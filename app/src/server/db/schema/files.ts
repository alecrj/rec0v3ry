import { pgTable, uuid, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { fileCategory, sensitivityLevel } from './enums';
import { organizations } from './orgs';
import { users } from './users';
import { residents } from './residents';

// File Uploads (S3/storage tracking)
export const fileUploads = pgTable(
  'file_uploads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),

    // File metadata
    file_name: text('file_name').notNull(),
    file_size: integer('file_size').notNull(), // Bytes
    mime_type: text('mime_type').notNull(),
    category: fileCategory('category').notNull(),

    // Storage
    storage_key: text('storage_key').notNull(), // S3 key or storage path
    storage_url: text('storage_url').notNull(), // Presigned URL or CDN URL
    storage_bucket: text('storage_bucket').notNull(),

    // Encryption
    is_encrypted: boolean('is_encrypted').default(true),
    encryption_key_id: text('encryption_key_id'), // KMS key ID

    // Associations
    uploaded_by_user_id: uuid('uploaded_by_user_id').references(() => users.id),
    uploaded_by_resident_id: uuid('uploaded_by_resident_id').references(() => residents.id),
    related_resident_id: uuid('related_resident_id').references(() => residents.id), // File is about this resident

    // Reference to parent entity
    reference_type: text('reference_type'), // 'document', 'message', 'profile_photo', etc.
    reference_id: uuid('reference_id'),

    // Security
    sensitivity_level: sensitivityLevel('sensitivity_level').notNull().default('confidential'),
    virus_scan_status: text('virus_scan_status').default('pending'), // 'pending', 'clean', 'infected', 'failed'
    virus_scan_result: text('virus_scan_result'),

    // Metadata
    description: text('description'),
    checksum: text('checksum'), // SHA-256 hash for integrity verification

    // Timestamps
    uploaded_at: timestamp('uploaded_at').defaultNow().notNull(),
    expires_at: timestamp('expires_at'), // For temporary files
    created_at: timestamp('created_at').defaultNow().notNull(),
    deleted_at: timestamp('deleted_at'), // Soft delete
  },
  (table) => ({
    org_id_idx: index('file_uploads_org_id_idx').on(table.org_id),
    uploaded_by_user_id_idx: index('file_uploads_uploaded_by_user_id_idx').on(table.uploaded_by_user_id),
    related_resident_id_idx: index('file_uploads_related_resident_id_idx').on(table.related_resident_id),
    reference_idx: index('file_uploads_reference_idx').on(table.reference_type, table.reference_id),
    category_idx: index('file_uploads_category_idx').on(table.category),
    deleted_at_idx: index('file_uploads_deleted_at_idx').on(table.deleted_at),
    uploaded_at_idx: index('file_uploads_uploaded_at_idx').on(table.uploaded_at),
  })
);

export const fileUploadsRelations = relations(fileUploads, ({ one }) => ({
  organization: one(organizations, {
    fields: [fileUploads.org_id],
    references: [organizations.id],
  }),
  uploaderUser: one(users, {
    fields: [fileUploads.uploaded_by_user_id],
    references: [users.id],
  }),
  uploaderResident: one(residents, {
    fields: [fileUploads.uploaded_by_resident_id],
    references: [residents.id],
  }),
  relatedResident: one(residents, {
    fields: [fileUploads.related_resident_id],
    references: [residents.id],
  }),
}));
