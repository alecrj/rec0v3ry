/**
 * Meeting Router
 * Meeting scheduling, attendance tracking, and compliance monitoring
 *
 * Sprint 13-14: House Operations
 * Source: docs/06_ROADMAP.md Sprint 13 (OPS-03, OPS-04)
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { meetings, meetingAttendance } from '../db/schema/operations';
import { meetingRequirements, meetingTypes } from '../db/schema/operations-extended';
import { residents } from '../db/schema/residents';
import { houses } from '../db/schema/orgs';
import { users } from '../db/schema/users';
import { eq, and, isNull, sql, desc, asc, gte, lte, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const meetingRouter = router({
  /**
   * List meetings
   */
  list: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      meetingType: z.enum(['house_meeting', 'group_therapy', 'aa_na', 'life_skills', 'one_on_one', 'family_session', 'other']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(meetings.org_id, input.orgId),
        isNull(meetings.deleted_at),
      ];

      if (input.houseId) {
        conditions.push(eq(meetings.house_id, input.houseId));
      }
      if (input.meetingType) {
        conditions.push(eq(meetings.meeting_type, input.meetingType));
      }
      if (input.startDate) {
        conditions.push(gte(meetings.scheduled_at, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(meetings.scheduled_at, new Date(input.endDate)));
      }

      const result = await db
        .select({
          id: meetings.id,
          house_id: meetings.house_id,
          title: meetings.title,
          meeting_type: meetings.meeting_type,
          description: meetings.description,
          scheduled_at: meetings.scheduled_at,
          duration_minutes: meetings.duration_minutes,
          location: meetings.location,
          facilitator_id: meetings.facilitator_id,
          is_mandatory: meetings.is_mandatory,
          is_recurring: meetings.is_recurring,
          created_at: meetings.created_at,
          house_name: houses.name,
        })
        .from(meetings)
        .leftJoin(houses, eq(meetings.house_id, houses.id))
        .where(and(...conditions))
        .orderBy(desc(meetings.scheduled_at))
        .limit(input.limit)
        .offset(input.offset);

      return result;
    }),

  /**
   * Get meeting by ID with attendance
   */
  getById: protectedProcedure
    .input(z.object({
      meetingId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const [meeting] = await db
        .select()
        .from(meetings)
        .where(
          and(
            eq(meetings.id, input.meetingId),
            isNull(meetings.deleted_at)
          )
        )
        .limit(1);

      if (!meeting) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Meeting not found' });
      }

      // Get attendance
      const attendance = await db
        .select({
          id: meetingAttendance.id,
          resident_id: meetingAttendance.resident_id,
          attended: meetingAttendance.attended,
          checked_in_at: meetingAttendance.checked_in_at,
          excused: meetingAttendance.excused,
          excuse_reason: meetingAttendance.excuse_reason,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
        })
        .from(meetingAttendance)
        .innerJoin(residents, eq(meetingAttendance.resident_id, residents.id))
        .where(eq(meetingAttendance.meeting_id, input.meetingId));

      return {
        ...meeting,
        attendance,
      };
    }),

  /**
   * Create a meeting
   */
  create: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      title: z.string().min(1).max(255),
      meetingType: z.enum(['house_meeting', 'group_therapy', 'aa_na', 'life_skills', 'one_on_one', 'family_session', 'other']),
      description: z.string().optional(),
      scheduledAt: z.string(),
      durationMinutes: z.number().int().min(15).max(480).default(60),
      location: z.string().optional(),
      facilitatorId: z.string().uuid().optional(),
      isMandatory: z.boolean().default(false),
      isRecurring: z.boolean().default(false),
      recurrenceRule: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [meeting] = await db
        .insert(meetings)
        .values({
          org_id: input.orgId,
          house_id: input.houseId,
          title: input.title,
          meeting_type: input.meetingType,
          description: input.description,
          scheduled_at: new Date(input.scheduledAt),
          duration_minutes: input.durationMinutes,
          location: input.location,
          facilitator_id: input.facilitatorId,
          is_mandatory: input.isMandatory,
          is_recurring: input.isRecurring,
          recurrence_rule: input.recurrenceRule,
          created_by: ctx.user!.id,
        })
        .returning();

      return meeting;
    }),

  /**
   * Update a meeting
   */
  update: protectedProcedure
    .input(z.object({
      meetingId: z.string().uuid(),
      title: z.string().min(1).max(255).optional(),
      meetingType: z.enum(['house_meeting', 'group_therapy', 'aa_na', 'life_skills', 'one_on_one', 'family_session', 'other']).optional(),
      description: z.string().nullable().optional(),
      scheduledAt: z.string().optional(),
      durationMinutes: z.number().int().min(15).max(480).optional(),
      location: z.string().nullable().optional(),
      facilitatorId: z.string().uuid().nullable().optional(),
      isMandatory: z.boolean().optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { meetingId, meetingType, scheduledAt, durationMinutes, facilitatorId, isMandatory, ...rest } = input;

      const [meeting] = await db
        .update(meetings)
        .set({
          ...rest,
          meeting_type: meetingType,
          scheduled_at: scheduledAt ? new Date(scheduledAt) : undefined,
          duration_minutes: durationMinutes,
          facilitator_id: facilitatorId,
          is_mandatory: isMandatory,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(meetings.id, meetingId),
            isNull(meetings.deleted_at)
          )
        )
        .returning();

      if (!meeting) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Meeting not found' });
      }

      return meeting;
    }),

  /**
   * Delete a meeting
   */
  delete: protectedProcedure
    .input(z.object({
      meetingId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [meeting] = await db
        .update(meetings)
        .set({
          deleted_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(meetings.id, input.meetingId),
            isNull(meetings.deleted_at)
          )
        )
        .returning();

      if (!meeting) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Meeting not found' });
      }

      return { success: true };
    }),

  /**
   * Record meeting attendance (batch)
   * OPS-03: Log attendance by meeting type
   */
  recordAttendance: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      meetingId: z.string().uuid(),
      attendance: z.array(z.object({
        residentId: z.string().uuid(),
        attended: z.boolean(),
        excused: z.boolean().optional(),
        excuseReason: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      // Delete existing attendance for this meeting
      await db
        .delete(meetingAttendance)
        .where(eq(meetingAttendance.meeting_id, input.meetingId));

      // Insert new attendance records
      if (input.attendance.length > 0) {
        const records = input.attendance.map(a => ({
          org_id: input.orgId,
          meeting_id: input.meetingId,
          resident_id: a.residentId,
          attended: a.attended,
          checked_in_at: a.attended ? new Date() : null,
          excused: a.excused ?? false,
          excuse_reason: a.excuseReason,
        }));

        await db.insert(meetingAttendance).values(records);
      }

      return { success: true, count: input.attendance.length };
    }),

  /**
   * Quick check-in for a resident at a meeting
   */
  checkIn: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      meetingId: z.string().uuid(),
      residentId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      // Upsert attendance record
      const existing = await db
        .select()
        .from(meetingAttendance)
        .where(
          and(
            eq(meetingAttendance.meeting_id, input.meetingId),
            eq(meetingAttendance.resident_id, input.residentId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const [updated] = await db
          .update(meetingAttendance)
          .set({
            attended: true,
            checked_in_at: new Date(),
            updated_at: new Date(),
          })
          .where(eq(meetingAttendance.id, existing[0]!.id))
          .returning();
        return updated;
      }

      const [record] = await db
        .insert(meetingAttendance)
        .values({
          org_id: input.orgId,
          meeting_id: input.meetingId,
          resident_id: input.residentId,
          attended: true,
          checked_in_at: new Date(),
        })
        .returning();

      return record;
    }),

  /**
   * Get meeting requirements for a house
   * OPS-04: Per-house minimums
   */
  getRequirements: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const requirements = await db
        .select()
        .from(meetingRequirements)
        .where(
          and(
            eq(meetingRequirements.org_id, input.orgId),
            eq(meetingRequirements.house_id, input.houseId)
          )
        );

      return requirements;
    }),

  /**
   * Set meeting requirement
   */
  setRequirement: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid(),
      meetingType: z.enum(['house_meeting', 'group_therapy', 'aa_na', 'life_skills', 'one_on_one', 'family_session', 'other']),
      requiredPerWeek: z.number().int().min(0).max(14).optional(),
      requiredPerMonth: z.number().int().min(0).max(60).optional(),
      isMandatory: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      // Upsert requirement
      const existing = await db
        .select()
        .from(meetingRequirements)
        .where(
          and(
            eq(meetingRequirements.org_id, input.orgId),
            eq(meetingRequirements.house_id, input.houseId),
            eq(meetingRequirements.meeting_type, input.meetingType)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const [updated] = await db
          .update(meetingRequirements)
          .set({
            required_per_week: input.requiredPerWeek,
            required_per_month: input.requiredPerMonth,
            is_mandatory: input.isMandatory,
            updated_at: new Date(),
          })
          .where(eq(meetingRequirements.id, existing[0]!.id))
          .returning();
        return updated;
      }

      const [requirement] = await db
        .insert(meetingRequirements)
        .values({
          org_id: input.orgId,
          house_id: input.houseId,
          meeting_type: input.meetingType,
          required_per_week: input.requiredPerWeek,
          required_per_month: input.requiredPerMonth,
          is_mandatory: input.isMandatory,
        })
        .returning();

      return requirement;
    }),

  /**
   * Get resident meeting compliance
   * OPS-04: Per-resident compliance dashboard
   */
  getResidentCompliance: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      houseId: z.string().uuid(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => {
      // Get requirements for house
      const requirements = await db
        .select()
        .from(meetingRequirements)
        .where(
          and(
            eq(meetingRequirements.org_id, input.orgId),
            eq(meetingRequirements.house_id, input.houseId)
          )
        );

      // Get attendance for resident in date range
      const attendance = await db
        .select({
          meeting_type: meetings.meeting_type,
          count: sql<number>`count(*)::int`,
        })
        .from(meetingAttendance)
        .innerJoin(meetings, eq(meetingAttendance.meeting_id, meetings.id))
        .where(
          and(
            eq(meetingAttendance.resident_id, input.residentId),
            eq(meetingAttendance.attended, true),
            gte(meetings.scheduled_at, new Date(input.startDate)),
            lte(meetings.scheduled_at, new Date(input.endDate))
          )
        )
        .groupBy(meetings.meeting_type);

      // Calculate compliance per meeting type
      const compliance = requirements.map(req => {
        const attended = attendance.find(a => a.meeting_type === req.meeting_type)?.count ?? 0;
        const required = req.required_per_week ?? 0;

        // Calculate weeks in range
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);
        const weeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const totalRequired = required * weeks;

        const percentage = totalRequired > 0 ? Math.round((attended / totalRequired) * 100) : 100;
        const status: 'compliant' | 'at_risk' | 'non_compliant' =
          percentage >= 100 ? 'compliant' :
          percentage >= 75 ? 'at_risk' : 'non_compliant';

        return {
          meetingType: req.meeting_type,
          required: totalRequired,
          attended,
          percentage,
          status,
          isMandatory: req.is_mandatory,
        };
      });

      const overallStatus = compliance.some(c => c.status === 'non_compliant' && c.isMandatory)
        ? 'non_compliant'
        : compliance.some(c => c.status === 'at_risk' && c.isMandatory)
          ? 'at_risk'
          : 'compliant';

      return {
        compliance,
        overallStatus,
      };
    }),

  /**
   * Get attendance stats for dashboard
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
        eq(meetings.org_id, input.orgId),
        isNull(meetings.deleted_at),
      ];

      if (input.houseId) {
        conditions.push(eq(meetings.house_id, input.houseId));
      }
      if (input.startDate) {
        conditions.push(gte(meetings.scheduled_at, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(meetings.scheduled_at, new Date(input.endDate)));
      }

      // Total meetings
      const [meetingCount] = await db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(meetings)
        .where(and(...conditions));

      // Attendance stats
      const meetingIds = await db
        .select({ id: meetings.id })
        .from(meetings)
        .where(and(...conditions));

      let attendanceRate = 0;
      let totalAttended = 0;
      let totalExpected = 0;

      if (meetingIds.length > 0) {
        const ids = meetingIds.map(m => m.id);
        const [stats] = await db
          .select({
            total: sql<number>`count(*)::int`,
            attended: sql<number>`sum(case when attended then 1 else 0 end)::int`,
          })
          .from(meetingAttendance)
          .where(inArray(meetingAttendance.meeting_id, ids));

        totalExpected = stats?.total ?? 0;
        totalAttended = stats?.attended ?? 0;
        attendanceRate = totalExpected > 0
          ? Math.round((totalAttended / totalExpected) * 100)
          : 0;
      }

      // By meeting type
      const byType = await db
        .select({
          meeting_type: meetings.meeting_type,
          count: sql<number>`count(*)::int`,
        })
        .from(meetings)
        .where(and(...conditions))
        .groupBy(meetings.meeting_type);

      return {
        totalMeetings: meetingCount?.count ?? 0,
        totalAttended,
        totalExpected,
        attendanceRate,
        byType: byType.reduce((acc, t) => {
          acc[t.meeting_type] = t.count;
          return acc;
        }, {} as Record<string, number>),
      };
    }),
});
