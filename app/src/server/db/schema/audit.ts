import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './orgs';
import { users } from './users';
import { residents } from './residents';

// Audit Logs (append-only, immutable)
// NOTE: This table has NO updated_at, NO deleted_at, NO updated_by
// Records are NEVER modified or deleted (compliance requirement)
// NOTE: action and sensitivity_level use text (not enums) because audit
// actions are granular (55+ types) and sensitivity classifications differ
// from other tables' enum values. TypeScript types enforce correctness.
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),

    // Actor (who performed the action)
    actor_user_id: uuid('actor_user_id').references(() => users.id),
    actor_resident_id: uuid('actor_resident_id').references(() => residents.id),
    actor_type: text('actor_type').notNull(), // 'user', 'resident', 'system', 'api'
    actor_ip_address: text('actor_ip_address'),

    // Action (text for 55+ granular AuditAction types)
    action: text('action').notNull(),
    resource_type: text('resource_type').notNull(), // Table name or resource type
    resource_id: uuid('resource_id'), // ID of affected resource

    // Context
    description: text('description').notNull(), // Human-readable description
    sensitivity_level: text('sensitivity_level').notNull().default('operational'),

    // Changes (for update actions)
    old_values: jsonb('old_values'), // ENCRYPTED: AES-256-GCM if Part 2 data
    new_values: jsonb('new_values'), // ENCRYPTED: AES-256-GCM if Part 2 data

    // Metadata
    metadata: jsonb('metadata'), // Additional context (user_agent, session_id, etc.)

    // Hash Chain (tamper detection)
    previous_log_hash: text('previous_log_hash'), // HMAC-SHA256 of previous log entry
    current_log_hash: text('current_log_hash'), // HMAC-SHA256 of this log entry

    // Timestamp (append-only)
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    org_id_idx: index('audit_logs_org_id_idx').on(table.org_id),
    actor_user_id_idx: index('audit_logs_actor_user_id_idx').on(table.actor_user_id),
    actor_resident_id_idx: index('audit_logs_actor_resident_id_idx').on(table.actor_resident_id),
    action_idx: index('audit_logs_action_idx').on(table.action),
    resource_type_idx: index('audit_logs_resource_type_idx').on(table.resource_type),
    resource_id_idx: index('audit_logs_resource_id_idx').on(table.resource_id),
    created_at_idx: index('audit_logs_created_at_idx').on(table.created_at),
    sensitivity_level_idx: index('audit_logs_sensitivity_level_idx').on(table.sensitivity_level),
    // Composite index for Part 2 audit queries
    part2_audit_idx: index('audit_logs_part2_audit_idx').on(
      table.org_id,
      table.sensitivity_level,
      table.created_at
    ),
  })
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.org_id],
    references: [organizations.id],
  }),
  actorUser: one(users, {
    fields: [auditLogs.actor_user_id],
    references: [users.id],
  }),
  actorResident: one(residents, {
    fields: [auditLogs.actor_resident_id],
    references: [residents.id],
  }),
}));
