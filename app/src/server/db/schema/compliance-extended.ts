import { pgTable, uuid, text, timestamp, jsonb, boolean, date, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sensitivityLevel } from './enums';
import { organizations } from './orgs';
import { residents } from './residents';
import { users } from './users';
import { consents } from './compliance';

// Disclosure Accounting Requests (42 CFR Part 2 § 2.36)
export const disclosureAccountingRequests = pgTable(
  'disclosure_accounting_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    requested_at: timestamp('requested_at').defaultNow().notNull(),
    requested_by: uuid('requested_by').references(() => users.id), // Can be resident or authorized user
    period_start: date('period_start').notNull(),
    period_end: date('period_end').notNull(),
    status: text('status').default('pending'), // 'pending', 'completed', 'delivered'
    completed_at: timestamp('completed_at'),
    delivery_method: text('delivery_method'), // 'email', 'mail', 'in_person', 'portal'
    delivered_at: timestamp('delivered_at'),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    org_id_idx: index('disclosure_accounting_requests_org_id_idx').on(table.org_id),
    resident_id_idx: index('disclosure_accounting_requests_resident_id_idx').on(table.resident_id),
    requested_at_idx: index('disclosure_accounting_requests_requested_at_idx').on(table.requested_at),
  })
);

export const disclosureAccountingRequestsRelations = relations(disclosureAccountingRequests, ({ one }) => ({
  organization: one(organizations, {
    fields: [disclosureAccountingRequests.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [disclosureAccountingRequests.resident_id],
    references: [residents.id],
  }),
  requester: one(users, {
    fields: [disclosureAccountingRequests.requested_by],
    references: [users.id],
  }),
}));

// Data Access Requests (resident rights to access their data)
export const dataAccessRequests = pgTable(
  'data_access_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    request_type: text('request_type').notNull(), // 'access', 'amendment', 'restriction', 'deletion'
    requested_at: timestamp('requested_at').defaultNow().notNull(),
    requested_by: uuid('requested_by').references(() => users.id),
    description: text('description'), // ENCRYPTED: AES-256-GCM
    status: text('status').default('pending'), // 'pending', 'approved', 'denied', 'completed'
    reviewed_by: uuid('reviewed_by').references(() => users.id),
    reviewed_at: timestamp('reviewed_at'),
    decision_notes: text('decision_notes'), // ENCRYPTED: AES-256-GCM
    completed_at: timestamp('completed_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    org_id_idx: index('data_access_requests_org_id_idx').on(table.org_id),
    resident_id_idx: index('data_access_requests_resident_id_idx').on(table.resident_id),
    status_idx: index('data_access_requests_status_idx').on(table.status),
  })
);

export const dataAccessRequestsRelations = relations(dataAccessRequests, ({ one }) => ({
  organization: one(organizations, {
    fields: [dataAccessRequests.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [dataAccessRequests.resident_id],
    references: [residents.id],
  }),
  requester: one(users, {
    fields: [dataAccessRequests.requested_by],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [dataAccessRequests.reviewed_by],
    references: [users.id],
  }),
}));

// Break Glass Events (emergency access override)
export const breakGlassEvents = pgTable(
  'break_glass_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    user_id: uuid('user_id').notNull().references(() => users.id),
    reason: text('reason').notNull(), // ENCRYPTED: AES-256-GCM
    emergency_type: text('emergency_type').notNull(), // 'medical', 'safety', 'legal', 'other'
    accessed_data: jsonb('accessed_data'), // ENCRYPTED: AES-256-GCM - what was accessed
    ip_address: text('ip_address'),
    user_agent: text('user_agent'),
    supervisor_notified: boolean('supervisor_notified').default(false),
    supervisor_id: uuid('supervisor_id').references(() => users.id),
    supervisor_notified_at: timestamp('supervisor_notified_at'),
    is_justified: boolean('is_justified'), // Reviewed after the fact
    review_notes: text('review_notes'), // ENCRYPTED: AES-256-GCM
    reviewed_by: uuid('reviewed_by').references(() => users.id),
    reviewed_at: timestamp('reviewed_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    org_id_idx: index('break_glass_events_org_id_idx').on(table.org_id),
    resident_id_idx: index('break_glass_events_resident_id_idx').on(table.resident_id),
    user_id_idx: index('break_glass_events_user_id_idx').on(table.user_id),
    created_at_idx: index('break_glass_events_created_at_idx').on(table.created_at),
  })
);

export const breakGlassEventsRelations = relations(breakGlassEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [breakGlassEvents.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [breakGlassEvents.resident_id],
    references: [residents.id],
  }),
  user: one(users, {
    fields: [breakGlassEvents.user_id],
    references: [users.id],
  }),
  supervisor: one(users, {
    fields: [breakGlassEvents.supervisor_id],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [breakGlassEvents.reviewed_by],
    references: [users.id],
  }),
}));
