# RecoveryOS - Payments Architecture

> **Status**: Complete
> **Owner**: payments-architect
> **Last Updated**: 2026-02-12
> **Depends On**: [01_REQUIREMENTS.md](01_REQUIREMENTS.md) (PAY-01 through PAY-22), [04_COMPLIANCE.md](04_COMPLIANCE.md) (PCI, audit logging, multi-tenancy), [06_ROADMAP.md](06_ROADMAP.md) (Sprints 9-12)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Stripe Connect Architecture](#2-stripe-connect-architecture)
3. [Double-Entry Ledger Design](#3-double-entry-ledger-design)
4. [Invoice Lifecycle](#4-invoice-lifecycle)
5. [Payment Flows](#5-payment-flows)
6. [Proration Engine](#6-proration-engine)
7. [Multi-Payer Architecture](#7-multi-payer-architecture)
8. [Dunning & Collections](#8-dunning--collections)
9. [Deposit Management](#9-deposit-management)
10. [Reconciliation & Reporting](#10-reconciliation--reporting)
11. [PCI Compliance & Security](#11-pci-compliance--security)
12. [Payout Architecture](#12-payout-architecture)
13. [Webhook Processing](#13-webhook-processing)
14. [Idempotency & Error Handling](#14-idempotency--error-handling)

---

## 1. Architecture Overview

### Design Principles

1. **Ledger is the source of truth** -- no cached balance fields, no computed columns stored. Every balance is derived from summing ledger entries.
2. **Every financial operation is idempotent** -- retrying a payment, invoice generation, or fee assessment never creates duplicates.
3. **Stripe never stores SUD data** -- payment metadata contains no clinical information. Stripe sees amounts, descriptions like "Monthly Rent -- Unit 3B", and payer identity. No Part 2 data crosses the PCI boundary.
4. **External payments are first-class** -- cash, check, money order, Zelle, Venmo, and state vouchers all produce ledger entries identical in structure to Stripe-processed payments.
5. **Immutable ledger entries** -- corrections are made via reversal entries, never by modifying existing records.
6. **Multi-payer from day one** -- every invoice can be split across multiple payers with different payment methods.

### System Boundaries

```
                                   RecoveryOS Platform
                    ┌──────────────────────────────────────────┐
                    │                                          │
  Operator CRM      │   ┌──────────┐     ┌──────────────┐     │
  (Desktop)  ───────┤──>│  tRPC    │────>│  Ledger      │     │
                    │   │  API     │     │  Engine      │     │
  Resident PWA      │   │  Routes  │     │  (Source of  │     │
  (Mobile)   ───────┤──>│          │────>│   Truth)     │     │
                    │   └────┬─────┘     └──────┬───────┘     │
  Family Portal     │        │                  │             │
  (Web/Mobile) ─────┤──>     │                  │             │
                    │   ┌────┴─────┐     ┌──────┴───────┐     │
                    │   │  Stripe  │     │  PostgreSQL  │     │
                    │   │  Client  │     │  (Neon)      │     │
                    │   └────┬─────┘     └──────────────┘     │
                    │        │                                │
                    └────────┼────────────────────────────────┘
                             │
                    ┌────────┴────────────┐
                    │   Stripe Connect    │
                    │   ┌──────────────┐  │
                    │   │  Platform    │  │
                    │   │  (RecoveryOS)│  │
                    │   └──────┬───────┘  │
                    │          │          │
                    │   ┌──────┴───────┐  │
                    │   │  Connected   │  │
                    │   │  Accounts    │  │
                    │   │  (per org)   │  │
                    │   └──────────────┘  │
                    └─────────────────────┘
```

---

## 2. Stripe Connect Architecture

### Platform Model

RecoveryOS uses **Stripe Connect** with the **Platform (destination charges)** model:

| Component | Role |
|-----------|------|
| **RecoveryOS** | Platform account. Owns the Stripe integration. Collects platform fees. |
| **Each operator org** | Connected Account (Express). Receives payouts from resident payments. |
| **Residents/payers** | Customers. Payment methods attached via Stripe Elements. |

**Why destination charges (not direct charges)**:
- Platform controls the payment flow end-to-end
- Platform fee deducted before payout to operator
- Platform handles disputes and refunds on behalf of operators
- Single Stripe dashboard for RecoveryOS to monitor all orgs
- Operators still see their own Stripe Express dashboard for payouts

### Connected Account Onboarding

RecoveryOS uses **Stripe Connect Express** accounts for operator onboarding.

```
Operator Onboarding Flow
═══════════════════════

1. Org Owner clicks "Connect Payments" in Org Settings
      │
2. RecoveryOS creates Express Connected Account
      │  POST /v1/accounts
      │  { type: "express", country: "US",
      │    capabilities: { card_payments: {requested: true},
      │                    us_bank_account_ach_payments: {requested: true},
      │                    transfers: {requested: true} },
      │    business_type: "company",
      │    metadata: { org_id: "org_xxx" } }
      │
3. RecoveryOS generates Account Link (onboarding URL)
      │  POST /v1/account_links
      │  { account: "acct_xxx", type: "account_onboarding",
      │    refresh_url: "https://app.recoveryos.com/settings/payments/refresh",
      │    return_url: "https://app.recoveryos.com/settings/payments/complete" }
      │
4. Org Owner redirected to Stripe-hosted onboarding
      │  (Identity verification, bank account, tax info)
      │
5. Stripe webhook: account.updated
      │  { charges_enabled: true, payouts_enabled: true }
      │
6. RecoveryOS marks org as "payments_active"
      │  Operator can now accept payments
```

**Stored per org**:

| Field | Type | Description |
|-------|------|-------------|
| `stripe_account_id` | string | Stripe Connected Account ID (`acct_xxx`) |
| `charges_enabled` | boolean | Can accept payments |
| `payouts_enabled` | boolean | Can receive payouts |
| `onboarding_complete` | boolean | All verification steps done |
| `platform_fee_percent` | decimal(5,4) | RecoveryOS fee (e.g., 0.0250 = 2.5%) |
| `platform_fee_fixed_cents` | integer | Per-transaction fixed fee in cents (e.g., 30) |

### Stripe Customer Management

Each payer (resident, family member, sponsor, agency) is a Stripe Customer linked to the operator's Connected Account.

```
Stripe Customer Creation
════════════════════════

POST /v1/customers
Headers: Stripe-Account: acct_xxx  (Connected Account)
Body: {
  email: "resident@example.com",
  name: "John Doe",
  metadata: {
    recoveryos_payer_id: "pyr_xxx",
    recoveryos_org_id: "org_xxx",
    payer_type: "resident"
  }
}
```

Payment methods (cards, bank accounts) are attached to Stripe Customers on the Connected Account. This ensures operators own their customer relationships -- if they leave RecoveryOS, their Stripe data remains.

---

## 3. Double-Entry Ledger Design

### Core Principle

Every money movement in RecoveryOS creates exactly two ledger entries: one debit and one credit. The sum of all debits always equals the sum of all credits. There are no stored balance fields anywhere -- all balances are computed from the ledger at query time.

### Account Types

The ledger uses standard accounting account types:

| Type | Normal Balance | Description | Debit Increases | Credit Increases |
|------|---------------|-------------|:---:|:---:|
| **Asset** | Debit | What is owed TO the org (receivables, cash) | Yes | -- |
| **Liability** | Credit | What the org OWES (deposits held, credits owed) | -- | Yes |
| **Revenue** | Credit | Income earned (rent, fees) | -- | Yes |
| **Expense** | Debit | Costs incurred (refunds given, write-offs) | Yes | -- |

### Chart of Accounts

| Account Code | Name | Type | Description |
|-------------|------|------|-------------|
| **1000** | Accounts Receivable | Asset | Rent, fees, charges owed by residents/payers |
| **1010** | Accounts Receivable - Deposits | Asset | Deposits owed but not yet collected |
| **1100** | Cash - Stripe | Asset | Payments received via Stripe (pending payout) |
| **1110** | Cash - External | Asset | Payments received via cash, check, etc. |
| **1200** | Platform Fee Receivable | Asset | Platform fees owed to RecoveryOS |
| **2000** | Deposit Liability | Liability | Security deposits held on behalf of residents |
| **2010** | Credit Balance | Liability | Overpayments or credits owed to residents |
| **2020** | Deferred Revenue | Liability | Payments received for future periods |
| **3000** | Rent Revenue | Revenue | Monthly rent income |
| **3010** | Program Fee Revenue | Revenue | Program/service fees |
| **3020** | Late Fee Revenue | Revenue | Late fee income |
| **3030** | Application Fee Revenue | Revenue | Application/intake fees |
| **3040** | Other Fee Revenue | Revenue | Fines, miscellaneous charges |
| **4000** | Refund Expense | Expense | Refunds issued to payers |
| **4010** | Write-Off Expense | Expense | Bad debt written off |
| **4020** | Platform Fee Expense | Expense | Fees paid to RecoveryOS platform |
| **4030** | Processing Fee Expense | Expense | Stripe processing fees |

### Ledger Entry Schema

```sql
CREATE TABLE ledger_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  transaction_id  UUID NOT NULL,          -- groups debit+credit pair
  account_code    VARCHAR(10) NOT NULL,   -- from chart of accounts
  entry_type      VARCHAR(6) NOT NULL     -- 'debit' or 'credit'
    CHECK (entry_type IN ('debit', 'credit')),
  amount_cents    BIGINT NOT NULL         -- always positive
    CHECK (amount_cents > 0),
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
  resident_id     UUID REFERENCES residents(id),
  payer_id        UUID REFERENCES payers(id),
  invoice_id      UUID REFERENCES invoices(id),
  payment_id      UUID REFERENCES payments(id),
  description     TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  idempotency_key VARCHAR(255) UNIQUE,    -- prevents duplicate entries
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID NOT NULL REFERENCES users(id),

  -- Immutability: no updated_at column. Corrections via reversal entries.
  -- RLS: org_id scoping enforced at database level.
);

-- Indexes for common queries
CREATE INDEX idx_ledger_org_created ON ledger_entries(org_id, created_at DESC);
CREATE INDEX idx_ledger_transaction ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_resident ON ledger_entries(resident_id, created_at DESC);
CREATE INDEX idx_ledger_invoice ON ledger_entries(invoice_id);
CREATE INDEX idx_ledger_account ON ledger_entries(org_id, account_code, created_at DESC);
CREATE INDEX idx_ledger_idempotency ON ledger_entries(idempotency_key);
```

### Ledger Invariants

These invariants are enforced programmatically and verified by nightly reconciliation:

1. **Balance invariant**: `SUM(debits) = SUM(credits)` globally within each org
2. **Transaction invariant**: Every `transaction_id` has exactly one debit and one credit entry with equal `amount_cents`
3. **Immutability invariant**: No UPDATE or DELETE on `ledger_entries` table (enforced by PostgreSQL REVOKE)
4. **Idempotency invariant**: No two entries share an `idempotency_key`

### Balance Computation

Balances are always computed, never stored:

```sql
-- Resident balance (what they owe)
-- Positive = resident owes money, Negative = resident has a credit
SELECT
  COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount_cents ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount_cents ELSE 0 END), 0)
  AS balance_cents
FROM ledger_entries
WHERE org_id = $1
  AND resident_id = $2
  AND account_code = '1000';  -- Accounts Receivable
```

For performance at scale, a materialized view refreshes on a configurable schedule (default: every 5 minutes) for dashboard queries. The materialized view is clearly marked as a cache and is never used for transactional decisions.

---

## 4. Invoice Lifecycle

### Invoice Schema

```sql
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  invoice_number  VARCHAR(50) NOT NULL,     -- human-readable, org-unique
  resident_id     UUID NOT NULL REFERENCES residents(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void', 'written_off')),
  billing_period_start DATE,
  billing_period_end   DATE,
  due_date        DATE NOT NULL,
  subtotal_cents  BIGINT NOT NULL DEFAULT 0,
  adjustments_cents BIGINT NOT NULL DEFAULT 0,
  total_cents     BIGINT NOT NULL DEFAULT 0,
  paid_cents      BIGINT NOT NULL DEFAULT 0,  -- denormalized for query speed
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
  notes           TEXT,
  idempotency_key VARCHAR(255) UNIQUE,
  sent_at         TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  voided_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID NOT NULL REFERENCES users(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(org_id, invoice_number)
);

CREATE TABLE invoice_line_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id),
  description     TEXT NOT NULL,
  charge_type     VARCHAR(30) NOT NULL
    CHECK (charge_type IN ('rent', 'deposit', 'program_fee', 'late_fee',
                           'application_fee', 'fine', 'other', 'proration_credit',
                           'proration_charge', 'discount', 'credit_applied')),
  amount_cents    BIGINT NOT NULL,          -- positive for charges, negative for credits
  quantity        INTEGER NOT NULL DEFAULT 1,
  period_start    DATE,
  period_end      DATE,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Invoice State Machine

```
                    ┌──────────┐
                    │  draft   │
                    └────┬─────┘
                         │ send()
                    ┌────┴─────┐
            ┌──────>│  sent    │<──────┐
            │       └────┬─────┘       │
            │            │             │
            │   partial  │  full       │ payment
            │   payment  │  payment    │ reversed
            │            │             │
            │  ┌─────────┴──┐    ┌─────┴────────┐
            │  │ partially  │    │              │
            │  │ _paid      │───>│    paid      │
            │  └─────┬──────┘    └──────────────┘
            │        │
            │  due_date passes
            │        │
            │  ┌─────┴──────┐
            └──│  overdue   │
               └─────┬──────┘
                     │
           ┌─────────┼─────────┐
           │         │         │
     ┌─────┴───┐  ┌──┴───┐  ┌─┴──────────┐
     │  void   │  │ paid │  │ written_off │
     └─────────┘  └──────┘  └────────────-┘
```

### Invoice Generation

Invoices are generated by a scheduled job at the start of each billing cycle.

```
Invoice Generation Flow
═══════════════════════

1. Scheduler triggers at cycle start (configurable: 1st of month, start of week, etc.)
      │
2. For each active resident in the org:
      │
3. Calculate line items:
      │  ├── Base rent (from rate configuration)
      │  ├── Proration adjustment (if mid-cycle move-in/out/transfer)
      │  ├── Recurring program fees
      │  ├── Pending one-time charges (fines, fees queued by staff)
      │  └── Credits/adjustments (manually added)
      │
4. Create invoice record with status = 'draft'
      │  Idempotency key: org_id + resident_id + billing_period_start
      │
5. Create ledger entries:
      │  DEBIT  1000 Accounts Receivable  $X (total invoice amount)
      │  CREDIT 3000 Rent Revenue         $Y (rent portion)
      │  CREDIT 3010 Program Fee Revenue  $Z (fee portion)
      │  ... (one credit per revenue category)
      │
6. Split invoice across payers (if multi-payer configured)
      │
7. Transition status to 'sent'
      │  Send notification to resident + payers (email + in-app)
```

---

## 5. Payment Flows

### 5.1 Card Payment (Stripe)

```
Card Payment Flow
═════════════════

1. Payer opens payment portal (resident PWA or family portal)
      │
2. Selects invoice(s) to pay, enters amount
      │  (can pay full invoice, partial amount, or multiple invoices)
      │
3. Frontend creates Payment Intent via tRPC
      │
4. Backend creates Stripe PaymentIntent (destination charge):
      │  POST /v1/payment_intents
      │  {
      │    amount: 125000,                    // $1,250.00
      │    currency: "usd",
      │    customer: "cus_resident_xxx",
      │    payment_method_types: ["card"],
      │    on_behalf_of: "acct_operator",     // Connected Account
      │    transfer_data: {
      │      destination: "acct_operator",
      │      amount: 121875                   // $1,250.00 - 2.5% platform fee
      │    },
      │    metadata: {
      │      org_id: "org_xxx",
      │      payment_id: "pay_xxx",           // RecoveryOS payment ID
      │      invoice_ids: "inv_001,inv_002",
      │      payer_id: "pyr_xxx"
      │    },
      │    idempotency_key: "pay_xxx"
      │  }
      │
5. Frontend renders Stripe Elements for card input
      │  (Card number, expiry, CVC -- never touches our servers)
      │
6. Payer confirms payment -> Stripe processes
      │
7. Stripe webhook: payment_intent.succeeded
      │
8. Backend records payment and creates ledger entries:
      │  DEBIT  1100 Cash - Stripe           $1,250.00
      │  CREDIT 1000 Accounts Receivable     $1,250.00
      │
      │  DEBIT  4030 Processing Fee Expense  $36.25 (Stripe fee)
      │  CREDIT 1100 Cash - Stripe           $36.25
      │
      │  DEBIT  4020 Platform Fee Expense    $31.25 (RecoveryOS fee)
      │  CREDIT 1200 Platform Fee Receivable $31.25
      │
9. Update invoice status (paid or partially_paid)
      │
10. Send receipt to payer (email + in-app)
      │
11. Audit log: payment_received
```

### 5.2 ACH Bank Transfer (Stripe)

ACH payments follow the same flow as card payments with these differences:

| Aspect | Card | ACH |
|--------|------|-----|
| Payment method type | `card` | `us_bank_account` |
| Confirmation | Immediate | 4-5 business days (micro-deposit verification for new accounts) |
| Stripe fee | 2.9% + $0.30 | 0.8% capped at $5.00 |
| Failure window | Immediate | Up to 4 business days after confirmation |
| Dispute window | 120 days | 60 days |

ACH-specific ledger handling:

```
ACH Payment Lifecycle
═════════════════════

1. PaymentIntent created (status: requires_confirmation)
      │  Ledger: no entry yet (payment not confirmed)
      │
2. Payer confirms bank account (instant or micro-deposits)
      │
3. PaymentIntent confirmed (status: processing)
      │  Ledger: DEBIT 1100 Cash-Stripe (pending) / CREDIT 1000 AR
      │  Payment record status: 'processing'
      │
4a. Webhook: payment_intent.succeeded
      │  Ledger: Payment record status -> 'completed'
      │  Invoice updated
      │
4b. Webhook: payment_intent.payment_failed
      │  Ledger: REVERSE (debit 1000 AR / credit 1100 Cash-Stripe)
      │  Payment record status -> 'failed'
      │  Notification to payer + house manager
```

### 5.3 External Payments (Cash, Check, Money Order)

External payments are recorded by staff and create the same ledger structure as electronic payments.

```
External Payment Recording
══════════════════════════

1. House Manager or Property Manager opens payment recording form
      │
2. Enters:
      │  ├── Payer (select from resident's payer list)
      │  ├── Amount
      │  ├── Payment method: cash | check | money_order
      │  ├── Reference number (check number, money order serial)
      │  ├── Date received
      │  └── Notes (optional)
      │
3. Backend validates and creates payment record
      │  Idempotency key: org_id + method + reference + amount + date
      │
4. Ledger entries:
      │  DEBIT  1110 Cash - External         $500.00
      │  CREDIT 1000 Accounts Receivable     $500.00
      │
5. Invoice status updated
      │
6. Receipt generated (printable for resident)
      │
7. Audit log: payment_created (manual)
```

### 5.4 External Digital Payments (Zelle, Venmo, Cash App)

Same flow as external payments with `payment_method` set to `zelle`, `venmo`, or `cashapp`. The reference field captures the transaction ID or confirmation number from the external service. These payments are not processed through Stripe -- they are record-keeping entries only.

### 5.5 State Voucher / Insurance Payments

State agency and insurance payments are recorded as external payments with additional fields:

| Field | Description |
|-------|-------------|
| `payer_type` | `state_agency` or `insurance` |
| `authorization_number` | Pre-authorization or voucher number |
| `covered_period_start` | Start of covered period |
| `covered_period_end` | End of covered period |
| `approved_amount_cents` | Approved amount per period |

Ledger entries are identical to other external payments. The additional metadata enables reporting on state/insurance revenue separately.

### 5.6 Refund Processing

```
Refund Flow
════════════

1. Staff initiates refund from payment detail screen
      │  ├── Full refund: entire payment amount
      │  └── Partial refund: specified amount <= original payment
      │
2. For Stripe payments:
      │  POST /v1/refunds
      │  {
      │    payment_intent: "pi_xxx",
      │    amount: 50000,                    // $500.00 (partial)
      │    reason: "requested_by_customer",
      │    metadata: { refund_id: "ref_xxx", org_id: "org_xxx" },
      │    idempotency_key: "ref_xxx"
      │  }
      │  Headers: Stripe-Account: acct_operator
      │
3. For external payments:
      │  Staff records refund method (cash back, check mailed, etc.)
      │
4. Ledger entries:
      │  DEBIT  4000 Refund Expense          $500.00
      │  CREDIT 1100 Cash - Stripe           $500.00  (or 1110 Cash - External)
      │
5. If refund exceeds invoice balance, create credit:
      │  DEBIT  1000 Accounts Receivable     $X (reduce AR)
      │  CREDIT 2010 Credit Balance          $X (credit owed to resident)
      │
6. Invoice status may revert to 'partially_paid' or 'sent'
      │
7. Audit log: payment_refunded
```

### 5.7 Credit Application

Credits (from overpayments, goodwill adjustments, or deposit refund remainders) are tracked in the `2010 Credit Balance` liability account and can be applied to future invoices.

```
Credit Application
══════════════════

1. Staff or automated system applies credit to invoice
      │
2. Ledger entries:
      │  DEBIT  2010 Credit Balance          $200.00
      │  CREDIT 1000 Accounts Receivable     $200.00
      │
3. Invoice line item added: type = 'credit_applied'
      │
4. Invoice paid_cents updated; status transitions as needed
```

---

## 6. Proration Engine

### Proration Triggers

| Trigger | Direction | Description |
|---------|-----------|-------------|
| Mid-month move-in | Charge | Resident pays for remaining days in period |
| Mid-month move-out | Credit | Resident credited for unused days in period |
| Mid-month bed transfer (rate change) | Charge + Credit | Credit for old rate remaining days, charge for new rate remaining days |
| Rate change mid-period | Charge + Credit | Credit for old rate remaining days, charge for new rate remaining days |

### Proration Formula

```
daily_rate = monthly_rate / days_in_month

prorated_amount = daily_rate * days_in_period

Where:
  - days_in_month = actual days in the billing month (28, 29, 30, or 31)
  - days_in_period = days the resident occupies the bed during the billing period
```

### Move-In Proration Example

```
Scenario: Resident moves in on January 15
Monthly rate: $1,500.00
Days in January: 31
Days remaining (Jan 15-31): 17

Calculation:
  daily_rate = $1,500.00 / 31 = $48.387...
  prorated_amount = $48.387... * 17 = $822.58 (rounded to nearest cent)

Invoice line items:
  Line 1: "Monthly Rent (Jan 15 - Jan 31, prorated)" = $822.58

Ledger:
  DEBIT  1000 AR          $822.58
  CREDIT 3000 Rent Revenue $822.58
```

### Move-Out Proration Example

```
Scenario: Resident moves out on March 10
Monthly rate: $1,500.00
Days in March: 31
Days occupied (Mar 1-10): 10

Calculation:
  daily_rate = $1,500.00 / 31 = $48.387...
  prorated_charge = $48.387... * 10 = $483.87
  credit_amount = $1,500.00 - $483.87 = $1,016.13

If full month was already invoiced:
  Credit line item: "Move-out proration credit (Mar 11-31)" = -$1,016.13

Ledger:
  DEBIT  3000 Rent Revenue  $1,016.13  (reversal of unearned revenue)
  CREDIT 1000 AR             $1,016.13
```

### Transfer Proration

When a resident transfers between beds with different rates, both the old and new rates are prorated.

```
Scenario: Transfer on February 15
Old rate: $1,200.00/month  New rate: $1,500.00/month
Days in February: 28
Old period (Feb 1-14): 14 days  New period (Feb 15-28): 14 days

Old rate prorated: ($1,200.00 / 28) * 14 = $600.00
New rate prorated: ($1,500.00 / 28) * 14 = $750.00

Invoice line items:
  Line 1: "Rent - Old Room (Feb 1-14)"    = $600.00
  Line 2: "Rent - New Room (Feb 15-28)"   = $750.00
  Total:                                    = $1,350.00
```

---

## 7. Multi-Payer Architecture

### Payer Model

Each resident can have multiple payers. Each payer has a responsibility configuration.

```sql
CREATE TABLE payers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  resident_id       UUID NOT NULL REFERENCES residents(id),
  user_id           UUID REFERENCES users(id),  -- nullable for agencies
  payer_type        VARCHAR(20) NOT NULL
    CHECK (payer_type IN ('resident', 'family', 'sponsor', 'state_agency', 'insurance', 'other')),
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(20),
  relationship      VARCHAR(100),
  stripe_customer_id VARCHAR(255),             -- on Connected Account
  responsibility_type VARCHAR(10) NOT NULL DEFAULT 'percentage'
    CHECK (responsibility_type IN ('percentage', 'fixed')),
  responsibility_value DECIMAL(10,2) NOT NULL,  -- percentage (0-100) or fixed cents
  is_primary        BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  consent_id        UUID REFERENCES consents(id), -- Part 2 consent for family/sponsor
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Invoice Splitting

When an invoice is generated for a resident with multiple payers, the system creates `invoice_payer_allocations`:

```sql
CREATE TABLE invoice_payer_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id),
  payer_id        UUID NOT NULL REFERENCES payers(id),
  allocated_cents BIGINT NOT NULL,
  paid_cents      BIGINT NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'partially_paid', 'paid')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Split Billing Flow

```
Split Billing Example
═════════════════════

Resident: John Doe
Monthly rent: $2,000.00
Payers:
  - John (resident): 60% = $1,200.00
  - Jane Doe (mother, family): 40% = $800.00

Invoice #INV-2026-001: Total = $2,000.00

Allocations:
  ├── John:  $1,200.00 -> sent to resident portal
  └── Jane:  $800.00   -> sent to family portal

Each payer pays their allocation independently.
Payments from each payer create separate ledger entries.

Ledger when John pays his share:
  DEBIT  1100 Cash - Stripe   $1,200.00
  CREDIT 1000 AR              $1,200.00
  (payer_id = John's payer record)

Ledger when Jane pays her share:
  DEBIT  1100 Cash - Stripe   $800.00
  CREDIT 1000 AR              $800.00
  (payer_id = Jane's payer record)

Invoice transitions:
  sent -> partially_paid (after John pays) -> paid (after Jane pays)
```

### Family/Sponsor Payment Portal

Family and sponsor payers access a consent-gated payment portal:

1. Family member receives payment link or logs into family portal
2. System verifies active Part 2 consent (via `consent_id` on payer record)
3. If consent is active: display allocated invoices, balance, payment history
4. If consent is revoked/expired: display message explaining access is restricted, no financial data shown
5. Family pays their allocated portion via card or ACH
6. Payment receipt sent to family member

The family portal displays ONLY financial information (amounts, dates, invoice numbers). No clinical data, no SUD-related information, no resident status details. Stripe descriptions use generic terms ("Monthly Housing Fee" rather than "Sober Living Rent").

---

## 8. Dunning & Collections

### Dunning Ladder Configuration

Each org configures their own dunning ladder. The default configuration:

| Step | Days Past Due | Action | Notification Target |
|------|:---:|--------|---------------------|
| 1 | 1 | Past-due reminder | Resident + all active payers |
| 2 | 7 | Warning notice | Resident + all active payers + house manager |
| 3 | 14 | Account suspension | Resident + all active payers + property manager |
| 4 | 30 | Discharge review | Property manager + org admin |

### Dunning Configuration Schema

```sql
CREATE TABLE dunning_configurations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  step_number     INTEGER NOT NULL,
  days_past_due   INTEGER NOT NULL,
  action_type     VARCHAR(30) NOT NULL
    CHECK (action_type IN ('reminder', 'warning', 'suspension', 'discharge_review')),
  notification_template_id UUID REFERENCES notification_templates(id),
  auto_late_fee   BOOLEAN NOT NULL DEFAULT false,
  late_fee_type   VARCHAR(10) CHECK (late_fee_type IN ('flat', 'percentage')),
  late_fee_value  DECIMAL(10,2),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(org_id, step_number)
);
```

### Dunning Engine

```
Dunning Processing (runs daily)
════════════════════════════════

1. Query all invoices WHERE status = 'overdue' OR (status IN ('sent','partially_paid') AND due_date < NOW())
      │
2. For each overdue invoice:
      │
3. Calculate days_past_due = NOW() - due_date
      │
4. Look up dunning configuration for org
      │
5. For each dunning step not yet executed for this invoice:
      │  IF days_past_due >= step.days_past_due
      │  AND step not already executed (check dunning_events table)
      │  THEN:
      │
6.  ├── Execute action:
      │  │  ├── 'reminder': send reminder notification
      │  │  ├── 'warning': send warning notification
      │  │  ├── 'suspension': restrict resident portal access, notify
      │  │  └── 'discharge_review': create discharge review task for manager
      │  │
      │  ├── If auto_late_fee = true AND late fee not already assessed:
      │  │     Create late fee charge:
      │  │     ├── flat: add $X to invoice
      │  │     └── percentage: add X% of overdue amount
      │  │     Ledger:
      │  │       DEBIT  1000 AR              $late_fee
      │  │       CREDIT 3020 Late Fee Revenue $late_fee
      │  │
      │  ├── Record dunning_event (prevents re-execution)
      │  │
      │  └── Audit log: dunning_step_executed
```

### Grace Period

Each org can configure a grace period (default: 0 days) that delays the start of the dunning ladder. If grace_period = 3, the first dunning step at "day 1 past due" actually triggers on day 4 after the due date.

### Stripe Smart Retries

For failed Stripe payments (card declined, insufficient funds), RecoveryOS enables Stripe's Smart Retries:

- Stripe automatically retries failed payments using ML-optimized timing
- RecoveryOS receives `invoice.payment_failed` webhook for each failure
- After Stripe exhausts retries (configurable, default 4 attempts over 3 weeks), the payment is marked as permanently failed
- Failed payment triggers dunning ladder advancement

---

## 9. Deposit Management

### Deposit Lifecycle

```
Deposit Flow
═════════════

1. COLLECTION (at move-in)
      │
      │  Staff creates deposit charge for resident
      │  Ledger:
      │    DEBIT  1010 AR - Deposits     $500.00
      │    CREDIT 2000 Deposit Liability $500.00
      │
      │  Resident pays deposit (via any payment method)
      │  Ledger:
      │    DEBIT  1100 Cash - Stripe     $500.00  (or 1110 External)
      │    CREDIT 1010 AR - Deposits     $500.00
      │
2. HOLDING (during residency)
      │
      │  Deposit sits in 2000 Deposit Liability
      │  Balance query shows deposit held for this resident
      │
3. REFUND/FORFEITURE (at move-out)
      │
      │  Staff processes deposit disposition:
      │
      │  3a. Full refund:
      │      DEBIT  2000 Deposit Liability $500.00
      │      CREDIT 1100 Cash - Stripe     $500.00
      │      (Stripe refund issued to original payment method)
      │
      │  3b. Partial refund (deductions):
      │      DEBIT  2000 Deposit Liability $500.00
      │      CREDIT 1100 Cash - Stripe     $350.00  (refund amount)
      │      CREDIT 3040 Other Fee Revenue $150.00  (deductions: damages, cleaning)
      │
      │  3c. Full forfeiture:
      │      DEBIT  2000 Deposit Liability $500.00
      │      CREDIT 3040 Other Fee Revenue $500.00
      │
4. Deposit disposition record created with:
      │  ├── Original deposit amount
      │  ├── Deduction line items (description + amount)
      │  ├── Refund amount
      │  ├── Staff who processed
      │  └── Resident acknowledgment (optional e-signature)
      │
5. Audit log: deposit_refunded / deposit_forfeited
```

### Deposit Tracking

```sql
CREATE TABLE deposits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  resident_id     UUID NOT NULL REFERENCES residents(id),
  amount_cents    BIGINT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'collected', 'partially_refunded', 'refunded', 'forfeited')),
  collected_at    TIMESTAMPTZ,
  payment_id      UUID REFERENCES payments(id),
  disposition_at  TIMESTAMPTZ,
  refund_amount_cents  BIGINT DEFAULT 0,
  disposition_notes    TEXT,
  disposition_by       UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE deposit_deductions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id      UUID NOT NULL REFERENCES deposits(id),
  description     TEXT NOT NULL,
  amount_cents    BIGINT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 10. Reconciliation & Reporting

### Daily Reconciliation

The reconciliation engine matches internal ledger records against Stripe payout data.

```
Daily Reconciliation Flow
═════════════════════════

1. Fetch Stripe Balance Transactions for the day:
      │  GET /v1/balance_transactions?created[gte]=YYYY-MM-DD&created[lt]=YYYY-MM-DD+1
      │  Headers: Stripe-Account: acct_operator
      │
2. For each Stripe transaction:
      │  Match against ledger_entries by:
      │    - stripe_payment_intent_id (stored in payment.metadata)
      │    - amount_cents
      │    - transaction date
      │
3. Classification:
      │  ├── MATCHED: Stripe txn matches ledger entry (expected state)
      │  ├── STRIPE_ONLY: Stripe txn with no ledger entry (investigate)
      │  ├── LEDGER_ONLY: Ledger entry with no Stripe txn (pending or external)
      │  └── AMOUNT_MISMATCH: IDs match but amounts differ (error)
      │
4. Generate reconciliation report:
      │  ├── Total matched: $X
      │  ├── Stripe processing fees: $Y
      │  ├── Platform fees collected: $Z
      │  ├── Unmatched Stripe items: [list]
      │  ├── Unmatched ledger items: [list]
      │  └── Amount mismatches: [list]
      │
5. Flag discrepancies for manual review
      │
6. Audit log: reconciliation_completed
```

### Reconciliation Schema

```sql
CREATE TABLE reconciliation_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'completed_with_discrepancies', 'failed')),
  total_stripe_cents     BIGINT,
  total_ledger_cents     BIGINT,
  matched_count          INTEGER DEFAULT 0,
  stripe_only_count      INTEGER DEFAULT 0,
  ledger_only_count      INTEGER DEFAULT 0,
  mismatch_count         INTEGER DEFAULT 0,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reconciliation_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES reconciliation_runs(id),
  status            VARCHAR(20) NOT NULL
    CHECK (status IN ('matched', 'stripe_only', 'ledger_only', 'amount_mismatch')),
  stripe_txn_id     VARCHAR(255),
  ledger_entry_id   UUID REFERENCES ledger_entries(id),
  stripe_amount_cents BIGINT,
  ledger_amount_cents BIGINT,
  resolution        VARCHAR(20) CHECK (resolution IN ('auto_matched', 'manual_matched', 'investigated', 'written_off')),
  resolution_notes  TEXT,
  resolved_by       UUID REFERENCES users(id),
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Month-End Close

```
Month-End Close Process
═══════════════════════

1. Verify all daily reconciliations for the month are completed
      │
2. Verify ledger balance invariant:
      │  SUM(all debits) = SUM(all credits) for the period
      │
3. Generate month-end reports:
      │  ├── Revenue by category (rent, fees, late fees, other)
      │  ├── Collections by payment method (card, ACH, cash, check, external)
      │  ├── Outstanding AR aging (0-30, 31-60, 61-90, 90+ days)
      │  ├── Deposit liability balance
      │  ├── Credit balance liability
      │  ├── Platform fees assessed
      │  └── Write-offs
      │
4. Flag month as "closed" (prevents backdated ledger entries)
      │  Corrections to closed months require reversal entries dated in current month
      │
5. Audit log: month_end_close
```

### Financial Reports

| Report | Description | Data Source |
|--------|-------------|-------------|
| **AR Aging** | Outstanding balances by age bucket (0-30, 31-60, 61-90, 90+) per resident, per house, per property | Ledger entries on account 1000, grouped by invoice due_date |
| **Revenue by Property** | Total revenue per property per period, broken down by revenue type | Ledger entries on accounts 3000-3040 |
| **Collection Rate** | Percentage of invoiced amounts collected within period | Invoice total_cents vs. paid_cents for period |
| **Payment Method Mix** | Breakdown of payments by method (card, ACH, cash, etc.) | Payment records grouped by method |
| **Per-House P&L** | Revenue minus expenses per house | Ledger entries filtered by house (via resident's house assignment) |
| **Deposit Report** | All deposits: collected, held, refunded, forfeited | Deposits table with status breakdown |
| **Dunning Report** | Accounts in dunning: step, days overdue, total outstanding | Dunning events joined with invoice data |
| **Payer Report** | Revenue by payer type (resident, family, sponsor, agency) | Payments grouped by payer_type |

### Accounting Export

RecoveryOS supports export in formats compatible with external accounting software:

| Format | Target Software | Content |
|--------|----------------|---------|
| **CSV (General Journal)** | QuickBooks, Xero, any | Date, Account, Debit, Credit, Description, Reference |
| **IIF** | QuickBooks Desktop | QuickBooks Interchange Format for direct import |
| **CSV (Chart of Accounts)** | Any | Account code, name, type mapping |

Export includes only financial data -- no resident names (replaced with resident codes), no clinical data, no Part 2 information. Export events are logged in the audit trail.

---

## 11. PCI Compliance & Security

### PCI Scope Minimization

RecoveryOS achieves **PCI SAQ-A** compliance by never handling card data directly.

| Component | PCI Scope | Rationale |
|-----------|-----------|-----------|
| RecoveryOS servers | Out of scope | No card data stored, processed, or transmitted |
| Frontend (browser) | SAQ-A | Uses Stripe.js + Elements (hosted card fields) |
| Stripe | PCI DSS Level 1 | Stripe handles all card processing |

### Stripe Elements Integration

Card input fields are rendered by Stripe's JavaScript library inside iframes. The card number, expiration date, and CVC never touch RecoveryOS servers, DOM, or JavaScript scope.

```
Browser Security Model
══════════════════════

┌──────────────────────────────────────────────┐
│  RecoveryOS Frontend (our code)              │
│  ┌────────────────────────────────────────┐  │
│  │  Payment Form                         │  │
│  │  ┌──────────────────────────────────┐ │  │
│  │  │  Stripe Elements (iframe)        │ │  │
│  │  │  ┌────────────────────────────┐  │ │  │
│  │  │  │  Card Number: ****        │  │ │  │
│  │  │  │  Expiry: MM/YY            │  │ │  │
│  │  │  │  CVC: ***                 │  │ │  │
│  │  │  └────────────────────────────┘  │ │  │
│  │  │  (Stripe-hosted, cross-origin)   │ │  │
│  │  └──────────────────────────────────┘ │  │
│  │  [Pay $1,250.00]                      │  │
│  └────────────────────────────────────────┘  │
│  Card data NEVER enters our JavaScript scope │
└──────────────────────────────────────────────┘
```

### Webhook Security

All Stripe webhooks are verified using signature verification:

1. Stripe signs every webhook with a secret specific to the endpoint
2. RecoveryOS verifies the `Stripe-Signature` header using the webhook signing secret
3. Rejected webhooks are logged and alerted
4. Webhook endpoint is rate-limited to prevent abuse
5. Webhook processing is idempotent (re-delivery of the same event produces no side effects)

### Data Isolation

Stripe metadata contains only non-sensitive identifiers:

| Allowed in Stripe metadata | NOT allowed in Stripe metadata |
|---------------------------|-------------------------------|
| `org_id` | Resident name |
| `payment_id` | Diagnosis or clinical data |
| `invoice_ids` | Drug test results |
| `payer_id` | SUD-related information |
| `payer_type` | Any Part 2 data |

Stripe payment descriptions use generic terms: "Monthly Housing Fee", "Security Deposit", "Program Fee". No mention of "sober living", "recovery", or "substance" in any Stripe-facing data.

---

## 12. Payout Architecture

### Payout Flow

Stripe handles payouts from Connected Accounts to operator bank accounts automatically.

```
Payout Timeline
═══════════════

Day 0: Resident pays $1,250 via card
  └── Stripe captures payment
  └── Platform fee deducted ($31.25 at 2.5%)
  └── Processing fee deducted ($36.55 at 2.9% + $0.30)

Day 2 (default): Stripe initiates payout to operator bank
  └── Payout amount: $1,250.00 - $36.55 (processing) - $31.25 (platform) = $1,182.20
  └── Operator receives funds in bank account

RecoveryOS receives webhook: payout.paid
  └── Record payout in reconciliation system
```

### Payout Configuration

| Setting | Options | Default |
|---------|---------|---------|
| Payout schedule | Daily, Weekly, Monthly | Daily (Stripe default) |
| Payout speed | Standard (2 days), Instant (30 min, additional fee) | Standard |
| Minimum payout | Configurable per org | $0 (no minimum) |
| Payout currency | USD | USD |

Payout configuration is managed through the Stripe Express dashboard by the operator. RecoveryOS does not override these settings but displays payout status on the financial dashboard.

### Platform Fee Collection

RecoveryOS collects platform fees via Stripe's `application_fee_amount` on destination charges. Fees are automatically deducted from the payment before transfer to the Connected Account.

| Fee Component | Description | Example |
|---------------|-------------|---------|
| Percentage fee | Configurable per org (default 2.5%) | $1,250.00 * 2.5% = $31.25 |
| Per-transaction fee | Optional fixed fee per transaction | $0.30 |
| Total platform fee | percentage + fixed | $31.55 |

Platform fees are collected into the RecoveryOS platform Stripe account and appear in the operator's ledger as `4020 Platform Fee Expense`.

---

## 13. Webhook Processing

### Webhook Architecture

```
Stripe Webhook Processing
═════════════════════════

Stripe ──POST──> /api/webhooks/stripe
                    │
              Verify signature
                    │
              Parse event type
                    │
              Store raw event in webhook_events table
              (idempotency: check event.id for duplicates)
                    │
              Route to handler by event.type
                    │
        ┌───────────┼───────────────┬──────────────────┐
        │           │               │                  │
  payment_intent  charge         account            payout
  .succeeded      .refunded      .updated           .paid
  .failed         .dispute.*                        .failed
```

### Critical Webhook Events

| Event | Handler Action |
|-------|---------------|
| `payment_intent.succeeded` | Record payment, create ledger entries, update invoice status, send receipt |
| `payment_intent.payment_failed` | Mark payment failed, reverse pending ledger entries, notify payer + staff |
| `charge.refunded` | Record refund, create refund ledger entries, update invoice status |
| `charge.dispute.created` | Flag payment as disputed, notify org admin, create dispute record |
| `charge.dispute.closed` | Update dispute resolution, adjust ledger if lost (write-off) |
| `account.updated` | Update Connected Account status (charges_enabled, payouts_enabled) |
| `payout.paid` | Record payout for reconciliation |
| `payout.failed` | Alert org admin, flag for investigation |
| `customer.subscription.updated` | (Reserved for future recurring billing via Stripe Subscriptions) |

### Webhook Event Storage

```sql
CREATE TABLE webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(255) NOT NULL UNIQUE,  -- Stripe event ID for idempotency
  event_type      VARCHAR(100) NOT NULL,
  stripe_account_id VARCHAR(255),                 -- Connected Account
  org_id          UUID REFERENCES organizations(id),
  payload         JSONB NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processing', 'processed', 'failed')),
  processed_at    TIMESTAMPTZ,
  error_message   TEXT,
  retry_count     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Webhook Retry Strategy

If webhook processing fails:
1. Mark event as `failed` with error message
2. Background job retries failed events every 5 minutes (up to 5 retries)
3. After 5 retries, event marked as permanently failed and alerts ops team
4. Stripe also retries delivery for up to 3 days with exponential backoff

---

## 14. Idempotency & Error Handling

### Idempotency Strategy

Every financial operation in RecoveryOS uses idempotency keys to prevent duplicates.

| Operation | Idempotency Key Pattern | Scope |
|-----------|------------------------|-------|
| Invoice generation | `inv:{org_id}:{resident_id}:{period_start}` | Prevents duplicate invoices for same period |
| Payment recording | `pay:{org_id}:{payment_id}` | Prevents duplicate payment records |
| Ledger entry creation | `le:{org_id}:{transaction_id}:{entry_type}:{account_code}` | Prevents duplicate ledger entries |
| Refund processing | `ref:{org_id}:{refund_id}` | Prevents duplicate refunds |
| Late fee assessment | `lf:{org_id}:{invoice_id}:{step}` | Prevents duplicate late fees per dunning step |
| Deposit collection | `dep:{org_id}:{resident_id}:{deposit_id}` | Prevents duplicate deposit charges |
| Stripe API calls | `stripe:{operation}:{recoveryos_id}` | Passed as Stripe `Idempotency-Key` header |

### Concurrency Control

Financial operations use database-level advisory locks to prevent race conditions:

```
Payment Processing (Concurrency Safe)
══════════════════════════════════════

1. Acquire advisory lock on invoice_id:
      SELECT pg_advisory_xact_lock(hashtext($invoice_id::text));

2. Re-read invoice state inside transaction

3. Validate payment is still applicable:
      - Invoice not already paid
      - Invoice not voided
      - Amount does not exceed remaining balance

4. Create payment record + ledger entries

5. Update invoice paid_cents and status

6. Commit transaction (releases advisory lock)
```

### Error Recovery

| Failure Scenario | Recovery |
|-----------------|----------|
| Stripe payment succeeds but ledger write fails | Webhook re-processing picks up the payment; idempotency prevents duplicates |
| Ledger entries created but invoice update fails | Reconciliation job detects mismatch; ledger is truth, invoice status corrected |
| Partial multi-entry transaction | Database transaction ensures atomicity; either all entries write or none |
| Stripe webhook missed | Stripe retries for 3 days; manual reconciliation catches any gaps |
| Double submission from browser | Idempotency key on PaymentIntent prevents duplicate charges |

### Payment Record Schema

```sql
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  resident_id     UUID NOT NULL REFERENCES residents(id),
  payer_id        UUID NOT NULL REFERENCES payers(id),
  invoice_id      UUID REFERENCES invoices(id),
  amount_cents    BIGINT NOT NULL CHECK (amount_cents > 0),
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_method  VARCHAR(20) NOT NULL
    CHECK (payment_method IN ('card', 'ach', 'cash', 'check', 'money_order',
                              'zelle', 'venmo', 'cashapp', 'state_voucher',
                              'insurance', 'credit_applied', 'other')),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded', 'disputed')),
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id         VARCHAR(255),
  external_reference       VARCHAR(255),   -- check number, voucher ID, etc.
  refunded_amount_cents    BIGINT DEFAULT 0,
  description     TEXT,
  metadata        JSONB DEFAULT '{}',
  idempotency_key VARCHAR(255) UNIQUE,
  recorded_by     UUID NOT NULL REFERENCES users(id),  -- staff who entered (for external) or system
  completed_at    TIMESTAMPTZ,
  failed_at       TIMESTAMPTZ,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_org_created ON payments(org_id, created_at DESC);
CREATE INDEX idx_payments_resident ON payments(resident_id, created_at DESC);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_stripe_pi ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(org_id, status);
```

### Rate Configuration

```sql
CREATE TABLE rate_configurations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  house_id        UUID REFERENCES houses(id),       -- null = org-wide default
  bed_id          UUID REFERENCES beds(id),          -- null = house-wide rate
  resident_id     UUID REFERENCES residents(id),     -- null = not resident-specific
  rate_type       VARCHAR(20) NOT NULL
    CHECK (rate_type IN ('rent', 'program_fee', 'other')),
  amount_cents    BIGINT NOT NULL,
  billing_cycle   VARCHAR(20) NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('weekly', 'biweekly', 'monthly')),
  effective_from  DATE NOT NULL,
  effective_to    DATE,                              -- null = no end date
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID NOT NULL REFERENCES users(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rate resolution order (most specific wins):
-- 1. resident_id specific rate
-- 2. bed_id specific rate
-- 3. house_id specific rate
-- 4. org_id default rate
```

---

## Appendix A: Ledger Entry Examples

### Complete Ledger Trail for a Monthly Cycle

```
Resident: John Doe | Monthly Rate: $1,500.00 | Payers: Self (100%)

═══ Invoice Generation (Feb 1) ═══

  TXN-001  DEBIT  1000 AR          $1,500.00  "Feb 2026 rent"
  TXN-001  CREDIT 3000 Rent Rev    $1,500.00  "Feb 2026 rent"

═══ Late Fee Assessed (Feb 8, 7 days past due) ═══

  TXN-002  DEBIT  1000 AR          $50.00     "Late fee - Feb invoice"
  TXN-002  CREDIT 3020 Late Fee    $50.00     "Late fee - Feb invoice"

═══ Card Payment Received (Feb 10, $1,000 partial) ═══

  TXN-003  DEBIT  1100 Cash-Stripe $1,000.00  "Payment from John Doe"
  TXN-003  CREDIT 1000 AR          $1,000.00  "Payment from John Doe"

  TXN-004  DEBIT  4030 Proc Fee    $29.30     "Stripe fee on $1,000"
  TXN-004  CREDIT 1100 Cash-Stripe $29.30     "Stripe fee on $1,000"

  TXN-005  DEBIT  4020 Platform    $25.00     "Platform fee on $1,000"
  TXN-005  CREDIT 1200 Plat Rcv    $25.00     "Platform fee on $1,000"

═══ Cash Payment Received (Feb 20, $550 remainder) ═══

  TXN-006  DEBIT  1110 Cash-Ext    $550.00    "Cash payment from John Doe"
  TXN-006  CREDIT 1000 AR          $550.00    "Cash payment from John Doe"

═══ Balance Check ═══

  AR (1000): $1,500 + $50 - $1,000 - $550 = $0.00  (paid in full)
  Revenue:   $1,500 (rent) + $50 (late fee) = $1,550.00
  Fees:      $29.30 (Stripe) + $25.00 (platform) = $54.30
```

### Move-Out with Deposit Refund

```
Resident: Jane Smith | Deposit: $500 | Leaving March 10

═══ Move-Out Proration (Mar 10) ═══

  Already invoiced: $1,500 for full March
  Prorated charge: ($1,500 / 31) * 10 = $483.87
  Credit:          $1,500 - $483.87 = $1,016.13

  TXN-010  DEBIT  3000 Rent Rev    $1,016.13  "Move-out proration credit Mar 11-31"
  TXN-010  CREDIT 1000 AR          $1,016.13  "Move-out proration credit Mar 11-31"

═══ Deposit Refund (minus $75 cleaning) ═══

  TXN-011  DEBIT  2000 Dep Liab    $500.00    "Deposit disposition"
  TXN-011  CREDIT 1100 Cash-Stripe $425.00    "Deposit refund to Jane Smith"

  TXN-012  DEBIT  2000 (implicit via TXN-011 split)
  TXN-012  CREDIT 3040 Other Rev   $75.00     "Cleaning deduction from deposit"

  (Note: TXN-011 and TXN-012 are simplified above.
   Actual implementation: single transaction_id with
   one $500 debit to 2000, two credits: $425 to Cash, $75 to Revenue)
```

---

## Appendix B: Stripe API Patterns Reference

### Creating a Destination Charge

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountCents,
  currency: 'usd',
  customer: stripeCustomerId,
  payment_method: paymentMethodId,
  confirm: true,
  on_behalf_of: connectedAccountId,
  transfer_data: {
    destination: connectedAccountId,
    amount: amountCents - platformFeeCents,
  },
  application_fee_amount: platformFeeCents,
  metadata: {
    org_id: orgId,
    payment_id: paymentId,
    invoice_ids: invoiceIds.join(','),
    payer_id: payerId,
  },
  idempotency_key: `pay_${paymentId}`,
}, {
  idempotencyKey: `pay_${paymentId}`,
});
```

### Creating an Express Connected Account

```typescript
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  capabilities: {
    card_payments: { requested: true },
    us_bank_account_ach_payments: { requested: true },
    transfers: { requested: true },
  },
  business_type: 'company',
  metadata: {
    org_id: orgId,
  },
});
```

### Generating an Onboarding Link

```typescript
const accountLink = await stripe.accountLinks.create({
  account: connectedAccountId,
  type: 'account_onboarding',
  refresh_url: `${baseUrl}/settings/payments/refresh`,
  return_url: `${baseUrl}/settings/payments/complete`,
});
```

### Issuing a Refund

```typescript
const refund = await stripe.refunds.create({
  payment_intent: stripePaymentIntentId,
  amount: refundAmountCents, // omit for full refund
  reason: 'requested_by_customer',
  metadata: {
    refund_id: refundId,
    org_id: orgId,
  },
}, {
  stripeAccount: connectedAccountId,
  idempotencyKey: `ref_${refundId}`,
});
```

### Verifying a Webhook Signature

```typescript
const event = stripe.webhooks.constructEvent(
  requestBody,       // raw body (Buffer)
  signatureHeader,   // req.headers['stripe-signature']
  webhookSecret,     // endpoint-specific signing secret
);
```

---

## Appendix C: Integration Points with Other Modules

| Module | Integration | Direction |
|--------|------------|-----------|
| **Occupancy (OCC-03, OCC-04, OCC-08)** | Bed assignment triggers rate lookup; transfer triggers proration; move-out triggers final invoice + deposit disposition | Occupancy -> Payments |
| **Admissions (ADM-01)** | Intake completion triggers deposit charge + first invoice generation + payer setup | Admissions -> Payments |
| **Compliance (CMP-*)** | All payment operations create audit log entries; family portal access gated by Part 2 consent | Payments -> Compliance |
| **Operations (OPS-*)** | Fines from incidents create pending charges on next invoice | Operations -> Payments |
| **Reporting (RPT-02)** | Financial dashboard reads from ledger (via materialized view) and invoice tables | Payments -> Reporting |
| **Documents (DOC-*)** | Invoice PDFs stored as documents; deposit disposition forms signed via e-sign | Payments -> Documents |
| **Messaging (MSG-*)** | Payment reminders, receipts, dunning notices delivered via messaging + email | Payments -> Messaging |

---

*Document prepared by payments-architect for RecoveryOS.*
*Cross-referenced with: 01_REQUIREMENTS.md (PAY-01 through PAY-22), 04_COMPLIANCE.md (PCI scope, audit logging, Part 2 data isolation), 06_ROADMAP.md (Sprints 9-12 build plan).*
