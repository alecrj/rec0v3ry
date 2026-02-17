/**
 * Authentication Middleware
 *
 * Verifies Clerk session and extracts user information.
 * Source: docs/02_ARCHITECTURE.md Section 6 (Authentication Architecture)
 */

import { TRPCError } from '@trpc/server';
import { middleware } from '../trpc-init';
import { UnauthorizedError } from '@/lib/errors';

/**
 * Authentication middleware
 * Ensures user is authenticated via Clerk
 */
export const authMiddleware = middleware(async ({ ctx, next }) => {
  // Check if user exists in context (set by createContext)
  if (!ctx.user) {
    throw new UnauthorizedError('Authentication required');
  }

  // Verify user has required metadata
  if (!ctx.user.id || !ctx.user.email) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid session - missing user data',
    });
  }

  // Pass user data to next middleware
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
