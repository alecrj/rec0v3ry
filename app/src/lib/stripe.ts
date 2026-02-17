/**
 * Stripe Client and Helpers
 *
 * Platform Stripe setup with destination charges for multi-tenant architecture.
 * Each org = Stripe Connected Account (Express), RecoveryOS = Platform.
 *
 * Architecture: docs/05_PAYMENTS.md Section 3 (Stripe Connect)
 * Compliance: NO SUD data crosses PCI boundary per 42 CFR Part 2
 */

import Stripe from 'stripe';

// Lazy-initialized Stripe client (avoids build-time crash when STRIPE_SECRET_KEY is absent)
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    });
  }
  return _stripe;
}

// Proxy for lazy access — same pattern as db/client.ts
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});

/**
 * Create destination charge on connected account
 *
 * Flow:
 * 1. Customer charged on RecoveryOS platform
 * 2. Platform fee collected automatically
 * 3. Remaining amount transferred to connected account
 *
 * Compliance: Metadata only contains non-SUD identifiers
 */
export async function createDestinationCharge(params: {
  amount: number; // in cents
  currency?: string;
  connectedAccountId: string;
  platformFeeAmount: number; // in cents
  paymentMethodId: string;
  customerId: string;
  description: string; // Generic description ONLY (e.g., "Monthly Rent - Unit 3B")
  metadata: Record<string, string>; // Only non-SUD data: recoveryos_payer_id, org_id, payer_type
  idempotencyKey: string;
}) {
  return stripe.paymentIntents.create(
    {
      amount: params.amount,
      currency: params.currency || 'usd',
      payment_method: params.paymentMethodId,
      customer: params.customerId,
      confirm: true,
      description: params.description,
      metadata: params.metadata,
      application_fee_amount: params.platformFeeAmount,
      transfer_data: {
        destination: params.connectedAccountId,
      },
      // return_url for 3DS/SCA redirects
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/complete`,
    },
    {
      idempotencyKey: params.idempotencyKey,
    }
  );
}

/**
 * Create Stripe Customer on connected account
 *
 * Note: Customer is created on the CONNECTED ACCOUNT (not platform).
 * This allows the connected account to manage payment methods.
 */
export async function createCustomerOnConnectedAccount(params: {
  connectedAccountId: string;
  email: string;
  name: string;
  metadata: Record<string, string>; // Only non-SUD data
}) {
  return stripe.customers.create(
    {
      email: params.email,
      name: params.name,
      metadata: params.metadata,
    },
    {
      stripeAccount: params.connectedAccountId,
    }
  );
}

/**
 * Create Setup Intent for saving payment method
 *
 * Used for:
 * - Adding payment methods without charging
 * - Setting up auto-pay
 */
export async function createSetupIntent(params: {
  connectedAccountId: string;
  customerId: string;
  metadata: Record<string, string>;
}) {
  return stripe.setupIntents.create(
    {
      customer: params.customerId,
      payment_method_types: ['card'],
      metadata: params.metadata,
    },
    {
      stripeAccount: params.connectedAccountId,
    }
  );
}

/**
 * List payment methods for customer
 */
export async function listPaymentMethods(params: {
  connectedAccountId: string;
  customerId: string;
}) {
  return stripe.paymentMethods.list(
    {
      customer: params.customerId,
      type: 'card',
    },
    {
      stripeAccount: params.connectedAccountId,
    }
  );
}

/**
 * Detach payment method from customer
 */
export async function detachPaymentMethod(params: {
  connectedAccountId: string;
  paymentMethodId: string;
}) {
  return stripe.paymentMethods.detach(
    params.paymentMethodId,
    {},
    {
      stripeAccount: params.connectedAccountId,
    }
  );
}
