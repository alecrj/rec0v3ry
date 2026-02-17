/**
 * Break Glass Router
 *
 * Emergency access override for critical situations.
 * Source: docs/04_COMPLIANCE.md Section 3.4 (Break Glass Access)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { breakGlassEvents } from '../db/schema/compliance-extended';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Activate break glass input schema
 */
const activateBreakGlassSchema = z.object({
  residentId: z.string().uuid(),
  reason: z.enum(['medical', 'safety', 'legal', 'other']),
  justification: z.string().min(10, 'Justification must be at least 10 characters'),
  supervisorId: z.string().uuid().optional(),
});

/**
 * List break glass events input schema
 */
const listBreakGlassSchema = z.object({
  residentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  emergencyType: z.enum(['medical', 'safety', 'legal', 'other']).optional(),
  isJustified: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(25),
  cursor: z.string().uuid().optional(),
});

/**
 * Review break glass event input schema
 */
const reviewBreakGlassSchema = z.object({
  id: z.string().uuid(),
  isJustified: z.boolean(),
  reviewNotes: z.string().min(1),
});

/**
 * Break glass router
 */
export const breakGlassRouter = router({
  /**
   * Activate break glass access
   * Grants emergency access to Part 2 data
   */
  activate: protectedProcedure
    .input(activateBreakGlassSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Get IP address from request
      const ipAddress = ctx.req.headers.get('x-forwarded-for') ||
                        ctx.req.headers.get('x-real-ip') ||
                        'unknown';

      const userAgent = ctx.req.headers.get('user-agent') || 'unknown';

      // Create break glass event
      const [event] = await ctx.db
        .insert(breakGlassEvents)
        .values({
          org_id: orgId,
          resident_id: input.residentId,
          user_id: ctx.user!.id,
          reason: input.justification, // Should be encrypted
          emergency_type: input.reason,
          ip_address: ipAddress,
          user_agent: userAgent,
          supervisor_id: input.supervisorId || null,
          supervisor_notified: !!input.supervisorId,
          supervisor_notified_at: input.supervisorId ? new Date() : null,
        })
        .returning();

      // In a real implementation, this would:
      // 1. Generate a temporary elevated access token
      // 2. Send notification to supervisor
      // 3. Log the event in audit trail with high sensitivity
      // 4. Return the elevated token for use in subsequent requests

      return {
        eventId: event.id,
        message: 'Break glass access activated',
        residentId: input.residentId,
        activatedAt: event.created_at,
        expiresAt: new Date(event.created_at.getTime() + 60 * 60 * 1000), // 1 hour
        supervisorNotified: event.supervisor_notified,
      };
    }),

  /**
   * List break glass events
   * For compliance officer review
   */
  list: protectedProcedure
    .meta({ permission: 'audit_log:read', resource: 'audit_log' })
    .input(listBreakGlassSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const conditions = [eq(breakGlassEvents.org_id, orgId)];

      if (input.residentId) {
        conditions.push(eq(breakGlassEvents.resident_id, input.residentId));
      }

      if (input.userId) {
        conditions.push(eq(breakGlassEvents.user_id, input.userId));
      }

      if (input.emergencyType) {
        conditions.push(eq(breakGlassEvents.emergency_type, input.emergencyType));
      }

      if (input.isJustified !== undefined) {
        conditions.push(eq(breakGlassEvents.is_justified, input.isJustified));
      }

      const items = await ctx.db.query.breakGlassEvents.findMany({
        where: and(...conditions),
        orderBy: [desc(breakGlassEvents.created_at)],
        limit: input.limit + 1,
        with: {
          user: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          resident: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
          supervisor: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          reviewer: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      const hasMore = items.length > input.limit;
      const results = hasMore ? items.slice(0, input.limit) : items;

      return {
        items: results,
        nextCursor: hasMore ? results[results.length - 1]?.id : null,
      };
    }),

  /**
   * Review a break glass event
   * Compliance officer determines if access was justified
   */
  review: protectedProcedure
    .meta({ permission: 'audit_log:read', resource: 'audit_log' })
    .input(reviewBreakGlassSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Verify event exists
      const existing = await ctx.db.query.breakGlassEvents.findFirst({
        where: and(
          eq(breakGlassEvents.id, input.id),
          eq(breakGlassEvents.org_id, orgId)
        ),
      });

      if (!existing) {
        throw new Error('Break glass event not found');
      }

      // Update review
      const [updated] = await ctx.db
        .update(breakGlassEvents)
        .set({
          is_justified: input.isJustified,
          review_notes: input.reviewNotes, // Should be encrypted
          reviewed_by: ctx.user!.id,
          reviewed_at: new Date(),
        })
        .where(eq(breakGlassEvents.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Get break glass statistics
   * Summary of emergency access usage
   */
  getStats: protectedProcedure
    .meta({ permission: 'audit_log:read', resource: 'audit_log' })
    .input(z.object({
      dateFrom: z.string().datetime(),
      dateTo: z.string().datetime(),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const events = await ctx.db.query.breakGlassEvents.findMany({
        where: and(
          eq(breakGlassEvents.org_id, orgId),
          eq(breakGlassEvents.created_at, new Date(input.dateFrom)),
          eq(breakGlassEvents.created_at, new Date(input.dateTo))
        ),
      });

      const total = events.length;
      const reviewed = events.filter(e => e.reviewed_at !== null).length;
      const justified = events.filter(e => e.is_justified === true).length;
      const unjustified = events.filter(e => e.is_justified === false).length;
      const pending = total - reviewed;

      const byType = events.reduce((acc, e) => {
        acc[e.emergency_type] = (acc[e.emergency_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        reviewed,
        justified,
        unjustified,
        pending,
        byType,
        dateRange: {
          from: input.dateFrom,
          to: input.dateTo,
        },
      };
    }),
});
