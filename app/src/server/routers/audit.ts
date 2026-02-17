/**
 * Audit Log Router
 *
 * Query and verify audit logs with hash chain integrity.
 * Source: docs/04_COMPLIANCE.md Section 4 (Audit Logging)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { auditLogs } from '../db/schema/audit';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';

/**
 * Query audit logs input schema
 */
const queryAuditLogsSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  userId: z.string().uuid().optional(),
  residentId: z.string().uuid().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  sensitivityLevel: z.enum(['public', 'internal', 'confidential', 'part2_protected']).optional(),
  limit: z.number().min(1).max(100).default(25),
  cursor: z.string().uuid().optional(),
});

/**
 * Verify hash chain input schema
 */
const verifyHashChainSchema = z.object({
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
});

/**
 * Audit log router
 */
export const auditRouter = router({
  /**
   * Query audit logs
   * Filterable by date, user, action, resource type, sensitivity level
   */
  query: protectedProcedure
    .meta({ permission: 'audit_log:read', resource: 'audit_log' })
    .input(queryAuditLogsSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const conditions = [eq(auditLogs.org_id, orgId)];

      if (input.dateFrom) {
        conditions.push(gte(auditLogs.created_at, new Date(input.dateFrom)));
      }

      if (input.dateTo) {
        conditions.push(lte(auditLogs.created_at, new Date(input.dateTo)));
      }

      if (input.userId) {
        conditions.push(eq(auditLogs.actor_user_id, input.userId));
      }

      if (input.residentId) {
        conditions.push(eq(auditLogs.actor_resident_id, input.residentId));
      }

      if (input.action) {
        conditions.push(eq(auditLogs.action, input.action));
      }

      if (input.resourceType) {
        conditions.push(eq(auditLogs.resource_type, input.resourceType));
      }

      if (input.sensitivityLevel) {
        conditions.push(eq(auditLogs.sensitivity_level, input.sensitivityLevel));
      }

      const items = await ctx.db.query.auditLogs.findMany({
        where: and(...conditions),
        orderBy: [desc(auditLogs.created_at)],
        limit: input.limit + 1,
        with: {
          actorUser: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          actorResident: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      const hasMore = items.length > input.limit;
      const results = hasMore ? items.slice(0, input.limit) : items;

      return {
        items: results,
        nextCursor: hasMore ? results[results.length - 1]?.id : null,
        totalCount: items.length,
      };
    }),

  /**
   * Verify hash chain integrity
   * Checks that each log entry's previous_log_hash matches the actual hash of the previous entry
   */
  verifyChain: protectedProcedure
    .meta({ permission: 'audit_log:read', resource: 'audit_log' })
    .input(verifyHashChainSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Fetch logs in order
      const logs = await ctx.db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.org_id, orgId),
          gte(auditLogs.created_at, new Date(input.dateFrom)),
          lte(auditLogs.created_at, new Date(input.dateTo))
        ),
        orderBy: [auditLogs.created_at],
      });

      if (logs.length === 0) {
        return {
          valid: true,
          totalLogs: 0,
          message: 'No logs found in date range',
        };
      }

      // Verify chain
      for (let i = 1; i < logs.length; i++) {
        const currentLog = logs[i];
        const previousLog = logs[i - 1];

        // Check if current log's previous_log_hash matches previous log's current_log_hash
        if (currentLog.previous_log_hash !== previousLog!.current_log_hash) {
          return {
            valid: false,
            totalLogs: logs.length,
            brokenAt: currentLog.id,
            brokenAtTimestamp: currentLog.created_at.toISOString(),
            message: `Hash chain broken at log ${currentLog.id}`,
            details: {
              logId: currentLog.id,
              expectedHash: previousLog!.current_log_hash,
              actualHash: currentLog.previous_log_hash,
              previousLogId: previousLog!.id,
            },
          };
        }
      }

      return {
        valid: true,
        totalLogs: logs.length,
        message: 'Hash chain integrity verified',
        dateRange: {
          from: logs[0]!.created_at.toISOString(),
          to: logs[logs.length - 1]!.created_at.toISOString(),
        },
      };
    }),

  /**
   * Get audit log statistics
   * Summary of audit activity by action type, sensitivity level
   */
  getStats: protectedProcedure
    .meta({ permission: 'audit_log:read', resource: 'audit_log' })
    .input(z.object({
      dateFrom: z.string().datetime(),
      dateTo: z.string().datetime(),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Count by action
      const byAction = await ctx.db
        .select({
          action: auditLogs.action,
          count: sql<number>`count(*)::int`,
        })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.org_id, orgId),
            gte(auditLogs.created_at, new Date(input.dateFrom)),
            lte(auditLogs.created_at, new Date(input.dateTo))
          )
        )
        .groupBy(auditLogs.action);

      // Count by sensitivity level
      const bySensitivity = await ctx.db
        .select({
          sensitivityLevel: auditLogs.sensitivity_level,
          count: sql<number>`count(*)::int`,
        })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.org_id, orgId),
            gte(auditLogs.created_at, new Date(input.dateFrom)),
            lte(auditLogs.created_at, new Date(input.dateTo))
          )
        )
        .groupBy(auditLogs.sensitivity_level);

      // Count by resource type
      const byResourceType = await ctx.db
        .select({
          resourceType: auditLogs.resource_type,
          count: sql<number>`count(*)::int`,
        })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.org_id, orgId),
            gte(auditLogs.created_at, new Date(input.dateFrom)),
            lte(auditLogs.created_at, new Date(input.dateTo))
          )
        )
        .groupBy(auditLogs.resource_type);

      // Total count
      const [total] = await ctx.db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.org_id, orgId),
            gte(auditLogs.created_at, new Date(input.dateFrom)),
            lte(auditLogs.created_at, new Date(input.dateTo))
          )
        );

      return {
        totalLogs: total?.count || 0,
        byAction,
        bySensitivity,
        byResourceType,
        dateRange: {
          from: input.dateFrom,
          to: input.dateTo,
        },
      };
    }),
});
