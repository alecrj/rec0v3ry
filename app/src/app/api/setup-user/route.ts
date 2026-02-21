import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/server/db/client";
import { users, roleAssignments } from "@/server/db/schema/users";
import { organizations, properties, houses, rooms, beds } from "@/server/db/schema/orgs";
import { residents, admissions } from "@/server/db/schema/residents";
import { rateConfigs } from "@/server/db/schema/payment-extended";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Setup User API — Full onboarding flow
 *
 * POST: Creates org + user + property + house + rooms + beds + rate + (optional) resident + admission
 * GET: Check if current user is already set up
 */
export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { clerkId, email, firstName, lastName, orgName, house, resident } = body;

    // Verify the request is for the authenticated user
    if (clerkId !== clerkUserId) {
      return NextResponse.json({ error: "User ID mismatch" }, { status: 403 });
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerk_id, clerkId))
      .limit(1);

    if (existingUser) {
      const [roleAssignment] = await db
        .select()
        .from(roleAssignments)
        .where(and(eq(roleAssignments.user_id, existingUser.id), isNull(roleAssignments.revoked_at)))
        .limit(1);

      if (roleAssignment) {
        const client = await clerkClient();
        await client.users.updateUser(clerkId, {
          publicMetadata: {
            dbUserId: existingUser.id,
            orgId: roleAssignment.org_id,
            role: roleAssignment.role,
            scopeType: roleAssignment.scope_type,
            scopeId: roleAssignment.scope_id,
          },
        });
      }

      return NextResponse.json({
        message: "User already exists",
        userId: existingUser.id,
        orgId: roleAssignment?.org_id,
      });
    }

    // --- Create everything ---

    // 1. Organization
    const name = (orgName || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || `org-${Date.now()}`;

    const [org] = await db
      .insert(organizations)
      .values({ name, slug })
      .returning();

    // 2. User + Role
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

    await db.insert(roleAssignments).values({
      user_id: newUser.id,
      org_id: org.id,
      role: "org_owner",
      scope_type: "organization",
      scope_id: org.id,
      granted_by: newUser.id,
    });

    // 3. Property + House + Rooms + Beds (if house data provided)
    if (house?.name) {
      const [property] = await db
        .insert(properties)
        .values({
          org_id: org.id,
          name: house.name,
          address_line1: house.address || "TBD",
          city: house.city || "TBD",
          state: house.state || "TBD",
          zip: house.zip || "00000",
          created_by: newUser.id,
        })
        .returning();

      const bedCount = Math.min(Math.max(house.bedCount || 4, 1), 50);

      const [newHouse] = await db
        .insert(houses)
        .values({
          org_id: org.id,
          property_id: property.id,
          name: house.name,
          capacity: bedCount,
          address_line1: house.address || undefined,
          city: house.city || undefined,
          state: house.state || undefined,
          zip: house.zip || undefined,
          created_by: newUser.id,
        })
        .returning();

      // Create rooms and beds — 1 bed per room for simplicity
      const createdBeds: { id: string }[] = [];
      for (let i = 1; i <= bedCount; i++) {
        const [room] = await db
          .insert(rooms)
          .values({
            org_id: org.id,
            house_id: newHouse.id,
            name: `Room ${i}`,
            capacity: 1,
            created_by: newUser.id,
          })
          .returning();

        const [bed] = await db
          .insert(beds)
          .values({
            org_id: org.id,
            room_id: room.id,
            name: `Bed ${i}`,
            status: "available",
            created_by: newUser.id,
          })
          .returning();

        createdBeds.push(bed);
      }

      // 4. Rate config
      const rentAmount = parseFloat(house.rentAmount);
      if (rentAmount > 0) {
        await db.insert(rateConfigs).values({
          org_id: org.id,
          house_id: newHouse.id,
          payment_type: "rent",
          rate_name: "Monthly Rent",
          amount: String(rentAmount),
          billing_frequency: "monthly",
          effective_from: new Date().toISOString().split("T")[0],
          is_active: true,
          created_by: newUser.id,
        });
      }

      // 5. Resident + Admission (optional)
      if (resident?.firstName && resident?.lastName) {
        const [newResident] = await db
          .insert(residents)
          .values({
            org_id: org.id,
            first_name: resident.firstName,
            last_name: resident.lastName,
            phone: resident.phone || undefined,
            email: resident.email || undefined,
            date_of_birth: "2000-01-01", // Placeholder — operator can update later
            created_by: newUser.id,
          })
          .returning();

        // Assign to first bed
        const firstBed = createdBeds[0];
        await db.insert(admissions).values({
          org_id: org.id,
          resident_id: newResident.id,
          house_id: newHouse.id,
          bed_id: firstBed?.id,
          status: "active",
          admission_date: resident.moveInDate || new Date().toISOString().split("T")[0],
          created_by: newUser.id,
        });

        // Mark bed as occupied
        if (firstBed) {
          await db
            .update(beds)
            .set({ status: "occupied", updated_by: newUser.id })
            .where(eq(beds.id, firstBed.id));
        }
      }
    }

    // 6. Update Clerk metadata
    const client = await clerkClient();
    await client.users.updateUser(clerkId, {
      publicMetadata: {
        dbUserId: newUser.id,
        orgId: org.id,
        role: "org_owner",
        scopeType: "organization",
        scopeId: org.id,
      },
    });

    console.log(`[Setup] Created org "${name}" + user ${newUser.id} + house "${house?.name || "none"}"`);

    const response = NextResponse.json({
      message: "Setup complete",
      userId: newUser.id,
      orgId: org.id,
      role: "org_owner",
    });

    response.cookies.set("ros_setup_complete", "1", {
      maxAge: 60,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Setup User] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Setup failed" },
      { status: 500 }
    );
  }
}

/**
 * GET - Check if current user has been set up.
 */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [existingUser] = await db
      .select({
        id: users.id,
        email: users.email,
        first_name: users.first_name,
        last_name: users.last_name,
      })
      .from(users)
      .where(eq(users.clerk_id, clerkUserId))
      .limit(1);

    if (!existingUser) {
      try {
        const client = await clerkClient();
        await client.users.updateUser(clerkUserId, { publicMetadata: {} });
      } catch (clearErr) {
        console.error("[Setup User Check] Failed to clear stale metadata:", clearErr);
      }
      return NextResponse.json({ exists: false });
    }

    const [roleAssignment] = await db
      .select()
      .from(roleAssignments)
      .where(and(eq(roleAssignments.user_id, existingUser.id), isNull(roleAssignments.revoked_at)))
      .limit(1);

    if (roleAssignment) {
      try {
        const client = await clerkClient();
        await client.users.updateUser(clerkUserId, {
          publicMetadata: {
            dbUserId: existingUser.id,
            orgId: roleAssignment.org_id,
            role: roleAssignment.role,
            scopeType: roleAssignment.scope_type,
            scopeId: roleAssignment.scope_id,
          },
        });
      } catch (metaErr) {
        console.error("[Setup User Check] Failed to sync Clerk metadata:", metaErr);
      }
    }

    const response = NextResponse.json({
      exists: true,
      user: existingUser,
      orgId: roleAssignment?.org_id,
      role: roleAssignment?.role,
    });

    if (roleAssignment) {
      response.cookies.set("ros_setup_complete", "1", {
        maxAge: 60,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("[Setup User Check] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Check failed" },
      { status: 500 }
    );
  }
}
