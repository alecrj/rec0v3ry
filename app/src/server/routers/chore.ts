/**
 * Chore Router
 * Chore management, assignments, rotation, and verification
 *
 * Sprint 13-14: House Operations
 * Source: docs/06_ROADMAP.md Sprint 13 (OPS-01, OPS-02)
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { chores, choreAssignments } from '../db/schema/operations';
import { choreTemplates } from '../db/schema/operations-extended';
import { residents, admissions } from '../db/schema/residents';
import { houses } from '../db/schema/orgs';
import { users } from '../db/schema/users';
import { eq, and, isNull, sql, desc, asc, gte, lte, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const choreRouter = router({
  /**
   * List chores for a house
   */
  list: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      isActive: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(chores.org_id, input.orgId),
        isNull(chores.deleted_at),
      ];

      if (input.houseId) {
        conditions.push(eq(chores.house_id, input.houseId));
      }
      if (input.isActive !== undefined) {
        conditions.push(eq(chores.is_active, input.isActive));
      }

      const result = await db
        .select({
          id: chores.id,
          house_id: chores.house_id,
          title: chores.title,
          description: chores.description,
          area: chores.area,
          frequency: chores.frequency,
          estimated_duration_minutes: chores.estimated_duration_minutes,
          is_active: chores.is_active,
          created_at: chores.created_at,
          house_name: houses.name,
        })
        .from(chores)
        .innerJoin(houses, eq(chores.house_id, houses.id))
        .where(and(...conditions))
        .orderBy(asc(chores.area), asc(chores.title))
        .limit(input.limit)
        .offset(input.offset);

      return result;
    }),

  /**
   * Get chore by ID
   */
  getById: protectedProcedure
    .input(z.object({
      choreId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const [chore] = await db
        .select()
        .from(chores)
        .where(
          and(
            eq(chores.id, input.choreId),
            isNull(chores.deleted_at)
          )
        )
        .limit(1);

      if (!chore) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chore not found' });
      }

      return chore;
    }),

  /**
   * Create a chore
   */
  create: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid(),
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      area: z.string().optional(),
      frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
      estimatedDurationMinutes: z.number().int().min(1).max(480).optional(),
      instructions: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [chore] = await db
        .insert(chores)
        .values({
          org_id: input.orgId,
          house_id: input.houseId,
          title: input.title,
          description: input.description,
          area: input.area,
          frequency: input.frequency,
          estimated_duration_minutes: input.estimatedDurationMinutes,
          instructions: input.instructions,
          is_active: true,
          created_by: ctx.user!.id,
        })
        .returning();

      return chore;
    }),

  /**
   * Update a chore
   */
  update: protectedProcedure
    .input(z.object({
      choreId: z.string().uuid(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().nullable().optional(),
      area: z.string().nullable().optional(),
      frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).nullable().optional(),
      estimatedDurationMinutes: z.number().int().min(1).max(480).nullable().optional(),
      instructions: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { choreId, estimatedDurationMinutes, isActive, ...rest } = input;

      const [chore] = await db
        .update(chores)
        .set({
          ...rest,
          estimated_duration_minutes: estimatedDurationMinutes,
          is_active: isActive,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(chores.id, choreId),
            isNull(chores.deleted_at)
          )
        )
        .returning();

      if (!chore) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chore not found' });
      }

      return chore;
    }),

  /**
   * Soft delete a chore
   */
  delete: protectedProcedure
    .input(z.object({
      choreId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [chore] = await db
        .update(chores)
        .set({
          deleted_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(chores.id, input.choreId),
            isNull(chores.deleted_at)
          )
        )
        .returning();

      if (!chore) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chore not found' });
      }

      return { success: true };
    }),

  /**
   * List chore assignments
   */
  listAssignments: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      residentId: z.string().uuid().optional(),
      choreId: z.string().uuid().optional(),
      status: z.enum(['assigned', 'in_progress', 'completed', 'verified', 'failed', 'skipped']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(choreAssignments.org_id, input.orgId)];

      if (input.choreId) {
        conditions.push(eq(choreAssignments.chore_id, input.choreId));
      }
      if (input.residentId) {
        conditions.push(eq(choreAssignments.resident_id, input.residentId));
      }
      if (input.status) {
        conditions.push(eq(choreAssignments.status, input.status));
      }
      if (input.startDate) {
        conditions.push(gte(choreAssignments.due_date, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(choreAssignments.due_date, input.endDate));
      }

      // Filter by house via chore join
      let query = db
        .select({
          id: choreAssignments.id,
          chore_id: choreAssignments.chore_id,
          resident_id: choreAssignments.resident_id,
          assigned_date: choreAssignments.assigned_date,
          due_date: choreAssignments.due_date,
          status: choreAssignments.status,
          completed_at: choreAssignments.completed_at,
          verified_at: choreAssignments.verified_at,
          notes: choreAssignments.notes,
          chore_title: chores.title,
          chore_area: chores.area,
          house_id: chores.house_id,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
        })
        .from(choreAssignments)
        .innerJoin(chores, eq(choreAssignments.chore_id, chores.id))
        .innerJoin(residents, eq(choreAssignments.resident_id, residents.id))
        .where(and(...conditions))
        .orderBy(asc(choreAssignments.due_date), asc(chores.title))
        .limit(input.limit)
        .offset(input.offset);

      const result = await query;

      // Filter by house if specified
      if (input.houseId) {
        return result.filter(r => r.house_id === input.houseId);
      }

      return result;
    }),

  /**
   * Create chore assignment
   */
  createAssignment: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      choreId: z.string().uuid(),
      residentId: z.string().uuid(),
      assignedDate: z.string(),
      dueDate: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [assignment] = await db
        .insert(choreAssignments)
        .values({
          org_id: input.orgId,
          chore_id: input.choreId,
          resident_id: input.residentId,
          assigned_date: input.assignedDate,
          due_date: input.dueDate,
          notes: input.notes,
          status: 'assigned',
          created_by: ctx.user!.id,
        })
        .returning();

      return assignment;
    }),

  /**
   * Update chore assignment status
   */
  updateAssignment: protectedProcedure
    .input(z.object({
      assignmentId: z.string().uuid(),
      status: z.enum(['assigned', 'in_progress', 'completed', 'verified', 'failed', 'skipped']).optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date(),
        updated_by: ctx.user!.id,
      };

      if (input.status !== undefined) {
        updateData.status = input.status;
        if (input.status === 'completed') {
          updateData.completed_at = new Date();
        } else if (input.status === 'verified') {
          updateData.verified_at = new Date();
          updateData.verified_by = ctx.user!.id;
        }
      }
      if (input.notes !== undefined) {
        updateData.notes = input.notes;
      }

      const [assignment] = await db
        .update(choreAssignments)
        .set(updateData)
        .where(eq(choreAssignments.id, input.assignmentId))
        .returning();

      if (!assignment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assignment not found' });
      }

      return assignment;
    }),

  /**
   * Verify chore completion (house manager)
   */
  verifyAssignment: protectedProcedure
    .input(z.object({
      assignmentId: z.string().uuid(),
      verified: z.boolean(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [assignment] = await db
        .update(choreAssignments)
        .set({
          status: input.verified ? 'verified' : 'failed',
          verified_at: new Date(),
          verified_by: ctx.user!.id,
          notes: input.notes,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(choreAssignments.id, input.assignmentId))
        .returning();

      if (!assignment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assignment not found' });
      }

      return assignment;
    }),

  /**
   * Bulk create weekly chore rotation
   * OPS-02: Auto-rotate weekly/biweekly
   */
  generateWeeklyRotation: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid(),
      weekStartDate: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get active chores for house
      const houseChores = await db
        .select()
        .from(chores)
        .where(
          and(
            eq(chores.org_id, input.orgId),
            eq(chores.house_id, input.houseId),
            eq(chores.is_active, true),
            isNull(chores.deleted_at)
          )
        );

      // Get active residents in house via active admissions
      const activeResidents = await db
        .select({
          id: residents.id,
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

      if (houseChores.length === 0 || activeResidents.length === 0) {
        return { assignments: 0 };
      }

      // Get previous assignments to ensure rotation
      const lastWeek = new Date(input.weekStartDate);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekStr = lastWeek.toISOString().split('T')[0];

      const previousAssignments = await db
        .select({
          chore_id: choreAssignments.chore_id,
          resident_id: choreAssignments.resident_id,
        })
        .from(choreAssignments)
        .where(
          and(
            eq(choreAssignments.org_id, input.orgId),
            gte(choreAssignments.assigned_date, lastWeekStr!),
            lte(choreAssignments.assigned_date, input.weekStartDate)
          )
        );

      // Build map of last assigned resident per chore
      const lastAssigned = new Map<string, string>();
      for (const pa of previousAssignments) {
        lastAssigned.set(pa.chore_id, pa.resident_id);
      }

      // Rotate chores - each resident gets different chore than last week
      const assignments: Array<{
        org_id: string;
        chore_id: string;
        resident_id: string;
        assigned_date: string;
        due_date: string;
        status: 'assigned';
        created_by: string;
      }> = [];

      const weekEnd = new Date(input.weekStartDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0]!;

      // Simple round-robin rotation
      const residentIds = activeResidents.map(r => r.id);
      let residentIndex = 0;

      for (const chore of houseChores) {
        const lastResidentId = lastAssigned.get(chore.id);
        let assignedResidentId: string;

        // Try to assign to a different resident than last week
        if (lastResidentId) {
          const lastIndex = residentIds.indexOf(lastResidentId);
          assignedResidentId = residentIds[(lastIndex + 1) % residentIds.length]!;
        } else {
          assignedResidentId = residentIds[residentIndex % residentIds.length]!;
          residentIndex++;
        }

        assignments.push({
          org_id: input.orgId,
          chore_id: chore.id,
          resident_id: assignedResidentId,
          assigned_date: input.weekStartDate,
          due_date: weekEndStr,
          status: 'assigned',
          created_by: ctx.user!.id,
        });
      }

      if (assignments.length > 0) {
        await db.insert(choreAssignments).values(assignments);
      }

      return { assignments: assignments.length };
    }),

  /**
   * Get chore completion stats for dashboard
   */
  getStats: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(choreAssignments.org_id, input.orgId)];

      if (input.startDate) {
        conditions.push(gte(choreAssignments.due_date, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(choreAssignments.due_date, input.endDate));
      }

      const stats = await db
        .select({
          status: choreAssignments.status,
          count: sql<number>`count(*)::int`,
        })
        .from(choreAssignments)
        .innerJoin(chores, eq(choreAssignments.chore_id, chores.id))
        .where(
          input.houseId
            ? and(...conditions, eq(chores.house_id, input.houseId))
            : and(...conditions)
        )
        .groupBy(choreAssignments.status);

      const result: Record<string, number> = {
        assigned: 0,
        in_progress: 0,
        completed: 0,
        verified: 0,
        failed: 0,
        skipped: 0,
      };

      for (const row of stats) {
        result[row.status] = row.count;
      }

      const total = Object.values(result).reduce((sum, n) => sum + n, 0);
      const completionRate = total > 0
        ? Math.round(((result.verified! + result.completed!) / total) * 100)
        : 0;

      return {
        ...result,
        total,
        completionRate,
      };
    }),
});
