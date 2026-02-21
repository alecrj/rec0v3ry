import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './orgs';

// Automation Configs — one row per (org, automation_key) pair
export const automationConfigs = pgTable(
  'automation_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    automation_key: text('automation_key').notNull(), // e.g. 'rent_reminders', 'daily_digest'
    enabled: boolean('enabled').default(false).notNull(),
    settings: jsonb('settings').default({}).notNull(), // automation-specific config
    last_run_at: timestamp('last_run_at'),
    last_run_status: text('last_run_status'), // 'success' | 'error' | 'skipped'
    last_run_message: text('last_run_message'),
    run_count: integer('run_count').default(0).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    org_id_idx: index('automation_configs_org_id_idx').on(table.org_id),
    org_key_unique: unique('automation_configs_org_key_unique').on(table.org_id, table.automation_key),
  })
);

export const automationConfigsRelations = relations(automationConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [automationConfigs.org_id],
    references: [organizations.id],
  }),
}));

// Automation Logs — historical record of every automation run
export const automationLogs = pgTable(
  'automation_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    automation_key: text('automation_key').notNull(),
    status: text('status').notNull(), // 'success' | 'error' | 'skipped'
    message: text('message'),
    details: jsonb('details'), // e.g. { reminders_sent: 5, invoices_checked: 20 }
    ran_at: timestamp('ran_at').defaultNow().notNull(),
  },
  (table) => ({
    org_id_idx: index('automation_logs_org_id_idx').on(table.org_id),
    automation_key_idx: index('automation_logs_automation_key_idx').on(table.automation_key),
    ran_at_idx: index('automation_logs_ran_at_idx').on(table.ran_at),
  })
);

export const automationLogsRelations = relations(automationLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [automationLogs.org_id],
    references: [organizations.id],
  }),
}));
