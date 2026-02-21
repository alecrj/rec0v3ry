import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/server/db/client";
import { users, roleAssignments } from "@/server/db/schema/users";
import { organizations } from "@/server/db/schema/orgs";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Setup User API
 *
 * Creates a database user record for a Clerk user and assigns them
 * to an organization. If no organization exists, creates one.
 *
 * Flow:
 * 1. Clerk auth -> user signs up/in
 * 2. Frontend calls GET to check status
 * 3. If no user, frontend shows org name form
 * 4. POST with orgName -> creates org + user + role + updates Clerk metadata
 * 5. User redirected to /admin/properties to continue setup
 */
export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { clerkId, email, firstName, lastName, orgName } = body;

    // Verify the request is for the authenticated user
    if (clerkId !== clerkUserId) {
      return NextResponse.json({ error: "User ID mismatch" }, { status: 403 });
    }

    // Check if user already exists in our DB
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerk_id, clerkId))
      .limit(1);

    if (existingUser) {
      // User exists - get their org assignment
      const [roleAssignment] = await db
        .select()
        .from(roleAssignments)
        .where(
          and(
            eq(roleAssignments.user_id, existingUser.id),
            isNull(roleAssignments.revoked_at)
          )
        )
        .limit(1);

      // Update Clerk metadata to ensure it's in sync
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

    // Find or create organization
    let org = (await db
      .select()
      .from(organizations)
      .where(isNull(organizations.deleted_at))
      .limit(1)
    )[0];

    if (!org) {
      // Create new organization — first user becomes org_owner
      const name = (orgName || "").trim();
      if (!name) {
        return NextResponse.json(
          { error: "Organization name is required", needsOrgName: true },
          { status: 400 }
        );
      }

      // Generate URL-safe slug from name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        || `org-${Date.now()}`;

      [org] = await db
        .insert(organizations)
        .values({
          name,
          slug,
        })
        .returning();

      console.log(`[Setup] Created organization "${name}" (${org.id})`);
    }

    // Create user in our database
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

    // Assign org_owner role
    const [roleAssignment] = await db
      .insert(roleAssignments)
      .values({
        user_id: newUser.id,
        org_id: org.id,
        role: "org_owner",
        scope_type: "organization",
        scope_id: org.id,
        granted_by: newUser.id,
      })
      .returning();

    // Update Clerk publicMetadata with org context
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

    console.log(
      `[Setup] Created user ${newUser.id} with org_owner role for org ${org.id}`
    );

    const response = NextResponse.json({
      message: "User created successfully",
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
 * Also re-syncs Clerk publicMetadata if user exists but metadata is stale.
 */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user exists in our DB
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
      // Clear stale Clerk metadata so the proxy redirects to setup
      try {
        const client = await clerkClient();
        await client.users.updateUser(clerkUserId, {
          publicMetadata: {},
        });
      } catch (clearErr) {
        console.error("[Setup User Check] Failed to clear stale metadata:", clearErr);
      }
      return NextResponse.json({ exists: false });
    }

    // Get active role assignment
    const [roleAssignment] = await db
      .select()
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.user_id, existingUser.id),
          isNull(roleAssignments.revoked_at)
        )
      )
      .limit(1);

    // Always re-sync Clerk metadata to prevent redirect loops
    // (proxy checks publicMetadata.dbUserId — if stale, user gets stuck on /setup)
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

    // Set a short-lived cookie so the proxy allows through to dashboard
    // while Clerk's JWT refreshes with the new metadata
    const response = NextResponse.json({
      exists: true,
      user: existingUser,
      orgId: roleAssignment?.org_id,
      role: roleAssignment?.role,
    });

    if (roleAssignment) {
      response.cookies.set("ros_setup_complete", "1", {
        maxAge: 60, // 60 seconds — enough for Clerk JWT to refresh
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
