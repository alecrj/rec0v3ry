/**
 * User Management Router
 *
 * Handles user invitations, role management, and user lifecycle.
 * Source: docs/04_COMPLIANCE.md Section 6 (RBAC)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { users, roleAssignments, userSessions } from '../db/schema/users';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { NotFoundError, ConflictError } from '@/lib/errors';

/**
 * User invitation input schema
 */
const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    'super_admin',
    'org_owner',
    'property_manager',
    'house_manager',
    'case_manager',
    'staff',
    'resident',
    'family',
    'referral_source',
  ]),
  scopeType: z.enum(['organization', 'property', 'house', 'resident']).optional(),
  scopeId: z.string().uuid().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

/**
 * Update role input schema
 */
const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum([
    'super_admin',
    'org_owner',
    'property_manager',
    'house_manager',
    'case_manager',
    'staff',
    'resident',
    'family',
    'referral_source',
  ]),
  scopeType: z.enum(['organization', 'property', 'house', 'resident']).optional(),
  scopeId: z.string().uuid().optional(),
});

/**
 * List users input schema
 */
const listUsersSchema = z.object({
  role: z.enum([
    'super_admin',
    'org_owner',
    'property_manager',
    'house_manager',
    'case_manager',
    'staff',
    'resident',
    'family',
    'referral_source',
  ]).optional(),
  isActive: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(25),
  cursor: z.string().uuid().optional(),
});

/**
 * User router
 */
export const userRouter = router({
  /**
   * List organization users with their roles
   */
  list: protectedProcedure
    .meta({ permission: 'user:read', resource: 'user' })
    .input(listUsersSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Find users with active role assignments in this org
      const userRoles = await ctx.db.query.roleAssignments.findMany({
        where: and(
          eq(roleAssignments.org_id, orgId),
          isNull(roleAssignments.revoked_at),
          input.role ? eq(roleAssignments.role, input.role) : undefined
        ),
        with: {
          user: true,
        },
        orderBy: [desc(roleAssignments.granted_at)],
        limit: input.limit + 1,
      });

      // Filter by isActive if specified
      let filteredUsers = userRoles;
      if (input.isActive !== undefined) {
        filteredUsers = userRoles.filter(ur => ur.user.is_active === input.isActive);
      }

      const hasMore = filteredUsers.length > input.limit;
      const results = hasMore ? filteredUsers.slice(0, input.limit) : filteredUsers;

      return {
        items: results.map(ur => ({
          ...ur.user,
          role: ur.role,
          scopeType: ur.scope_type,
          scopeId: ur.scope_id,
          grantedAt: ur.granted_at,
        })),
        nextCursor: hasMore ? results[results.length - 1]?.user.id : null,
      };
    }),

  /**
   * Get user details by ID
   */
  getById: protectedProcedure
    .meta({ permission: 'user:read', resource: 'user' })
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.id),
      });

      if (!user) {
        throw new NotFoundError('User', input.id);
      }

      // Get user's role assignments in this org
      const roles = await ctx.db.query.roleAssignments.findMany({
        where: and(
          eq(roleAssignments.user_id, user.id),
          eq(roleAssignments.org_id, orgId),
          isNull(roleAssignments.revoked_at)
        ),
      });

      return {
        ...user,
        roles,
      };
    }),

  /**
   * Invite a new user
   * Creates a role assignment record
   */
  invite: protectedProcedure
    .meta({ permission: 'user:create', resource: 'user' })
    .input(inviteUserSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Check if user already exists with this email
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      let userId: string;

      if (existingUser) {
        // User exists - check if they already have this role in this org
        const existingRole = await ctx.db.query.roleAssignments.findFirst({
          where: and(
            eq(roleAssignments.user_id, existingUser.id),
            eq(roleAssignments.org_id, orgId),
            eq(roleAssignments.role, input.role),
            input.scopeType ? eq(roleAssignments.scope_type, input.scopeType) : undefined,
            input.scopeId ? eq(roleAssignments.scope_id, input.scopeId) : undefined,
            isNull(roleAssignments.revoked_at)
          ),
        });

        if (existingRole) {
          throw new ConflictError('User already has this role', {
            userId: existingUser.id,
            role: input.role,
          });
        }

        userId = existingUser.id;
      } else {
        // Create placeholder user (will be completed when they accept invitation)
        const [newUser] = await ctx.db
          .insert(users)
          .values({
            clerk_id: `pending_${Date.now()}_${input.email}`, // Temporary until Clerk signup
            email: input.email,
            first_name: input.firstName || '',
            last_name: input.lastName || '',
            is_active: false, // Inactive until they complete signup
          })
          .returning();

        userId = newUser.id;
      }

      // Create role assignment
      const [roleAssignment] = await ctx.db
        .insert(roleAssignments)
        .values({
          org_id: orgId,
          user_id: userId,
          role: input.role,
          scope_type: input.scopeType || null,
          scope_id: input.scopeId || null,
          granted_by: ctx.user!.id,
        })
        .returning();

      return {
        userId,
        email: input.email,
        role: input.role,
        roleAssignmentId: roleAssignment.id,
        isNewUser: !existingUser,
      };
    }),

  /**
   * Update user role
   */
  updateRole: protectedProcedure
    .meta({ permission: 'user:update', resource: 'user' })
    .input(updateRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Verify user exists
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!user) {
        throw new NotFoundError('User', input.userId);
      }

      // Revoke all existing active roles for this user in this org
      await ctx.db
        .update(roleAssignments)
        .set({
          revoked_at: new Date(),
          revoked_by: ctx.user!.id,
        })
        .where(
          and(
            eq(roleAssignments.user_id, input.userId),
            eq(roleAssignments.org_id, orgId),
            isNull(roleAssignments.revoked_at)
          )
        );

      // Create new role assignment
      const [newRole] = await ctx.db
        .insert(roleAssignments)
        .values({
          org_id: orgId,
          user_id: input.userId,
          role: input.role,
          scope_type: input.scopeType || null,
          scope_id: input.scopeId || null,
          granted_by: ctx.user!.id,
        })
        .returning();

      return newRole;
    }),

  /**
   * Deactivate user
   * Sets is_active=false, revokes all role assignments, invalidates sessions
   */
  deactivate: protectedProcedure
    .meta({ permission: 'user:delete', resource: 'user' })
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Verify user exists
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.id),
      });

      if (!user) {
        throw new NotFoundError('User', input.id);
      }

      // Deactivate user
      const [updated] = await ctx.db
        .update(users)
        .set({
          is_active: false,
          updated_at: new Date(),
        })
        .where(eq(users.id, input.id))
        .returning();

      // Revoke all active role assignments in this org
      await ctx.db
        .update(roleAssignments)
        .set({
          revoked_at: new Date(),
          revoked_by: ctx.user!.id,
        })
        .where(
          and(
            eq(roleAssignments.user_id, input.id),
            eq(roleAssignments.org_id, orgId),
            isNull(roleAssignments.revoked_at)
          )
        );

      // Invalidate all active sessions
      await ctx.db
        .update(userSessions)
        .set({
          ended_at: new Date(),
          end_reason: 'deactivation',
        })
        .where(
          and(
            eq(userSessions.user_id, input.id),
            isNull(userSessions.ended_at)
          )
        );

      return updated;
    }),

  /**
   * Reactivate user
   * Sets is_active=true
   */
  reactivate: protectedProcedure
    .meta({ permission: 'user:update', resource: 'user' })
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user exists
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.id),
      });

      if (!user) {
        throw new NotFoundError('User', input.id);
      }

      if (user.is_active) {
        throw new ConflictError('User is already active', { userId: input.id });
      }

      // Reactivate user
      const [updated] = await ctx.db
        .update(users)
        .set({
          is_active: true,
          updated_at: new Date(),
        })
        .where(eq(users.id, input.id))
        .returning();

      return updated;
    }),
});
