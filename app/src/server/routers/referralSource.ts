/**
 * Referral Source Router
 * Manage referral sources (treatment centers, courts, etc.) that send residents
 *
 * Phase F: Referrals & Admissions
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { referralSources, REFERRAL_SOURCE_TYPES } from '../db/schema/referrals';
import { leads } from '../db/schema/residents';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const referralSourceRouter = router({
  /**
   * List all active referral sources for the org, with stats
   */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const orgId = (ctx as any).orgId as string;

      // Get all active referral sources
      const sources = await db
        .select({
          id: referralSources.id,
          name: referralSources.name,
          type: referralSources.type,
          contact_name: referralSources.contact_name,
          contact_phone: referralSources.contact_phone,
          contact_email: referralSources.contact_email,
          address: referralSources.address,
          notes: referralSources.notes,
          is_active: referralSources.is_active,
          created_at: referralSources.created_at,
        })
        .from(referralSources)
        .where(
          and(
            eq(referralSources.org_id, orgId),
            isNull(referralSources.deleted_at)
          )
        )
        .orderBy(desc(referralSources.created_at));

      // Get referral stats per source (count of leads + converted)
      const stats = await db
        .select({
          referral_source_id: leads.referral_source_id,
          total: sql<number>`count(*)::int`,
          converted: sql<number>`count(case when ${leads.status} = 'converted' then 1 end)::int`,
        })
        .from(leads)
        .where(
          and(
            eq(leads.org_id, orgId),
            isNull(leads.deleted_at),
            sql`${leads.referral_source_id} IS NOT NULL`
          )
        )
        .groupBy(leads.referral_source_id);

      // Build stats map
      const statsMap: Record<string, { total: number; converted: number }> = {};
      for (const s of stats) {
        if (s.referral_source_id) {
          statsMap[s.referral_source_id] = { total: s.total, converted: s.converted };
        }
      }

      return sources.map((source) => {
        const sourceStats = statsMap[source.id] || { total: 0, converted: 0 };
        return {
          ...source,
          total_referrals: sourceStats.total,
          total_admitted: sourceStats.converted,
          conversion_rate: sourceStats.total > 0
            ? Math.round((sourceStats.converted / sourceStats.total) * 100)
            : 0,
        };
      });
    }),

  /**
   * Create a new referral source
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      type: z.enum(REFERRAL_SOURCE_TYPES),
      contactName: z.string().max(255).optional(),
      contactPhone: z.string().max(50).optional(),
      contactEmail: z.string().email().optional(),
      address: z.string().max(500).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as any).orgId as string;

      const [source] = await db
        .insert(referralSources)
        .values({
          org_id: orgId,
          name: input.name,
          type: input.type,
          contact_name: input.contactName,
          contact_phone: input.contactPhone,
          contact_email: input.contactEmail,
          address: input.address,
          notes: input.notes,
          created_by: ctx.user!.id,
        })
        .returning();

      return source;
    }),

  /**
   * Update a referral source
   */
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      type: z.enum(REFERRAL_SOURCE_TYPES).optional(),
      contactName: z.string().max(255).nullable().optional(),
      contactPhone: z.string().max(50).nullable().optional(),
      contactEmail: z.string().email().nullable().optional(),
      address: z.string().max(500).nullable().optional(),
      notes: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as any).orgId as string;
      const { id, contactName, contactPhone, contactEmail, isActive, ...rest } = input;

      const [source] = await db
        .update(referralSources)
        .set({
          ...rest,
          contact_name: contactName,
          contact_phone: contactPhone,
          contact_email: contactEmail,
          is_active: isActive,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(referralSources.id, id),
            eq(referralSources.org_id, orgId),
            isNull(referralSources.deleted_at)
          )
        )
        .returning();

      if (!source) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Referral source not found' });
      }

      return source;
    }),

  /**
   * Soft delete a referral source
   */
  delete: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as any).orgId as string;

      const [source] = await db
        .update(referralSources)
        .set({
          deleted_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(referralSources.id, input.id),
            eq(referralSources.org_id, orgId),
            isNull(referralSources.deleted_at)
          )
        )
        .returning();

      if (!source) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Referral source not found' });
      }

      return source;
    }),

  /**
   * Get detailed stats for a specific referral source
   */
  getStats: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const orgId = (ctx as any).orgId as string;

      // Verify source exists
      const [source] = await db
        .select()
        .from(referralSources)
        .where(
          and(
            eq(referralSources.id, input.id),
            eq(referralSources.org_id, orgId),
            isNull(referralSources.deleted_at)
          )
        )
        .limit(1);

      if (!source) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Referral source not found' });
      }

      // Get lead counts by status
      const statusCounts = await db
        .select({
          status: leads.status,
          count: sql<number>`count(*)::int`,
        })
        .from(leads)
        .where(
          and(
            eq(leads.org_id, orgId),
            eq(leads.referral_source_id, input.id),
            isNull(leads.deleted_at)
          )
        )
        .groupBy(leads.status);

      const total = statusCounts.reduce((sum, s) => sum + s.count, 0);
      const converted = statusCounts.find(s => s.status === 'converted')?.count || 0;
      const lost = statusCounts.find(s => s.status === 'lost')?.count || 0;
      const active = total - converted - lost;

      return {
        source,
        stats: {
          total,
          converted,
          lost,
          active,
          conversion_rate: total > 0 ? Math.round((converted / total) * 100) : 0,
          by_status: statusCounts,
        },
      };
    }),

  /**
   * List active referral sources (for dropdowns)
   */
  listActive: protectedProcedure
    .query(async ({ ctx }) => {
      const orgId = (ctx as any).orgId as string;

      const sources = await db
        .select({
          id: referralSources.id,
          name: referralSources.name,
          type: referralSources.type,
        })
        .from(referralSources)
        .where(
          and(
            eq(referralSources.org_id, orgId),
            eq(referralSources.is_active, true),
            isNull(referralSources.deleted_at)
          )
        )
        .orderBy(referralSources.name);

      return sources;
    }),
});
