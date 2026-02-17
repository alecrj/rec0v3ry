/**
 * Pass Router
 * Pass requests, approvals, and tracking
 *
 * Sprint 13-14: House Operations
 * Source: docs/06_ROADMAP.md Sprint 14 (OPS-05)
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { passes } from '../db/schema/operations';
import { residents, admissions } from '../db/schema/residents';
import { users } from '../db/schema/users';
import { houses } from '../db/schema/orgs';
import { eq, and, isNull, sql, desc, asc, gte, lte, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const passRouter = router({
  /**
   * List passes with filtering
   */
  list: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      residentId: z.string().uuid().optional(),
      status: z.enum(['requested', 'approved', 'denied', 'active', 'completed', 'violated', 'cancelled']).optional(),
      passType: z.enum(['day_pass', 'overnight', 'weekend', 'extended', 'medical', 'work', 'family_visit']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(passes.org_id, input.orgId),
        isNull(passes.deleted_at),
      ];

      if (input.residentId) {
        conditions.push(eq(passes.resident_id, input.residentId));
      }
      if (input.status) {
        conditions.push(eq(passes.status, input.status));
      }
      if (input.passType) {
        conditions.push(eq(passes.pass_type, input.passType));
      }
      if (input.startDate) {
        conditions.push(gte(passes.start_time, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(passes.end_time, new Date(input.endDate)));
      }

      let query = db
        .select({
          id: passes.id,
          resident_id: passes.resident_id,
          pass_type: passes.pass_type,
          status: passes.status,
          requested_at: passes.requested_at,
          start_time: passes.start_time,
          end_time: passes.end_time,
          destination: passes.destination,
          purpose: passes.purpose,
          approved_by: passes.approved_by,
          approved_at: passes.approved_at,
          actual_return_time: passes.actual_return_time,
          was_violated: passes.was_violated,
          created_at: passes.created_at,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
          house_id: admissions.house_id,
        })
        .from(passes)
        .innerJoin(residents, eq(passes.resident_id, residents.id))
        .leftJoin(
          admissions,
          and(
            eq(admissions.resident_id, residents.id),
            eq(admissions.status, 'active')
          )
        )
        .where(and(...conditions))
        .orderBy(desc(passes.start_time))
        .limit(input.limit)
        .offset(input.offset);

      const result = await query;

      // Filter by house if specified
      if (input.houseId) {
        return result.filter(p => p.house_id === input.houseId);
      }

      return result;
    }),

  /**
   * Get pass by ID
   */
  getById: protectedProcedure
    .input(z.object({
      passId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const [pass] = await db
        .select({
          id: passes.id,
          org_id: passes.org_id,
          resident_id: passes.resident_id,
          pass_type: passes.pass_type,
          status: passes.status,
          requested_at: passes.requested_at,
          start_time: passes.start_time,
          end_time: passes.end_time,
          destination: passes.destination,
          purpose: passes.purpose,
          contact_during_pass: passes.contact_during_pass,
          approved_by: passes.approved_by,
          approved_at: passes.approved_at,
          denial_reason: passes.denial_reason,
          actual_return_time: passes.actual_return_time,
          was_violated: passes.was_violated,
          violation_notes: passes.violation_notes,
          notes: passes.notes,
          created_at: passes.created_at,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
        })
        .from(passes)
        .innerJoin(residents, eq(passes.resident_id, residents.id))
        .where(
          and(
            eq(passes.id, input.passId),
            isNull(passes.deleted_at)
          )
        )
        .limit(1);

      if (!pass) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pass not found' });
      }

      return pass;
    }),

  /**
   * Request a pass (by resident or staff)
   */
  request: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      passType: z.enum(['day_pass', 'overnight', 'weekend', 'extended', 'medical', 'work', 'family_visit']),
      startTime: z.string(),
      endTime: z.string(),
      destination: z.string().optional(),
      purpose: z.string().optional(),
      contactDuringPass: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validate end time is after start time
      const start = new Date(input.startTime);
      const end = new Date(input.endTime);
      if (end <= start) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'End time must be after start time',
        });
      }

      const [pass] = await db
        .insert(passes)
        .values({
          org_id: input.orgId,
          resident_id: input.residentId,
          pass_type: input.passType,
          status: 'requested',
          start_time: start,
          end_time: end,
          destination: input.destination,
          purpose: input.purpose,
          contact_during_pass: input.contactDuringPass,
          notes: input.notes,
          created_by: ctx.user!.id,
        })
        .returning();

      return pass;
    }),

  /**
   * Approve a pass request
   */
  approve: protectedProcedure
    .input(z.object({
      passId: z.string().uuid(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [pass] = await db
        .update(passes)
        .set({
          status: 'approved',
          approved_by: ctx.user!.id,
          approved_at: new Date(),
          notes: input.notes,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(passes.id, input.passId),
            eq(passes.status, 'requested'),
            isNull(passes.deleted_at)
          )
        )
        .returning();

      if (!pass) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pass not found or not in requested status',
        });
      }

      return pass;
    }),

  /**
   * Deny a pass request
   */
  deny: protectedProcedure
    .input(z.object({
      passId: z.string().uuid(),
      denialReason: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const [pass] = await db
        .update(passes)
        .set({
          status: 'denied',
          denial_reason: input.denialReason,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(passes.id, input.passId),
            eq(passes.status, 'requested'),
            isNull(passes.deleted_at)
          )
        )
        .returning();

      if (!pass) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pass not found or not in requested status',
        });
      }

      return pass;
    }),

  /**
   * Activate a pass (resident departs)
   */
  activate: protectedProcedure
    .input(z.object({
      passId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [pass] = await db
        .update(passes)
        .set({
          status: 'active',
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(passes.id, input.passId),
            eq(passes.status, 'approved'),
            isNull(passes.deleted_at)
          )
        )
        .returning();

      if (!pass) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pass not found or not approved',
        });
      }

      return pass;
    }),

  /**
   * Complete a pass (resident returns)
   */
  complete: protectedProcedure
    .input(z.object({
      passId: z.string().uuid(),
      actualReturnTime: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const returnTime = input.actualReturnTime ? new Date(input.actualReturnTime) : new Date();

      // Get pass to check if violated
      const [existingPass] = await db
        .select()
        .from(passes)
        .where(eq(passes.id, input.passId))
        .limit(1);

      if (!existingPass) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pass not found' });
      }

      // Check if return is late (violated)
      const wasViolated = returnTime > existingPass.end_time;

      const [pass] = await db
        .update(passes)
        .set({
          status: wasViolated ? 'violated' : 'completed',
          actual_return_time: returnTime,
          was_violated: wasViolated,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(passes.id, input.passId),
            eq(passes.status, 'active'),
            isNull(passes.deleted_at)
          )
        )
        .returning();

      if (!pass) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pass not found or not active',
        });
      }

      return pass;
    }),

  /**
   * Cancel a pass
   */
  cancel: protectedProcedure
    .input(z.object({
      passId: z.string().uuid(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [pass] = await db
        .update(passes)
        .set({
          status: 'cancelled',
          notes: input.notes,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(passes.id, input.passId),
            or(
              eq(passes.status, 'requested'),
              eq(passes.status, 'approved')
            ),
            isNull(passes.deleted_at)
          )
        )
        .returning();

      if (!pass) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pass not found or cannot be cancelled',
        });
      }

      return pass;
    }),

  /**
   * Record pass violation
   */
  recordViolation: protectedProcedure
    .input(z.object({
      passId: z.string().uuid(),
      violationNotes: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const [pass] = await db
        .update(passes)
        .set({
          status: 'violated',
          was_violated: true,
          violation_notes: input.violationNotes,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(passes.id, input.passId),
            isNull(passes.deleted_at)
          )
        )
        .returning();

      if (!pass) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pass not found' });
      }

      return pass;
    }),

  /**
   * Get pass stats
   */
  getStats: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(passes.org_id, input.orgId),
        isNull(passes.deleted_at),
      ];

      if (input.startDate) {
        conditions.push(gte(passes.start_time, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(passes.start_time, new Date(input.endDate)));
      }

      // Stats by status
      const byStatusBase = input.houseId
        ? db
            .select({
              status: passes.status,
              count: sql<number>`count(*)::int`,
            })
            .from(passes)
            .innerJoin(
              admissions,
              and(
                eq(admissions.resident_id, passes.resident_id),
                eq(admissions.status, 'active'),
                eq(admissions.house_id, input.houseId)
              )
            )
            .where(and(...conditions))
            .groupBy(passes.status)
        : db
            .select({
              status: passes.status,
              count: sql<number>`count(*)::int`,
            })
            .from(passes)
            .where(and(...conditions))
            .groupBy(passes.status);
      const byStatus = await byStatusBase;

      // Stats by type
      const byTypeBase = input.houseId
        ? db
            .select({
              pass_type: passes.pass_type,
              count: sql<number>`count(*)::int`,
            })
            .from(passes)
            .innerJoin(
              admissions,
              and(
                eq(admissions.resident_id, passes.resident_id),
                eq(admissions.status, 'active'),
                eq(admissions.house_id, input.houseId)
              )
            )
            .where(and(...conditions))
            .groupBy(passes.pass_type)
        : db
            .select({
              pass_type: passes.pass_type,
              count: sql<number>`count(*)::int`,
            })
            .from(passes)
            .where(and(...conditions))
            .groupBy(passes.pass_type);
      const byType = await byTypeBase;

      // Violation count
      const violationsBase = input.houseId
        ? db
            .select({ count: sql<number>`count(*)::int` })
            .from(passes)
            .innerJoin(
              admissions,
              and(
                eq(admissions.resident_id, passes.resident_id),
                eq(admissions.status, 'active'),
                eq(admissions.house_id, input.houseId)
              )
            )
            .where(and(...conditions, eq(passes.was_violated, true)))
        : db
            .select({ count: sql<number>`count(*)::int` })
            .from(passes)
            .where(and(...conditions, eq(passes.was_violated, true)));
      const [violations] = await violationsBase;

      // Pending requests
      const pendingBase = input.houseId
        ? db
            .select({ count: sql<number>`count(*)::int` })
            .from(passes)
            .innerJoin(
              admissions,
              and(
                eq(admissions.resident_id, passes.resident_id),
                eq(admissions.status, 'active'),
                eq(admissions.house_id, input.houseId)
              )
            )
            .where(and(...conditions, eq(passes.status, 'requested')))
        : db
            .select({ count: sql<number>`count(*)::int` })
            .from(passes)
            .where(and(...conditions, eq(passes.status, 'requested')));
      const [pending] = await pendingBase;

      // Active passes
      const activeBase = input.houseId
        ? db
            .select({ count: sql<number>`count(*)::int` })
            .from(passes)
            .innerJoin(
              admissions,
              and(
                eq(admissions.resident_id, passes.resident_id),
                eq(admissions.status, 'active'),
                eq(admissions.house_id, input.houseId)
              )
            )
            .where(and(...conditions, eq(passes.status, 'active')))
        : db
            .select({ count: sql<number>`count(*)::int` })
            .from(passes)
            .where(and(...conditions, eq(passes.status, 'active')));
      const [active] = await activeBase;

      const statusCounts = byStatus.reduce((acc, s) => {
        acc[s.status] = s.count;
        return acc;
      }, {} as Record<string, number>);

      const typeCounts = byType.reduce((acc, t) => {
        acc[t.pass_type] = t.count;
        return acc;
      }, {} as Record<string, number>);

      return {
        byStatus: statusCounts,
        byType: typeCounts,
        totalViolations: violations?.count ?? 0,
        pendingRequests: pending?.count ?? 0,
        activeNow: active?.count ?? 0,
      };
    }),

  /**
   * Get currently active passes
   */
  getActive: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(passes.org_id, input.orgId),
        eq(passes.status, 'active'),
        isNull(passes.deleted_at),
      ];

      const result = await db
        .select({
          id: passes.id,
          resident_id: passes.resident_id,
          pass_type: passes.pass_type,
          start_time: passes.start_time,
          end_time: passes.end_time,
          destination: passes.destination,
          contact_during_pass: passes.contact_during_pass,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
          house_id: admissions.house_id,
        })
        .from(passes)
        .innerJoin(residents, eq(passes.resident_id, residents.id))
        .leftJoin(
          admissions,
          and(
            eq(admissions.resident_id, residents.id),
            eq(admissions.status, 'active')
          )
        )
        .where(and(...conditions))
        .orderBy(asc(passes.end_time));

      if (input.houseId) {
        return result.filter(p => p.house_id === input.houseId);
      }

      return result;
    }),
});
