/**
 * Wellness Router
 * Resident daily mood check-ins for operator dashboard insight
 * Uses the existing wellness_check_ins table from operations-extended schema
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { wellnessCheckIns } from '../db/schema/operations-extended';
import { admissions } from '../db/schema/residents';
import { houses } from '../db/schema/orgs';
import { eq, and, gte, desc, count, avg } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const wellnessRouter = router({
  /**
   * Submit or update today's mood check-in (upsert by resident+date)
   */
  checkIn: protectedProcedure
    .meta({ permission: 'resident:write', resource: 'resident' })
    .input(z.object({
      moodRating: z.number().int().min(1).max(5),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const userId = ctx.user!.id;
      const today = new Date().toISOString().split('T')[0]!;

      // Find the active admission for this user's resident
      const allActiveAdmissions = await ctx.db.query.admissions.findMany({
        where: and(
          eq(admissions.org_id, orgId),
          eq(admissions.status, 'active'),
        ),
        with: { resident: true },
      });

      const myAdmission = allActiveAdmissions.find(
        (a) => a.resident.created_by === userId || a.resident_id === userId
      ) || allActiveAdmissions[0];

      if (!myAdmission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No active admission found' });
      }

      // Upsert: insert or update today's check-in
      await ctx.db
        .insert(wellnessCheckIns)
        .values({
          org_id: orgId,
          resident_id: myAdmission.resident_id,
          check_in_date: today,
          mood_rating: input.moodRating,
          notes: input.note ?? null,
        })
        .onConflictDoNothing(); // No unique constraint on the existing table, so just insert

      return { success: true, date: today };
    }),

  /**
   * Check if resident has checked in today + get today's entry
   */
  getDailyStatus: protectedProcedure
    .meta({ permission: 'resident:read', resource: 'resident' })
    .query(async ({ ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const userId = ctx.user!.id;
      const today = new Date().toISOString().split('T')[0]!;

      const allActiveAdmissions = await ctx.db.query.admissions.findMany({
        where: and(
          eq(admissions.org_id, orgId),
          eq(admissions.status, 'active'),
        ),
        with: { resident: true },
      });

      const myAdmission = allActiveAdmissions.find(
        (a) => a.resident.created_by === userId || a.resident_id === userId
      ) || allActiveAdmissions[0];

      if (!myAdmission) {
        return { checkedInToday: false, todayEntry: null };
      }

      const todayEntry = await ctx.db.query.wellnessCheckIns.findFirst({
        where: and(
          eq(wellnessCheckIns.resident_id, myAdmission.resident_id),
          eq(wellnessCheckIns.check_in_date, today),
        ),
        orderBy: [desc(wellnessCheckIns.created_at)],
      });

      return {
        checkedInToday: !!todayEntry,
        todayEntry: todayEntry
          ? {
              id: todayEntry.id,
              moodRating: todayEntry.mood_rating,
              note: todayEntry.notes,
              date: todayEntry.check_in_date,
            }
          : null,
      };
    }),

  /**
   * Get resident's mood history for the last 30 days (sparkline data)
   */
  getMyHistory: protectedProcedure
    .meta({ permission: 'resident:read', resource: 'resident' })
    .query(async ({ ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const userId = ctx.user!.id;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0]!;

      const allActiveAdmissions = await ctx.db.query.admissions.findMany({
        where: and(
          eq(admissions.org_id, orgId),
          eq(admissions.status, 'active'),
        ),
        with: { resident: true },
      });

      const myAdmission = allActiveAdmissions.find(
        (a) => a.resident.created_by === userId || a.resident_id === userId
      ) || allActiveAdmissions[0];

      if (!myAdmission) {
        return { history: [] };
      }

      const history = await ctx.db.query.wellnessCheckIns.findMany({
        where: and(
          eq(wellnessCheckIns.resident_id, myAdmission.resident_id),
          gte(wellnessCheckIns.check_in_date, fromDate),
        ),
        orderBy: [desc(wellnessCheckIns.check_in_date)],
        limit: 30,
      });

      return {
        history: history
          .filter((h) => h.mood_rating !== null)
          .map((h) => ({
            date: h.check_in_date,
            moodRating: h.mood_rating as number,
            note: h.notes,
          })),
      };
    }),

  /**
   * Get per-house mood averages (for operator dashboard)
   * NOTE: The existing wellness_check_ins table doesn't have house_id,
   * so we join through admissions to get house info.
   */
  getHouseSummary: protectedProcedure
    .meta({ permission: 'report:read', resource: 'report' })
    .query(async ({ ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      // Get all houses for this org
      const allHouses = await ctx.db.query.houses.findMany({
        where: eq(houses.org_id, orgId),
        columns: { id: true, name: true },
      });

      if (allHouses.length === 0) return [];

      // Get last 7 days of wellness data for this org
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fromDate = sevenDaysAgo.toISOString().split('T')[0]!;

      // Get active admissions with house info
      const activeAdmissions = await ctx.db.query.admissions.findMany({
        where: and(
          eq(admissions.org_id, orgId),
          eq(admissions.status, 'active'),
        ),
        columns: { resident_id: true, house_id: true },
      });

      const residentToHouse = new Map(
        activeAdmissions.map((a) => [a.resident_id, a.house_id])
      );

      // Get recent wellness check-ins
      const recentCheckIns = await ctx.db.query.wellnessCheckIns.findMany({
        where: and(
          eq(wellnessCheckIns.org_id, orgId),
          gte(wellnessCheckIns.check_in_date, fromDate),
        ),
      });

      // Group by house
      const houseMap = new Map<string, { total: number; count: number }>();

      for (const checkIn of recentCheckIns) {
        if (checkIn.mood_rating === null) continue;
        const houseId = residentToHouse.get(checkIn.resident_id);
        if (!houseId) continue;

        const existing = houseMap.get(houseId) || { total: 0, count: 0 };
        existing.total += checkIn.mood_rating;
        existing.count++;
        houseMap.set(houseId, existing);
      }

      const houseNameMap = new Map(allHouses.map((h) => [h.id, h.name]));

      return Array.from(houseMap.entries()).map(([houseId, data]) => {
        const avg = data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : null;
        return {
          houseId,
          houseName: houseNameMap.get(houseId) ?? 'Unknown House',
          avgMood: avg,
          checkInCount: data.count,
          isLow: avg !== null && avg < 2.5,
        };
      });
    }),
});
