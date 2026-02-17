/**
 * Ledger Router
 *
 * Double-entry ledger operations.
 * Source: docs/05_PAYMENTS.md Section 4 (Double-Entry Ledger)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '../db/client';
import { ledgerAccounts, ledgerEntries } from '../db/schema/payments';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { NotFoundError, InvalidInputError } from '@/lib/errors';

/**
 * List ledger entries input schema
 */
const listEntriesSchema = z.object({
  accountId: z.string().uuid().optional(),
  referenceType: z.string().optional(), // 'payment', 'invoice', 'refund'
  dateFrom: z.string().optional(), // ISO date
  dateTo: z.string().optional(), // ISO date
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});

/**
 * Create ledger entry input schema
 */
const createEntrySchema = z.object({
  debitAccountCode: z.string(), // e.g., "1100"
  creditAccountCode: z.string(), // e.g., "1000"
  amount: z.string(), // Decimal string
  description: z.string().min(1),
  transactionDate: z.string().datetime(),
  referenceType: z.string().optional(), // 'payment', 'invoice', 'refund', 'adjustment'
  referenceId: z.string().uuid().optional(),
});

/**
 * Standard chart of accounts (16 accounts from docs/05_PAYMENTS.md)
 */
const CHART_OF_ACCOUNTS = [
  { code: '1000', name: 'Accounts Receivable', type: 'asset' as const, description: 'Amounts owed by residents' },
  { code: '1010', name: 'Allowance for Doubtful Accounts', type: 'asset' as const, description: 'Estimated uncollectible receivables' },
  { code: '1100', name: 'Cash - Stripe', type: 'asset' as const, description: 'Cash held in Stripe account' },
  { code: '1110', name: 'Cash - External', type: 'asset' as const, description: 'Cash, checks, wire transfers' },
  { code: '1200', name: 'Security Deposits Held', type: 'asset' as const, description: 'Refundable security deposits' },
  { code: '2000', name: 'Unearned Revenue', type: 'liability' as const, description: 'Prepaid rent/fees' },
  { code: '2010', name: 'Accounts Payable', type: 'liability' as const, description: 'Amounts owed to vendors' },
  { code: '2020', name: 'Security Deposits Payable', type: 'liability' as const, description: 'Liability for refundable deposits' },
  { code: '3000', name: 'Rent Revenue', type: 'revenue' as const, description: 'Rental income' },
  { code: '3010', name: 'Program Fee Revenue', type: 'revenue' as const, description: 'Program and service fees' },
  { code: '3020', name: 'Late Fee Revenue', type: 'revenue' as const, description: 'Late payment fees' },
  { code: '3030', name: 'Damage Fee Revenue', type: 'revenue' as const, description: 'Property damage charges' },
  { code: '3040', name: 'Other Revenue', type: 'revenue' as const, description: 'Miscellaneous income' },
  { code: '4000', name: 'Refund Expense', type: 'expense' as const, description: 'Payment refunds issued' },
  { code: '4010', name: 'Bad Debt Expense', type: 'expense' as const, description: 'Uncollectible receivables written off' },
  { code: '4020', name: 'Payment Processing Fees', type: 'expense' as const, description: 'Stripe fees and payment costs' },
  { code: '4030', name: 'Administrative Expenses', type: 'expense' as const, description: 'General administrative costs' },
];

/**
 * Ledger router
 */
export const ledgerRouter = router({
  /**
   * List ledger accounts with computed balances
   */
  listAccounts: protectedProcedure
    .meta({ permission: 'ledger:read', resource: 'ledger' })
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const orgId = (ctx as any).orgId as string;

      // Get all accounts
      const accounts = await db.query.ledgerAccounts.findMany({
        where: eq(ledgerAccounts.org_id, orgId),
        orderBy: [ledgerAccounts.code],
      });

      // Compute balances for each account
      const accountsWithBalances = await Promise.all(
        accounts.map(async (account) => {
          const result = await db
            .select({
              debits: sql<string>`COALESCE(SUM(${ledgerEntries.debit_amount}), 0)`,
              credits: sql<string>`COALESCE(SUM(${ledgerEntries.credit_amount}), 0)`,
            })
            .from(ledgerEntries)
            .where(
              and(
                eq(ledgerEntries.org_id, orgId),
                eq(ledgerEntries.account_id, account.id)
              )
            );

          const debits = parseFloat(result[0]?.debits || '0');
          const credits = parseFloat(result[0]?.credits || '0');

          // Calculate balance based on account type
          // Assets, Expenses: debits increase balance (debits - credits)
          // Liabilities, Equity, Revenue: credits increase balance (credits - debits)
          let balance: number;
          if (account.account_type === 'asset' || account.account_type === 'expense') {
            balance = debits - credits;
          } else {
            balance = credits - debits;
          }

          return {
            ...account,
            balance: balance.toFixed(2),
            debits: debits.toFixed(2),
            credits: credits.toFixed(2),
          };
        })
      );

      return accountsWithBalances;
    }),

  /**
   * Initialize standard chart of accounts for a new org
   * Idempotent: safe to call multiple times
   */
  initializeAccounts: protectedProcedure
    .meta({ permission: 'ledger:admin', resource: 'ledger' })
    .input(z.object({}).optional())
    .mutation(async ({ ctx }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      // Check if accounts already exist
      const existingAccounts = await db.query.ledgerAccounts.findMany({
        where: eq(ledgerAccounts.org_id, orgId),
      });

      if (existingAccounts.length > 0) {
        // Already initialized, return existing
        return {
          created: false,
          message: 'Accounts already initialized',
          accounts: existingAccounts,
        };
      }

      // Create all accounts
      const createdAccounts = await db
        .insert(ledgerAccounts)
        .values(
          CHART_OF_ACCOUNTS.map((account) => ({
            org_id: orgId,
            code: account.code,
            name: account.name,
            account_type: account.type,
            description: account.description,
            is_system: true, // System accounts cannot be deleted
            is_active: true,
            created_by: userId,
            updated_by: userId,
          }))
        )
        .returning();

      return {
        created: true,
        message: `Created ${createdAccounts.length} ledger accounts`,
        accounts: createdAccounts,
      };
    }),

  /**
   * Get account balance (computed from entries)
   */
  getAccountBalance: protectedProcedure
    .meta({ permission: 'ledger:read', resource: 'ledger' })
    .input(z.object({ accountCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Get account
      const account = await db.query.ledgerAccounts.findFirst({
        where: and(
          eq(ledgerAccounts.org_id, orgId),
          eq(ledgerAccounts.code, input.accountCode)
        ),
      });

      if (!account) {
        throw new NotFoundError('Ledger Account', input.accountCode);
      }

      // Calculate balance
      const result = await db
        .select({
          debits: sql<string>`COALESCE(SUM(${ledgerEntries.debit_amount}), 0)`,
          credits: sql<string>`COALESCE(SUM(${ledgerEntries.credit_amount}), 0)`,
        })
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.org_id, orgId),
            eq(ledgerEntries.account_id, account.id)
          )
        );

      const debits = parseFloat(result[0]?.debits || '0');
      const credits = parseFloat(result[0]?.credits || '0');

      // Calculate balance based on account type
      let balance: number;
      if (account.account_type === 'asset' || account.account_type === 'expense') {
        balance = debits - credits;
      } else {
        balance = credits - debits;
      }

      return {
        accountCode: account.code,
        accountName: account.name,
        accountType: account.account_type,
        balance: balance.toFixed(2),
        debits: debits.toFixed(2),
        credits: credits.toFixed(2),
      };
    }),

  /**
   * List ledger entries with filters
   */
  listEntries: protectedProcedure
    .meta({ permission: 'ledger:read', resource: 'ledger' })
    .input(listEntriesSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const conditions = [eq(ledgerEntries.org_id, orgId)];

      if (input.accountId) {
        conditions.push(eq(ledgerEntries.account_id, input.accountId));
      }

      if (input.referenceType) {
        conditions.push(eq(ledgerEntries.reference_type, input.referenceType));
      }

      if (input.dateFrom) {
        conditions.push(gte(ledgerEntries.transaction_date, new Date(input.dateFrom)));
      }

      if (input.dateTo) {
        conditions.push(lte(ledgerEntries.transaction_date, new Date(input.dateTo)));
      }

      if (input.cursor) {
        conditions.push(sql`${ledgerEntries.id} > ${input.cursor}`);
      }

      // Get entries with account info
      const items = await db
        .select({
          id: ledgerEntries.id,
          accountId: ledgerEntries.account_id,
          accountCode: ledgerAccounts.code,
          accountName: ledgerAccounts.name,
          transactionId: ledgerEntries.transaction_id,
          transactionDate: ledgerEntries.transaction_date,
          debitAmount: ledgerEntries.debit_amount,
          creditAmount: ledgerEntries.credit_amount,
          description: ledgerEntries.description,
          referenceType: ledgerEntries.reference_type,
          referenceId: ledgerEntries.reference_id,
          createdAt: ledgerEntries.created_at,
        })
        .from(ledgerEntries)
        .innerJoin(ledgerAccounts, eq(ledgerEntries.account_id, ledgerAccounts.id))
        .where(and(...conditions))
        .orderBy(desc(ledgerEntries.transaction_date))
        .limit(input.limit + 1);

      const hasMore = items.length > input.limit;
      const results = hasMore ? items.slice(0, input.limit) : items;

      return {
        items: results,
        nextCursor: hasMore ? results[results.length - 1]?.id : null,
      };
    }),

  /**
   * Create ledger entry pair (debit + credit)
   * MUST create both sides in same transaction
   */
  createEntry: protectedProcedure
    .meta({ permission: 'ledger:create', resource: 'ledger' })
    .input(createEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      // Get debit account
      const debitAccount = await db.query.ledgerAccounts.findFirst({
        where: and(
          eq(ledgerAccounts.org_id, orgId),
          eq(ledgerAccounts.code, input.debitAccountCode)
        ),
      });

      // Get credit account
      const creditAccount = await db.query.ledgerAccounts.findFirst({
        where: and(
          eq(ledgerAccounts.org_id, orgId),
          eq(ledgerAccounts.code, input.creditAccountCode)
        ),
      });

      if (!debitAccount) {
        throw new NotFoundError('Ledger Account (Debit)', input.debitAccountCode);
      }

      if (!creditAccount) {
        throw new NotFoundError('Ledger Account (Credit)', input.creditAccountCode);
      }

      // Validate amount
      const amount = parseFloat(input.amount);
      if (amount <= 0) {
        throw new InvalidInputError('Amount must be greater than zero');
      }

      // Create both entries in transaction
      const transactionId = crypto.randomUUID();
      const transactionDate = new Date(input.transactionDate);

      const entries = await db
        .insert(ledgerEntries)
        .values([
          {
            org_id: orgId,
            account_id: debitAccount.id,
            transaction_id: transactionId,
            transaction_date: transactionDate,
            debit_amount: input.amount,
            credit_amount: '0',
            description: input.description,
            reference_type: input.referenceType || null,
            reference_id: input.referenceId || null,
            created_by: userId,
          },
          {
            org_id: orgId,
            account_id: creditAccount.id,
            transaction_id: transactionId,
            transaction_date: transactionDate,
            debit_amount: '0',
            credit_amount: input.amount,
            description: input.description,
            reference_type: input.referenceType || null,
            reference_id: input.referenceId || null,
            created_by: userId,
          },
        ])
        .returning();

      return {
        transactionId,
        entries,
      };
    }),

  /**
   * Get trial balance (verify debits = credits)
   * Returns all account balances and validation
   */
  getTrialBalance: protectedProcedure
    .meta({ permission: 'ledger:read', resource: 'ledger' })
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const orgId = (ctx as any).orgId as string;

      // Get all accounts with balances
      const accounts = await db.query.ledgerAccounts.findMany({
        where: eq(ledgerAccounts.org_id, orgId),
        orderBy: [ledgerAccounts.code],
      });

      const accountBalances = await Promise.all(
        accounts.map(async (account) => {
          const result = await db
            .select({
              debits: sql<string>`COALESCE(SUM(${ledgerEntries.debit_amount}), 0)`,
              credits: sql<string>`COALESCE(SUM(${ledgerEntries.credit_amount}), 0)`,
            })
            .from(ledgerEntries)
            .where(
              and(
                eq(ledgerEntries.org_id, orgId),
                eq(ledgerEntries.account_id, account.id)
              )
            );

          const debits = parseFloat(result[0]?.debits || '0');
          const credits = parseFloat(result[0]?.credits || '0');

          // For trial balance, we show debit and credit totals (not net balance)
          return {
            code: account.code,
            name: account.name,
            type: account.account_type,
            debitBalance: debits > credits ? (debits - credits).toFixed(2) : '0.00',
            creditBalance: credits > debits ? (credits - debits).toFixed(2) : '0.00',
          };
        })
      );

      // Sum all debits and credits
      const totalDebits = accountBalances.reduce(
        (sum, account) => sum + parseFloat(account.debitBalance),
        0
      );

      const totalCredits = accountBalances.reduce(
        (sum, account) => sum + parseFloat(account.creditBalance),
        0
      );

      const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01; // Allow 1 cent rounding difference

      return {
        accounts: accountBalances,
        totalDebits: totalDebits.toFixed(2),
        totalCredits: totalCredits.toFixed(2),
        difference: (totalDebits - totalCredits).toFixed(2),
        isBalanced,
      };
    }),
});
