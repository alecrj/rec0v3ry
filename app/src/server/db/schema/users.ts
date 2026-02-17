import { pgTable, uuid, text, timestamp, jsonb, boolean, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { userRole, sensitivityLevel } from './enums';
import { organizations } from './orgs';

// Users (staff, operators, family members)
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerk_id: text('clerk_id').notNull().unique(), // Clerk user ID
    email: text('email').notNull(),
    phone: text('phone'),
    first_name: text('first_name').notNull(),
    last_name: text('last_name').notNull(),
    profile_photo_url: text('profile_photo_url'),
    timezone: text('timezone').default('America/Los_Angeles'),
    preferences: jsonb('preferences'), // UI settings, notification prefs
    is_active: boolean('is_active').notNull().default(true),
    last_login_at: timestamp('last_login_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    clerk_id_idx: index('users_clerk_id_idx').on(table.clerk_id),
    email_idx: index('users_email_idx').on(table.email),
    deleted_at_idx: index('users_deleted_at_idx').on(table.deleted_at),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  roles: many(roleAssignments),
  sessions: many(userSessions),
}));

// Role Assignments (RBAC with flexible scoping)
export const roleAssignments = pgTable(
  'role_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    user_id: uuid('user_id').notNull().references(() => users.id),
    role: userRole('role').notNull(),
    scope_type: text('scope_type'), // 'organization', 'property', 'house', 'resident'
    scope_id: uuid('scope_id'), // ID of the scoped entity
    granted_by: uuid('granted_by').references(() => users.id),
    granted_at: timestamp('granted_at').defaultNow().notNull(),
    revoked_at: timestamp('revoked_at'),
    revoked_by: uuid('revoked_by').references(() => users.id),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    user_id_idx: index('role_assignments_user_id_idx').on(table.user_id),
    org_id_idx: index('role_assignments_org_id_idx').on(table.org_id),
    scope_idx: index('role_assignments_scope_idx').on(table.scope_type, table.scope_id),
    unique_active_role: unique('role_assignments_unique_active').on(table.user_id, table.role, table.scope_type, table.scope_id),
  })
);

export const roleAssignmentsRelations = relations(roleAssignments, ({ one }) => ({
  organization: one(organizations, {
    fields: [roleAssignments.org_id],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [roleAssignments.user_id],
    references: [users.id],
  }),
  granter: one(users, {
    fields: [roleAssignments.granted_by],
    references: [users.id],
  }),
  revoker: one(users, {
    fields: [roleAssignments.revoked_by],
    references: [users.id],
  }),
}));

// User Sessions (active sessions for security monitoring)
export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull().references(() => users.id),
    org_id: uuid('org_id').references(() => organizations.id),
    ip_address: text('ip_address'),
    user_agent: text('user_agent'),
    started_at: timestamp('started_at').defaultNow().notNull(),
    last_active: timestamp('last_active').defaultNow().notNull(),
    expires_at: timestamp('expires_at').notNull(),
    ended_at: timestamp('ended_at'),
    end_reason: text('end_reason'), // 'logout', 'timeout', 'force_logout', 'deactivation'
  },
  (table) => ({
    user_id_idx: index('user_sessions_user_id_idx').on(table.user_id),
    expires_at_idx: index('user_sessions_expires_at_idx').on(table.expires_at),
  })
);

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.user_id],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [userSessions.org_id],
    references: [organizations.id],
  }),
}));
