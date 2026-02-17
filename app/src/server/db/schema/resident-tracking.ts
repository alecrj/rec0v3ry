import { pgTable, uuid, text, timestamp, jsonb, date, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { admissionStatus, leadStatus } from './enums';
import { organizations, houses, beds, rooms } from './orgs';
import { residents, admissions } from './residents';
import { users } from './users';

// Discharges (separate from admissions for detailed tracking)
export const discharges = pgTable(
  'discharges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    admission_id: uuid('admission_id').notNull().references(() => admissions.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    discharge_date: date('discharge_date').notNull(),
    discharge_type: text('discharge_type').notNull(), // 'successful_completion', 'voluntary', 'involuntary', 'transfer', 'other'
    discharge_reason: text('discharge_reason'), // ENCRYPTED: AES-256-GCM
    discharge_notes: text('discharge_notes'), // ENCRYPTED: AES-256-GCM
    aftercare_plan: text('aftercare_plan'), // ENCRYPTED: AES-256-GCM
    referrals_made: jsonb('referrals_made'),
    final_balance: text('final_balance'), // Amount owed/refunded
    security_deposit_returned: boolean('security_deposit_returned').default(false),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
  },
  (table) => ({
    org_id_idx: index('discharges_org_id_idx').on(table.org_id),
    admission_id_idx: index('discharges_admission_id_idx').on(table.admission_id),
    resident_id_idx: index('discharges_resident_id_idx').on(table.resident_id),
    discharge_date_idx: index('discharges_discharge_date_idx').on(table.discharge_date),
  })
);

export const dischargesRelations = relations(discharges, ({ one }) => ({
  organization: one(organizations, {
    fields: [discharges.org_id],
    references: [organizations.id],
  }),
  admission: one(admissions, {
    fields: [discharges.admission_id],
    references: [admissions.id],
  }),
  resident: one(residents, {
    fields: [discharges.resident_id],
    references: [residents.id],
  }),
}));

// Resident Status History (audit trail of status changes)
export const residentStatusHistory = pgTable(
  'resident_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    old_status: admissionStatus('old_status'),
    new_status: admissionStatus('new_status').notNull(),
    changed_at: timestamp('changed_at').defaultNow().notNull(),
    reason: text('reason'),
    changed_by: uuid('changed_by').references(() => users.id),
  },
  (table) => ({
    org_id_idx: index('resident_status_history_org_id_idx').on(table.org_id),
    resident_id_idx: index('resident_status_history_resident_id_idx').on(table.resident_id),
    changed_at_idx: index('resident_status_history_changed_at_idx').on(table.changed_at),
  })
);

export const residentStatusHistoryRelations = relations(residentStatusHistory, ({ one }) => ({
  organization: one(organizations, {
    fields: [residentStatusHistory.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [residentStatusHistory.resident_id],
    references: [residents.id],
  }),
  changedBy: one(users, {
    fields: [residentStatusHistory.changed_by],
    references: [users.id],
  }),
}));

// Waitlist Entries
export const waitlistEntries = pgTable(
  'waitlist_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    house_id: uuid('house_id').references(() => houses.id),
    status: leadStatus('status').notNull().default('new'),
    priority: text('priority').default('normal'), // 'low', 'normal', 'high', 'urgent'
    requested_move_in_date: date('requested_move_in_date'),
    added_at: timestamp('added_at').defaultNow().notNull(),
    removed_at: timestamp('removed_at'),
    removal_reason: text('removal_reason'),
    notes: text('notes'), // ENCRYPTED: AES-256-GCM
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
  },
  (table) => ({
    org_id_idx: index('waitlist_entries_org_id_idx').on(table.org_id),
    resident_id_idx: index('waitlist_entries_resident_id_idx').on(table.resident_id),
    house_id_idx: index('waitlist_entries_house_id_idx').on(table.house_id),
    status_idx: index('waitlist_entries_status_idx').on(table.status),
  })
);

export const waitlistEntriesRelations = relations(waitlistEntries, ({ one }) => ({
  organization: one(organizations, {
    fields: [waitlistEntries.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [waitlistEntries.resident_id],
    references: [residents.id],
  }),
  house: one(houses, {
    fields: [waitlistEntries.house_id],
    references: [houses.id],
  }),
}));

// Bed Transfers (moving between rooms/beds)
export const bedTransfers = pgTable(
  'bed_transfers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    admission_id: uuid('admission_id').notNull().references(() => admissions.id),
    from_bed_id: uuid('from_bed_id').references(() => beds.id),
    to_bed_id: uuid('to_bed_id').notNull().references(() => beds.id),
    transfer_date: timestamp('transfer_date').notNull(),
    reason: text('reason'),
    notes: text('notes'),
    approved_by: uuid('approved_by').references(() => users.id),
    created_at: timestamp('created_at').defaultNow().notNull(),
    created_by: uuid('created_by'),
  },
  (table) => ({
    org_id_idx: index('bed_transfers_org_id_idx').on(table.org_id),
    resident_id_idx: index('bed_transfers_resident_id_idx').on(table.resident_id),
    transfer_date_idx: index('bed_transfers_transfer_date_idx').on(table.transfer_date),
  })
);

export const bedTransfersRelations = relations(bedTransfers, ({ one }) => ({
  organization: one(organizations, {
    fields: [bedTransfers.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [bedTransfers.resident_id],
    references: [residents.id],
  }),
  admission: one(admissions, {
    fields: [bedTransfers.admission_id],
    references: [admissions.id],
  }),
  fromBed: one(beds, {
    fields: [bedTransfers.from_bed_id],
    references: [beds.id],
  }),
  toBed: one(beds, {
    fields: [bedTransfers.to_bed_id],
    references: [beds.id],
  }),
  approver: one(users, {
    fields: [bedTransfers.approved_by],
    references: [users.id],
  }),
}));
