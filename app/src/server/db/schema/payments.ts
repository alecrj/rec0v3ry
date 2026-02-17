import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, numeric, date, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { invoiceStatus, paymentStatus, paymentMethodType, paymentType, accountType, dunningActionType } from './enums';
import { organizations } from './orgs';
import { residents, admissions } from './residents';
import { users } from './users';

// Invoices
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    admission_id: uuid('admission_id').references(() => admissions.id),
    invoice_number: text('invoice_number').notNull(), // Auto-generated, human-readable
    status: invoiceStatus('status').notNull().default('draft'),
    issue_date: date('issue_date').notNull(),
    due_date: date('due_date').notNull(),
    subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(), // Sum of line items
    tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).default('0'),
    total: numeric('total', { precision: 10, scale: 2 }).notNull(), // subtotal + tax
    amount_paid: numeric('amount_paid', { precision: 10, scale: 2 }).default('0'), // Calculated from payments
    amount_due: numeric('amount_due', { precision: 10, scale: 2 }).notNull(), // total - amount_paid (computed)
    stripe_invoice_id: text('stripe_invoice_id'), // Stripe Invoice ID if auto-billing enabled
    notes: text('notes'),
    metadata: jsonb('metadata'), // Custom fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('invoices_org_id_idx').on(table.org_id),
    resident_id_idx: index('invoices_resident_id_idx').on(table.resident_id),
    invoice_number_unique: unique('invoices_invoice_number_unique').on(table.org_id, table.invoice_number),
    status_idx: index('invoices_status_idx').on(table.status),
    due_date_idx: index('invoices_due_date_idx').on(table.due_date),
    deleted_at_idx: index('invoices_deleted_at_idx').on(table.deleted_at),
  })
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invoices.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [invoices.resident_id],
    references: [residents.id],
  }),
  admission: one(admissions, {
    fields: [invoices.admission_id],
    references: [admissions.id],
  }),
  lineItems: many(invoiceLineItems),
  payments: many(payments),
}));

// Invoice Line Items
export const invoiceLineItems = pgTable(
  'invoice_line_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoice_id: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    payment_type: paymentType('payment_type').notNull(), // Maps to ledger account
    quantity: integer('quantity').default(1),
    unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(), // quantity * unit_price
    start_date: date('start_date'), // For prorated items
    end_date: date('end_date'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    invoice_id_idx: index('invoice_line_items_invoice_id_idx').on(table.invoice_id),
  })
);

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLineItems.invoice_id],
    references: [invoices.id],
  }),
}));

// Payments
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    invoice_id: uuid('invoice_id').references(() => invoices.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    payer_config_id: uuid('payer_config_id'), // References payer_configs
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    payment_method_type: paymentMethodType('payment_method_type').notNull(),
    status: paymentStatus('status').notNull().default('pending'),
    payment_date: timestamp('payment_date').notNull(),
    stripe_payment_intent_id: text('stripe_payment_intent_id'),
    stripe_charge_id: text('stripe_charge_id'),
    stripe_refund_id: text('stripe_refund_id'),
    failure_reason: text('failure_reason'),
    receipt_url: text('receipt_url'),
    notes: text('notes'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('payments_org_id_idx').on(table.org_id),
    invoice_id_idx: index('payments_invoice_id_idx').on(table.invoice_id),
    resident_id_idx: index('payments_resident_id_idx').on(table.resident_id),
    status_idx: index('payments_status_idx').on(table.status),
    payment_date_idx: index('payments_payment_date_idx').on(table.payment_date),
    deleted_at_idx: index('payments_deleted_at_idx').on(table.deleted_at),
  })
);

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [payments.org_id],
    references: [organizations.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoice_id],
    references: [invoices.id],
  }),
  resident: one(residents, {
    fields: [payments.resident_id],
    references: [residents.id],
  }),
  ledgerEntries: many(ledgerEntries),
}));

// Ledger Accounts (double-entry accounting)
export const ledgerAccounts = pgTable(
  'ledger_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    code: text('code').notNull(), // e.g., "1000", "4000"
    name: text('name').notNull(), // e.g., "Cash", "Rent Revenue"
    account_type: accountType('account_type').notNull(),
    parent_account_id: uuid('parent_account_id'), // Self-reference for sub-accounts
    description: text('description'),
    is_system: boolean('is_system').default(false), // System accounts cannot be deleted
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
  },
  (table) => ({
    org_code_unique: unique('ledger_accounts_org_code_unique').on(table.org_id, table.code),
    org_id_idx: index('ledger_accounts_org_id_idx').on(table.org_id),
    account_type_idx: index('ledger_accounts_account_type_idx').on(table.account_type),
  })
);

export const ledgerAccountsRelations = relations(ledgerAccounts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [ledgerAccounts.org_id],
    references: [organizations.id],
  }),
  parentAccount: one(ledgerAccounts, {
    fields: [ledgerAccounts.parent_account_id],
    references: [ledgerAccounts.id],
  }),
  entries: many(ledgerEntries),
}));

// Ledger Entries (double-entry transactions)
export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    account_id: uuid('account_id').notNull().references(() => ledgerAccounts.id),
    transaction_id: uuid('transaction_id').notNull(), // Groups debit/credit pairs
    transaction_date: timestamp('transaction_date').notNull(),
    debit_amount: numeric('debit_amount', { precision: 10, scale: 2 }).default('0'),
    credit_amount: numeric('credit_amount', { precision: 10, scale: 2 }).default('0'),
    description: text('description').notNull(),
    reference_type: text('reference_type'), // 'payment', 'invoice', 'refund', etc.
    reference_id: uuid('reference_id'), // ID of referenced entity
    created_at: timestamp('created_at').defaultNow().notNull(),
    created_by: uuid('created_by'),
  },
  (table) => ({
    org_id_idx: index('ledger_entries_org_id_idx').on(table.org_id),
    account_id_idx: index('ledger_entries_account_id_idx').on(table.account_id),
    transaction_id_idx: index('ledger_entries_transaction_id_idx').on(table.transaction_id),
    transaction_date_idx: index('ledger_entries_transaction_date_idx').on(table.transaction_date),
  })
);

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  organization: one(organizations, {
    fields: [ledgerEntries.org_id],
    references: [organizations.id],
  }),
  account: one(ledgerAccounts, {
    fields: [ledgerEntries.account_id],
    references: [ledgerAccounts.id],
  }),
}));

// Deposits (security deposits, upfront fees)
export const deposits = pgTable(
  'deposits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    admission_id: uuid('admission_id').references(() => admissions.id),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    payment_type: paymentType('payment_type').notNull(),
    payment_id: uuid('payment_id').references(() => payments.id), // Initial payment
    is_refundable: boolean('is_refundable').default(true),
    refunded_amount: numeric('refunded_amount', { precision: 10, scale: 2 }).default('0'),
    refund_payment_id: uuid('refund_payment_id'), // References payments table
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('deposits_org_id_idx').on(table.org_id),
    resident_id_idx: index('deposits_resident_id_idx').on(table.resident_id),
    deleted_at_idx: index('deposits_deleted_at_idx').on(table.deleted_at),
  })
);

export const depositsRelations = relations(deposits, ({ one }) => ({
  organization: one(organizations, {
    fields: [deposits.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [deposits.resident_id],
    references: [residents.id],
  }),
  admission: one(admissions, {
    fields: [deposits.admission_id],
    references: [admissions.id],
  }),
}));

// Payer Configs (multi-payer support: insurance, family, third-party)
export const payerConfigs = pgTable(
  'payer_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    payer_name: text('payer_name').notNull(), // ENCRYPTED: AES-256-GCM
    payer_email: text('payer_email'), // ENCRYPTED: AES-256-GCM
    payer_phone: text('payer_phone'), // ENCRYPTED: AES-256-GCM
    payer_type: text('payer_type').notNull(), // 'self', 'family', 'insurance', 'third_party'
    payment_responsibility_percentage: integer('payment_responsibility_percentage').default(100), // Split billing
    stripe_customer_id: text('stripe_customer_id'),
    stripe_payment_method_id: text('stripe_payment_method_id'),
    auto_pay_enabled: boolean('auto_pay_enabled').default(false),
    is_active: boolean('is_active').default(true),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('payer_configs_org_id_idx').on(table.org_id),
    resident_id_idx: index('payer_configs_resident_id_idx').on(table.resident_id),
    deleted_at_idx: index('payer_configs_deleted_at_idx').on(table.deleted_at),
  })
);

export const payerConfigsRelations = relations(payerConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [payerConfigs.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [payerConfigs.resident_id],
    references: [residents.id],
  }),
}));

// Dunning Actions (collections tracking)
export const dunningActions = pgTable(
  'dunning_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    invoice_id: uuid('invoice_id').notNull().references(() => invoices.id),
    action_type: dunningActionType('action_type').notNull(),
    action_date: timestamp('action_date').notNull(),
    performed_by: uuid('performed_by').references(() => users.id),
    notes: text('notes'),
    next_action_date: timestamp('next_action_date'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    org_id_idx: index('dunning_actions_org_id_idx').on(table.org_id),
    invoice_id_idx: index('dunning_actions_invoice_id_idx').on(table.invoice_id),
    action_date_idx: index('dunning_actions_action_date_idx').on(table.action_date),
  })
);

export const dunningActionsRelations = relations(dunningActions, ({ one }) => ({
  organization: one(organizations, {
    fields: [dunningActions.org_id],
    references: [organizations.id],
  }),
  invoice: one(invoices, {
    fields: [dunningActions.invoice_id],
    references: [invoices.id],
  }),
  performer: one(users, {
    fields: [dunningActions.performed_by],
    references: [users.id],
  }),
}));
