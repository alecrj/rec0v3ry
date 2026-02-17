/**
 * Rate Limiting Middleware
 *
 * Upstash-based rate limiting per user per endpoint.
 * Source: docs/02_ARCHITECTURE.md Section 5 (Rate Limiting)
 *
 * NOTE: This is a stub implementation. In production, integrate with Upstash Redis.
 */

import { TRPCError } from '@trpc/server';
import { middleware } from '../trpc-init';
import { RateLimitError } from '@/lib/errors';

/**
 * Rate limit configuration per endpoint type
 */
type RateLimitConfig = {
  limit: number;  // Max requests
  window: number; // Time window in seconds
};

/**
 * In-memory rate limit store (for development)
 * In production, use Upstash Redis: @upstash/ratelimit
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for a user/endpoint combination
 */
async function checkRateLimit(
  userId: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();

  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt < now) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + (config.window * 1000),
    });
    return { allowed: true };
  }

  if (existing.count >= config.limit) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment counter
  existing.count++;
  return { allowed: true };
}

/**
 * Rate limiting middleware (stub)
 *
 * In production, configure with:
 * ```typescript
 * import { Ratelimit } from "@upstash/ratelimit";
 * import { Redis } from "@upstash/redis";
 *
 * const redis = Redis.fromEnv();
 * const ratelimit = new Ratelimit({
 *   redis,
 *   limiter: Ratelimit.slidingWindow(100, "10 s"),
 * });
 * ```
 */
export const rateLimitMiddleware = middleware(async ({ ctx, path, next }) => {
  // Only rate limit authenticated requests
  if (!ctx.user) {
    return next({ ctx });
  }

  // Determine rate limit config based on path
  // This is a simplified implementation - in production, configure per endpoint
  const config: RateLimitConfig = path.includes('export')
    ? { limit: 5, window: 60 }
    : path.includes('create') || path.includes('update') || path.includes('delete')
    ? { limit: 30, window: 10 }
    : { limit: 100, window: 10 };

  // Check rate limit
  const result = await checkRateLimit(ctx.user.id, path, config);

  if (!result.allowed) {
    // Set Retry-After header
    if (ctx.resHeaders && result.retryAfter) {
      ctx.resHeaders.set('retry-after', result.retryAfter.toString());
      ctx.resHeaders.set('x-ratelimit-remaining', '0');
    }

    throw new RateLimitError(result.retryAfter || 60);
  }

  return next({ ctx });
});

/**
 * Clean up expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute
