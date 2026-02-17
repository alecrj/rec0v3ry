/**
 * Breach Incident Router
 *
 * HIPAA breach incident tracking and management.
 * Source: docs/04_COMPLIANCE.md Section 2.5 (Breach Notification)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { breachIncidents } from '../db/schema/compliance';
import { eq, and, desc } from 'drizzle-orm';
import { NotFoundError } from '@/lib/errors';

/**
 * Create breach incident input schema
 */
const createBreachSchema = z.object({
  breachType: z.enum([
    'unauthorized_access',
    'unauthorized_disclosure',
    'data_loss',
    'data_theft',
    'hacking',
    'phishing',
    'lost_device',
    'improper_disposal',
    'other',
  ]),
  riskLevel: z.enum(['low', 'medium', 'high']),
  description: z.string().min(1),
  discoveredDate: z.string().datetime(),
  occurredDate: z.string().datetime().optional(),
  affectedCount: z.number().int().min(0),
  dataCategoriesAffected: z.array(z.string()).min(1),
  affectedResidentIds: z.array(z.string().uuid()).optional(),
  cause: z.string().optional(),
  containmentActions: z.string().optional(),
});

/**
 * Update breach incident input schema
 */
const updateBreachSchema = z.object({
  id: z.string().uuid(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  occurredDate: z.string().datetime().optional(),
  cause: z.string().optional(),
  mitigationActions: z.string().optional(),
  investigationStatus: z.enum(['open', 'in_progress', 'closed']).optional(),
  investigationNotes: z.string().optional(),
  hhsNotified: z.boolean().optional(),
  hhsNotificationDate: z.string().refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: 'Date must be in YYYY-MM-DD format',
  }).optional(),
  mediaNotified: z.boolean().optional(),
  individualsNotified: z.boolean().optional(),
  notificationDate: z.string().refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: 'Date must be in YYYY-MM-DD format',
  }).optional(),
});

/**
 * List breach incidents input schema
 */
const listBreachesSchema = z.object({
  breachType: z.enum([
    'unauthorized_access',
    'unauthorized_disclosure',
    'data_loss',
    'data_theft',
    'hacking',
    'phishing',
    'lost_device',
    'improper_disposal',
    'other',
  ]).optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  investigationStatus: z.enum(['open', 'in_progress', 'closed']).optional(),
  limit: z.number().min(1).max(100).default(25),
  cursor: z.string().uuid().optional(),
});

/**
 * Breach incident router
 */
export const breachRouter = router({
  /**
   * Create a breach incident
   */
  create: protectedProcedure
    .meta({ permission: 'audit_log:read', resource: 'audit_log' })
    .input(createBreachSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const [breach] = await ctx.db
        .insert(breachIncidents)
        .values({
          org_id: orgId,
          breach_type: input.breachType,
          risk_level: input.riskLevel,
          description: input.description, // Should be encrypted
          discovered_at: new Date(input.discoveredDate),
          occurred_at: input.occurredDate ? new Date(input.occurredDate) : null,
          affected_resident_count: input.affectedCount.toString(),
          affected_resident_ids: input.affectedResidentIds || null, // Should be encrypted
          phi_involved: input.dataCategoriesAffected.join(', '), // Should be encrypted
          cause: input.cause || null, // Should be encrypted
          mitigation_actions: input.containmentActions || null, // Should be encrypted
          investigation_status: 'open',
          reported_by: ctx.user!.id,
          created_by: ctx.user!.id,
          updated_by: ctx.user!.id,
        })
        .returning();

      return breach;
    }),

  /**
   * List breach incidents
   */
  list: protectedProcedure
    .meta({ permission: 'audit_log:read', resource: 'audit_log' })
    .input(listBreachesSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const conditions = [eq(breachIncidents.org_id, orgId)];

      if (input.breachType) {
        conditions.push(eq(breachIncidents.breach_type, input.breachType));
      }

      if (input.riskLevel) {
        conditions.push(eq(breachIncidents.risk_level, input.riskLevel));
      }

      if (input.investigationStatus) {
        conditions.push(eq(breachIncidents.investigation_status, input.investigationStatus));
      }

      const items = await ctx.db.query.breachIncidents.findMany({
        where: and(...conditions),
        orderBy: [desc(breachIncidents.discovered_at)],
        limit: input.limit + 1,
        with: {
          reporter: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      });

      const hasMore = items.length > input.limit;
      const results = hasMore ? items.slice(0, input.limit) : items;

      return {
        items: results,
        nextCursor: hasMore ? results[results.length - 1]?.id : null,
      };
    }),

  /**
   * Get breach incident by ID
   */
  getById: protectedProcedure
    .meta({ permission: 'audit_log:read', resource: 'audit_log' })
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const breach = await ctx.db.query.breachIncidents.findFirst({
        where: and(
          eq(breachIncidents.id, input.id),
          eq(breachIncidents.org_id, orgId)
        ),
        with: {
          reporter: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      });

      if (!breach) {
        throw new NotFoundError('Breach incident', input.id);
      }

      return breach;
    }),

  /**
   * Update breach incident
   */
  update: protectedProcedure
    .meta({ permission: 'audit_log:read', resource: 'audit_log' })
    .input(updateBreachSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Verify breach exists
      const existing = await ctx.db.query.breachIncidents.findFirst({
        where: and(
          eq(breachIncidents.id, input.id),
          eq(breachIncidents.org_id, orgId)
        ),
      });

      if (!existing) {
        throw new NotFoundError('Breach incident', input.id);
      }

      // Build update object
      const updates: any = {
        updated_by: ctx.user!.id,
        updated_at: new Date(),
      };

      if (input.riskLevel !== undefined) {
        updates.risk_level = input.riskLevel;
      }

      if (input.occurredDate !== undefined) {
        updates.occurred_at = new Date(input.occurredDate);
      }

      if (input.cause !== undefined) {
        updates.cause = input.cause; // Should be encrypted
      }

      if (input.mitigationActions !== undefined) {
        updates.mitigation_actions = input.mitigationActions; // Should be encrypted
      }

      if (input.investigationStatus !== undefined) {
        updates.investigation_status = input.investigationStatus;
      }

      if (input.investigationNotes !== undefined) {
        updates.investigation_notes = input.investigationNotes; // Should be encrypted
      }

      if (input.hhsNotified !== undefined) {
        updates.hhs_notified = input.hhsNotified;
      }

      if (input.hhsNotificationDate !== undefined) {
        updates.hhs_notification_date = input.hhsNotificationDate;
      }

      if (input.mediaNotified !== undefined) {
        updates.media_notified = input.mediaNotified;
      }

      if (input.individualsNotified !== undefined) {
        updates.individuals_notified = input.individualsNotified;
      }

      if (input.notificationDate !== undefined) {
        updates.notification_date = input.notificationDate;
      }

      const [updated] = await ctx.db
        .update(breachIncidents)
        .set(updates)
        .where(eq(breachIncidents.id, input.id))
        .returning();

      return updated;
    }),
});
