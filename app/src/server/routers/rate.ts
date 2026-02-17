/**
 * Rate Router
 *
 * Rate configuration management for billing.
 * Source: docs/05_PAYMENTS.md Section 1 (Rate Configuration)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '../db/client';
import { rateConfigs } from '../db/schema/payment-extended';
import { eq, and, desc } from 'drizzle-orm';
import { NotFoundError } from '@/lib/errors';

/**
 * List rate configs input schema
 */
const listRateConfigsSchema = z.object({
  houseId: z.string().uuid().optional(),
  paymentType: z.enum(['rent', 'security_deposit', 'program_fee', 'service_fee', 'damage', 'late_fee', 'other']).optional(),
  activeOnly: z.boolean().default(true),
});

/**
 * Create rate config input schema
 */
const createRateConfigSchema = z.object({
  houseId: z.string().uuid().optional(),
  paymentType: z.enum(['rent', 'security_deposit', 'program_fee', 'service_fee', 'damage', 'late_fee', 'other']),
  rateName: z.string().min(1), // "Weekly Rent", "Monthly Rent", etc.
  amount: z.string(), // Decimal string
  billingFrequency: z.enum(['daily', 'weekly', 'monthly']),
  effectiveFrom: z.string(), // ISO date YYYY-MM-DD
  effectiveUntil: z.string().optional(), // ISO date YYYY-MM-DD
});

/**
 * Update rate config input schema
 */
const updateRateConfigSchema = z.object({
  id: z.string().uuid(),
  rateName: z.string().min(1).optional(),
  amount: z.string().optional(), // Decimal string
  billingFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  effectiveFrom: z.string().optional(), // ISO date YYYY-MM-DD
  effectiveUntil: z.string().optional(), // ISO date YYYY-MM-DD
});

/**
 * Rate router
 */
export const rateRouter = router({
  /**
   * List rate configs for org
   * Optionally filter by house and payment type
   */
  list: protectedProcedure
    .meta({ permission: 'rate:read', resource: 'rate' })
    .input(listRateConfigsSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const conditions = [eq(rateConfigs.org_id, orgId)];

      if (input.houseId) {
        conditions.push(eq(rateConfigs.house_id, input.houseId));
      }

      if (input.paymentType) {
        conditions.push(eq(rateConfigs.payment_type, input.paymentType));
      }

      if (input.activeOnly) {
        conditions.push(eq(rateConfigs.is_active, true));
      }

      const items = await db.query.rateConfigs.findMany({
        where: and(...conditions),
        orderBy: [desc(rateConfigs.created_at)],
        with: {
          house: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      return items;
    }),

  /**
   * Get rate config by ID
   */
  getById: protectedProcedure
    .meta({ permission: 'rate:read', resource: 'rate' })
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const rateConfig = await db.query.rateConfigs.findFirst({
        where: and(
          eq(rateConfigs.id, input.id),
          eq(rateConfigs.org_id, orgId)
        ),
        with: {
          house: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!rateConfig) {
        throw new NotFoundError('Rate Config', input.id);
      }

      return rateConfig;
    }),

  /**
   * Create rate config
   */
  create: protectedProcedure
    .meta({ permission: 'rate:create', resource: 'rate' })
    .input(createRateConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      const [rateConfig] = await db
        .insert(rateConfigs)
        .values({
          org_id: orgId,
          house_id: input.houseId || null,
          payment_type: input.paymentType,
          rate_name: input.rateName,
          amount: input.amount,
          billing_frequency: input.billingFrequency,
          effective_from: input.effectiveFrom,
          effective_until: input.effectiveUntil || null,
          is_active: true,
          created_by: userId,
          updated_by: userId,
        })
        .returning();

      return rateConfig;
    }),

  /**
   * Update rate config
   */
  update: protectedProcedure
    .meta({ permission: 'rate:update', resource: 'rate' })
    .input(updateRateConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      // Check rate config exists
      const existing = await db.query.rateConfigs.findFirst({
        where: and(
          eq(rateConfigs.id, input.id),
          eq(rateConfigs.org_id, orgId)
        ),
      });

      if (!existing) {
        throw new NotFoundError('Rate Config', input.id);
      }

      // Build update object
      const updates: any = {
        updated_by: userId,
      };

      if (input.rateName !== undefined) {
        updates.rate_name = input.rateName;
      }

      if (input.amount !== undefined) {
        updates.amount = input.amount;
      }

      if (input.billingFrequency !== undefined) {
        updates.billing_frequency = input.billingFrequency;
      }

      if (input.effectiveFrom !== undefined) {
        updates.effective_from = input.effectiveFrom;
      }

      if (input.effectiveUntil !== undefined) {
        updates.effective_until = input.effectiveUntil;
      }

      // Update rate config
      const [updated] = await db
        .update(rateConfigs)
        .set(updates)
        .where(eq(rateConfigs.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Deactivate rate config
   */
  deactivate: protectedProcedure
    .meta({ permission: 'rate:update', resource: 'rate' })
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      // Check rate config exists
      const existing = await db.query.rateConfigs.findFirst({
        where: and(
          eq(rateConfigs.id, input.id),
          eq(rateConfigs.org_id, orgId)
        ),
      });

      if (!existing) {
        throw new NotFoundError('Rate Config', input.id);
      }

      // Deactivate
      const [updated] = await db
        .update(rateConfigs)
        .set({
          is_active: false,
          updated_by: userId,
        })
        .where(eq(rateConfigs.id, input.id))
        .returning();

      return updated;
    }),
});
