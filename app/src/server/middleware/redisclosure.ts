/**
 * Redisclosure Middleware
 *
 * Attaches 42 CFR Part 2 redisclosure notice to responses containing SUD data.
 * Source: docs/04_COMPLIANCE.md Section 3.2 (Redisclosure Controls)
 */

import { middleware } from '../trpc-init';
import { PART2_REDISCLOSURE_NOTICE } from '@/lib/constants';

/**
 * Redisclosure middleware
 * Adds Part 2 notice header when response contains SUD-protected data
 */
export const redisclosureMiddleware = middleware(async ({ ctx, next }) => {
  // Execute handler
  const result = await next({ ctx });

  // Add redisclosure notice header to response
  // The frontend should render this notice prominently
  if (ctx.resHeaders) {
    ctx.resHeaders.set('x-redisclosure-notice', PART2_REDISCLOSURE_NOTICE);
    // Also set no-cache headers for Part 2 data
    // Source: Phase 3 compliance review finding F2
    ctx.resHeaders.set('cache-control', 'no-store, no-cache, must-revalidate, private');
    ctx.resHeaders.set('pragma', 'no-cache');
    ctx.resHeaders.set('expires', '0');
  }

  return result;
});
