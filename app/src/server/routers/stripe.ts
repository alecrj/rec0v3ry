/**
 * Stripe Router
 *
 * Handles Stripe Connect onboarding and payment method management.
 *
 * Endpoints:
 * - getAccountStatus: Check Stripe Connected Account status
 * - createConnectedAccount: Create Express Connected Account for org
 * - createAccountLink: Generate onboarding URL
 * - createLoginLink: Generate dashboard login URL
 * - createCustomer: Create Stripe Customer for payer
 * - createSetupIntent: Generate SetupIntent for adding payment method
 * - listPaymentMethods: List saved payment methods
 *
 * Architecture: docs/05_PAYMENTS.md Section 3 (Stripe Connect)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '../db/client';
import { organizations } from '../db/schema/orgs';
import { payerConfigs } from '../db/schema/payments';
import { eq, and } from 'drizzle-orm';
import {
  stripe,
  createCustomerOnConnectedAccount,
  createSetupIntent,
  listPaymentMethods as listPaymentMethodsHelper,
} from '../../lib/stripe';

export const stripeRouter = router({
  /**
   * Get Stripe Connected Account status
   */
  getAccountStatus: protectedProcedure.query(async ({ ctx }) => {
    const orgId = (ctx as any).orgId as string;

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if org has Stripe account ID in settings
    const settings = (org.settings as any) || {};
    const stripeSettings = settings.stripe || {};

    if (!stripeSettings.accountId) {
      return {
        connected: false,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingComplete: false,
      };
    }

    // Fetch account from Stripe
    const account = await stripe.accounts.retrieve(stripeSettings.accountId);

    return {
      connected: true,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      onboardingComplete:
        account.charges_enabled && account.payouts_enabled,
    };
  }),

  /**
   * Create Express Connected Account
   */
  createConnectedAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const orgId = (ctx as any).orgId as string;

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) {
      throw new Error('Organization not found');
    }

    // Create Stripe Connected Account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'company',
      metadata: {
        recoveryos_org_id: orgId,
        org_name: org.name,
      },
    });

    // Store account ID and initial status in org settings
    const settings = (org.settings as any) || {};
    const updatedSettings = {
      ...settings,
      stripe: {
        accountId: account.id,
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingComplete: false,
        platformFeePercent: 2.5,
        platformFeeFixedCents: 30,
      },
    };

    await db
      .update(organizations)
      .set({
        settings: updatedSettings,
        stripe_account_id: account.id, // Also store in dedicated column for webhook lookup
        updated_at: new Date(),
        updated_by: ctx.user!.id,
      })
      .where(eq(organizations.id, orgId));

    return {
      accountId: account.id,
    };
  }),

  /**
   * Create Account Link for onboarding
   */
  createAccountLink: protectedProcedure.mutation(async ({ ctx }) => {
    const orgId = (ctx as any).orgId as string;

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) {
      throw new Error('Organization not found');
    }

    const settings = (org.settings as any) || {};
    const stripeSettings = settings.stripe || {};

    if (!stripeSettings.accountId) {
      throw new Error('No Stripe account found. Create one first.');
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeSettings.accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/payments/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/payments/complete`,
      type: 'account_onboarding',
    });

    return {
      url: accountLink.url,
    };
  }),

  /**
   * Create Login Link for Stripe Express Dashboard
   */
  createLoginLink: protectedProcedure.mutation(async ({ ctx }) => {
    const orgId = (ctx as any).orgId as string;

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) {
      throw new Error('Organization not found');
    }

    const settings = (org.settings as any) || {};
    const stripeSettings = settings.stripe || {};

    if (!stripeSettings.accountId) {
      throw new Error('No Stripe account found');
    }

    const loginLink = await stripe.accounts.createLoginLink(
      stripeSettings.accountId
    );

    return {
      url: loginLink.url,
    };
  }),

  /**
   * Create Stripe Customer for payer
   */
  createCustomer: protectedProcedure
    .input(
      z.object({
        payerConfigId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Get org Stripe account
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!org) {
        throw new Error('Organization not found');
      }

      const settings = (org.settings as any) || {};
      const stripeSettings = settings.stripe || {};

      if (!stripeSettings.accountId) {
        throw new Error('Stripe account not connected');
      }

      // Get payer config
      const [payerConfig] = await db
        .select()
        .from(payerConfigs)
        .where(
          and(
            eq(payerConfigs.id, input.payerConfigId),
            eq(payerConfigs.org_id, orgId)
          )
        )
        .limit(1);

      if (!payerConfig) {
        throw new Error('Payer config not found');
      }

      if (payerConfig.stripe_customer_id) {
        throw new Error('Customer already exists for this payer');
      }

      // Create customer on connected account
      const customer = await createCustomerOnConnectedAccount({
        connectedAccountId: stripeSettings.accountId,
        email: payerConfig.payer_email || '',
        name: payerConfig.payer_name,
        metadata: {
          recoveryos_payer_id: input.payerConfigId,
          org_id: orgId,
          payer_type: payerConfig.payer_type,
        },
      });

      // Store customer ID
      await db
        .update(payerConfigs)
        .set({
          stripe_customer_id: customer.id,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(payerConfigs.id, input.payerConfigId));

      return {
        customerId: customer.id,
      };
    }),

  /**
   * Create Setup Intent for adding payment method
   */
  createSetupIntent: protectedProcedure
    .input(
      z.object({
        payerConfigId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Get org Stripe account
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!org) {
        throw new Error('Organization not found');
      }

      const settings = (org.settings as any) || {};
      const stripeSettings = settings.stripe || {};

      if (!stripeSettings.accountId) {
        throw new Error('Stripe account not connected');
      }

      // Get payer config
      const [payerConfig] = await db
        .select()
        .from(payerConfigs)
        .where(
          and(
            eq(payerConfigs.id, input.payerConfigId),
            eq(payerConfigs.org_id, orgId)
          )
        )
        .limit(1);

      if (!payerConfig) {
        throw new Error('Payer config not found');
      }

      if (!payerConfig.stripe_customer_id) {
        throw new Error(
          'Customer not created yet. Call createCustomer first.'
        );
      }

      // Create setup intent
      const setupIntent = await createSetupIntent({
        connectedAccountId: stripeSettings.accountId,
        customerId: payerConfig.stripe_customer_id,
        metadata: {
          recoveryos_payer_id: input.payerConfigId,
          org_id: orgId,
        },
      });

      return {
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      };
    }),

  /**
   * Create Stripe Checkout Session (D1)
   * Resident taps "Pay" → redirected to Stripe hosted page → card, ACH, Apple Pay, Google Pay
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string().uuid(),
        invoiceIds: z.array(z.string().uuid()).optional(), // All selected invoices
        residentId: z.string().uuid(),
        amountCents: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const allInvoiceIds = input.invoiceIds ?? [input.invoiceId];

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!org) throw new Error('Organization not found');

      const settings = (org.settings as any) || {};
      const stripeSettings = settings.stripe || {};

      if (!stripeSettings.accountId) {
        throw new Error('Stripe payments not configured for this organization');
      }

      // Fee handling: absorb vs pass-through
      const feeMode = stripeSettings.feeMode || 'absorb'; // 'absorb' | 'pass_through'
      let checkoutAmount = input.amountCents;
      if (feeMode === 'pass_through') {
        // Add ~3% convenience fee
        const convenienceFee = Math.round(input.amountCents * 0.03 + 30);
        checkoutAmount = input.amountCents + convenienceFee;
      }

      const platformFee = Math.round(
        input.amountCents * ((stripeSettings.platformFeePercent || 2.5) / 100) +
        (stripeSettings.platformFeeFixedCents || 30)
      );

      const session = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: 'Rent Payment',
                  description: allInvoiceIds.length > 1
                    ? `Payment for ${allInvoiceIds.length} invoices`
                    : 'Invoice payment',
                },
                unit_amount: checkoutAmount,
              },
              quantity: 1,
            },
          ],
          payment_method_types: ['card', 'us_bank_account'],
          payment_intent_data: {
            application_fee_amount: platformFee,
            metadata: {
              org_id: orgId,
              resident_id: input.residentId,
              invoice_id: input.invoiceId,
              invoice_ids: allInvoiceIds.join(','),
              source: 'checkout',
            },
          },
          success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/pay?checkout=success`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/pay?checkout=canceled`,
          metadata: {
            org_id: orgId,
            resident_id: input.residentId,
            invoice_id: input.invoiceId,
            invoice_ids: allInvoiceIds.join(','),
          },
        },
        {
          stripeAccount: stripeSettings.accountId,
        }
      );

      return { checkoutUrl: session.url, sessionId: session.id };
    }),

  /**
   * Get fee configuration for org (D3)
   */
  getFeeConfig: protectedProcedure.query(async ({ ctx }) => {
    const orgId = (ctx as any).orgId as string;
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const settings = (org?.settings as any) || {};
    const stripeSettings = settings.stripe || {};

    return {
      feeMode: stripeSettings.feeMode || 'absorb',
      connected: !!stripeSettings.accountId,
      chargesEnabled: stripeSettings.chargesEnabled || false,
    };
  }),

  /**
   * Update fee configuration (D3)
   */
  updateFeeConfig: protectedProcedure
    .input(z.object({ feeMode: z.enum(['absorb', 'pass_through']) }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!org) throw new Error('Organization not found');

      const settings = (org.settings as any) || {};
      const updatedSettings = {
        ...settings,
        stripe: {
          ...(settings.stripe || {}),
          feeMode: input.feeMode,
        },
      };

      await db
        .update(organizations)
        .set({ settings: updatedSettings, updated_at: new Date() })
        .where(eq(organizations.id, orgId));

      return { feeMode: input.feeMode };
    }),

  /**
   * Create PaymentIntent for invoice payment (resident-facing)
   */
  createPaymentIntent: protectedProcedure
    .input(
      z.object({
        invoiceIds: z.array(z.string().uuid()).min(1),
        amountCents: z.number().int().positive(),
        residentId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Get org Stripe account
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!org) {
        throw new Error('Organization not found');
      }

      const settings = (org.settings as any) || {};
      const stripeSettings = settings.stripe || {};

      if (!stripeSettings.accountId) {
        throw new Error('Stripe payments not configured for this organization');
      }

      // Calculate platform fee (2.5% + 30c)
      const feePercent = stripeSettings.platformFeePercent || 2.5;
      const feeFixed = stripeSettings.platformFeeFixedCents || 30;
      const platformFee = Math.round(input.amountCents * (feePercent / 100) + feeFixed);

      // Create payment intent on connected account
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: input.amountCents,
          currency: 'usd',
          automatic_payment_methods: { enabled: true },
          application_fee_amount: platformFee,
          metadata: {
            org_id: orgId,
            resident_id: input.residentId,
            invoice_id: input.invoiceIds[0] || '',
            invoice_ids: input.invoiceIds.join(','),
            recoveryos_payer_id: ctx.user!.id,
          },
        },
        {
          stripeAccount: stripeSettings.accountId,
        }
      );

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        connectedAccountId: stripeSettings.accountId,
      };
    }),

  /**
   * List payment methods for payer
   */
  listPaymentMethods: protectedProcedure
    .input(
      z.object({
        payerConfigId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Get org Stripe account
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!org) {
        throw new Error('Organization not found');
      }

      const settings = (org.settings as any) || {};
      const stripeSettings = settings.stripe || {};

      if (!stripeSettings.accountId) {
        throw new Error('Stripe account not connected');
      }

      // Get payer config
      const [payerConfig] = await db
        .select()
        .from(payerConfigs)
        .where(
          and(
            eq(payerConfigs.id, input.payerConfigId),
            eq(payerConfigs.org_id, orgId)
          )
        )
        .limit(1);

      if (!payerConfig) {
        throw new Error('Payer config not found');
      }

      if (!payerConfig.stripe_customer_id) {
        return { paymentMethods: [] };
      }

      // List payment methods
      const result = await listPaymentMethodsHelper({
        connectedAccountId: stripeSettings.accountId,
        customerId: payerConfig.stripe_customer_id,
      });

      return {
        paymentMethods: result.data.map((pm) => ({
          id: pm.id,
          type: pm.type,
          card: pm.card
            ? {
                brand: pm.card.brand,
                last4: pm.card.last4,
                expMonth: pm.card.exp_month,
                expYear: pm.card.exp_year,
              }
            : null,
        })),
      };
    }),
});
