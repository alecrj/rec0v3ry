import { pgTable, uuid, text, timestamp, jsonb, boolean, date, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { documentType, documentStatus, signatureMethod, sensitivityLevel } from './enums';
import { organizations, houses } from './orgs';
import { residents } from './residents';
import { users } from './users';

// Documents
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').references(() => residents.id), // Nullable for org-level docs
    template_id: uuid('template_id'), // References document_templates
    document_type: documentType('document_type').notNull(),
    status: documentStatus('status').notNull().default('draft'),
    title: text('title').notNull(),
    description: text('description'),
    file_url: text('file_url'), // S3/storage URL
    docusign_envelope_id: text('docusign_envelope_id'), // DocuSign integration
    docusign_status: text('docusign_status'),
    expires_at: timestamp('expires_at'),
    sensitivity_level: sensitivityLevel('sensitivity_level').notNull().default('confidential'),
    retention_policy_id: uuid('retention_policy_id'), // References retention_policies
    metadata: jsonb('metadata'), // Custom fields
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('documents_org_id_idx').on(table.org_id),
    resident_id_idx: index('documents_resident_id_idx').on(table.resident_id),
    document_type_idx: index('documents_document_type_idx').on(table.document_type),
    status_idx: index('documents_status_idx').on(table.status),
    deleted_at_idx: index('documents_deleted_at_idx').on(table.deleted_at),
  })
);

export const documentsRelations = relations(documents, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [documents.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [documents.resident_id],
    references: [residents.id],
  }),
  template: one(documentTemplates, {
    fields: [documents.template_id],
    references: [documentTemplates.id],
  }),
  signatures: many(signatures),
}));

// Document Templates
export const documentTemplates = pgTable(
  'document_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    name: text('name').notNull(),
    document_type: documentType('document_type').notNull(),
    description: text('description'),
    template_content: text('template_content'), // HTML/markdown content with merge fields
    docusign_template_id: text('docusign_template_id'), // DocuSign template
    merge_fields: jsonb('merge_fields'), // Available merge field definitions
    is_active: boolean('is_active').default(true),
    version: text('version').default('1.0'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
  },
  (table) => ({
    org_id_idx: index('document_templates_org_id_idx').on(table.org_id),
    document_type_idx: index('document_templates_document_type_idx').on(table.document_type),
  })
);

export const documentTemplatesRelations = relations(documentTemplates, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [documentTemplates.org_id],
    references: [organizations.id],
  }),
  documents: many(documents),
}));

// Signatures
export const signatures = pgTable(
  'signatures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    document_id: uuid('document_id').notNull().references(() => documents.id),
    signer_resident_id: uuid('signer_resident_id').references(() => residents.id),
    signer_user_id: uuid('signer_user_id').references(() => users.id),
    signer_name: text('signer_name').notNull(), // ENCRYPTED: AES-256-GCM
    signer_email: text('signer_email'), // ENCRYPTED: AES-256-GCM
    signature_method: signatureMethod('signature_method').notNull(),
    signed_at: timestamp('signed_at'),
    ip_address: text('ip_address'), // For audit trail
    user_agent: text('user_agent'),
    docusign_recipient_id: text('docusign_recipient_id'),
    signature_image_url: text('signature_image_url'), // S3 URL for signature image
    is_verified: boolean('is_verified').default(false),
    verification_code: text('verification_code'), // For email/SMS verification
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    org_id_idx: index('signatures_org_id_idx').on(table.org_id),
    document_id_idx: index('signatures_document_id_idx').on(table.document_id),
    signer_resident_id_idx: index('signatures_signer_resident_id_idx').on(table.signer_resident_id),
    signed_at_idx: index('signatures_signed_at_idx').on(table.signed_at),
  })
);

export const signaturesRelations = relations(signatures, ({ one }) => ({
  organization: one(organizations, {
    fields: [signatures.org_id],
    references: [organizations.id],
  }),
  document: one(documents, {
    fields: [signatures.document_id],
    references: [documents.id],
  }),
  signerResident: one(residents, {
    fields: [signatures.signer_resident_id],
    references: [residents.id],
  }),
  signerUser: one(users, {
    fields: [signatures.signer_user_id],
    references: [users.id],
  }),
}));

// Retention Policies
export const retentionPolicies = pgTable(
  'retention_policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    name: text('name').notNull(),
    document_type: documentType('document_type'),
    retention_period_days: text('retention_period_days').notNull(), // e.g., '2555' (7 years), 'indefinite'
    description: text('description'),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
  },
  (table) => ({
    org_id_idx: index('retention_policies_org_id_idx').on(table.org_id),
  })
);

export const retentionPoliciesRelations = relations(retentionPolicies, ({ one }) => ({
  organization: one(organizations, {
    fields: [retentionPolicies.org_id],
    references: [organizations.id],
  }),
}));
