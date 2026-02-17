import { pgTable, uuid, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './orgs';
import { documents } from './documents';
import { users } from './users';

// Document Versions (version control for documents)
export const documentVersions = pgTable(
  'document_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    document_id: uuid('document_id').notNull().references(() => documents.id),
    version_number: integer('version_number').notNull(),
    file_url: text('file_url').notNull(),
    changes_summary: text('changes_summary'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    created_by: uuid('created_by').references(() => users.id),
  },
  (table) => ({
    org_id_idx: index('document_versions_org_id_idx').on(table.org_id),
    document_id_idx: index('document_versions_document_id_idx').on(table.document_id),
  })
);

export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  organization: one(organizations, {
    fields: [documentVersions.org_id],
    references: [organizations.id],
  }),
  document: one(documents, {
    fields: [documentVersions.document_id],
    references: [documents.id],
  }),
  creator: one(users, {
    fields: [documentVersions.created_by],
    references: [users.id],
  }),
}));
