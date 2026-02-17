import { pgTable, uuid, text, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { conversationType, messageStatus, sensitivityLevel } from './enums';
import { organizations, houses } from './orgs';
import { residents } from './residents';
import { users } from './users';

// Conversations
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    conversation_type: conversationType('conversation_type').notNull(),
    title: text('title'),
    house_id: uuid('house_id').references(() => houses.id), // For house-wide announcements
    is_archived: boolean('is_archived').default(false),
    sensitivity_level: sensitivityLevel('sensitivity_level').notNull().default('internal'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
  },
  (table) => ({
    org_id_idx: index('conversations_org_id_idx').on(table.org_id),
    conversation_type_idx: index('conversations_conversation_type_idx').on(table.conversation_type),
    house_id_idx: index('conversations_house_id_idx').on(table.house_id),
  })
);

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [conversations.org_id],
    references: [organizations.id],
  }),
  house: one(houses, {
    fields: [conversations.house_id],
    references: [houses.id],
  }),
  members: many(conversationMembers),
  messages: many(messages),
}));

// Conversation Members
export const conversationMembers = pgTable(
  'conversation_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    conversation_id: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    user_id: uuid('user_id').references(() => users.id),
    resident_id: uuid('resident_id').references(() => residents.id),
    joined_at: timestamp('joined_at').defaultNow().notNull(),
    last_read_at: timestamp('last_read_at'),
    is_muted: boolean('is_muted').default(false),
    left_at: timestamp('left_at'),
  },
  (table) => ({
    org_id_idx: index('conversation_members_org_id_idx').on(table.org_id),
    conversation_id_idx: index('conversation_members_conversation_id_idx').on(table.conversation_id),
    user_id_idx: index('conversation_members_user_id_idx').on(table.user_id),
    resident_id_idx: index('conversation_members_resident_id_idx').on(table.resident_id),
  })
);

export const conversationMembersRelations = relations(conversationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [conversationMembers.org_id],
    references: [organizations.id],
  }),
  conversation: one(conversations, {
    fields: [conversationMembers.conversation_id],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [conversationMembers.user_id],
    references: [users.id],
  }),
  resident: one(residents, {
    fields: [conversationMembers.resident_id],
    references: [residents.id],
  }),
}));

// Messages
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    conversation_id: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    sender_user_id: uuid('sender_user_id').references(() => users.id),
    sender_resident_id: uuid('sender_resident_id').references(() => residents.id),
    content: text('content').notNull(), // ENCRYPTED: AES-256-GCM
    status: messageStatus('status').notNull().default('sent'),
    sent_at: timestamp('sent_at').defaultNow().notNull(),
    delivered_at: timestamp('delivered_at'),
    read_at: timestamp('read_at'),
    reply_to_message_id: uuid('reply_to_message_id'), // Thread support
    attachments: jsonb('attachments'), // Array of file URLs
    metadata: jsonb('metadata'),
    is_system_message: boolean('is_system_message').default(false),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('messages_org_id_idx').on(table.org_id),
    conversation_id_idx: index('messages_conversation_id_idx').on(table.conversation_id),
    sender_user_id_idx: index('messages_sender_user_id_idx').on(table.sender_user_id),
    sender_resident_id_idx: index('messages_sender_resident_id_idx').on(table.sender_resident_id),
    sent_at_idx: index('messages_sent_at_idx').on(table.sent_at),
  })
);

export const messagesRelations = relations(messages, ({ one }) => ({
  organization: one(organizations, {
    fields: [messages.org_id],
    references: [organizations.id],
  }),
  conversation: one(conversations, {
    fields: [messages.conversation_id],
    references: [conversations.id],
  }),
  senderUser: one(users, {
    fields: [messages.sender_user_id],
    references: [users.id],
  }),
  senderResident: one(residents, {
    fields: [messages.sender_resident_id],
    references: [residents.id],
  }),
  replyTo: one(messages, {
    fields: [messages.reply_to_message_id],
    references: [messages.id],
  }),
}));

// Announcements
export const announcements = pgTable(
  'announcements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    house_id: uuid('house_id').references(() => houses.id), // Null = org-wide
    title: text('title').notNull(),
    content: text('content').notNull(),
    priority: text('priority').default('normal'), // 'low', 'normal', 'high', 'urgent'
    is_pinned: boolean('is_pinned').default(false),
    published_at: timestamp('published_at'),
    expires_at: timestamp('expires_at'),
    target_roles: jsonb('target_roles'), // Array of user_role enums
    is_draft: boolean('is_draft').default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('announcements_org_id_idx').on(table.org_id),
    house_id_idx: index('announcements_house_id_idx').on(table.house_id),
    published_at_idx: index('announcements_published_at_idx').on(table.published_at),
    deleted_at_idx: index('announcements_deleted_at_idx').on(table.deleted_at),
  })
);

export const announcementsRelations = relations(announcements, ({ one }) => ({
  organization: one(organizations, {
    fields: [announcements.org_id],
    references: [organizations.id],
  }),
  house: one(houses, {
    fields: [announcements.house_id],
    references: [houses.id],
  }),
}));
