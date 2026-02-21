import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './orgs';

// Referral source types
export const REFERRAL_SOURCE_TYPES = [
  'treatment_center',
  'court',
  'hospital',
  'aa_na',
  'church',
  'self',
  'family',
  'online',
  'other',
] as const;

export type ReferralSourceType = typeof REFERRAL_SOURCE_TYPES[number];

// Referral Sources (organizations/entities that refer residents)
export const referralSources = pgTable(
  'referral_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    name: text('name').notNull(),
    type: text('type').notNull(), // treatment_center, court, hospital, aa_na, church, self, family, online, other
    contact_name: text('contact_name'),
    contact_phone: text('contact_phone'),
    contact_email: text('contact_email'),
    address: text('address'),
    notes: text('notes'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('referral_sources_org_id_idx').on(table.org_id),
    type_idx: index('referral_sources_type_idx').on(table.type),
    is_active_idx: index('referral_sources_is_active_idx').on(table.is_active),
    deleted_at_idx: index('referral_sources_deleted_at_idx').on(table.deleted_at),
  })
);

export const referralSourcesRelations = relations(referralSources, ({ one }) => ({
  organization: one(organizations, {
    fields: [referralSources.org_id],
    references: [organizations.id],
  }),
}));
