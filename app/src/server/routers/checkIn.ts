/**
 * Check-In Router
 * Daily check-ins and wellness tracking
 *
 * Sprint 13-14: House Operations
 * Source: docs/06_ROADMAP.md Sprint 13 (OPS-12)
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { dailyCheckIns } from '../db/schema/operations';
import { wellnessCheckIns } from '../db/schema/operations-extended';
import { residents, admissions } from '../db/schema/residents';
import { eq, and, isNull, sql, desc, asc, gte, lte } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
// Note: Sensitive fields (notes) should be encrypted in production

export const checkInRouter = router({
  /**
   * Record daily check-in for a resident
   * OPS-12: House monitor marks present/absent
   */
  recordDaily: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      checkInDate: z.string(),
      moodRating: z.number().int().min(1).max(10).optional(),
      cravingsRating: z.number().int().min(1).max(10).optional(),
      sleepHours: z.number().int().min(0).max(24).optional(),
      attendedMeeting: z.boolean().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Check if check-in already exists for this date
      const existing = await db
        .select()
        .from(dailyCheckIns)
        .where(
          and(
            eq(dailyCheckIns.resident_id, input.residentId),
            eq(dailyCheckIns.check_in_date, input.checkInDate)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing check-in
        const [updated] = await db
          .update(dailyCheckIns)
          .set({
            mood_rating: input.moodRating,
            cravings_rating: input.cravingsRating,
            sleep_hours: input.sleepHours,
            attended_meeting: input.attendedMeeting,
            notes: input.notes,
            updated_at: new Date(),
          })
          .where(eq(dailyCheckIns.id, existing[0]!.id))
          .returning();

        return updated;
      }

      // Create new check-in
      const [checkIn] = await db
        .insert(dailyCheckIns)
        .values({
          org_id: input.orgId,
          resident_id: input.residentId,
          check_in_date: input.checkInDate,
          mood_rating: input.moodRating,
          cravings_rating: input.cravingsRating,
          sleep_hours: input.sleepHours,
          attended_meeting: input.attendedMeeting,
          notes: input.notes,
        })
        .returning();

      return checkIn;
    }),

  /**
   * Batch daily check-in for a house
   */
  batchRecordDaily: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid(),
      checkInDate: z.string(),
      checkIns: z.array(z.object({
        residentId: z.string().uuid(),
        present: z.boolean(),
        moodRating: z.number().int().min(1).max(10).optional(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      // Get existing check-ins for this date
      const existingCheckIns = await db
        .select()
        .from(dailyCheckIns)
        .where(
          and(
            eq(dailyCheckIns.org_id, input.orgId),
            eq(dailyCheckIns.check_in_date, input.checkInDate)
          )
        );

      const existingMap = new Map(existingCheckIns.map(c => [c.resident_id, c]));

      const toInsert: Array<{
        org_id: string;
        resident_id: string;
        check_in_date: string;
        mood_rating?: number;
        notes?: string;
      }> = [];

      const toUpdate: Array<{
        id: string;
        mood_rating?: number;
        notes?: string;
      }> = [];

      for (const checkIn of input.checkIns) {
        if (!checkIn.present) continue; // Only record present residents

        const existing = existingMap.get(checkIn.residentId);
        if (existing) {
          toUpdate.push({
            id: existing.id,
            mood_rating: checkIn.moodRating,
            notes: checkIn.notes,
          });
        } else {
          toInsert.push({
            org_id: input.orgId,
            resident_id: checkIn.residentId,
            check_in_date: input.checkInDate,
            mood_rating: checkIn.moodRating,
            notes: checkIn.notes,
          });
        }
      }

      // Insert new check-ins
      if (toInsert.length > 0) {
        await db.insert(dailyCheckIns).values(toInsert);
      }

      // Update existing check-ins
      for (const update of toUpdate) {
        await db
          .update(dailyCheckIns)
          .set({
            mood_rating: update.mood_rating,
            notes: update.notes,
            updated_at: new Date(),
          })
          .where(eq(dailyCheckIns.id, update.id));
      }

      return {
        inserted: toInsert.length,
        updated: toUpdate.length,
      };
    }),

  /**
   * Record wellness check-in (more detailed)
   */
  recordWellness: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      checkInDate: z.string(),
      moodRating: z.number().int().min(1).max(10).optional(),
      stressLevel: z.number().int().min(1).max(10).optional(),
      sleepQuality: z.number().int().min(1).max(10).optional(),
      physicalHealth: z.number().int().min(1).max(10).optional(),
      cravingsIntensity: z.number().int().min(1).max(10).optional(),
      supportNeeded: z.boolean().default(false),
      notes: z.string().optional(),
      followUpRequired: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      // Check for existing
      const existing = await db
        .select()
        .from(wellnessCheckIns)
        .where(
          and(
            eq(wellnessCheckIns.resident_id, input.residentId),
            eq(wellnessCheckIns.check_in_date, input.checkInDate)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Wellness check-in already exists for this date',
        });
      }

      const [checkIn] = await db
        .insert(wellnessCheckIns)
        .values({
          org_id: input.orgId,
          resident_id: input.residentId,
          check_in_date: input.checkInDate,
          mood_rating: input.moodRating,
          stress_level: input.stressLevel,
          sleep_quality: input.sleepQuality,
          physical_health: input.physicalHealth,
          cravings_intensity: input.cravingsIntensity,
          support_needed: input.supportNeeded,
          notes: input.notes,
          follow_up_required: input.followUpRequired,
        })
        .returning();

      return checkIn;
    }),

  /**
   * List daily check-ins
   */
  listDaily: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      residentId: z.string().uuid().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(dailyCheckIns.org_id, input.orgId)];

      if (input.residentId) {
        conditions.push(eq(dailyCheckIns.resident_id, input.residentId));
      }
      if (input.startDate) {
        conditions.push(gte(dailyCheckIns.check_in_date, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(dailyCheckIns.check_in_date, input.endDate));
      }

      // Join through admissions to get house_id
      const result = await db
        .select({
          id: dailyCheckIns.id,
          resident_id: dailyCheckIns.resident_id,
          check_in_date: dailyCheckIns.check_in_date,
          mood_rating: dailyCheckIns.mood_rating,
          cravings_rating: dailyCheckIns.cravings_rating,
          sleep_hours: dailyCheckIns.sleep_hours,
          attended_meeting: dailyCheckIns.attended_meeting,
          created_at: dailyCheckIns.created_at,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
          house_id: admissions.house_id,
        })
        .from(dailyCheckIns)
        .innerJoin(residents, eq(dailyCheckIns.resident_id, residents.id))
        .leftJoin(
          admissions,
          and(
            eq(admissions.resident_id, residents.id),
            eq(admissions.status, 'active')
          )
        )
        .where(and(...conditions))
        .orderBy(desc(dailyCheckIns.check_in_date), asc(residents.last_name))
        .limit(input.limit)
        .offset(input.offset);

      if (input.houseId) {
        return result.filter(c => c.house_id === input.houseId);
      }

      return result;
    }),

  /**
   * List wellness check-ins
   */
  listWellness: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      residentId: z.string().uuid().optional(),
      supportNeeded: z.boolean().optional(),
      followUpRequired: z.boolean().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(wellnessCheckIns.org_id, input.orgId)];

      if (input.residentId) {
        conditions.push(eq(wellnessCheckIns.resident_id, input.residentId));
      }
      if (input.supportNeeded !== undefined) {
        conditions.push(eq(wellnessCheckIns.support_needed, input.supportNeeded));
      }
      if (input.followUpRequired !== undefined) {
        conditions.push(eq(wellnessCheckIns.follow_up_required, input.followUpRequired));
      }
      if (input.startDate) {
        conditions.push(gte(wellnessCheckIns.check_in_date, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(wellnessCheckIns.check_in_date, input.endDate));
      }

      const result = await db
        .select({
          id: wellnessCheckIns.id,
          resident_id: wellnessCheckIns.resident_id,
          check_in_date: wellnessCheckIns.check_in_date,
          mood_rating: wellnessCheckIns.mood_rating,
          stress_level: wellnessCheckIns.stress_level,
          sleep_quality: wellnessCheckIns.sleep_quality,
          physical_health: wellnessCheckIns.physical_health,
          cravings_intensity: wellnessCheckIns.cravings_intensity,
          support_needed: wellnessCheckIns.support_needed,
          follow_up_required: wellnessCheckIns.follow_up_required,
          created_at: wellnessCheckIns.created_at,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
          house_id: admissions.house_id,
        })
        .from(wellnessCheckIns)
        .innerJoin(residents, eq(wellnessCheckIns.resident_id, residents.id))
        .leftJoin(
          admissions,
          and(
            eq(admissions.resident_id, residents.id),
            eq(admissions.status, 'active')
          )
        )
        .where(and(...conditions))
        .orderBy(desc(wellnessCheckIns.check_in_date), asc(residents.last_name))
        .limit(input.limit)
        .offset(input.offset);

      if (input.houseId) {
        return result.filter(c => c.house_id === input.houseId);
      }

      return result;
    }),

  /**
   * Get today's check-in status for a house
   */
  getTodayStatus: protectedProcedure
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
        .from(dailyCheckIns)
        .where(
          and(
            eq(dailyCheckIns.org_id, input.orgId),
            eq(dailyCheckIns.check_in_date, today)
          )
        );

      const checkInMap = new Map(todayCheckIns.map(c => [c.resident_id, c]));

      const residents_status = activeResidents.map(r => ({
        resident_id: r.id,
        first_name: r.first_name,
        last_name: r.last_name,
        checked_in: checkInMap.has(r.id),
        check_in: checkInMap.get(r.id) ?? null,
      }));

      const checkedInCount = residents_status.filter(r => r.checked_in).length;

      return {
        date: today,
        total_residents: activeResidents.length,
        checked_in: checkedInCount,
        pending: activeResidents.length - checkedInCount,
        residents: residents_status,
      };
    }),

  /**
   * Get check-in stats for dashboard
   */
  getStats: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(dailyCheckIns.org_id, input.orgId)];

      if (input.startDate) {
        conditions.push(gte(dailyCheckIns.check_in_date, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(dailyCheckIns.check_in_date, input.endDate));
      }

      const baseQuery = input.houseId
        ? db
            .select({
              total: sql<number>`count(*)::int`,
              with_mood: sql<number>`sum(case when ${dailyCheckIns.mood_rating} is not null then 1 else 0 end)::int`,
              avg_mood: sql<number>`avg(${dailyCheckIns.mood_rating})::numeric(3,1)`,
              avg_cravings: sql<number>`avg(${dailyCheckIns.cravings_rating})::numeric(3,1)`,
              avg_sleep: sql<number>`avg(${dailyCheckIns.sleep_hours})::numeric(3,1)`,
            })
            .from(dailyCheckIns)
            .innerJoin(
              admissions,
              and(
                eq(admissions.resident_id, dailyCheckIns.resident_id),
                eq(admissions.house_id, input.houseId)
              )
            )
            .where(and(...conditions))
        : db
            .select({
              total: sql<number>`count(*)::int`,
              with_mood: sql<number>`sum(case when ${dailyCheckIns.mood_rating} is not null then 1 else 0 end)::int`,
              avg_mood: sql<number>`avg(${dailyCheckIns.mood_rating})::numeric(3,1)`,
              avg_cravings: sql<number>`avg(${dailyCheckIns.cravings_rating})::numeric(3,1)`,
              avg_sleep: sql<number>`avg(${dailyCheckIns.sleep_hours})::numeric(3,1)`,
            })
            .from(dailyCheckIns)
            .where(and(...conditions));

      const [stats] = await baseQuery;

      // Residents needing support (from wellness check-ins)
      const wellnessConditions = [eq(wellnessCheckIns.org_id, input.orgId)];
      if (input.startDate) {
        wellnessConditions.push(gte(wellnessCheckIns.check_in_date, input.startDate));
      }
      if (input.endDate) {
        wellnessConditions.push(lte(wellnessCheckIns.check_in_date, input.endDate));
      }

      const [needingSupport] = input.houseId
        ? await db
            .select({
              count: sql<number>`count(distinct ${wellnessCheckIns.resident_id})::int`,
            })
            .from(wellnessCheckIns)
            .innerJoin(
              admissions,
              and(
                eq(admissions.resident_id, wellnessCheckIns.resident_id),
                eq(admissions.house_id, input.houseId)
              )
            )
            .where(
              and(
                ...wellnessConditions,
                eq(wellnessCheckIns.support_needed, true)
              )
            )
        : await db
            .select({
              count: sql<number>`count(distinct ${wellnessCheckIns.resident_id})::int`,
            })
            .from(wellnessCheckIns)
            .where(
              and(
                ...wellnessConditions,
                eq(wellnessCheckIns.support_needed, true)
              )
            );

      return {
        totalCheckIns: stats?.total ?? 0,
        withMoodRating: stats?.with_mood ?? 0,
        averageMood: stats?.avg_mood ?? null,
        averageCravings: stats?.avg_cravings ?? null,
        averageSleep: stats?.avg_sleep ?? null,
        residentsNeedingSupport: needingSupport?.count ?? 0,
      };
    }),

  /**
   * Get resident check-in history
   */
  getResidentHistory: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      days: z.number().int().min(7).max(90).default(30),
    }))
    .query(async ({ input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      const startDateStr = startDate.toISOString().split('T')[0]!;

      const checkIns = await db
        .select()
        .from(dailyCheckIns)
        .where(
          and(
            eq(dailyCheckIns.org_id, input.orgId),
            eq(dailyCheckIns.resident_id, input.residentId),
            gte(dailyCheckIns.check_in_date, startDateStr)
          )
        )
        .orderBy(asc(dailyCheckIns.check_in_date));

      return checkIns;
    }),

  /**
   * Get residents needing follow-up
   */
  getNeedingFollowUp: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(wellnessCheckIns.org_id, input.orgId),
        eq(wellnessCheckIns.follow_up_required, true),
      ];

      const result = await db
        .select({
          id: wellnessCheckIns.id,
          resident_id: wellnessCheckIns.resident_id,
          check_in_date: wellnessCheckIns.check_in_date,
          mood_rating: wellnessCheckIns.mood_rating,
          cravings_intensity: wellnessCheckIns.cravings_intensity,
          support_needed: wellnessCheckIns.support_needed,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
          house_id: admissions.house_id,
        })
        .from(wellnessCheckIns)
        .innerJoin(residents, eq(wellnessCheckIns.resident_id, residents.id))
        .leftJoin(
          admissions,
          and(
            eq(admissions.resident_id, residents.id),
            eq(admissions.status, 'active')
          )
        )
        .where(and(...conditions))
        .orderBy(desc(wellnessCheckIns.check_in_date));

      if (input.houseId) {
        return result.filter(c => c.house_id === input.houseId);
      }

      return result;
    }),
});
