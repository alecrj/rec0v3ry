/**
 * Curfew Router
 * Curfew configuration, check-ins, and violation tracking
 *
 * Sprint 13-14: House Operations
 * Source: docs/06_ROADMAP.md Sprint 14 (OPS-06)
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { curfewConfigs } from '../db/schema/operations';
import { curfewCheckIns } from '../db/schema/operations-extended';
import { residents, admissions } from '../db/schema/residents';
import { houses } from '../db/schema/orgs';
import { users } from '../db/schema/users';
import { eq, and, isNull, sql, desc, asc, gte, lte, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const curfewRouter = router({
  /**
   * Get curfew config for a house
   */
  getHouseConfig: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const today = new Date().toISOString().split('T')[0]!;

      const [config] = await db
        .select()
        .from(curfewConfigs)
        .where(
          and(
            eq(curfewConfigs.org_id, input.orgId),
            eq(curfewConfigs.house_id, input.houseId),
            isNull(curfewConfigs.resident_id),
            lte(curfewConfigs.effective_from, today),
            or(
              isNull(curfewConfigs.effective_until),
              gte(curfewConfigs.effective_until, today)
            )
          )
        )
        .orderBy(desc(curfewConfigs.effective_from))
        .limit(1);

      return config;
    }),

  /**
   * Get curfew config for a specific resident (or house default)
   */
  getResidentConfig: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      houseId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const today = new Date().toISOString().split('T')[0]!;

      // First try resident-specific config
      const [residentConfig] = await db
        .select()
        .from(curfewConfigs)
        .where(
          and(
            eq(curfewConfigs.org_id, input.orgId),
            eq(curfewConfigs.resident_id, input.residentId),
            lte(curfewConfigs.effective_from, today),
            or(
              isNull(curfewConfigs.effective_until),
              gte(curfewConfigs.effective_until, today)
            )
          )
        )
        .orderBy(desc(curfewConfigs.effective_from))
        .limit(1);

      if (residentConfig) {
        return { config: residentConfig, source: 'resident' as const };
      }

      // Fall back to house default
      const [houseConfig] = await db
        .select()
        .from(curfewConfigs)
        .where(
          and(
            eq(curfewConfigs.org_id, input.orgId),
            eq(curfewConfigs.house_id, input.houseId),
            isNull(curfewConfigs.resident_id),
            lte(curfewConfigs.effective_from, today),
            or(
              isNull(curfewConfigs.effective_until),
              gte(curfewConfigs.effective_until, today)
            )
          )
        )
        .orderBy(desc(curfewConfigs.effective_from))
        .limit(1);

      return { config: houseConfig, source: 'house' as const };
    }),

  /**
   * Set curfew config for a house
   */
  setHouseConfig: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid(),
      weekdayCurfew: z.string(), // '22:00:00'
      weekendCurfew: z.string(),
      effectiveFrom: z.string(),
      effectiveUntil: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [config] = await db
        .insert(curfewConfigs)
        .values({
          org_id: input.orgId,
          house_id: input.houseId,
          resident_id: null,
          weekday_curfew: input.weekdayCurfew,
          weekend_curfew: input.weekendCurfew,
          effective_from: input.effectiveFrom,
          effective_until: input.effectiveUntil,
          notes: input.notes,
          created_by: ctx.user!.id,
        })
        .returning();

      return config;
    }),

  /**
   * Set curfew override for a specific resident
   */
  setResidentConfig: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      weekdayCurfew: z.string(),
      weekendCurfew: z.string(),
      effectiveFrom: z.string(),
      effectiveUntil: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [config] = await db
        .insert(curfewConfigs)
        .values({
          org_id: input.orgId,
          house_id: null,
          resident_id: input.residentId,
          weekday_curfew: input.weekdayCurfew,
          weekend_curfew: input.weekendCurfew,
          effective_from: input.effectiveFrom,
          effective_until: input.effectiveUntil,
          notes: input.notes,
          created_by: ctx.user!.id,
        })
        .returning();

      return config;
    }),

  /**
   * Record curfew check-in for a resident
   */
  checkIn: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      checkInDate: z.string(),
      expectedCurfewTime: z.string(),
      actualCheckInTime: z.string().optional(),
      wasOnTime: z.boolean().optional(),
      wasExcused: z.boolean().optional(),
      excuseReason: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const actualTime = input.actualCheckInTime ? new Date(input.actualCheckInTime) : new Date();
      const expectedTime = new Date(input.expectedCurfewTime);
      const wasOnTime = input.wasOnTime ?? actualTime <= expectedTime;

      const [checkIn] = await db
        .insert(curfewCheckIns)
        .values({
          org_id: input.orgId,
          resident_id: input.residentId,
          check_in_date: input.checkInDate,
          expected_curfew_time: expectedTime,
          actual_check_in_time: actualTime,
          was_on_time: wasOnTime,
          was_excused: input.wasExcused ?? false,
          excuse_reason: input.excuseReason,
          verified_by: ctx.user!.id,
          notes: input.notes,
        })
        .returning();

      return checkIn;
    }),

  /**
   * Batch check-in for all residents in a house
   */
  batchCheckIn: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid(),
      checkInDate: z.string(),
      checkIns: z.array(z.object({
        residentId: z.string().uuid(),
        expectedCurfewTime: z.string(),
        actualCheckInTime: z.string().optional(),
        wasOnTime: z.boolean().optional(),
        wasExcused: z.boolean().optional(),
        excuseReason: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const records = input.checkIns.map(c => {
        const actualTime = c.actualCheckInTime ? new Date(c.actualCheckInTime) : null;
        const expectedTime = new Date(c.expectedCurfewTime);
        const wasOnTime = c.wasOnTime ?? (actualTime ? actualTime <= expectedTime : null);

        return {
          org_id: input.orgId,
          resident_id: c.residentId,
          check_in_date: input.checkInDate,
          expected_curfew_time: expectedTime,
          actual_check_in_time: actualTime,
          was_on_time: wasOnTime,
          was_excused: c.wasExcused ?? false,
          excuse_reason: c.excuseReason,
          verified_by: ctx.user!.id,
        };
      });

      await db.insert(curfewCheckIns).values(records);

      return { success: true, count: records.length };
    }),

  /**
   * List curfew check-ins with filtering
   */
  listCheckIns: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      residentId: z.string().uuid().optional(),
      wasOnTime: z.boolean().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(curfewCheckIns.org_id, input.orgId)];

      if (input.residentId) {
        conditions.push(eq(curfewCheckIns.resident_id, input.residentId));
      }
      if (input.wasOnTime !== undefined) {
        conditions.push(eq(curfewCheckIns.was_on_time, input.wasOnTime));
      }
      if (input.startDate) {
        conditions.push(gte(curfewCheckIns.check_in_date, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(curfewCheckIns.check_in_date, input.endDate));
      }

      const result = await db
        .select({
          id: curfewCheckIns.id,
          resident_id: curfewCheckIns.resident_id,
          check_in_date: curfewCheckIns.check_in_date,
          expected_curfew_time: curfewCheckIns.expected_curfew_time,
          actual_check_in_time: curfewCheckIns.actual_check_in_time,
          was_on_time: curfewCheckIns.was_on_time,
          was_excused: curfewCheckIns.was_excused,
          excuse_reason: curfewCheckIns.excuse_reason,
          created_at: curfewCheckIns.created_at,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
          house_id: admissions.house_id,
        })
        .from(curfewCheckIns)
        .innerJoin(residents, eq(curfewCheckIns.resident_id, residents.id))
        .leftJoin(
          admissions,
          and(
            eq(admissions.resident_id, residents.id),
            eq(admissions.status, 'active')
          )
        )
        .where(and(...conditions))
        .orderBy(desc(curfewCheckIns.check_in_date), asc(residents.last_name))
        .limit(input.limit)
        .offset(input.offset);

      if (input.houseId) {
        return result.filter(c => c.house_id === input.houseId);
      }

      return result;
    }),

  /**
   * Get violations for a resident
   */
  getViolations: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid().optional(),
      houseId: z.string().uuid().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(curfewCheckIns.org_id, input.orgId),
        eq(curfewCheckIns.was_on_time, false),
        eq(curfewCheckIns.was_excused, false),
      ];

      if (input.residentId) {
        conditions.push(eq(curfewCheckIns.resident_id, input.residentId));
      }
      if (input.startDate) {
        conditions.push(gte(curfewCheckIns.check_in_date, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(curfewCheckIns.check_in_date, input.endDate));
      }

      const result = await db
        .select({
          id: curfewCheckIns.id,
          resident_id: curfewCheckIns.resident_id,
          check_in_date: curfewCheckIns.check_in_date,
          expected_curfew_time: curfewCheckIns.expected_curfew_time,
          actual_check_in_time: curfewCheckIns.actual_check_in_time,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
          house_id: admissions.house_id,
        })
        .from(curfewCheckIns)
        .innerJoin(residents, eq(curfewCheckIns.resident_id, residents.id))
        .leftJoin(
          admissions,
          and(
            eq(admissions.resident_id, residents.id),
            eq(admissions.status, 'active')
          )
        )
        .where(and(...conditions))
        .orderBy(desc(curfewCheckIns.check_in_date))
        .limit(input.limit);

      if (input.houseId) {
        return result.filter(c => c.house_id === input.houseId);
      }

      return result;
    }),

  /**
   * Get curfew stats for dashboard
   */
  getStats: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(curfewCheckIns.org_id, input.orgId)];

      if (input.startDate) {
        conditions.push(gte(curfewCheckIns.check_in_date, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(curfewCheckIns.check_in_date, input.endDate));
      }

      const baseQuery = input.houseId
        ? db
            .select({
              total: sql<number>`count(*)::int`,
              on_time: sql<number>`sum(case when was_on_time then 1 else 0 end)::int`,
              late: sql<number>`sum(case when not was_on_time and not was_excused then 1 else 0 end)::int`,
              excused: sql<number>`sum(case when was_excused then 1 else 0 end)::int`,
            })
            .from(curfewCheckIns)
            .innerJoin(
              admissions,
              and(
                eq(admissions.resident_id, curfewCheckIns.resident_id),
                eq(admissions.status, 'active'),
                eq(admissions.house_id, input.houseId)
              )
            )
            .where(and(...conditions))
        : db
            .select({
              total: sql<number>`count(*)::int`,
              on_time: sql<number>`sum(case when was_on_time then 1 else 0 end)::int`,
              late: sql<number>`sum(case when not was_on_time and not was_excused then 1 else 0 end)::int`,
              excused: sql<number>`sum(case when was_excused then 1 else 0 end)::int`,
            })
            .from(curfewCheckIns)
            .where(and(...conditions));

      const [stats] = await baseQuery;

      const total = stats?.total ?? 0;
      const onTime = stats?.on_time ?? 0;
      const complianceRate = total > 0 ? Math.round((onTime / total) * 100) : 100;

      return {
        total,
        onTime,
        late: stats?.late ?? 0,
        excused: stats?.excused ?? 0,
        complianceRate,
      };
    }),

  /**
   * Get tonight's expected check-ins for a house
   */
  getTonightCheckIns: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const today = new Date().toISOString().split('T')[0]!;

      // Get active residents in house via active admissions
      const activeResidents = await db
        .select({
          id: residents.id,
          first_name: residents.first_name,
          last_name: residents.last_name,
        })
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

      // Get today's check-ins
      const todayCheckIns = await db
        .select()
        .from(curfewCheckIns)
        .where(
          and(
            eq(curfewCheckIns.org_id, input.orgId),
            eq(curfewCheckIns.check_in_date, today)
          )
        );

      const checkInMap = new Map(todayCheckIns.map(c => [c.resident_id, c]));

      // Get house curfew config
      const isWeekend = [0, 6].includes(new Date().getDay());
      const [config] = await db
        .select()
        .from(curfewConfigs)
        .where(
          and(
            eq(curfewConfigs.org_id, input.orgId),
            eq(curfewConfigs.house_id, input.houseId),
            isNull(curfewConfigs.resident_id),
            lte(curfewConfigs.effective_from, today),
            or(
              isNull(curfewConfigs.effective_until),
              gte(curfewConfigs.effective_until, today)
            )
          )
        )
        .orderBy(desc(curfewConfigs.effective_from))
        .limit(1);

      const defaultCurfew = isWeekend
        ? config?.weekend_curfew
        : config?.weekday_curfew;

      return activeResidents.map(r => ({
        resident_id: r.id,
        first_name: r.first_name,
        last_name: r.last_name,
        expected_curfew: defaultCurfew,
        check_in: checkInMap.get(r.id) ?? null,
        status: checkInMap.has(r.id)
          ? checkInMap.get(r.id)!.was_on_time
            ? 'on_time'
            : checkInMap.get(r.id)!.was_excused
              ? 'excused'
              : 'late'
          : 'pending',
      }));
    }),
});
