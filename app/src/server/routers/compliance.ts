/**
 * Compliance Router
 *
 * Disclosure tracking, audit log queries, and breach management.
 * Source: docs/04_COMPLIANCE.md Section 3 (42 CFR Part 2 Requirements)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { consentDisclosures, breachIncidents } from '../db/schema/compliance';
import { auditLogs } from '../db/schema/audit';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { hasPermission } from '../middleware/rbac';
import { ForbiddenError } from '@/lib/errors';

const listDisclosuresSchema = z.object({
  residentId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(25),
  cursor: z.string().uuid().optional(),
});

const queryAuditSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sensitivityLevel: z.enum(['public', 'internal', 'confidential', 'part2_protected']).optional(),
  limit: z.number().min(1).max(100).default(25),
});

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
  description: z.string().min(10),
  occurredAt: z.string().datetime().optional(),
  affectedResidentIds: z.array(z.string().uuid()).optional(),
  phiInvolved: z.string(),
  cause: z.string().optional(),
});

export const complianceRouter = router({
  disclosure: router({
    list: protectedProcedure
      .meta({ permission: 'disclosure:read', resource: 'disclosure' })
      .input(listDisclosuresSchema)
      .query(async ({ ctx, input }) => {
        const orgId = (ctx as any).orgId as string;
        const userRole = ctx.user?.role as string;
        if (!hasPermission(userRole as any, 'read', 'disclosure')) {
          throw new ForbiddenError('Insufficient permissions to view disclosures');
        }

        const conditions = [eq(consentDisclosures.org_id, orgId)];
        if (input.residentId) conditions.push(eq(consentDisclosures.resident_id, input.residentId));
        if (input.startDate) conditions.push(gte(consentDisclosures.disclosed_at, new Date(input.startDate)));
        if (input.endDate) conditions.push(lte(consentDisclosures.disclosed_at, new Date(input.endDate)));

        const items = await ctx.db.query.consentDisclosures.findMany({
          where: and(...conditions),
          orderBy: [desc(consentDisclosures.disclosed_at)],
          limit: input.limit + 1,
        });

        const hasMore = items.length > input.limit;
        const results = hasMore ? items.slice(0, input.limit) : items;

        return {
          items: results,
          nextCursor: hasMore ? results[results.length - 1]?.id : null,
          totalCount: items.length,
        };
      }),
  }),

  audit: router({
    query: protectedProcedure
      .meta({ permission: 'audit_log:read', resource: 'audit_log' })
      .input(queryAuditSchema)
      .query(async ({ ctx, input }) => {
        const orgId = (ctx as any).orgId as string;
        const userRole = ctx.user?.role as string;
        const allowedRoles = ['platform_admin', 'org_owner'];
        if (!allowedRoles.includes(userRole)) {
          throw new ForbiddenError('Only compliance officers can access audit logs');
        }

        const conditions = [eq(auditLogs.org_id, orgId)];
        if (input.userId) conditions.push(eq(auditLogs.actor_user_id, input.userId));
        if (input.action) conditions.push(eq(auditLogs.action, input.action as any));
        if (input.resourceType) conditions.push(eq(auditLogs.resource_type, input.resourceType));
        if (input.resourceId) conditions.push(eq(auditLogs.resource_id, input.resourceId));
        if (input.startDate) conditions.push(gte(auditLogs.created_at, new Date(input.startDate)));
        if (input.endDate) conditions.push(lte(auditLogs.created_at, new Date(input.endDate)));
        if (input.sensitivityLevel) conditions.push(eq(auditLogs.sensitivity_level, input.sensitivityLevel));

        const items = await ctx.db.query.auditLogs.findMany({
          where: and(...conditions),
          orderBy: [desc(auditLogs.created_at)],
          limit: input.limit + 1,
        });

        const hasMore = items.length > input.limit;
        const results = hasMore ? items.slice(0, input.limit) : items;

        return { items: results, nextCursor: hasMore ? results[results.length - 1]?.id : null };
      }),
  }),

  breach: router({
    create: protectedProcedure
      .meta({ permission: 'disclosure:create', resource: 'disclosure' })
      .input(createBreachSchema)
      .mutation(async ({ ctx, input }) => {
        const orgId = (ctx as any).orgId as string;
        const userRole = ctx.user?.role as string;
        if (!['org_owner', 'org_admin'].includes(userRole)) {
          throw new ForbiddenError('Insufficient permissions to create breach incident');
        }

        const [breach] = await ctx.db
          .insert(breachIncidents)
          .values({
            org_id: orgId,
            breach_type: input.breachType,
            risk_level: input.riskLevel,
            discovered_at: new Date(),
            occurred_at: input.occurredAt ? new Date(input.occurredAt) : null,
            description: input.description,
            affected_resident_count: input.affectedResidentIds?.length.toString() || '0',
            affected_resident_ids: input.affectedResidentIds || [],
            phi_involved: input.phiInvolved,
            cause: input.cause || null,
            reported_by: ctx.user!.id,
            investigation_status: 'open',
            created_by: ctx.user!.id,
            updated_by: ctx.user!.id,
          })
          .returning();

        return breach;
      }),
  }),
});
