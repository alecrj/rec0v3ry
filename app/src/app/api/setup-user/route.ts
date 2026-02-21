import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/server/db/client";
import { users, roleAssignments } from "@/server/db/schema/users";
import { organizations, properties, houses, rooms, beds } from "@/server/db/schema/orgs";
import { rateConfigs } from "@/server/db/schema/payment-extended";
import { eq } from "drizzle-orm";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "org";
}

/**
 * Setup User API
 *
 * Creates everything for a new organization:
 * org → property → house → rooms → beds → rate → user → role assignment
 * Also updates Clerk user metadata so tRPC context works.
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { clerkId, email, firstName, lastName, orgName, house, resident } = body;

    if (clerkId !== userId) {
      return NextResponse.json({ error: "User ID mismatch" }, { status: 403 });
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.clerk_id, clerkId))
      .limit(1);

    if (existingUser.length > 0) {
      // User exists — check if they have an org
      const existingRole = await db
        .select()
        .from(roleAssignments)
        .where(eq(roleAssignments.user_id, existingUser[0]!.id))
        .limit(1);

      if (existingRole.length > 0) {
        return NextResponse.json({
          message: "User already exists",
          userId: existingUser[0]!.id,
          orgId: existingRole[0]!.org_id,
        });
      }
    }

    // ── Create organization ──
    const orgSlug = generateSlug(orgName || "my-org");
    const [org] = await db
      .insert(organizations)
      .values({
        name: orgName?.trim() || "My Organization",
        slug: orgSlug + "-" + Date.now().toString(36),
      })
      .returning();

    const orgId = org!.id;

    // ── Create or find user ──
    let dbUserId: string;
    if (existingUser.length > 0) {
      dbUserId = existingUser[0]!.id;
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          clerk_id: clerkId,
          email: email || "",
          first_name: firstName || "New",
          last_name: lastName || "User",
          is_active: true,
          last_login_at: new Date(),
        })
        .returning();
      dbUserId = newUser!.id;
    }

    // ── Assign org_owner role ──
    await db.insert(roleAssignments).values({
      user_id: dbUserId,
      org_id: orgId,
      role: "org_owner",
    });

    // ── Create property + house + rooms + beds if provided ──
    if (house?.name) {
      const propSlug = generateSlug(house.name);
      const [property] = await db
        .insert(properties)
        .values({
          org_id: orgId,
          name: house.name,
          slug: propSlug + "-" + Date.now().toString(36),
          address_line1: house.address || "",
          city: house.city || "",
          state: house.state || "",
          zip: house.zip || "",
        })
        .returning();

      const bedCount = parseInt(house.bedCount) || 4;

      const [newHouse] = await db
        .insert(houses)
        .values({
          org_id: orgId,
          property_id: property!.id,
          name: house.name,
          capacity: bedCount,
          address_line1: house.address || "",
          city: house.city || "",
          state: house.state || "",
          zip: house.zip || "",
        })
        .returning();

      // Create rooms and beds (1 bed per room for simplicity)
      for (let i = 1; i <= bedCount; i++) {
        const [room] = await db
          .insert(rooms)
          .values({
            org_id: orgId,
            house_id: newHouse!.id,
            name: `Room ${i}`,
            floor: 1,
            capacity: 1,
          })
          .returning();

        await db.insert(beds).values({
          org_id: orgId,
          room_id: room!.id,
          name: `Bed ${i}`,
          status: "available",
        });
      }

      // Create rate config if rent amount provided
      const rentAmount = parseFloat(house.rentAmount);
      if (rentAmount > 0) {
        await db.insert(rateConfigs).values({
          org_id: orgId,
          house_id: newHouse!.id,
          payment_type: "rent",
          rate_name: "Monthly Rent",
          amount: rentAmount.toFixed(2),
          billing_frequency: "monthly",
          effective_from: new Date().toISOString().split("T")[0]!,
          is_active: true,
        });
      }
    }

    // ── Update Clerk metadata so tRPC context works ──
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(clerkId, {
        publicMetadata: {
          dbUserId,
          orgId,
          role: "org_owner",
          scopeType: "org",
          scopeId: orgId,
        },
      });
    } catch (clerkErr) {
      console.error("[Setup] Failed to update Clerk metadata:", clerkErr);
      // Non-fatal — user can still be matched by clerk_id in tRPC context
    }

    console.log(`[Setup] Created org ${orgId}, user ${dbUserId} with org_owner role`);

    return NextResponse.json({
      message: "Setup complete",
      userId: dbUserId,
      orgId,
    });
  } catch (error) {
    console.error("[Setup User] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Setup failed" },
      { status: 500 }
    );
  }
}
