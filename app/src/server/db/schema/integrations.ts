import { pgTable, uuid, text, timestamp, jsonb, boolean, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './orgs';
import { users } from './users';

// API Keys (programmatic access)
export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    name: text('name').notNull(),
    key_hash: text('key_hash').notNull(), // SHA-256 hash of the API key
    key_prefix: text('key_prefix').notNull(), // First 8 chars for identification
    scopes: jsonb('scopes').notNull(), // Array of permitted scopes/permissions
    created_by: uuid('created_by').notNull().references(() => users.id),
    last_used_at: timestamp('last_used_at'),
    expires_at: timestamp('expires_at'),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
    revoked_at: timestamp('revoked_at'),
    revoked_by: uuid('revoked_by').references(() => users.id),
  },
  (table) => ({
    org_id_idx: index('api_keys_org_id_idx').on(table.org_id),
    key_hash_idx: index('api_keys_key_hash_idx').on(table.key_hash),
  })
);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiKeys.org_id],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [apiKeys.created_by],
    references: [users.id],
  }),
  revoker: one(users, {
    fields: [apiKeys.revoked_by],
    references: [users.id],
  }),
}));

// Webhooks (outgoing event notifications)
export const webhooks = pgTable(
  'webhooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    name: text('name').notNull(),
    url: text('url').notNull(), // HTTPS endpoint
    events: jsonb('events').notNull(), // Array of event types to subscribe to
    secret: text('secret').notNull(), // ENCRYPTED: AES-256-GCM - HMAC signing secret
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by').references(() => users.id),
    updated_by: uuid('updated_by').references(() => users.id),
  },
  (table) => ({
    org_id_idx: index('webhooks_org_id_idx').on(table.org_id),
  })
);

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [webhooks.org_id],
    references: [organizations.id],
  }),
  deliveries: many(webhookDeliveries),
}));

// Webhook Deliveries (delivery tracking and retry)
export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    webhook_id: uuid('webhook_id').notNull().references(() => webhooks.id),
    event_type: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    attempt_count: integer('attempt_count').default(1),
    max_attempts: integer('max_attempts').default(3),
    status: text('status').default('pending'), // 'pending', 'delivered', 'failed', 'abandoned'
    http_status: integer('http_status'),
    response_body: text('response_body'),
    error_message: text('error_message'),
    delivered_at: timestamp('delivered_at'),
    next_retry_at: timestamp('next_retry_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    org_id_idx: index('webhook_deliveries_org_id_idx').on(table.org_id),
    webhook_id_idx: index('webhook_deliveries_webhook_id_idx').on(table.webhook_id),
    status_idx: index('webhook_deliveries_status_idx').on(table.status),
    next_retry_at_idx: index('webhook_deliveries_next_retry_at_idx').on(table.next_retry_at),
  })
);

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  organization: one(organizations, {
    fields: [webhookDeliveries.org_id],
    references: [organizations.id],
  }),
  webhook: one(webhooks, {
    fields: [webhookDeliveries.webhook_id],
    references: [webhooks.id],
  }),
}));

// Integration Configs (third-party service settings)
export const integrationConfigs = pgTable(
  'integration_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    integration_type: text('integration_type').notNull(), // 'stripe', 'docusign', 'twilio', etc.
    config: jsonb('config').notNull(), // ENCRYPTED: AES-256-GCM - API keys, credentials, settings
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by').references(() => users.id),
    updated_by: uuid('updated_by').references(() => users.id),
  },
  (table) => ({
    org_id_idx: index('integration_configs_org_id_idx').on(table.org_id),
    integration_type_idx: index('integration_configs_integration_type_idx').on(table.integration_type),
  })
);

export const integrationConfigsRelations = relations(integrationConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [integrationConfigs.org_id],
    references: [organizations.id],
  }),
}));

// Notification Preferences (per-user notification settings)
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull().references(() => users.id),
    notification_type: text('notification_type').notNull(), // 'invoice_overdue', 'new_resident', etc.
    email_enabled: boolean('email_enabled').default(true),
    sms_enabled: boolean('sms_enabled').default(false),
    in_app_enabled: boolean('in_app_enabled').default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    user_id_idx: index('notification_preferences_user_id_idx').on(table.user_id),
    notification_type_idx: index('notification_preferences_notification_type_idx').on(table.notification_type),
  })
);

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.user_id],
    references: [users.id],
  }),
}));

// Scheduled Jobs (background task tracking)
export const scheduledJobs = pgTable(
  'scheduled_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').references(() => organizations.id), // Nullable for system-wide jobs
    job_type: text('job_type').notNull(), // 'invoice_generation', 'dunning_email', 'report_generation', etc.
    payload: jsonb('payload'), // Job-specific data
    scheduled_for: timestamp('scheduled_for').notNull(),
    status: text('status').default('pending'), // 'pending', 'running', 'completed', 'failed', 'cancelled'
    started_at: timestamp('started_at'),
    completed_at: timestamp('completed_at'),
    error_message: text('error_message'),
    retry_count: integer('retry_count').default(0),
    max_retries: integer('max_retries').default(3),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    org_id_idx: index('scheduled_jobs_org_id_idx').on(table.org_id),
    job_type_idx: index('scheduled_jobs_job_type_idx').on(table.job_type),
    status_idx: index('scheduled_jobs_status_idx').on(table.status),
    scheduled_for_idx: index('scheduled_jobs_scheduled_for_idx').on(table.scheduled_for),
  })
);

export const scheduledJobsRelations = relations(scheduledJobs, ({ one }) => ({
  organization: one(organizations, {
    fields: [scheduledJobs.org_id],
    references: [organizations.id],
  }),
}));
