/**
 * Tenant Middleware
 *
 * Resolves organization ID from the authenticated user's session
 * and passes it into ctx for use by all downstream queries.
 *
 * Note: We do NOT use SET LOCAL for RLS because Neon's HTTP driver
 * is stateless (each query is a separate HTTP request, no persistent
 * connection/transaction). Instead, all routers filter by org_id
 * explicitly via `eq(table.org_id, ctx.orgId)`.
 *
 * Source: docs/02_ARCHITECTURE.md Section 8 (Multi-Tenancy)
 */

import { TRPCError } from '@trpc/server';
import { middleware } from '../trpc-init';

/**
 * Tenant middleware
 * Resolves org_id from user session and passes it into context
 */
export const tenantMiddleware = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User must be authenticated',
    });
  }

  const orgId = ctx.user.orgId;

  if (!orgId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'User not assigned to an organization',
    });
  }

  return next({
    ctx: {
      ...ctx,
      orgId,
    },
  });
});
