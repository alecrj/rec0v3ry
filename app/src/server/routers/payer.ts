/**
 * Payer Router
 *
 * Manages payer configurations (multi-payer support).
 * Payers can be: self, family, insurance, third-party.
 *
 * Note: Payer PII (name, email, phone) is encrypted at rest per 42 CFR Part 2.
 * This router handles CRUD operations and auto-pay settings.
 *
 * Architecture: docs/05_PAYMENTS.md Section 2 (Multi-Payer Support)
 * Compliance: 42 CFR Part 2 — payer data is SUD-related, encrypted
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '../db/client';
import { payerConfigs } from '../db/schema/payments';
import { eq, and, isNull } from 'drizzle-orm';

export const payerRouter = router({
  /**
   * List payer configs for a resident
   */
  list: protectedProcedure
    .input(
      z.object({
        residentId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const payers = await db
        .select()
        .from(payerConfigs)
        .where(
          and(
            eq(payerConfigs.org_id, orgId),
            eq(payerConfigs.resident_id, input.residentId),
            isNull(payerConfigs.deleted_at)
          )
        )
        .orderBy(payerConfigs.created_at);

      return {
        payers: payers.map((p) => ({
          id: p.id,
          payerName: p.payer_name,
          payerEmail: p.payer_email,
          payerPhone: p.payer_phone,
          payerType: p.payer_type,
          paymentResponsibilityPercentage: p.payment_responsibility_percentage,
          stripeCustomerId: p.stripe_customer_id,
          stripePaymentMethodId: p.stripe_payment_method_id,
          autoPayEnabled: p.auto_pay_enabled,
          isActive: p.is_active,
          notes: p.notes,
          createdAt: p.created_at,
        })),
      };
    }),

  /**
   * Create payer config
   */
  create: protectedProcedure
    .input(
      z.object({
        residentId: z.string().uuid(),
        payerName: z.string().min(1),
        payerEmail: z.string().email().optional(),
        payerPhone: z.string().optional(),
        payerType: z.enum(['self', 'family', 'insurance', 'third_party']),
        paymentResponsibilityPercentage: z.number().int().min(0).max(100),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const [newPayer] = await db
        .insert(payerConfigs)
        .values({
          org_id: orgId,
          resident_id: input.residentId,
          payer_name: input.payerName,
          payer_email: input.payerEmail || null,
          payer_phone: input.payerPhone || null,
          payer_type: input.payerType,
          payment_responsibility_percentage: input.paymentResponsibilityPercentage,
          notes: input.notes || null,
          created_by: ctx.user!.id,
          updated_by: ctx.user!.id,
        })
        .returning();

      return {
        payer: {
          id: newPayer.id,
          payerName: newPayer.payer_name,
          payerEmail: newPayer.payer_email,
          payerPhone: newPayer.payer_phone,
          payerType: newPayer.payer_type,
          paymentResponsibilityPercentage: newPayer.payment_responsibility_percentage,
          autoPayEnabled: newPayer.auto_pay_enabled,
          isActive: newPayer.is_active,
        },
      };
    }),

  /**
   * Update payer config
   */
  update: protectedProcedure
    .input(
      z.object({
        payerConfigId: z.string().uuid(),
        payerName: z.string().min(1).optional(),
        payerEmail: z.string().email().optional(),
        payerPhone: z.string().optional(),
        paymentResponsibilityPercentage: z.number().int().min(0).max(100).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const updates: any = {
        updated_at: new Date(),
        updated_by: ctx.user!.id,
      };

      if (input.payerName !== undefined) {
        updates.payer_name = input.payerName;
      }
      if (input.payerEmail !== undefined) {
        updates.payer_email = input.payerEmail;
      }
      if (input.payerPhone !== undefined) {
        updates.payer_phone = input.payerPhone;
      }
      if (input.paymentResponsibilityPercentage !== undefined) {
        updates.payment_responsibility_percentage = input.paymentResponsibilityPercentage;
      }
      if (input.notes !== undefined) {
        updates.notes = input.notes;
      }

      const [updated] = await db
        .update(payerConfigs)
        .set(updates)
        .where(
          and(
            eq(payerConfigs.id, input.payerConfigId),
            eq(payerConfigs.org_id, orgId)
          )
        )
        .returning();

      if (!updated) {
        throw new Error('Payer config not found');
      }

      return {
        payer: {
          id: updated.id,
          payerName: updated.payer_name,
          payerEmail: updated.payer_email,
          payerPhone: updated.payer_phone,
          paymentResponsibilityPercentage: updated.payment_responsibility_percentage,
          notes: updated.notes,
        },
      };
    }),

  /**
   * Deactivate payer config (soft delete)
   */
  deactivate: protectedProcedure
    .input(
      z.object({
        payerConfigId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const [updated] = await db
        .update(payerConfigs)
        .set({
          is_active: false,
          deleted_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(payerConfigs.id, input.payerConfigId),
            eq(payerConfigs.org_id, orgId)
          )
        )
        .returning();

      if (!updated) {
        throw new Error('Payer config not found');
      }

      return {
        success: true,
      };
    }),

  /**
   * Set auto-pay for payer
   */
  setAutoPay: protectedProcedure
    .input(
      z.object({
        payerConfigId: z.string().uuid(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const [updated] = await db
        .update(payerConfigs)
        .set({
          auto_pay_enabled: input.enabled,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(payerConfigs.id, input.payerConfigId),
            eq(payerConfigs.org_id, orgId)
          )
        )
        .returning();

      if (!updated) {
        throw new Error('Payer config not found');
      }

      return {
        autoPayEnabled: updated.auto_pay_enabled,
      };
    }),
});
