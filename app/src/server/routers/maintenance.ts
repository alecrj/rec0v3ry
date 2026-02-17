/**
 * Maintenance Request Router
 * Manages maintenance requests from residents and staff
 *
 * Sprint 17-18: Advanced Ops
 * Source: docs/06_ROADMAP.md Sprint 21-22 (OPS-11)
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { maintenanceRequests } from '../db/schema/operations-extended';
import { houses } from '../db/schema/orgs';
import { residents } from '../db/schema/residents';
import { users } from '../db/schema/users';
import { eq, and, isNull, sql, desc, gte, lte, or, ilike } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// Request priority validation
const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
// Request status validation
const statusSchema = z.enum(['open', 'in_progress', 'completed', 'cancelled']);

export const maintenanceRouter = router({
  /**
   * List maintenance requests
   */
  list: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      status: statusSchema.optional(),
      priority: prioritySchema.optional(),
      assignedTo: z.string().uuid().optional(),
      search: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(maintenanceRequests.org_id, input.orgId),
      ];

      if (input.houseId) {
        conditions.push(eq(maintenanceRequests.house_id, input.houseId));
      }
      if (input.status) {
        conditions.push(eq(maintenanceRequests.status, input.status));
      }
      if (input.priority) {
        conditions.push(eq(maintenanceRequests.priority, input.priority));
      }
      if (input.assignedTo) {
        conditions.push(eq(maintenanceRequests.assigned_to, input.assignedTo));
      }
      if (input.search) {
        conditions.push(
          or(
            ilike(maintenanceRequests.title, `%${input.search}%`),
            ilike(maintenanceRequests.description, `%${input.search}%`)
          )!
        );
      }

      const requests = await db
        .select({
          id: maintenanceRequests.id,
          org_id: maintenanceRequests.org_id,
          house_id: maintenanceRequests.house_id,
          title: maintenanceRequests.title,
          description: maintenanceRequests.description,
          location: maintenanceRequests.location,
          priority: maintenanceRequests.priority,
          status: maintenanceRequests.status,
          assigned_to: maintenanceRequests.assigned_to,
          reported_by_resident_id: maintenanceRequests.reported_by_resident_id,
          reported_by_user_id: maintenanceRequests.reported_by_user_id,
          completed_at: maintenanceRequests.completed_at,
          created_at: maintenanceRequests.created_at,
          updated_at: maintenanceRequests.updated_at,
          house_name: houses.name,
        })
        .from(maintenanceRequests)
        .innerJoin(houses, eq(maintenanceRequests.house_id, houses.id))
        .where(and(...conditions))
        .orderBy(
          // Priority order: urgent, high, medium, low
          sql`case ${maintenanceRequests.priority}
            when 'urgent' then 1
            when 'high' then 2
            when 'medium' then 3
            when 'low' then 4
          end`,
          desc(maintenanceRequests.created_at)
        )
        .limit(input.limit)
        .offset(input.offset);

      return requests;
    }),

  /**
   * Get maintenance request by ID
   */
  getById: protectedProcedure
    .input(z.object({
      requestId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const [request] = await db
        .select({
          id: maintenanceRequests.id,
          org_id: maintenanceRequests.org_id,
          house_id: maintenanceRequests.house_id,
          title: maintenanceRequests.title,
          description: maintenanceRequests.description,
          location: maintenanceRequests.location,
          priority: maintenanceRequests.priority,
          status: maintenanceRequests.status,
          assigned_to: maintenanceRequests.assigned_to,
          reported_by_resident_id: maintenanceRequests.reported_by_resident_id,
          reported_by_user_id: maintenanceRequests.reported_by_user_id,
          completed_at: maintenanceRequests.completed_at,
          completion_notes: maintenanceRequests.completion_notes,
          created_at: maintenanceRequests.created_at,
          updated_at: maintenanceRequests.updated_at,
          house_name: houses.name,
        })
        .from(maintenanceRequests)
        .innerJoin(houses, eq(maintenanceRequests.house_id, houses.id))
        .where(eq(maintenanceRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Maintenance request not found' });
      }

      // Get reporter info
      let reporterName: string | null = null;
      let reporterType: 'resident' | 'staff' | null = null;

      if (request.reported_by_resident_id) {
        const [resident] = await db
          .select({ first_name: residents.first_name, last_name: residents.last_name })
          .from(residents)
          .where(eq(residents.id, request.reported_by_resident_id))
          .limit(1);
        if (resident) {
          reporterName = `${resident.first_name} ${resident.last_name}`;
          reporterType = 'resident';
        }
      } else if (request.reported_by_user_id) {
        const [user] = await db
          .select({ first_name: users.first_name, last_name: users.last_name })
          .from(users)
          .where(eq(users.id, request.reported_by_user_id))
          .limit(1);
        if (user) {
          reporterName = `${user.first_name} ${user.last_name}`;
          reporterType = 'staff';
        }
      }

      // Get assignee info
      let assigneeName: string | null = null;
      if (request.assigned_to) {
        const [assignee] = await db
          .select({ first_name: users.first_name, last_name: users.last_name })
          .from(users)
          .where(eq(users.id, request.assigned_to))
          .limit(1);
        if (assignee) {
          assigneeName = `${assignee.first_name} ${assignee.last_name}`;
        }
      }

      return {
        ...request,
        reporter_name: reporterName,
        reporter_type: reporterType,
        assignee_name: assigneeName,
      };
    }),

  /**
   * Create a maintenance request
   */
  create: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid(),
      title: z.string().min(1).max(200),
      description: z.string().min(1).max(2000),
      location: z.string().max(200).optional(),
      priority: prioritySchema.default('medium'),
      reportedByResidentId: z.string().uuid().optional(),
      reportedByUserId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Ensure at least one reporter is specified
      if (!input.reportedByResidentId && !input.reportedByUserId) {
        // Default to current user as reporter
        input.reportedByUserId = ctx.user!.id;
      }

      const [request] = await db
        .insert(maintenanceRequests)
        .values({
          org_id: input.orgId,
          house_id: input.houseId,
          title: input.title,
          description: input.description,
          location: input.location,
          priority: input.priority,
          reported_by_resident_id: input.reportedByResidentId,
          reported_by_user_id: input.reportedByUserId,
          status: 'open',
        })
        .returning();

      return request;
    }),

  /**
   * Update a maintenance request
   */
  update: protectedProcedure
    .input(z.object({
      requestId: z.string().uuid(),
      title: z.string().min(1).max(200).optional(),
      description: z.string().min(1).max(2000).optional(),
      location: z.string().max(200).optional(),
      priority: prioritySchema.optional(),
      status: statusSchema.optional(),
      assignedTo: z.string().uuid().nullable().optional(),
      completionNotes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input }) => {
      const { requestId, ...updates } = input;

      const updateData: Record<string, unknown> = {
        updated_at: new Date(),
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;
      if (updates.completionNotes !== undefined) updateData.completion_notes = updates.completionNotes;

      // If status is completed, set completed_at
      if (updates.status === 'completed') {
        updateData.completed_at = new Date();
      }

      const [request] = await db
        .update(maintenanceRequests)
        .set(updateData)
        .where(eq(maintenanceRequests.id, requestId))
        .returning();

      if (!request) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Maintenance request not found' });
      }

      return request;
    }),

  /**
   * Assign a maintenance request to a staff member
   */
  assign: protectedProcedure
    .input(z.object({
      requestId: z.string().uuid(),
      assignedTo: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const [request] = await db
        .update(maintenanceRequests)
        .set({
          assigned_to: input.assignedTo,
          status: 'in_progress',
          updated_at: new Date(),
        })
        .where(eq(maintenanceRequests.id, input.requestId))
        .returning();

      if (!request) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Maintenance request not found' });
      }

      return request;
    }),

  /**
   * Complete a maintenance request
   */
  complete: protectedProcedure
    .input(z.object({
      requestId: z.string().uuid(),
      completionNotes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input }) => {
      const [request] = await db
        .update(maintenanceRequests)
        .set({
          status: 'completed',
          completed_at: new Date(),
          completion_notes: input.completionNotes,
          updated_at: new Date(),
        })
        .where(eq(maintenanceRequests.id, input.requestId))
        .returning();

      if (!request) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Maintenance request not found' });
      }

      return request;
    }),

  /**
   * Cancel a maintenance request
   */
  cancel: protectedProcedure
    .input(z.object({
      requestId: z.string().uuid(),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      const [request] = await db
        .update(maintenanceRequests)
        .set({
          status: 'cancelled',
          completion_notes: input.reason,
          updated_at: new Date(),
        })
        .where(eq(maintenanceRequests.id, input.requestId))
        .returning();

      if (!request) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Maintenance request not found' });
      }

      return request;
    }),

  /**
   * Get maintenance request statistics
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
        eq(maintenanceRequests.org_id, input.orgId),
      ];

      if (input.houseId) {
        conditions.push(eq(maintenanceRequests.house_id, input.houseId));
      }
      if (input.startDate) {
        conditions.push(gte(maintenanceRequests.created_at, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(maintenanceRequests.created_at, new Date(input.endDate)));
      }

      const [stats] = await db
        .select({
          total: sql<number>`count(*)::int`,
          open: sql<number>`sum(case when ${maintenanceRequests.status} = 'open' then 1 else 0 end)::int`,
          in_progress: sql<number>`sum(case when ${maintenanceRequests.status} = 'in_progress' then 1 else 0 end)::int`,
          completed: sql<number>`sum(case when ${maintenanceRequests.status} = 'completed' then 1 else 0 end)::int`,
          cancelled: sql<number>`sum(case when ${maintenanceRequests.status} = 'cancelled' then 1 else 0 end)::int`,
          urgent: sql<number>`sum(case when ${maintenanceRequests.priority} = 'urgent' then 1 else 0 end)::int`,
          high: sql<number>`sum(case when ${maintenanceRequests.priority} = 'high' then 1 else 0 end)::int`,
        })
        .from(maintenanceRequests)
        .where(and(...conditions));

      // Average resolution time (for completed requests)
      const [avgResolution] = await db
        .select({
          avg_hours: sql<number>`avg(extract(epoch from (${maintenanceRequests.completed_at} - ${maintenanceRequests.created_at})) / 3600)::numeric(10,2)`,
        })
        .from(maintenanceRequests)
        .where(
          and(
            ...conditions,
            eq(maintenanceRequests.status, 'completed')
          )
        );

      return {
        total: stats?.total ?? 0,
        open: stats?.open ?? 0,
        inProgress: stats?.in_progress ?? 0,
        completed: stats?.completed ?? 0,
        cancelled: stats?.cancelled ?? 0,
        urgent: stats?.urgent ?? 0,
        high: stats?.high ?? 0,
        avgResolutionHours: avgResolution?.avg_hours ?? null,
      };
    }),

  /**
   * Get requests for a specific resident (for PWA)
   */
  getByResident: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      const requests = await db
        .select({
          id: maintenanceRequests.id,
          title: maintenanceRequests.title,
          description: maintenanceRequests.description,
          location: maintenanceRequests.location,
          priority: maintenanceRequests.priority,
          status: maintenanceRequests.status,
          created_at: maintenanceRequests.created_at,
          completed_at: maintenanceRequests.completed_at,
          house_name: houses.name,
        })
        .from(maintenanceRequests)
        .innerJoin(houses, eq(maintenanceRequests.house_id, houses.id))
        .where(
          and(
            eq(maintenanceRequests.org_id, input.orgId),
            eq(maintenanceRequests.reported_by_resident_id, input.residentId)
          )
        )
        .orderBy(desc(maintenanceRequests.created_at))
        .limit(input.limit);

      return requests;
    }),

  /**
   * Get open requests by house (for dashboard)
   */
  getOpenByHouse: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const byHouse = await db
        .select({
          house_id: maintenanceRequests.house_id,
          house_name: houses.name,
          open_count: sql<number>`count(*)::int`,
          urgent_count: sql<number>`sum(case when ${maintenanceRequests.priority} = 'urgent' then 1 else 0 end)::int`,
        })
        .from(maintenanceRequests)
        .innerJoin(houses, eq(maintenanceRequests.house_id, houses.id))
        .where(
          and(
            eq(maintenanceRequests.org_id, input.orgId),
            or(
              eq(maintenanceRequests.status, 'open'),
              eq(maintenanceRequests.status, 'in_progress')
            )
          )
        )
        .groupBy(maintenanceRequests.house_id, houses.name)
        .orderBy(desc(sql`sum(case when ${maintenanceRequests.priority} = 'urgent' then 1 else 0 end)`));

      return byHouse;
    }),
});
