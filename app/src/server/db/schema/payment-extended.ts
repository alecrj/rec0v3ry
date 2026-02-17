import { pgTable, uuid, text, timestamp, jsonb, numeric, date, boolean, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { paymentType, paymentMethodType } from './enums';
import { organizations, houses } from './orgs';
import { residents } from './residents';
import { invoices, payments, payerConfigs } from './payments';
import { users } from './users';

// Rate Configs (pricing for different payment types)
export const rateConfigs = pgTable(
  'rate_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    house_id: uuid('house_id').references(() => houses.id), // House-specific rates
    payment_type: paymentType('payment_type').notNull(),
    rate_name: text('rate_name').notNull(), // "Weekly Rent", "Monthly Rent", etc.
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    billing_frequency: text('billing_frequency').notNull(), // 'daily', 'weekly', 'monthly'
    effective_from: date('effective_from').notNull(),
    effective_until: date('effective_until'),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
  },
  (table) => ({
    org_id_idx: index('rate_configs_org_id_idx').on(table.org_id),
    house_id_idx: index('rate_configs_house_id_idx').on(table.house_id),
    payment_type_idx: index('rate_configs_payment_type_idx').on(table.payment_type),
  })
);

export const rateConfigsRelations = relations(rateConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [rateConfigs.org_id],
    references: [organizations.id],
  }),
  house: one(houses, {
    fields: [rateConfigs.house_id],
    references: [houses.id],
  }),
}));

// Payment Methods (stored payment methods)
export const paymentMethods = pgTable(
  'payment_methods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    payer_config_id: uuid('payer_config_id').notNull().references(() => payerConfigs.id),
    payment_method_type: paymentMethodType('payment_method_type').notNull(),
    stripe_payment_method_id: text('stripe_payment_method_id'),
    last_4: text('last_4'), // Last 4 digits of card/account
    brand: text('brand'), // Visa, MasterCard, etc.
    expiry_month: integer('expiry_month'),
    expiry_year: integer('expiry_year'),
    is_default: boolean('is_default').default(false),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    org_id_idx: index('payment_methods_org_id_idx').on(table.org_id),
    payer_config_id_idx: index('payment_methods_payer_config_id_idx').on(table.payer_config_id),
  })
);

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  organization: one(organizations, {
    fields: [paymentMethods.org_id],
    references: [organizations.id],
  }),
  payerConfig: one(payerConfigs, {
    fields: [paymentMethods.payer_config_id],
    references: [payerConfigs.id],
  }),
}));

// Refunds
export const refunds = pgTable(
  'refunds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    payment_id: uuid('payment_id').notNull().references(() => payments.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    reason: text('reason').notNull(),
    stripe_refund_id: text('stripe_refund_id'),
    refunded_at: timestamp('refunded_at').defaultNow().notNull(),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    created_by: uuid('created_by'),
  },
  (table) => ({
    org_id_idx: index('refunds_org_id_idx').on(table.org_id),
    payment_id_idx: index('refunds_payment_id_idx').on(table.payment_id),
    resident_id_idx: index('refunds_resident_id_idx').on(table.resident_id),
    refunded_at_idx: index('refunds_refunded_at_idx').on(table.refunded_at),
  })
);

export const refundsRelations = relations(refunds, ({ one }) => ({
  organization: one(organizations, {
    fields: [refunds.org_id],
    references: [organizations.id],
  }),
  payment: one(payments, {
    fields: [refunds.payment_id],
    references: [payments.id],
  }),
  resident: one(residents, {
    fields: [refunds.resident_id],
    references: [residents.id],
  }),
}));

// Dunning Configs (automated collections settings)
export const dunningConfigs = pgTable(
  'dunning_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    name: text('name').notNull(),
    days_overdue_trigger: integer('days_overdue_trigger').notNull(),
    action_sequence: jsonb('action_sequence').notNull(), // Array of action configs
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
  },
  (table) => ({
    org_id_idx: index('dunning_configs_org_id_idx').on(table.org_id),
  })
);

export const dunningConfigsRelations = relations(dunningConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [dunningConfigs.org_id],
    references: [organizations.id],
  }),
}));

// Reconciliation Records (Stripe payouts)
export const reconciliationRecords = pgTable(
  'reconciliation_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    reconciliation_date: date('reconciliation_date').notNull(),
    period_start: date('period_start').notNull(),
    period_end: date('period_end').notNull(),
    stripe_payout_id: text('stripe_payout_id'),
    expected_amount: numeric('expected_amount', { precision: 10, scale: 2 }).notNull(),
    actual_amount: numeric('actual_amount', { precision: 10, scale: 2 }).notNull(),
    variance: numeric('variance', { precision: 10, scale: 2 }).notNull(),
    is_reconciled: boolean('is_reconciled').default(false),
    reconciled_by: uuid('reconciled_by').references(() => users.id),
    reconciled_at: timestamp('reconciled_at'),
    notes: text('notes'),
    discrepancies: jsonb('discrepancies'), // Array of discrepancy details
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
  },
  (table) => ({
    org_id_idx: index('reconciliation_records_org_id_idx').on(table.org_id),
    reconciliation_date_idx: index('reconciliation_records_reconciliation_date_idx').on(table.reconciliation_date),
  })
);

export const reconciliationRecordsRelations = relations(reconciliationRecords, ({ one }) => ({
  organization: one(organizations, {
    fields: [reconciliationRecords.org_id],
    references: [organizations.id],
  }),
  reconciler: one(users, {
    fields: [reconciliationRecords.reconciled_by],
    references: [users.id],
  }),
}));
