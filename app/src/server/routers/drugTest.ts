/**
 * Drug Test Router
 * Drug testing with Part 2 compliance (42 CFR Part 2)
 *
 * Sprint 13-14: House Operations
 * Source: docs/06_ROADMAP.md Sprint 14 (OPS-07)
 *
 * IMPORTANT: Drug test results are Part 2 protected data.
 * - Results should use field-level encryption (AES-256-GCM)
 * - Access requires active consent
 * - All access is audit logged
 * - Uses part2Procedure for consent verification
 */

import { router, protectedProcedure, part2Procedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { drugTests } from '../db/schema/operations';
import { residents, admissions } from '../db/schema/residents';
import { eq, and, isNull, sql, desc, gte, lte } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
// Note: Drug test results are Part 2 protected - encryption should be applied in production

export const drugTestRouter = router({
  /**
   * List drug tests (metadata only, no results)
   * This returns non-sensitive fields without consent check
   */
  list: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      residentId: z.string().uuid().optional(),
      testType: z.enum(['urine', 'breathalyzer', 'oral_swab', 'blood', 'hair_follicle']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(drugTests.org_id, input.orgId),
        isNull(drugTests.deleted_at),
      ];

      if (input.residentId) {
        conditions.push(eq(drugTests.resident_id, input.residentId));
      }
      if (input.testType) {
        conditions.push(eq(drugTests.test_type, input.testType));
      }
      if (input.startDate) {
        conditions.push(gte(drugTests.test_date, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(drugTests.test_date, new Date(input.endDate)));
      }

      // Return only non-sensitive metadata, join through admissions for house_id
      const result = await db
        .select({
          id: drugTests.id,
          resident_id: drugTests.resident_id,
          test_type: drugTests.test_type,
          test_date: drugTests.test_date,
          is_random: drugTests.is_random,
          administered_by: drugTests.administered_by,
          created_at: drugTests.created_at,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
          house_id: admissions.house_id,
        })
        .from(drugTests)
        .innerJoin(residents, eq(drugTests.resident_id, residents.id))
        .leftJoin(
          admissions,
          and(
            eq(admissions.resident_id, residents.id),
            eq(admissions.status, 'active')
          )
        )
        .where(and(...conditions))
        .orderBy(desc(drugTests.test_date))
        .limit(input.limit)
        .offset(input.offset);

      if (input.houseId) {
        return result.filter(t => t.house_id === input.houseId);
      }

      return result;
    }),

  /**
   * Get drug test by ID with results (Part 2 protected)
   * Requires active consent for the resident
   */
  getById: part2Procedure
    .input(z.object({
      testId: z.string().uuid(),
      residentId: z.string().uuid(), // Required for consent check
    }))
    .query(async ({ input }) => {
      const [test] = await db
        .select({
          id: drugTests.id,
          org_id: drugTests.org_id,
          resident_id: drugTests.resident_id,
          test_type: drugTests.test_type,
          test_date: drugTests.test_date,
          result: drugTests.result,
          substances_detected: drugTests.substances_detected,
          administered_by: drugTests.administered_by,
          lab_name: drugTests.lab_name,
          lab_order_number: drugTests.lab_order_number,
          is_random: drugTests.is_random,
          notes: drugTests.notes,
          created_at: drugTests.created_at,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
        })
        .from(drugTests)
        .innerJoin(residents, eq(drugTests.resident_id, residents.id))
        .where(
          and(
            eq(drugTests.id, input.testId),
            eq(drugTests.resident_id, input.residentId),
            isNull(drugTests.deleted_at)
          )
        )
        .limit(1);

      if (!test) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Drug test not found' });
      }

      // In production, decrypt sensitive fields here
      return test;
    }),

  /**
   * Record a drug test
   * Part 2 protected - requires active consent to store results
   */
  create: part2Procedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      testType: z.enum(['urine', 'breathalyzer', 'oral_swab', 'blood', 'hair_follicle']),
      testDate: z.string(),
      result: z.enum(['negative', 'positive', 'dilute', 'invalid', 'refused', 'pending']).optional(),
      substancesDetected: z.array(z.string()).optional(),
      administeredBy: z.string().uuid().optional(),
      labName: z.string().optional(),
      labOrderNumber: z.string().optional(),
      isRandom: z.boolean().default(false),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // In production, encrypt sensitive fields here
      const [test] = await db
        .insert(drugTests)
        .values({
          org_id: input.orgId,
          resident_id: input.residentId,
          test_type: input.testType,
          test_date: new Date(input.testDate),
          result: input.result,
          substances_detected: input.substancesDetected ? JSON.stringify(input.substancesDetected) : null,
          administered_by: input.administeredBy ?? ctx.user!.id,
          lab_name: input.labName,
          lab_order_number: input.labOrderNumber,
          is_random: input.isRandom,
          notes: input.notes,
          created_by: ctx.user!.id,
        })
        .returning();

      return test;
    }),

  /**
   * Update drug test result
   * Part 2 protected - requires active consent
   */
  updateResult: part2Procedure
    .input(z.object({
      testId: z.string().uuid(),
      residentId: z.string().uuid(),
      result: z.enum(['negative', 'positive', 'dilute', 'invalid', 'refused', 'pending']),
      substancesDetected: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify test exists
      const [existing] = await db
        .select()
        .from(drugTests)
        .where(
          and(
            eq(drugTests.id, input.testId),
            eq(drugTests.resident_id, input.residentId),
            isNull(drugTests.deleted_at)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Drug test not found' });
      }

      // In production, encrypt sensitive fields here
      const [test] = await db
        .update(drugTests)
        .set({
          result: input.result,
          substances_detected: input.substancesDetected ? JSON.stringify(input.substancesDetected) : undefined,
          notes: input.notes,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(drugTests.id, input.testId))
        .returning();

      return test;
    }),

  /**
   * Delete drug test (soft delete)
   */
  delete: protectedProcedure
    .input(z.object({
      testId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [test] = await db
        .update(drugTests)
        .set({
          deleted_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(drugTests.id, input.testId),
            isNull(drugTests.deleted_at)
          )
        )
        .returning();

      if (!test) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Drug test not found' });
      }

      return { success: true };
    }),

  /**
   * Get drug test stats (non-sensitive aggregate data)
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
        eq(drugTests.org_id, input.orgId),
        isNull(drugTests.deleted_at),
      ];

      if (input.startDate) {
        conditions.push(gte(drugTests.test_date, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(drugTests.test_date, new Date(input.endDate)));
      }

      // Total tests
      const baseQuery = input.houseId
        ? db
            .select({
              total: sql<number>`count(*)::int`,
              negative: sql<number>`sum(case when ${drugTests.result} = 'negative' then 1 else 0 end)::int`,
              positive: sql<number>`sum(case when ${drugTests.result} = 'positive' then 1 else 0 end)::int`,
              pending: sql<number>`sum(case when ${drugTests.result} = 'pending' then 1 else 0 end)::int`,
              other: sql<number>`sum(case when ${drugTests.result} not in ('negative', 'positive', 'pending') then 1 else 0 end)::int`,
            })
            .from(drugTests)
            .innerJoin(
              admissions,
              and(
                eq(admissions.resident_id, drugTests.resident_id),
                eq(admissions.house_id, input.houseId)
              )
            )
            .where(and(...conditions))
        : db
            .select({
              total: sql<number>`count(*)::int`,
              negative: sql<number>`sum(case when ${drugTests.result} = 'negative' then 1 else 0 end)::int`,
              positive: sql<number>`sum(case when ${drugTests.result} = 'positive' then 1 else 0 end)::int`,
              pending: sql<number>`sum(case when ${drugTests.result} = 'pending' then 1 else 0 end)::int`,
              other: sql<number>`sum(case when ${drugTests.result} not in ('negative', 'positive', 'pending') then 1 else 0 end)::int`,
            })
            .from(drugTests)
            .where(and(...conditions));

      const [stats] = await baseQuery;

      // By test type
      const byType = input.houseId
        ? await db
            .select({
              test_type: drugTests.test_type,
              count: sql<number>`count(*)::int`,
            })
            .from(drugTests)
            .innerJoin(
              admissions,
              and(
                eq(admissions.resident_id, drugTests.resident_id),
                eq(admissions.house_id, input.houseId)
              )
            )
            .where(and(...conditions))
            .groupBy(drugTests.test_type)
        : await db
            .select({
              test_type: drugTests.test_type,
              count: sql<number>`count(*)::int`,
            })
            .from(drugTests)
            .where(and(...conditions))
            .groupBy(drugTests.test_type);

      const total = stats?.total ?? 0;
      const negative = stats?.negative ?? 0;
      const complianceRate = total > 0 ? Math.round((negative / total) * 100) : 100;

      return {
        total,
        negative,
        positive: stats?.positive ?? 0,
        pending: stats?.pending ?? 0,
        other: stats?.other ?? 0,
        complianceRate,
        byType: byType.reduce((acc, t) => {
          acc[t.test_type] = t.count;
          return acc;
        }, {} as Record<string, number>),
      };
    }),

  /**
   * Get recent tests for a resident (summary only, no results)
   */
  getResidentSummary: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      limit: z.number().int().min(1).max(20).default(10),
    }))
    .query(async ({ input }) => {
      const tests = await db
        .select({
          id: drugTests.id,
          test_type: drugTests.test_type,
          test_date: drugTests.test_date,
          result: drugTests.result,
          is_random: drugTests.is_random,
        })
        .from(drugTests)
        .where(
          and(
            eq(drugTests.org_id, input.orgId),
            eq(drugTests.resident_id, input.residentId),
            isNull(drugTests.deleted_at)
          )
        )
        .orderBy(desc(drugTests.test_date))
        .limit(input.limit);

      // Mask result details, only show pass/fail/pending
      return tests.map(t => ({
        id: t.id,
        test_type: t.test_type,
        test_date: t.test_date,
        is_random: t.is_random,
        status: t.result === 'negative'
          ? 'pass'
          : t.result === 'pending'
            ? 'pending'
            : t.result
              ? 'fail'
              : 'unknown',
      }));
    }),

  /**
   * Schedule random drug test
   */
  scheduleRandom: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid(),
      testDate: z.string(),
      testType: z.enum(['urine', 'breathalyzer', 'oral_swab', 'blood', 'hair_follicle']).default('urine'),
      residentCount: z.number().int().min(1).optional(), // If specified, randomly select this many residents
    }))
    .mutation(async ({ input, ctx }) => {
      // Get active residents in house via active admissions
      const activeResidents = await db
        .select({ id: residents.id })
        .from(residents)
        .innerJoin(
          admissions,
          and(
            eq(admissions.resident_id, residents.id),
            eq(admissions.status, 'active'),
            eq(admissions.house_id, input.houseId)
          )
        )
        .where(
          and(
            eq(residents.org_id, input.orgId),
            isNull(residents.deleted_at)
          )
        );

      if (activeResidents.length === 0) {
        return { scheduled: 0 };
      }

      // Randomly select residents if count specified
      let selectedResidents = activeResidents;
      if (input.residentCount && input.residentCount < activeResidents.length) {
        selectedResidents = activeResidents
          .sort(() => Math.random() - 0.5)
          .slice(0, input.residentCount);
      }

      // Create pending drug tests
      const tests = selectedResidents.map(r => ({
        org_id: input.orgId,
        resident_id: r.id,
        test_type: input.testType,
        test_date: new Date(input.testDate),
        result: 'pending' as const,
        is_random: true,
        created_by: ctx.user!.id,
      }));

      await db.insert(drugTests).values(tests);

      return { scheduled: tests.length };
    }),
});
