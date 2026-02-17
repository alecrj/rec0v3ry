/**
 * Ledger Helper Functions
 *
 * Double-entry accounting utilities for RecoveryOS payment ledger.
 * All amounts stored in cents internally, converted to dollars for DB storage.
 *
 * Architecture: docs/05_PAYMENTS.md Section 4 (Ledger)
 */

import { eq, and, sum, sql } from 'drizzle-orm';
import { db } from '../server/db/client';
import { ledgerAccounts, ledgerEntries } from '../server/db/schema/payments';
import { randomUUID } from 'node:crypto';

/**
 * Create balanced ledger entry pair (debit + credit)
 *
 * Double-entry accounting: every transaction has equal debits and credits
 *
 * Example: Payment received
 *   DR Cash-Stripe (1100) $100.00
 *   CR Accounts Receivable (1000) $100.00
 *
 * @returns transaction_id for both entries
 */
export async function createLedgerEntryPair(params: {
  orgId: string;
  debitAccountCode: string;
  creditAccountCode: string;
  amountCents: number; // Use cents to avoid floating point issues
  description: string;
  referenceType: string; // 'payment', 'invoice', 'refund', 'late_fee'
  referenceId: string;
  createdBy: string;
}): Promise<string> {
  const {
    orgId,
    debitAccountCode,
    creditAccountCode,
    amountCents,
    description,
    referenceType,
    referenceId,
    createdBy,
  } = params;

  // Convert cents to dollars for storage (numeric(10,2))
  const amountDollars = (amountCents / 100).toFixed(2);

  // Generate shared transaction ID
  const transactionId = randomUUID();
  const transactionDate = new Date();

  // Look up ledger account IDs
  const [debitAccount] = await db
    .select()
    .from(ledgerAccounts)
    .where(
      and(
        eq(ledgerAccounts.org_id, orgId),
        eq(ledgerAccounts.code, debitAccountCode)
      )
    )
    .limit(1);

  if (!debitAccount) {
    throw new Error(`Debit account not found: ${debitAccountCode}`);
  }

  const [creditAccount] = await db
    .select()
    .from(ledgerAccounts)
    .where(
      and(
        eq(ledgerAccounts.org_id, orgId),
        eq(ledgerAccounts.code, creditAccountCode)
      )
    )
    .limit(1);

  if (!creditAccount) {
    throw new Error(`Credit account not found: ${creditAccountCode}`);
  }

  // Insert debit entry
  await db.insert(ledgerEntries).values({
    org_id: orgId,
    account_id: debitAccount.id,
    transaction_id: transactionId,
    transaction_date: transactionDate,
    debit_amount: amountDollars,
    credit_amount: '0',
    description,
    reference_type: referenceType,
    reference_id: referenceId,
    created_by: createdBy,
  });

  // Insert credit entry
  await db.insert(ledgerEntries).values({
    org_id: orgId,
    account_id: creditAccount.id,
    transaction_id: transactionId,
    transaction_date: transactionDate,
    debit_amount: '0',
    credit_amount: amountDollars,
    description,
    reference_type: referenceType,
    reference_id: referenceId,
    created_by: createdBy,
  });

  return transactionId;
}

/**
 * Get account balance
 *
 * Balance = Sum(debits) - Sum(credits)
 * Note: For liability/revenue accounts, credits increase balance (inverted for display)
 */
export async function getAccountBalance(
  orgId: string,
  accountCode: string
): Promise<number> {
  // Look up account
  const [account] = await db
    .select()
    .from(ledgerAccounts)
    .where(
      and(eq(ledgerAccounts.org_id, orgId), eq(ledgerAccounts.code, accountCode))
    )
    .limit(1);

  if (!account) {
    throw new Error(`Account not found: ${accountCode}`);
  }

  // Calculate balance: debits - credits
  const result = await db
    .select({
      totalDebits: sum(ledgerEntries.debit_amount),
      totalCredits: sum(ledgerEntries.credit_amount),
    })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.org_id, orgId),
        eq(ledgerEntries.account_id, account.id)
      )
    );

  const totalDebits = Number(result[0]?.totalDebits || 0);
  const totalCredits = Number(result[0]?.totalCredits || 0);

  return totalDebits - totalCredits;
}

/**
 * Get resident balance (Accounts Receivable for specific resident)
 *
 * This requires querying ledger entries where reference_type = 'invoice'
 * and reference_id matches the resident's invoices.
 *
 * For simplicity, we'll calculate: Invoice total - Payments received
 */
export async function getResidentBalance(
  orgId: string,
  residentId: string
): Promise<number> {
  // This is a simplified version. In production, you'd query:
  // 1. Sum of all invoice line items for resident
  // 2. Minus sum of all payments for resident
  // 3. From ledger entries with reference_type = 'invoice' or 'payment'

  // For now, return 0 as placeholder
  // Implementation will be completed when invoice/payment routers are built
  return 0;
}
