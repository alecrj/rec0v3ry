import { pgTable, uuid, text, timestamp, jsonb, boolean, date, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { consentType, consentStatus, disclosurePurpose, breachType, breachRiskLevel, sensitivityLevel } from './enums';
import { organizations } from './orgs';
import { residents } from './residents';
import { users } from './users';

// Consents (42 CFR Part 2 consent tracking)
export const consents = pgTable(
  'consents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    consent_type: consentType('consent_type').notNull(),
    status: consentStatus('status').notNull().default('pending'),
    granted_at: timestamp('granted_at'),
    expires_at: timestamp('expires_at'),
    revoked_at: timestamp('revoked_at'),
    revocation_reason: text('revocation_reason'),
    purpose: text('purpose').notNull(), // What the consent is for
    recipient_name: text('recipient_name'), // ENCRYPTED: AES-256-GCM - who can receive info
    recipient_organization: text('recipient_organization'), // ENCRYPTED: AES-256-GCM
    scope_of_information: text('scope_of_information'), // What information can be disclosed
    consent_form_signed: boolean('consent_form_signed').default(false),
    consent_document_id: uuid('consent_document_id'), // References documents table
    signature_date: date('signature_date'),
    witness_name: text('witness_name'), // ENCRYPTED: AES-256-GCM
    witness_signature_date: date('witness_signature_date'),
    notes: text('notes'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('consents_org_id_idx').on(table.org_id),
    resident_id_idx: index('consents_resident_id_idx').on(table.resident_id),
    status_idx: index('consents_status_idx').on(table.status),
    expires_at_idx: index('consents_expires_at_idx').on(table.expires_at),
    deleted_at_idx: index('consents_deleted_at_idx').on(table.deleted_at),
  })
);

export const consentsRelations = relations(consents, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [consents.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [consents.resident_id],
    references: [residents.id],
  }),
  disclosures: many(consentDisclosures),
}));

// Consent Disclosures (log every time Part 2 data is shared)
export const consentDisclosures = pgTable(
  'consent_disclosures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    consent_id: uuid('consent_id').notNull().references(() => consents.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    disclosed_to_name: text('disclosed_to_name').notNull(), // ENCRYPTED: AES-256-GCM
    disclosed_to_organization: text('disclosed_to_organization'), // ENCRYPTED: AES-256-GCM
    disclosed_to_email: text('disclosed_to_email'), // ENCRYPTED: AES-256-GCM
    disclosure_purpose: disclosurePurpose('disclosure_purpose').notNull(),
    information_disclosed: text('information_disclosed').notNull(), // ENCRYPTED: AES-256-GCM - what was shared
    disclosure_method: text('disclosure_method'), // 'email', 'fax', 'phone', 'in_person', 'portal'
    disclosed_at: timestamp('disclosed_at').notNull(),
    disclosed_by: uuid('disclosed_by').notNull().references(() => users.id),
    recipient_confirmation: boolean('recipient_confirmation').default(false),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    org_id_idx: index('consent_disclosures_org_id_idx').on(table.org_id),
    consent_id_idx: index('consent_disclosures_consent_id_idx').on(table.consent_id),
    resident_id_idx: index('consent_disclosures_resident_id_idx').on(table.resident_id),
    disclosed_at_idx: index('consent_disclosures_disclosed_at_idx').on(table.disclosed_at),
  })
);

export const consentDisclosuresRelations = relations(consentDisclosures, ({ one }) => ({
  organization: one(organizations, {
    fields: [consentDisclosures.org_id],
    references: [organizations.id],
  }),
  consent: one(consents, {
    fields: [consentDisclosures.consent_id],
    references: [consents.id],
  }),
  resident: one(residents, {
    fields: [consentDisclosures.resident_id],
    references: [residents.id],
  }),
  discloser: one(users, {
    fields: [consentDisclosures.disclosed_by],
    references: [users.id],
  }),
}));

// Patient Notices (Notice of Privacy Practices tracking)
export const patientNotices = pgTable(
  'patient_notices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    notice_type: text('notice_type').notNull(), // 'privacy_practices', 'part2_rights', 'data_breach', etc.
    notice_version: text('notice_version').notNull(),
    provided_at: timestamp('provided_at').notNull(),
    provided_method: text('provided_method').notNull(), // 'paper', 'email', 'portal', 'verbal'
    acknowledgment_signed: boolean('acknowledgment_signed').default(false),
    signature_date: date('signature_date'),
    document_id: uuid('document_id'), // References documents table
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    created_by: uuid('created_by'),
  },
  (table) => ({
    org_id_idx: index('patient_notices_org_id_idx').on(table.org_id),
    resident_id_idx: index('patient_notices_resident_id_idx').on(table.resident_id),
    provided_at_idx: index('patient_notices_provided_at_idx').on(table.provided_at),
  })
);

export const patientNoticesRelations = relations(patientNotices, ({ one }) => ({
  organization: one(organizations, {
    fields: [patientNotices.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [patientNotices.resident_id],
    references: [residents.id],
  }),
}));

// Breach Incidents (HIPAA breach tracking)
export const breachIncidents = pgTable(
  'breach_incidents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    breach_type: breachType('breach_type').notNull(),
    risk_level: breachRiskLevel('risk_level').notNull(),
    discovered_at: timestamp('discovered_at').notNull(),
    occurred_at: timestamp('occurred_at'),
    description: text('description').notNull(), // ENCRYPTED: AES-256-GCM
    affected_resident_count: text('affected_resident_count'), // Integer as text to avoid leakage
    affected_resident_ids: jsonb('affected_resident_ids'), // ENCRYPTED: AES-256-GCM - array of UUIDs
    phi_involved: text('phi_involved'), // ENCRYPTED: AES-256-GCM - description of PHI
    cause: text('cause'), // ENCRYPTED: AES-256-GCM
    mitigation_actions: text('mitigation_actions'), // ENCRYPTED: AES-256-GCM
    hhs_notified: boolean('hhs_notified').default(false),
    hhs_notification_date: date('hhs_notification_date'),
    media_notified: boolean('media_notified').default(false),
    individuals_notified: boolean('individuals_notified').default(false),
    notification_date: date('notification_date'),
    reported_by: uuid('reported_by').references(() => users.id),
    investigation_status: text('investigation_status').default('open'), // 'open', 'in_progress', 'closed'
    investigation_notes: text('investigation_notes'), // ENCRYPTED: AES-256-GCM
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
  },
  (table) => ({
    org_id_idx: index('breach_incidents_org_id_idx').on(table.org_id),
    discovered_at_idx: index('breach_incidents_discovered_at_idx').on(table.discovered_at),
    risk_level_idx: index('breach_incidents_risk_level_idx').on(table.risk_level),
  })
);

export const breachIncidentsRelations = relations(breachIncidents, ({ one }) => ({
  organization: one(organizations, {
    fields: [breachIncidents.org_id],
    references: [organizations.id],
  }),
  reporter: one(users, {
    fields: [breachIncidents.reported_by],
    references: [users.id],
  }),
}));

// BAA Records (Business Associate Agreement tracking)
export const baaRecords = pgTable(
  'baa_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    vendor_name: text('vendor_name').notNull(),
    vendor_contact_name: text('vendor_contact_name'),
    vendor_contact_email: text('vendor_contact_email'),
    vendor_contact_phone: text('vendor_contact_phone'),
    service_provided: text('service_provided').notNull(), // What service/PHI access
    baa_signed_date: date('baa_signed_date').notNull(),
    baa_effective_date: date('baa_effective_date').notNull(),
    baa_expiration_date: date('baa_expiration_date'),
    baa_document_id: uuid('baa_document_id'), // References documents table
    is_active: boolean('is_active').default(true),
    renewal_reminder_date: date('renewal_reminder_date'),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('baa_records_org_id_idx').on(table.org_id),
    baa_expiration_date_idx: index('baa_records_baa_expiration_date_idx').on(table.baa_expiration_date),
    deleted_at_idx: index('baa_records_deleted_at_idx').on(table.deleted_at),
  })
);

export const baaRecordsRelations = relations(baaRecords, ({ one }) => ({
  organization: one(organizations, {
    fields: [baaRecords.org_id],
    references: [organizations.id],
  }),
}));
