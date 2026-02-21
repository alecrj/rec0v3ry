/**
 * Stripe Webhook Handler
 *
 * Handles webhook events from Stripe for:
 * - Account updates (connected account status changes)
 * - Payment events (payment_intent.succeeded, payment_intent.payment_failed)
 * - Refunds (charge.refunded)
 * - Disputes (charge.dispute.created)
 *
 * Architecture: docs/05_PAYMENTS.md Section 3 (Stripe Connect)
 * Compliance: All events create audit trail entries
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createLedgerEntryPair } from '@/lib/ledger';
import { db } from '@/server/db/client';
import { organizations } from '@/server/db/schema/orgs';
import { payments, invoices } from '@/server/db/schema/payments';
import { refunds } from '@/server/db/schema/payment-extended';
import { residents } from '@/server/db/schema/residents';
import { eq, and } from 'drizzle-orm';
import { sendPaymentReceiptEmail } from '@/lib/email';

// Track processed events for idempotency
const processedEvents = new Set<string>();

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('[Stripe Webhook] Missing signature');
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Idempotency check
  if (processedEvents.has(event.id)) {
    console.log(`[Stripe Webhook] Event ${event.id} already processed`);
    return NextResponse.json({ received: true });
  }

  console.log(`[Stripe Webhook] Processing event: ${event.type}`);

  try {
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    // Mark as processed
    processedEvents.add(event.id);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Stripe Webhook] Error processing event:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle account.updated
 * Updates org settings with charges_enabled and payouts_enabled status
 */
async function handleAccountUpdated(account: Stripe.Account) {
  console.log(`[Stripe Webhook] Account updated: ${account.id}`);

  // Find org by Stripe account ID
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.stripe_account_id, account.id))
    .limit(1);

  if (!org) {
    console.error(`[Stripe Webhook] Org not found for account ${account.id}`);
    return;
  }

  // Update org settings
  const settings = (org.settings as any) || {};
  const updatedSettings = {
    ...settings,
    stripe: {
      ...(settings.stripe || {}),
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      onboardingComplete: account.charges_enabled && account.payouts_enabled,
    },
  };

  await db
    .update(organizations)
    .set({
      settings: updatedSettings,
      updated_at: new Date(),
    })
    .where(eq(organizations.id, org.id));

  console.log(`[Stripe Webhook] Updated org ${org.id} Stripe status`);
}

/**
 * Handle payment_intent.succeeded
 * Create payment record + ledger entries
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Stripe Webhook] Payment succeeded: ${paymentIntent.id}`);

  const metadata = paymentIntent.metadata;
  const orgId = metadata.org_id;
  const payerConfigId = metadata.recoveryos_payer_id;
  const invoiceId = metadata.invoice_id;
  const residentId = metadata.resident_id;

  if (!orgId || !residentId) {
    console.error('[Stripe Webhook] Missing required metadata');
    return;
  }

  // Get charge ID
  const chargeId = typeof paymentIntent.latest_charge === 'string'
    ? paymentIntent.latest_charge
    : paymentIntent.latest_charge?.id || null;

  // Create payment record
  const [payment] = await db
    .insert(payments)
    .values({
      org_id: orgId,
      invoice_id: invoiceId || null,
      resident_id: residentId,
      payer_config_id: payerConfigId || null,
      amount: (paymentIntent.amount / 100).toFixed(2), // Convert cents to dollars
      payment_method_type: 'card',
      status: 'succeeded',
      payment_date: new Date(),
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: chargeId,
      receipt_url: null, // Receipt URL will be available via Stripe API if needed
      created_by: 'system',
      updated_by: 'system',
    })
    .returning();

  console.log(`[Stripe Webhook] Created payment record: ${payment.id}`);

  // Send receipt email (fire-and-forget)
  if (residentId) {
    const resident = await db.query.residents.findFirst({
      where: eq(residents.id, residentId),
      columns: { first_name: true, last_name: true, email: true },
    });
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
      columns: { name: true },
    });
    if (resident?.email && org) {
      sendPaymentReceiptEmail({
        to: resident.email,
        recipientName: `${resident.first_name} ${resident.last_name}`,
        amount: (paymentIntent.amount / 100).toFixed(2),
        paymentDate: new Date().toLocaleDateString(),
        invoiceNumber: invoiceId ? undefined : undefined,
        orgName: org.name,
      }).catch((err) => console.error('[Stripe Webhook] Receipt email failed:', err));
    }
  }

  // Create ledger entries: DR Cash-Stripe (1100), CR Accounts Receivable (1000)
  const transactionId = await createLedgerEntryPair({
    orgId,
    debitAccountCode: '1100', // Cash - Stripe
    creditAccountCode: '1000', // Accounts Receivable
    amountCents: paymentIntent.amount,
    description: `Payment received - ${paymentIntent.description || 'Payment'}`,
    referenceType: 'payment',
    referenceId: payment.id,
    createdBy: 'system',
  });

  console.log(`[Stripe Webhook] Created ledger entries: ${transactionId}`);

  // Update invoice if applicable
  if (invoiceId) {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (invoice) {
      const amountPaid = Number(invoice.amount_paid || 0) + paymentIntent.amount / 100;
      const amountDue = Number(invoice.total) - amountPaid;

      const newStatus = amountDue <= 0 ? 'paid' : 'partially_paid';

      await db
        .update(invoices)
        .set({
          amount_paid: amountPaid.toFixed(2),
          amount_due: amountDue.toFixed(2),
          status: newStatus,
          updated_at: new Date(),
        })
        .where(eq(invoices.id, invoiceId));

      console.log(`[Stripe Webhook] Updated invoice ${invoiceId} status to ${newStatus}`);
    }
  }
}

/**
 * Handle payment_intent.payment_failed
 * Update payment status to failed
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Stripe Webhook] Payment failed: ${paymentIntent.id}`);

  const metadata = paymentIntent.metadata;
  const orgId = metadata.org_id;
  const residentId = metadata.resident_id;

  if (!orgId || !residentId) {
    console.error('[Stripe Webhook] Missing required metadata');
    return;
  }

  // Create failed payment record
  await db.insert(payments).values({
    org_id: orgId,
    invoice_id: metadata.invoice_id || null,
    resident_id: residentId,
    payer_config_id: metadata.recoveryos_payer_id || null,
    amount: (paymentIntent.amount / 100).toFixed(2),
    payment_method_type: 'card',
    status: 'failed',
    payment_date: new Date(),
    stripe_payment_intent_id: paymentIntent.id,
    failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
    created_by: 'system',
    updated_by: 'system',
  });

  console.log('[Stripe Webhook] Created failed payment record');
}

/**
 * Handle charge.refunded
 * Create refund record + reversal ledger entries
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log(`[Stripe Webhook] Charge refunded: ${charge.id}`);

  // Find payment by charge ID
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.stripe_charge_id, charge.id))
    .limit(1);

  if (!payment) {
    console.error(`[Stripe Webhook] Payment not found for charge ${charge.id}`);
    return;
  }

  // Get refund details
  const stripeRefund = charge.refunds?.data?.[0];
  const refundAmount = stripeRefund ? stripeRefund.amount / 100 : 0;

  // Create refund record
  const [refund] = await db
    .insert(refunds)
    .values({
      org_id: payment.org_id,
      payment_id: payment.id,
      resident_id: payment.resident_id,
      amount: refundAmount.toFixed(2),
      reason: 'Stripe refund',
      stripe_refund_id: stripeRefund?.id || null,
      refunded_at: new Date(),
      created_by: 'system',
    })
    .returning();

  console.log(`[Stripe Webhook] Created refund record: ${refund.id}`);

  // Create reversal ledger entries: DR Refund Expense (4000), CR Cash-Stripe (1100)
  const transactionId = await createLedgerEntryPair({
    orgId: payment.org_id,
    debitAccountCode: '4000', // Refund Expense
    creditAccountCode: '1100', // Cash - Stripe
    amountCents: stripeRefund?.amount || 0,
    description: `Refund processed - Charge ${charge.id}`,
    referenceType: 'refund',
    referenceId: refund.id,
    createdBy: 'system',
  });

  console.log(`[Stripe Webhook] Created refund ledger entries: ${transactionId}`);

  // Update payment status
  await db
    .update(payments)
    .set({
      status: 'refunded',
      stripe_refund_id: stripeRefund?.id || null,
      updated_at: new Date(),
    })
    .where(eq(payments.id, payment.id));
}

/**
 * Handle charge.dispute.created
 * Update payment status to disputed
 */
async function handleDisputeCreated(dispute: Stripe.Dispute) {
  console.log(`[Stripe Webhook] Dispute created: ${dispute.id}`);

  // Find payment by charge ID
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.stripe_charge_id, dispute.charge as string))
    .limit(1);

  if (!payment) {
    console.error(`[Stripe Webhook] Payment not found for dispute ${dispute.id}`);
    return;
  }

  // Update payment status
  await db
    .update(payments)
    .set({
      status: 'disputed',
      failure_reason: `Dispute: ${dispute.reason}`,
      updated_at: new Date(),
    })
    .where(eq(payments.id, payment.id));

  console.log(`[Stripe Webhook] Updated payment ${payment.id} to disputed`);

  // TODO: Alert org admin about dispute
}
