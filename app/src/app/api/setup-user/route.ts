import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db/client";
import { users, roleAssignments } from "@/server/db/schema/users";
import { organizations } from "@/server/db/schema/orgs";
import { eq } from "drizzle-orm";

/**
 * Setup User API
 *
 * Creates a database user record for a Clerk user and assigns them
 * to the default organization with org_owner role for testing.
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { clerkId, email, firstName, lastName } = body;

    // Verify the request is for the authenticated user
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
      return NextResponse.json({ message: "User already exists", userId: existingUser[0].id });
    }

    // Get the first organization (from seed data)
    const [org] = await db
      .select()
      .from(organizations)
      .limit(1);

    if (!org) {
      return NextResponse.json({ error: "No organization found. Run seed script first." }, { status: 500 });
    }

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        clerk_id: clerkId,
        email: email,
        first_name: firstName || "New",
        last_name: lastName || "User",
        is_active: true,
        last_login_at: new Date(),
      })
      .returning();

    // Assign org_owner role to the organization
    await db.insert(roleAssignments).values({
      user_id: newUser.id,
      org_id: org.id,
      role: "org_owner",
    });

    console.log(`[Setup] Created user ${newUser.id} with org_owner role for org ${org.id}`);

    return NextResponse.json({
      message: "User created successfully",
      userId: newUser.id,
      orgId: org.id,
    });
  } catch (error) {
    console.error("[Setup User] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Setup failed" },
      { status: 500 }
    );
  }
}
