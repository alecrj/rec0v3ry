import { pgTable, uuid, text, timestamp, numeric, date, boolean, index, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations, houses } from './orgs';

// Expense Categories
export const expenseCategories = pgTable(
  'expense_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    name: text('name').notNull(),
    icon: text('icon'), // lucide icon name
    color: text('color'), // hex color for badge
    is_default: boolean('is_default').default(false), // seeded defaults
    sort_order: numeric('sort_order').default('0'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    org_id_idx: index('expense_categories_org_id_idx').on(table.org_id),
  })
);

export const expenseCategoriesRelations = relations(expenseCategories, ({ one }) => ({
  organization: one(organizations, {
    fields: [expenseCategories.org_id],
    references: [organizations.id],
  }),
}));

// Expenses (manual entries + auto-imported from Plaid)
export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    house_id: uuid('house_id').references(() => houses.id), // null = org-level expense
    category_id: uuid('category_id').references(() => expenseCategories.id),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    description: text('description').notNull(),
    vendor: text('vendor'), // merchant/payee name
    expense_date: date('expense_date').notNull(),
    receipt_url: text('receipt_url'), // S3 link to uploaded receipt
    source: text('source').notNull().default('manual'), // 'manual' | 'plaid'
    plaid_transaction_id: text('plaid_transaction_id'), // link to plaid transaction
    created_by: uuid('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('expenses_org_id_idx').on(table.org_id),
    house_id_idx: index('expenses_house_id_idx').on(table.house_id),
    category_id_idx: index('expenses_category_id_idx').on(table.category_id),
    expense_date_idx: index('expenses_expense_date_idx').on(table.expense_date),
    deleted_at_idx: index('expenses_deleted_at_idx').on(table.deleted_at),
  })
);

export const expensesRelations = relations(expenses, ({ one }) => ({
  organization: one(organizations, {
    fields: [expenses.org_id],
    references: [organizations.id],
  }),
  house: one(houses, {
    fields: [expenses.house_id],
    references: [houses.id],
  }),
  category: one(expenseCategories, {
    fields: [expenses.category_id],
    references: [expenseCategories.id],
  }),
}));

// Plaid connected accounts
export const plaidItems = pgTable(
  'plaid_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    plaid_item_id: text('plaid_item_id').notNull(), // Plaid's item ID
    access_token: text('access_token').notNull(), // ENCRYPTED in production
    institution_name: text('institution_name'),
    institution_id: text('institution_id'),
    account_name: text('account_name'), // "Chase Checking ****1234"
    account_mask: text('account_mask'), // last 4 digits
    account_type: text('account_type'), // checking, credit, etc.
    cursor: text('cursor'), // Plaid sync cursor for incremental sync
    default_house_id: uuid('default_house_id').references(() => houses.id), // G2-14: auto-assign to house
    is_active: boolean('is_active').default(true),
    last_synced_at: timestamp('last_synced_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    created_by: uuid('created_by'),
  },
  (table) => ({
    org_id_idx: index('plaid_items_org_id_idx').on(table.org_id),
  })
);

export const plaidItemsRelations = relations(plaidItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [plaidItems.org_id],
    references: [organizations.id],
  }),
  defaultHouse: one(houses, {
    fields: [plaidItems.default_house_id],
    references: [houses.id],
  }),
}));

// Plaid transactions (raw from Plaid, before operator assigns to house/category)
export const plaidTransactions = pgTable(
  'plaid_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    plaid_item_id: uuid('plaid_item_id').notNull().references(() => plaidItems.id),
    plaid_transaction_id: text('plaid_transaction_id').notNull().unique(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(), // positive = expense
    merchant_name: text('merchant_name'),
    name: text('name').notNull(), // transaction description from Plaid
    category: jsonb('category'), // Plaid's category array
    date: date('date').notNull(),
    pending: boolean('pending').default(false),
    // Operator assignment
    assigned_house_id: uuid('assigned_house_id').references(() => houses.id),
    assigned_category_id: uuid('assigned_category_id').references(() => expenseCategories.id),
    expense_id: uuid('expense_id').references(() => expenses.id), // linked expense after assignment
    status: text('status').notNull().default('unassigned'), // 'unassigned' | 'assigned' | 'ignored'
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    org_id_idx: index('plaid_transactions_org_id_idx').on(table.org_id),
    status_idx: index('plaid_transactions_status_idx').on(table.status),
    date_idx: index('plaid_transactions_date_idx').on(table.date),
  })
);

export const plaidTransactionsRelations = relations(plaidTransactions, ({ one }) => ({
  organization: one(organizations, {
    fields: [plaidTransactions.org_id],
    references: [organizations.id],
  }),
  plaidItem: one(plaidItems, {
    fields: [plaidTransactions.plaid_item_id],
    references: [plaidItems.id],
  }),
  house: one(houses, {
    fields: [plaidTransactions.assigned_house_id],
    references: [houses.id],
  }),
  category: one(expenseCategories, {
    fields: [plaidTransactions.assigned_category_id],
    references: [expenseCategories.id],
  }),
  expense: one(expenses, {
    fields: [plaidTransactions.expense_id],
    references: [expenses.id],
  }),
}));
