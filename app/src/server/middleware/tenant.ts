/**
 * Tenant Middleware
 *
 * Resolves organization ID and sets PostgreSQL RLS context.
 * Source: docs/02_ARCHITECTURE.md Section 8 (Multi-Tenancy)
 */

import { TRPCError } from '@trpc/server';
import { middleware } from '../trpc-init';
import { sql } from 'drizzle-orm';

/**
 * Tenant middleware
 * Resolves org_id from user session and sets RLS context
 */
export const tenantMiddleware = middleware(async ({ ctx, next }) => {
  // User must be authenticated (enforced by authMiddleware)
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User must be authenticated',
    });
  }

  // Extract org_id from user metadata
  const orgId = ctx.user.orgId;

  if (!orgId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'User not assigned to an organization',
    });
  }

  // Set PostgreSQL RLS context for this session
  // This ensures all queries are automatically filtered by org_id
  try {
    await ctx.db.execute(
      sql`SET LOCAL app.current_org_id = ${orgId}`
    );
  } catch (error) {
    console.error('Failed to set RLS context:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to initialize database session',
    });
  }

  // Pass org_id to next middleware
  return next({
    ctx: {
      ...ctx,
      orgId,
    },
  });
});
