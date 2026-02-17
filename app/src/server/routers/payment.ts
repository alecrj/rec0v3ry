/**
 * Payment Router
 *
 * Payment recording and balance tracking.
 * Source: docs/05_PAYMENTS.md Section 3 (Payment Processing)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '../db/client';
import { payments, invoices, ledgerAccounts, ledgerEntries } from '../db/schema/payments';
import { eq, and, isNull, desc, gte, lte, sql } from 'drizzle-orm';
import { NotFoundError, InvalidInputError } from '@/lib/errors';

/**
 * Payment list filters schema
 */
const listPaymentsSchema = z.object({
  residentId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  status: z.enum(['pending', 'processing', 'succeeded', 'failed', 'refunded', 'disputed']).optional(),
  paymentMethodType: z.enum(['card', 'ach', 'cash', 'check', 'wire', 'other']).optional(),
  dateFrom: z.string().optional(), // ISO datetime string
  dateTo: z.string().optional(), // ISO datetime string
  limit: z.number().min(1).max(100).default(25),
  cursor: z.string().uuid().optional(),
});

/**
 * Record manual payment input schema
 */
const recordManualPaymentSchema = z.object({
  residentId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  amount: z.string(), // Decimal string
  paymentMethodType: z.enum(['cash', 'check', 'wire', 'other']),
  paymentDate: z.string().datetime(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Record Stripe payment input schema
 */
const recordStripePaymentSchema = z.object({
  residentId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  amount: z.string(), // Decimal string
  paymentMethodType: z.enum(['card', 'ach']),
  paymentDate: z.string().datetime(),
  stripePaymentIntentId: z.string(),
  stripeChargeId: z.string().optional(),
  receiptUrl: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Get resident balance input schema
 */
const getResidentBalanceSchema = z.object({
  residentId: z.string().uuid(),
});

/**
 * Get resident statement input schema
 */
const getResidentStatementSchema = z.object({
  residentId: z.string().uuid(),
  dateFrom: z.string().optional(), // ISO date
  dateTo: z.string().optional(), // ISO date
});

/**
 * Payment router
 */
export const paymentRouter = router({
  /**
   * List payments with pagination and filters
   */
  list: protectedProcedure
    .meta({ permission: 'payment:read', resource: 'payment' })
    .input(listPaymentsSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const conditions = [
        eq(payments.org_id, orgId),
        isNull(payments.deleted_at),
      ];

      if (input.residentId) {
        conditions.push(eq(payments.resident_id, input.residentId));
      }

      if (input.invoiceId) {
        conditions.push(eq(payments.invoice_id, input.invoiceId));
      }

      if (input.status) {
        conditions.push(eq(payments.status, input.status));
      }

      if (input.paymentMethodType) {
        conditions.push(eq(payments.payment_method_type, input.paymentMethodType));
      }

      if (input.dateFrom) {
        conditions.push(gte(payments.payment_date, new Date(input.dateFrom)));
      }

      if (input.dateTo) {
        conditions.push(lte(payments.payment_date, new Date(input.dateTo)));
      }

      if (input.cursor) {
        conditions.push(sql`${payments.id} > ${input.cursor}`);
      }

      const items = await db.query.payments.findMany({
        where: and(...conditions),
        orderBy: [desc(payments.payment_date)],
        limit: input.limit + 1,
        with: {
          resident: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
          invoice: {
            columns: {
              id: true,
              invoice_number: true,
              total: true,
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
   * Get payment by ID
   */
  getById: protectedProcedure
    .meta({ permission: 'payment:read', resource: 'payment' })
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const payment = await db.query.payments.findFirst({
        where: and(
          eq(payments.id, input.id),
          eq(payments.org_id, orgId),
          isNull(payments.deleted_at)
        ),
        with: {
          resident: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
          invoice: {
            columns: {
              id: true,
              invoice_number: true,
              total: true,
            },
          },
          ledgerEntries: true,
        },
      });

      if (!payment) {
        throw new NotFoundError('Payment', input.id);
      }

      return payment;
    }),

  /**
   * Record manual payment (cash/check/wire)
   * Creates payment record + ledger entries (DR Cash, CR AR)
   */
  recordManual: protectedProcedure
    .meta({ permission: 'payment:create', resource: 'payment' })
    .input(recordManualPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      // Get Cash-External account (1110)
      const cashAccount = await db.query.ledgerAccounts.findFirst({
        where: and(
          eq(ledgerAccounts.org_id, orgId),
          eq(ledgerAccounts.code, '1110')
        ),
      });

      // Get Accounts Receivable account (1000)
      const arAccount = await db.query.ledgerAccounts.findFirst({
        where: and(
          eq(ledgerAccounts.org_id, orgId),
          eq(ledgerAccounts.code, '1000')
        ),
      });

      if (!cashAccount || !arAccount) {
        throw new InvalidInputError('Ledger accounts not initialized. Run ledger.initializeAccounts first.');
      }

      // Create payment and ledger entries in transaction
      const result = await db.transaction(async (tx) => {
        // Create payment record
        const [payment] = await tx
          .insert(payments)
          .values({
            org_id: orgId,
            resident_id: input.residentId,
            invoice_id: input.invoiceId || null,
            amount: input.amount,
            payment_method_type: input.paymentMethodType,
            status: 'succeeded',
            payment_date: new Date(input.paymentDate),
            notes: input.notes || null,
            metadata: input.metadata || null,
            created_by: userId,
            updated_by: userId,
          })
          .returning();

        // Generate transaction ID for double-entry
        const transactionId = crypto.randomUUID();
        const transactionDate = new Date(input.paymentDate);

        // Create ledger entries (DR Cash-External, CR AR)
        await tx.insert(ledgerEntries).values([
          {
            org_id: orgId,
            account_id: cashAccount.id,
            transaction_id: transactionId,
            transaction_date: transactionDate,
            debit_amount: input.amount,
            credit_amount: '0',
            description: `Payment received - ${input.paymentMethodType}`,
            reference_type: 'payment',
            reference_id: payment.id,
            created_by: userId,
          },
          {
            org_id: orgId,
            account_id: arAccount.id,
            transaction_id: transactionId,
            transaction_date: transactionDate,
            debit_amount: '0',
            credit_amount: input.amount,
            description: `Payment received - ${input.paymentMethodType}`,
            reference_type: 'payment',
            reference_id: payment.id,
            created_by: userId,
          },
        ]);

        // Update invoice if provided
        if (input.invoiceId) {
          const invoice = await tx.query.invoices.findFirst({
            where: eq(invoices.id, input.invoiceId),
          });

          if (invoice) {
            const newAmountPaid = parseFloat(invoice.amount_paid || '0') + parseFloat(input.amount);
            const total = parseFloat(invoice.total);
            const newAmountDue = total - newAmountPaid;

            let newStatus = invoice.status;
            if (newAmountDue <= 0) {
              newStatus = 'paid';
            } else if (newAmountPaid > 0) {
              newStatus = 'partially_paid';
            }

            await tx
              .update(invoices)
              .set({
                amount_paid: newAmountPaid.toFixed(2),
                amount_due: Math.max(0, newAmountDue).toFixed(2),
                status: newStatus,
                updated_by: userId,
              })
              .where(eq(invoices.id, input.invoiceId));
          }
        }

        return payment;
      });

      return result;
    }),

  /**
   * Record Stripe payment (called by webhook)
   * Creates payment record + ledger entries (DR Cash-Stripe, CR AR)
   */
  recordStripePayment: protectedProcedure
    .meta({ permission: 'payment:create', resource: 'payment' })
    .input(recordStripePaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      // Get Cash-Stripe account (1100)
      const cashAccount = await db.query.ledgerAccounts.findFirst({
        where: and(
          eq(ledgerAccounts.org_id, orgId),
          eq(ledgerAccounts.code, '1100')
        ),
      });

      // Get Accounts Receivable account (1000)
      const arAccount = await db.query.ledgerAccounts.findFirst({
        where: and(
          eq(ledgerAccounts.org_id, orgId),
          eq(ledgerAccounts.code, '1000')
        ),
      });

      if (!cashAccount || !arAccount) {
        throw new InvalidInputError('Ledger accounts not initialized. Run ledger.initializeAccounts first.');
      }

      // Create payment and ledger entries in transaction
      const result = await db.transaction(async (tx) => {
        // Create payment record
        const [payment] = await tx
          .insert(payments)
          .values({
            org_id: orgId,
            resident_id: input.residentId,
            invoice_id: input.invoiceId || null,
            amount: input.amount,
            payment_method_type: input.paymentMethodType,
            status: 'succeeded',
            payment_date: new Date(input.paymentDate),
            stripe_payment_intent_id: input.stripePaymentIntentId,
            stripe_charge_id: input.stripeChargeId || null,
            receipt_url: input.receiptUrl || null,
            metadata: input.metadata || null,
            created_by: userId,
            updated_by: userId,
          })
          .returning();

        // Generate transaction ID for double-entry
        const transactionId = crypto.randomUUID();
        const transactionDate = new Date(input.paymentDate);

        // Create ledger entries (DR Cash-Stripe, CR AR)
        await tx.insert(ledgerEntries).values([
          {
            org_id: orgId,
            account_id: cashAccount.id,
            transaction_id: transactionId,
            transaction_date: transactionDate,
            debit_amount: input.amount,
            credit_amount: '0',
            description: `Stripe payment received - ${input.paymentMethodType}`,
            reference_type: 'payment',
            reference_id: payment.id,
            created_by: userId,
          },
          {
            org_id: orgId,
            account_id: arAccount.id,
            transaction_id: transactionId,
            transaction_date: transactionDate,
            debit_amount: '0',
            credit_amount: input.amount,
            description: `Stripe payment received - ${input.paymentMethodType}`,
            reference_type: 'payment',
            reference_id: payment.id,
            created_by: userId,
          },
        ]);

        // Update invoice if provided
        if (input.invoiceId) {
          const invoice = await tx.query.invoices.findFirst({
            where: eq(invoices.id, input.invoiceId),
          });

          if (invoice) {
            const newAmountPaid = parseFloat(invoice.amount_paid || '0') + parseFloat(input.amount);
            const total = parseFloat(invoice.total);
            const newAmountDue = total - newAmountPaid;

            let newStatus = invoice.status;
            if (newAmountDue <= 0) {
              newStatus = 'paid';
            } else if (newAmountPaid > 0) {
              newStatus = 'partially_paid';
            }

            await tx
              .update(invoices)
              .set({
                amount_paid: newAmountPaid.toFixed(2),
                amount_due: Math.max(0, newAmountDue).toFixed(2),
                status: newStatus,
                updated_by: userId,
              })
              .where(eq(invoices.id, input.invoiceId));
          }
        }

        return payment;
      });

      return result;
    }),

  /**
   * Get resident balance (computed from ledger)
   * Sum of AR account entries for this resident
   */
  getResidentBalance: protectedProcedure
    .meta({ permission: 'payment:read', resource: 'payment' })
    .input(getResidentBalanceSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Get AR account
      const arAccount = await db.query.ledgerAccounts.findFirst({
        where: and(
          eq(ledgerAccounts.org_id, orgId),
          eq(ledgerAccounts.code, '1000')
        ),
      });

      if (!arAccount) {
        return { residentId: input.residentId, balance: '0.00' };
      }

      // Calculate balance from ledger entries
      // AR is an asset, so balance = debits - credits
      const result = await db
        .select({
          debits: sql<string>`COALESCE(SUM(${ledgerEntries.debit_amount}), 0)`,
          credits: sql<string>`COALESCE(SUM(${ledgerEntries.credit_amount}), 0)`,
        })
        .from(ledgerEntries)
        .innerJoin(payments, eq(ledgerEntries.reference_id, payments.id))
        .where(
          and(
            eq(ledgerEntries.org_id, orgId),
            eq(ledgerEntries.account_id, arAccount.id),
            eq(ledgerEntries.reference_type, 'payment'),
            eq(payments.resident_id, input.residentId)
          )
        );

      const debits = parseFloat(result[0]?.debits || '0');
      const credits = parseFloat(result[0]?.credits || '0');
      const balance = debits - credits;

      return {
        residentId: input.residentId,
        balance: balance.toFixed(2),
      };
    }),

  /**
   * Get resident statement (all ledger entries)
   * Returns entries grouped by month
   */
  getResidentStatement: protectedProcedure
    .meta({ permission: 'payment:read', resource: 'payment' })
    .input(getResidentStatementSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Build conditions
      const conditions = [
        eq(ledgerEntries.org_id, orgId),
        eq(payments.resident_id, input.residentId),
        eq(ledgerEntries.reference_type, 'payment'),
      ];

      if (input.dateFrom) {
        conditions.push(gte(ledgerEntries.transaction_date, new Date(input.dateFrom)));
      }

      if (input.dateTo) {
        conditions.push(lte(ledgerEntries.transaction_date, new Date(input.dateTo)));
      }

      // Get all ledger entries for this resident
      const entries = await db
        .select({
          id: ledgerEntries.id,
          transactionId: ledgerEntries.transaction_id,
          transactionDate: ledgerEntries.transaction_date,
          description: ledgerEntries.description,
          debitAmount: ledgerEntries.debit_amount,
          creditAmount: ledgerEntries.credit_amount,
          accountCode: ledgerAccounts.code,
          accountName: ledgerAccounts.name,
          referenceType: ledgerEntries.reference_type,
          referenceId: ledgerEntries.reference_id,
        })
        .from(ledgerEntries)
        .innerJoin(ledgerAccounts, eq(ledgerEntries.account_id, ledgerAccounts.id))
        .innerJoin(payments, eq(ledgerEntries.reference_id, payments.id))
        .where(and(...conditions))
        .orderBy(desc(ledgerEntries.transaction_date));

      return {
        residentId: input.residentId,
        entries,
      };
    }),
});
