import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './orgs';
import { announcements } from './messaging';
import { users } from './users';
import { residents } from './residents';

// Announcement Reads (tracking who has read announcements)
export const announcementReads = pgTable(
  'announcement_reads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    announcement_id: uuid('announcement_id').notNull().references(() => announcements.id, { onDelete: 'cascade' }),
    user_id: uuid('user_id').references(() => users.id),
    resident_id: uuid('resident_id').references(() => residents.id),
    read_at: timestamp('read_at').defaultNow().notNull(),
  },
  (table) => ({
    org_id_idx: index('announcement_reads_org_id_idx').on(table.org_id),
    announcement_id_idx: index('announcement_reads_announcement_id_idx').on(table.announcement_id),
    user_id_idx: index('announcement_reads_user_id_idx').on(table.user_id),
    resident_id_idx: index('announcement_reads_resident_id_idx').on(table.resident_id),
  })
);

export const announcementReadsRelations = relations(announcementReads, ({ one }) => ({
  organization: one(organizations, {
    fields: [announcementReads.org_id],
    references: [organizations.id],
  }),
  announcement: one(announcements, {
    fields: [announcementReads.announcement_id],
    references: [announcements.id],
  }),
  user: one(users, {
    fields: [announcementReads.user_id],
    references: [users.id],
  }),
  resident: one(residents, {
    fields: [announcementReads.resident_id],
    references: [residents.id],
  }),
}));
