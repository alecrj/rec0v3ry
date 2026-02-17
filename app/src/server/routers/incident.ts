/**
 * Incident Router
 * Incident reporting and tracking
 *
 * Sprint 13-14: House Operations
 * Source: docs/06_ROADMAP.md Sprint 14 (OPS-09)
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { incidents } from '../db/schema/operations';
import { residents } from '../db/schema/residents';
import { houses } from '../db/schema/orgs';
import { users } from '../db/schema/users';
import { eq, and, isNull, sql, desc, asc, gte, lte, or, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
// Note: Sensitive fields (description, action_taken) should be encrypted in production

export const incidentRouter = router({
  /**
   * List incidents with filtering
   */
  list: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      residentId: z.string().uuid().optional(),
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      incidentType: z.enum(['relapse', 'curfew_violation', 'guest_policy', 'contraband', 'violence', 'theft', 'property_damage', 'awol', 'other']).optional(),
      followUpRequired: z.boolean().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(incidents.org_id, input.orgId),
        isNull(incidents.deleted_at),
      ];

      if (input.houseId) {
        conditions.push(eq(incidents.house_id, input.houseId));
      }
      if (input.residentId) {
        conditions.push(eq(incidents.resident_id, input.residentId));
      }
      if (input.severity) {
        conditions.push(eq(incidents.severity, input.severity));
      }
      if (input.incidentType) {
        conditions.push(eq(incidents.incident_type, input.incidentType));
      }
      if (input.followUpRequired !== undefined) {
        conditions.push(eq(incidents.follow_up_required, input.followUpRequired));
      }
      if (input.startDate) {
        conditions.push(gte(incidents.occurred_at, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(incidents.occurred_at, new Date(input.endDate)));
      }

      const result = await db
        .select({
          id: incidents.id,
          house_id: incidents.house_id,
          resident_id: incidents.resident_id,
          incident_type: incidents.incident_type,
          severity: incidents.severity,
          occurred_at: incidents.occurred_at,
          location: incidents.location,
          reported_by: incidents.reported_by,
          police_involved: incidents.police_involved,
          follow_up_required: incidents.follow_up_required,
          created_at: incidents.created_at,
          house_name: houses.name,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
        })
        .from(incidents)
        .leftJoin(houses, eq(incidents.house_id, houses.id))
        .leftJoin(residents, eq(incidents.resident_id, residents.id))
        .where(and(...conditions))
        .orderBy(desc(incidents.occurred_at))
        .limit(input.limit)
        .offset(input.offset);

      return result;
    }),

  /**
   * Get incident by ID with full details
   */
  getById: protectedProcedure
    .input(z.object({
      incidentId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const [incident] = await db
        .select({
          id: incidents.id,
          org_id: incidents.org_id,
          house_id: incidents.house_id,
          resident_id: incidents.resident_id,
          incident_type: incidents.incident_type,
          severity: incidents.severity,
          occurred_at: incidents.occurred_at,
          location: incidents.location,
          description: incidents.description,
          action_taken: incidents.action_taken,
          reported_by: incidents.reported_by,
          witnesses: incidents.witnesses,
          police_involved: incidents.police_involved,
          police_report_number: incidents.police_report_number,
          follow_up_required: incidents.follow_up_required,
          follow_up_notes: incidents.follow_up_notes,
          created_at: incidents.created_at,
          updated_at: incidents.updated_at,
          house_name: houses.name,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
        })
        .from(incidents)
        .leftJoin(houses, eq(incidents.house_id, houses.id))
        .leftJoin(residents, eq(incidents.resident_id, residents.id))
        .where(
          and(
            eq(incidents.id, input.incidentId),
            isNull(incidents.deleted_at)
          )
        )
        .limit(1);

      if (!incident) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Incident not found' });
      }

      // In production, decrypt sensitive fields here
      return incident;
    }),

  /**
   * Create an incident report
   * OPS-09: Structured form
   */
  create: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      residentId: z.string().uuid().optional(),
      incidentType: z.enum(['relapse', 'curfew_violation', 'guest_policy', 'contraband', 'violence', 'theft', 'property_damage', 'awol', 'other']),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      occurredAt: z.string(),
      location: z.string().optional(),
      description: z.string().min(10),
      actionTaken: z.string().optional(),
      witnesses: z.array(z.string()).optional(),
      policeInvolved: z.boolean().default(false),
      policeReportNumber: z.string().optional(),
      followUpRequired: z.boolean().default(false),
      followUpNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // In production, encrypt sensitive fields here
      const encryptedDescription = input.description;
      const encryptedActionTaken = input.actionTaken ?? null;

      const [incident] = await db
        .insert(incidents)
        .values({
          org_id: input.orgId,
          house_id: input.houseId,
          resident_id: input.residentId,
          incident_type: input.incidentType,
          severity: input.severity,
          occurred_at: new Date(input.occurredAt),
          location: input.location,
          description: encryptedDescription,
          action_taken: encryptedActionTaken,
          reported_by: ctx.user!.id,
          witnesses: input.witnesses ? JSON.stringify(input.witnesses) : null,
          police_involved: input.policeInvolved,
          police_report_number: input.policeReportNumber,
          follow_up_required: input.followUpRequired,
          follow_up_notes: input.followUpNotes,
          created_by: ctx.user!.id,
        })
        .returning();

      return incident;
    }),

  /**
   * Update an incident
   */
  update: protectedProcedure
    .input(z.object({
      incidentId: z.string().uuid(),
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      location: z.string().nullable().optional(),
      description: z.string().min(10).optional(),
      actionTaken: z.string().nullable().optional(),
      witnesses: z.array(z.string()).nullable().optional(),
      policeInvolved: z.boolean().optional(),
      policeReportNumber: z.string().nullable().optional(),
      followUpRequired: z.boolean().optional(),
      followUpNotes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get existing incident to get orgId
      const [existing] = await db
        .select()
        .from(incidents)
        .where(eq(incidents.id, input.incidentId))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Incident not found' });
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date(),
        updated_by: ctx.user!.id,
      };

      if (input.severity !== undefined) {
        updateData.severity = input.severity;
      }
      if (input.location !== undefined) {
        updateData.location = input.location;
      }
      if (input.description !== undefined) {
        // In production, encrypt description here
        updateData.description = input.description;
      }
      if (input.actionTaken !== undefined) {
        // In production, encrypt action_taken here
        updateData.action_taken = input.actionTaken ?? null;
      }
      if (input.witnesses !== undefined) {
        updateData.witnesses = input.witnesses ? JSON.stringify(input.witnesses) : null;
      }
      if (input.policeInvolved !== undefined) {
        updateData.police_involved = input.policeInvolved;
      }
      if (input.policeReportNumber !== undefined) {
        updateData.police_report_number = input.policeReportNumber;
      }
      if (input.followUpRequired !== undefined) {
        updateData.follow_up_required = input.followUpRequired;
      }
      if (input.followUpNotes !== undefined) {
        updateData.follow_up_notes = input.followUpNotes;
      }

      const [incident] = await db
        .update(incidents)
        .set(updateData)
        .where(
          and(
            eq(incidents.id, input.incidentId),
            isNull(incidents.deleted_at)
          )
        )
        .returning();

      if (!incident) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Incident not found' });
      }

      return incident;
    }),

  /**
   * Mark follow-up as complete
   */
  completeFollowUp: protectedProcedure
    .input(z.object({
      incidentId: z.string().uuid(),
      followUpNotes: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [incident] = await db
        .update(incidents)
        .set({
          follow_up_required: false,
          follow_up_notes: input.followUpNotes,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(incidents.id, input.incidentId),
            isNull(incidents.deleted_at)
          )
        )
        .returning();

      if (!incident) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Incident not found' });
      }

      return incident;
    }),

  /**
   * Delete incident (soft delete)
   */
  delete: protectedProcedure
    .input(z.object({
      incidentId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [incident] = await db
        .update(incidents)
        .set({
          deleted_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(incidents.id, input.incidentId),
            isNull(incidents.deleted_at)
          )
        )
        .returning();

      if (!incident) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Incident not found' });
      }

      return { success: true };
    }),

  /**
   * Get incident stats
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
        eq(incidents.org_id, input.orgId),
        isNull(incidents.deleted_at),
      ];

      if (input.houseId) {
        conditions.push(eq(incidents.house_id, input.houseId));
      }
      if (input.startDate) {
        conditions.push(gte(incidents.occurred_at, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(incidents.occurred_at, new Date(input.endDate)));
      }

      // By severity
      const bySeverity = await db
        .select({
          severity: incidents.severity,
          count: sql<number>`count(*)::int`,
        })
        .from(incidents)
        .where(and(...conditions))
        .groupBy(incidents.severity);

      // By type
      const byType = await db
        .select({
          incident_type: incidents.incident_type,
          count: sql<number>`count(*)::int`,
        })
        .from(incidents)
        .where(and(...conditions))
        .groupBy(incidents.incident_type);

      // Pending follow-ups
      const [pendingFollowUps] = await db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(incidents)
        .where(and(...conditions, eq(incidents.follow_up_required, true)));

      // High/Critical incidents
      const [critical] = await db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(incidents)
        .where(
          and(
            ...conditions,
            or(
              eq(incidents.severity, 'high'),
              eq(incidents.severity, 'critical')
            )
          )
        );

      // Total
      const [total] = await db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(incidents)
        .where(and(...conditions));

      return {
        total: total?.count ?? 0,
        critical: critical?.count ?? 0,
        pendingFollowUps: pendingFollowUps?.count ?? 0,
        bySeverity: bySeverity.reduce((acc, s) => {
          acc[s.severity] = s.count;
          return acc;
        }, {} as Record<string, number>),
        byType: byType.reduce((acc, t) => {
          acc[t.incident_type] = t.count;
          return acc;
        }, {} as Record<string, number>),
      };
    }),

  /**
   * Get incidents requiring follow-up
   */
  getPendingFollowUps: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(incidents.org_id, input.orgId),
        eq(incidents.follow_up_required, true),
        isNull(incidents.deleted_at),
      ];

      if (input.houseId) {
        conditions.push(eq(incidents.house_id, input.houseId));
      }

      const result = await db
        .select({
          id: incidents.id,
          house_id: incidents.house_id,
          resident_id: incidents.resident_id,
          incident_type: incidents.incident_type,
          severity: incidents.severity,
          occurred_at: incidents.occurred_at,
          created_at: incidents.created_at,
          house_name: houses.name,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
        })
        .from(incidents)
        .leftJoin(houses, eq(incidents.house_id, houses.id))
        .leftJoin(residents, eq(incidents.resident_id, residents.id))
        .where(and(...conditions))
        .orderBy(
          desc(sql`case when severity = 'critical' then 0 when severity = 'high' then 1 when severity = 'medium' then 2 else 3 end`),
          asc(incidents.occurred_at)
        )
        .limit(input.limit);

      return result;
    }),

  /**
   * Get resident incident history
   */
  getResidentHistory: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      const result = await db
        .select({
          id: incidents.id,
          incident_type: incidents.incident_type,
          severity: incidents.severity,
          occurred_at: incidents.occurred_at,
          location: incidents.location,
          follow_up_required: incidents.follow_up_required,
        })
        .from(incidents)
        .where(
          and(
            eq(incidents.org_id, input.orgId),
            eq(incidents.resident_id, input.residentId),
            isNull(incidents.deleted_at)
          )
        )
        .orderBy(desc(incidents.occurred_at))
        .limit(input.limit);

      return result;
    }),
});
