import { pgTable, uuid, text, timestamp, jsonb, date, integer, boolean, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { admissionStatus, leadStatus, sensitivityLevel } from './enums';
import { organizations, houses } from './orgs';
import { users } from './users';

// Residents (the people receiving care)
export const residents = pgTable(
  'residents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    first_name: text('first_name').notNull(), // ENCRYPTED: AES-256-GCM
    last_name: text('last_name').notNull(), // ENCRYPTED: AES-256-GCM
    preferred_name: text('preferred_name'), // ENCRYPTED: AES-256-GCM
    date_of_birth: date('date_of_birth').notNull(), // ENCRYPTED: AES-256-GCM
    ssn_last_4: text('ssn_last_4'), // ENCRYPTED: AES-256-GCM (full SSN stored encrypted)
    email: text('email'), // ENCRYPTED: AES-256-GCM
    phone: text('phone'), // ENCRYPTED: AES-256-GCM
    emergency_contact_name: text('emergency_contact_name'), // ENCRYPTED: AES-256-GCM
    emergency_contact_phone: text('emergency_contact_phone'), // ENCRYPTED: AES-256-GCM
    emergency_contact_relationship: text('emergency_contact_relationship'),
    profile_photo_url: text('profile_photo_url'),
    medical_info: text('medical_info'), // ENCRYPTED: AES-256-GCM - allergies, medications, conditions
    insurance_info: jsonb('insurance_info'), // ENCRYPTED: AES-256-GCM - provider, policy #, group #
    referral_source: text('referral_source'),
    referral_contact_id: uuid('referral_contact_id'), // References users with role=referral_source
    notes: text('notes'), // ENCRYPTED: AES-256-GCM
    sensitivity_level: sensitivityLevel('sensitivity_level').notNull().default('part2_protected'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('residents_org_id_idx').on(table.org_id),
    last_name_idx: index('residents_last_name_idx').on(table.last_name),
    deleted_at_idx: index('residents_deleted_at_idx').on(table.deleted_at),
  })
);

export const residentsRelations = relations(residents, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [residents.org_id],
    references: [organizations.id],
  }),
  admissions: many(admissions),
  contacts: many(residentContacts),
}));

// Admissions (a resident's stay at a house)
export const admissions = pgTable(
  'admissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    house_id: uuid('house_id').notNull().references(() => houses.id),
    bed_id: uuid('bed_id'), // May be assigned later
    status: admissionStatus('status').notNull().default('pending'),
    admission_date: date('admission_date').notNull(),
    planned_discharge_date: date('planned_discharge_date'),
    actual_discharge_date: date('actual_discharge_date'),
    discharge_reason: text('discharge_reason'),
    move_in_checklist: jsonb('move_in_checklist'), // Completed intake tasks
    move_out_checklist: jsonb('move_out_checklist'),
    case_manager_id: uuid('case_manager_id').references(() => users.id),
    notes: text('notes'), // ENCRYPTED: AES-256-GCM
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('admissions_org_id_idx').on(table.org_id),
    resident_id_idx: index('admissions_resident_id_idx').on(table.resident_id),
    house_id_idx: index('admissions_house_id_idx').on(table.house_id),
    status_idx: index('admissions_status_idx').on(table.status),
    admission_date_idx: index('admissions_admission_date_idx').on(table.admission_date),
    deleted_at_idx: index('admissions_deleted_at_idx').on(table.deleted_at),
  })
);

export const admissionsRelations = relations(admissions, ({ one }) => ({
  organization: one(organizations, {
    fields: [admissions.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [admissions.resident_id],
    references: [residents.id],
  }),
  house: one(houses, {
    fields: [admissions.house_id],
    references: [houses.id],
  }),
  caseManager: one(users, {
    fields: [admissions.case_manager_id],
    references: [users.id],
  }),
}));

// Leads (prospective residents)
export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    first_name: text('first_name').notNull(), // ENCRYPTED: AES-256-GCM
    last_name: text('last_name').notNull(), // ENCRYPTED: AES-256-GCM
    email: text('email'), // ENCRYPTED: AES-256-GCM
    phone: text('phone'), // ENCRYPTED: AES-256-GCM
    status: leadStatus('status').notNull().default('new'),
    source: text('source'), // Where did they hear about us
    referral_source_id: uuid('referral_source_id'), // References users with role=referral_source
    preferred_move_in_date: date('preferred_move_in_date'),
    house_preference_id: uuid('house_preference_id').references(() => houses.id),
    notes: text('notes'), // ENCRYPTED: AES-256-GCM
    converted_to_resident_id: uuid('converted_to_resident_id').references(() => residents.id),
    converted_at: timestamp('converted_at'),
    lost_reason: text('lost_reason'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('leads_org_id_idx').on(table.org_id),
    status_idx: index('leads_status_idx').on(table.status),
    deleted_at_idx: index('leads_deleted_at_idx').on(table.deleted_at),
  })
);

export const leadsRelations = relations(leads, ({ one }) => ({
  organization: one(organizations, {
    fields: [leads.org_id],
    references: [organizations.id],
  }),
  housePreference: one(houses, {
    fields: [leads.house_preference_id],
    references: [houses.id],
  }),
  convertedResident: one(residents, {
    fields: [leads.converted_to_resident_id],
    references: [residents.id],
  }),
}));

// Resident Contacts (family, authorized contacts)
export const residentContacts = pgTable(
  'resident_contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    user_id: uuid('user_id').references(() => users.id), // If contact has login access
    first_name: text('first_name').notNull(), // ENCRYPTED: AES-256-GCM
    last_name: text('last_name').notNull(), // ENCRYPTED: AES-256-GCM
    relationship: text('relationship').notNull(), // parent, spouse, sibling, etc.
    email: text('email'), // ENCRYPTED: AES-256-GCM
    phone: text('phone'), // ENCRYPTED: AES-256-GCM
    can_receive_updates: boolean('can_receive_updates').default(false),
    can_access_portal: boolean('can_access_portal').default(false),
    is_emergency_contact: boolean('is_emergency_contact').default(false),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('resident_contacts_org_id_idx').on(table.org_id),
    resident_id_idx: index('resident_contacts_resident_id_idx').on(table.resident_id),
    deleted_at_idx: index('resident_contacts_deleted_at_idx').on(table.deleted_at),
  })
);

export const residentContactsRelations = relations(residentContacts, ({ one }) => ({
  organization: one(organizations, {
    fields: [residentContacts.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [residentContacts.resident_id],
    references: [residents.id],
  }),
  user: one(users, {
    fields: [residentContacts.user_id],
    references: [users.id],
  }),
}));
