/**
 * Drug Test Schedule Router
 * Manages recurring and random drug test schedules
 *
 * Sprint 17-18: Advanced Ops
 * Source: docs/06_ROADMAP.md Sprint 21-22 (OPS-08)
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { drugTestSchedules, drugTestScheduleExecutions } from '../db/schema/operations-extended';
import { drugTests } from '../db/schema/operations';
import { residents, admissions } from '../db/schema/residents';
import { houses } from '../db/schema/orgs';
import { eq, and, isNull, sql, desc, gte, lte, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// Schedule type validation
const scheduleTypeSchema = z.enum(['random', 'scheduled', 'weekly', 'monthly']);
const testTypeSchema = z.enum(['urine', 'breathalyzer', 'oral_swab', 'blood', 'hair_follicle']);

export const drugTestScheduleRouter = router({
  /**
   * List all drug test schedules
   */
  list: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      scheduleType: scheduleTypeSchema.optional(),
      isActive: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(drugTestSchedules.org_id, input.orgId),
        isNull(drugTestSchedules.deleted_at),
      ];

      if (input.houseId) {
        conditions.push(eq(drugTestSchedules.house_id, input.houseId));
      }
      if (input.scheduleType) {
        conditions.push(eq(drugTestSchedules.schedule_type, input.scheduleType));
      }
      if (input.isActive !== undefined) {
        conditions.push(eq(drugTestSchedules.is_active, input.isActive));
      }

      const schedules = await db
        .select({
          id: drugTestSchedules.id,
          org_id: drugTestSchedules.org_id,
          house_id: drugTestSchedules.house_id,
          name: drugTestSchedules.name,
          description: drugTestSchedules.description,
          schedule_type: drugTestSchedules.schedule_type,
          test_type: drugTestSchedules.test_type,
          random_percentage: drugTestSchedules.random_percentage,
          is_active: drugTestSchedules.is_active,
          last_executed_at: drugTestSchedules.last_executed_at,
          next_execution_at: drugTestSchedules.next_execution_at,
          created_at: drugTestSchedules.created_at,
          house_name: houses.name,
        })
        .from(drugTestSchedules)
        .leftJoin(houses, eq(drugTestSchedules.house_id, houses.id))
        .where(and(...conditions))
        .orderBy(desc(drugTestSchedules.created_at))
        .limit(input.limit)
        .offset(input.offset);

      return schedules;
    }),

  /**
   * Get schedule by ID
   */
  getById: protectedProcedure
    .input(z.object({
      scheduleId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const [schedule] = await db
        .select({
          id: drugTestSchedules.id,
          org_id: drugTestSchedules.org_id,
          house_id: drugTestSchedules.house_id,
          name: drugTestSchedules.name,
          description: drugTestSchedules.description,
          schedule_type: drugTestSchedules.schedule_type,
          test_type: drugTestSchedules.test_type,
          random_percentage: drugTestSchedules.random_percentage,
          random_min_per_execution: drugTestSchedules.random_min_per_execution,
          random_max_per_execution: drugTestSchedules.random_max_per_execution,
          recurrence_rule: drugTestSchedules.recurrence_rule,
          day_of_week: drugTestSchedules.day_of_week,
          day_of_month: drugTestSchedules.day_of_month,
          time_of_day: drugTestSchedules.time_of_day,
          is_active: drugTestSchedules.is_active,
          notify_residents: drugTestSchedules.notify_residents,
          advance_notice_hours: drugTestSchedules.advance_notice_hours,
          last_executed_at: drugTestSchedules.last_executed_at,
          next_execution_at: drugTestSchedules.next_execution_at,
          created_at: drugTestSchedules.created_at,
          updated_at: drugTestSchedules.updated_at,
          house_name: houses.name,
        })
        .from(drugTestSchedules)
        .leftJoin(houses, eq(drugTestSchedules.house_id, houses.id))
        .where(
          and(
            eq(drugTestSchedules.id, input.scheduleId),
            isNull(drugTestSchedules.deleted_at)
          )
        )
        .limit(1);

      if (!schedule) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule not found' });
      }

      return schedule;
    }),

  /**
   * Create a drug test schedule
   */
  create: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      scheduleType: scheduleTypeSchema,
      testType: testTypeSchema.default('urine'),
      // Random schedule options
      randomPercentage: z.number().int().min(1).max(100).optional(),
      randomMinPerExecution: z.number().int().min(1).optional(),
      randomMaxPerExecution: z.number().int().min(1).optional(),
      // Scheduled options
      recurrenceRule: z.string().optional(),
      dayOfWeek: z.array(z.string()).optional(),
      dayOfMonth: z.array(z.number().int().min(1).max(31)).optional(),
      timeOfDay: z.string().optional(),
      // Notification options
      notifyResidents: z.boolean().default(false),
      advanceNoticeHours: z.number().int().min(0).optional(),
      // First execution
      nextExecutionAt: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validate schedule type specific fields
      if (input.scheduleType === 'random' && !input.randomPercentage) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Random schedules require randomPercentage',
        });
      }

      const [schedule] = await db
        .insert(drugTestSchedules)
        .values({
          org_id: input.orgId,
          house_id: input.houseId,
          name: input.name,
          description: input.description,
          schedule_type: input.scheduleType,
          test_type: input.testType,
          random_percentage: input.randomPercentage,
          random_min_per_execution: input.randomMinPerExecution,
          random_max_per_execution: input.randomMaxPerExecution,
          recurrence_rule: input.recurrenceRule,
          day_of_week: input.dayOfWeek ? JSON.stringify(input.dayOfWeek) : null,
          day_of_month: input.dayOfMonth ? JSON.stringify(input.dayOfMonth) : null,
          time_of_day: input.timeOfDay,
          notify_residents: input.notifyResidents,
          advance_notice_hours: input.advanceNoticeHours,
          next_execution_at: input.nextExecutionAt ? new Date(input.nextExecutionAt) : null,
          created_by: ctx.user!.id,
        })
        .returning();

      return schedule;
    }),

  /**
   * Update a drug test schedule
   */
  update: protectedProcedure
    .input(z.object({
      scheduleId: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      scheduleType: scheduleTypeSchema.optional(),
      testType: testTypeSchema.optional(),
      randomPercentage: z.number().int().min(1).max(100).optional(),
      randomMinPerExecution: z.number().int().min(1).optional(),
      randomMaxPerExecution: z.number().int().min(1).optional(),
      recurrenceRule: z.string().optional(),
      dayOfWeek: z.array(z.string()).optional(),
      dayOfMonth: z.array(z.number().int().min(1).max(31)).optional(),
      timeOfDay: z.string().optional(),
      isActive: z.boolean().optional(),
      notifyResidents: z.boolean().optional(),
      advanceNoticeHours: z.number().int().min(0).optional(),
      nextExecutionAt: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { scheduleId, ...updates } = input;

      const updateData: Record<string, unknown> = {
        updated_by: ctx.user!.id,
        updated_at: new Date(),
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.scheduleType !== undefined) updateData.schedule_type = updates.scheduleType;
      if (updates.testType !== undefined) updateData.test_type = updates.testType;
      if (updates.randomPercentage !== undefined) updateData.random_percentage = updates.randomPercentage;
      if (updates.randomMinPerExecution !== undefined) updateData.random_min_per_execution = updates.randomMinPerExecution;
      if (updates.randomMaxPerExecution !== undefined) updateData.random_max_per_execution = updates.randomMaxPerExecution;
      if (updates.recurrenceRule !== undefined) updateData.recurrence_rule = updates.recurrenceRule;
      if (updates.dayOfWeek !== undefined) updateData.day_of_week = JSON.stringify(updates.dayOfWeek);
      if (updates.dayOfMonth !== undefined) updateData.day_of_month = JSON.stringify(updates.dayOfMonth);
      if (updates.timeOfDay !== undefined) updateData.time_of_day = updates.timeOfDay;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.notifyResidents !== undefined) updateData.notify_residents = updates.notifyResidents;
      if (updates.advanceNoticeHours !== undefined) updateData.advance_notice_hours = updates.advanceNoticeHours;
      if (updates.nextExecutionAt !== undefined) updateData.next_execution_at = new Date(updates.nextExecutionAt);

      const [schedule] = await db
        .update(drugTestSchedules)
        .set(updateData)
        .where(
          and(
            eq(drugTestSchedules.id, scheduleId),
            isNull(drugTestSchedules.deleted_at)
          )
        )
        .returning();

      if (!schedule) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule not found' });
      }

      return schedule;
    }),

  /**
   * Delete a schedule (soft delete)
   */
  delete: protectedProcedure
    .input(z.object({
      scheduleId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [schedule] = await db
        .update(drugTestSchedules)
        .set({
          deleted_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(drugTestSchedules.id, input.scheduleId),
            isNull(drugTestSchedules.deleted_at)
          )
        )
        .returning();

      if (!schedule) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule not found' });
      }

      return { success: true };
    }),

  /**
   * Execute a schedule (trigger tests)
   */
  execute: protectedProcedure
    .input(z.object({
      scheduleId: z.string().uuid(),
      testDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get the schedule
      const [schedule] = await db
        .select()
        .from(drugTestSchedules)
        .where(
          and(
            eq(drugTestSchedules.id, input.scheduleId),
            isNull(drugTestSchedules.deleted_at)
          )
        )
        .limit(1);

      if (!schedule) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule not found' });
      }

      // Get active residents (house-specific or org-wide)
      const residentConditions = [
        eq(residents.org_id, schedule.org_id),
        isNull(residents.deleted_at),
      ];

      let activeResidents;
      if (schedule.house_id) {
        activeResidents = await db
          .select({ id: residents.id })
          .from(residents)
          .innerJoin(
            admissions,
            and(
              eq(admissions.resident_id, residents.id),
              eq(admissions.status, 'active'),
              eq(admissions.house_id, schedule.house_id)
            )
          )
          .where(and(...residentConditions));
      } else {
        activeResidents = await db
          .select({ id: residents.id })
          .from(residents)
          .innerJoin(
            admissions,
            and(
              eq(admissions.resident_id, residents.id),
              eq(admissions.status, 'active')
            )
          )
          .where(and(...residentConditions));
      }

      if (activeResidents.length === 0) {
        return { testsCreated: 0, message: 'No active residents found' };
      }

      // Determine how many to select
      let selectedResidents = activeResidents;
      if (schedule.schedule_type === 'random' && schedule.random_percentage) {
        // Random selection
        const targetCount = Math.max(
          schedule.random_min_per_execution ?? 1,
          Math.min(
            schedule.random_max_per_execution ?? activeResidents.length,
            Math.ceil(activeResidents.length * (schedule.random_percentage / 100))
          )
        );

        selectedResidents = activeResidents
          .sort(() => Math.random() - 0.5)
          .slice(0, targetCount);
      }

      const testDate = input.testDate ? new Date(input.testDate) : new Date();

      // Create execution log
      const [execution] = await db
        .insert(drugTestScheduleExecutions)
        .values({
          org_id: schedule.org_id,
          schedule_id: schedule.id,
          residents_selected: selectedResidents.length,
          status: 'in_progress',
          created_by: ctx.user!.id,
        })
        .returning();

      // Create pending drug tests
      const tests = selectedResidents.map(r => ({
        org_id: schedule.org_id,
        resident_id: r.id,
        test_type: schedule.test_type as 'urine' | 'breathalyzer' | 'oral_swab' | 'blood' | 'hair_follicle',
        test_date: testDate,
        result: 'pending' as const,
        is_random: schedule.schedule_type === 'random',
        created_by: ctx.user!.id,
      }));

      await db.insert(drugTests).values(tests);

      // Update schedule last executed
      await db
        .update(drugTestSchedules)
        .set({
          last_executed_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(drugTestSchedules.id, schedule.id));

      // Update execution status
      await db
        .update(drugTestScheduleExecutions)
        .set({ status: 'completed' })
        .where(eq(drugTestScheduleExecutions.id, execution.id));

      return {
        testsCreated: tests.length,
        executionId: execution.id,
      };
    }),

  /**
   * Get execution history for a schedule
   */
  getExecutions: protectedProcedure
    .input(z.object({
      scheduleId: z.string().uuid(),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const executions = await db
        .select()
        .from(drugTestScheduleExecutions)
        .where(eq(drugTestScheduleExecutions.schedule_id, input.scheduleId))
        .orderBy(desc(drugTestScheduleExecutions.executed_at))
        .limit(input.limit)
        .offset(input.offset);

      return executions;
    }),

  /**
   * Get upcoming scheduled tests (calendar view)
   */
  getUpcoming: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(drugTestSchedules.org_id, input.orgId),
        eq(drugTestSchedules.is_active, true),
        isNull(drugTestSchedules.deleted_at),
        gte(drugTestSchedules.next_execution_at, new Date(input.startDate)),
        lte(drugTestSchedules.next_execution_at, new Date(input.endDate)),
      ];

      if (input.houseId) {
        conditions.push(eq(drugTestSchedules.house_id, input.houseId));
      }

      const upcoming = await db
        .select({
          id: drugTestSchedules.id,
          name: drugTestSchedules.name,
          schedule_type: drugTestSchedules.schedule_type,
          test_type: drugTestSchedules.test_type,
          next_execution_at: drugTestSchedules.next_execution_at,
          house_id: drugTestSchedules.house_id,
          house_name: houses.name,
        })
        .from(drugTestSchedules)
        .leftJoin(houses, eq(drugTestSchedules.house_id, houses.id))
        .where(and(...conditions))
        .orderBy(asc(drugTestSchedules.next_execution_at));

      return upcoming;
    }),

  /**
   * Get drug test schedule stats
   */
  getStats: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(drugTestSchedules.org_id, input.orgId),
        isNull(drugTestSchedules.deleted_at),
      ];

      if (input.houseId) {
        conditions.push(eq(drugTestSchedules.house_id, input.houseId));
      }

      const [stats] = await db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`sum(case when ${drugTestSchedules.is_active} = true then 1 else 0 end)::int`,
          random: sql<number>`sum(case when ${drugTestSchedules.schedule_type} = 'random' then 1 else 0 end)::int`,
          scheduled: sql<number>`sum(case when ${drugTestSchedules.schedule_type} != 'random' then 1 else 0 end)::int`,
        })
        .from(drugTestSchedules)
        .where(and(...conditions));

      // Get last 30 days execution count
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [executionStats] = await db
        .select({
          executions: sql<number>`count(*)::int`,
          tests_created: sql<number>`sum(${drugTestScheduleExecutions.residents_selected})::int`,
        })
        .from(drugTestScheduleExecutions)
        .innerJoin(
          drugTestSchedules,
          eq(drugTestScheduleExecutions.schedule_id, drugTestSchedules.id)
        )
        .where(
          and(
            eq(drugTestSchedules.org_id, input.orgId),
            gte(drugTestScheduleExecutions.executed_at, thirtyDaysAgo),
            input.houseId ? eq(drugTestSchedules.house_id, input.houseId) : sql`true`
          )
        );

      return {
        total: stats?.total ?? 0,
        active: stats?.active ?? 0,
        random: stats?.random ?? 0,
        scheduled: stats?.scheduled ?? 0,
        last30Days: {
          executions: executionStats?.executions ?? 0,
          testsCreated: executionStats?.tests_created ?? 0,
        },
      };
    }),
});
