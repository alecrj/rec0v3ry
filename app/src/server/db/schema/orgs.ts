import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { bedStatus } from './enums';

// Organizations (top-level tenant)
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(), // URL-safe identifier
    settings: jsonb('settings'), // Org-wide configuration
    stripe_account_id: text('stripe_account_id'), // Stripe Connect Account
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    slug_idx: index('organizations_slug_idx').on(table.slug),
    deleted_at_idx: index('organizations_deleted_at_idx').on(table.deleted_at),
  })
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  properties: many(properties),
}));

// Properties (multi-property support)
export const properties = pgTable(
  'properties',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    name: text('name').notNull(),
    address_line1: text('address_line1').notNull(),
    address_line2: text('address_line2'),
    city: text('city').notNull(),
    state: text('state').notNull(),
    zip: text('zip').notNull(),
    phone: text('phone'),
    email: text('email'),
    settings: jsonb('settings'), // Property-specific settings
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('properties_org_id_idx').on(table.org_id),
    deleted_at_idx: index('properties_deleted_at_idx').on(table.deleted_at),
  })
);

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [properties.org_id],
    references: [organizations.id],
  }),
  houses: many(houses),
}));

// Houses (individual homes within a property)
export const houses = pgTable(
  'houses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    property_id: uuid('property_id').notNull().references(() => properties.id),
    name: text('name').notNull(),
    capacity: integer('capacity').notNull(), // Max residents
    gender_restriction: text('gender_restriction'), // 'male', 'female', 'coed', null
    address_line1: text('address_line1'),
    address_line2: text('address_line2'),
    city: text('city'),
    state: text('state'),
    zip: text('zip'),
    phone: text('phone'),
    settings: jsonb('settings'), // House-specific rules, curfew, etc.
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('houses_org_id_idx').on(table.org_id),
    property_id_idx: index('houses_property_id_idx').on(table.property_id),
    deleted_at_idx: index('houses_deleted_at_idx').on(table.deleted_at),
  })
);

export const housesRelations = relations(houses, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [houses.org_id],
    references: [organizations.id],
  }),
  property: one(properties, {
    fields: [houses.property_id],
    references: [properties.id],
  }),
  rooms: many(rooms),
}));

// Rooms
export const rooms = pgTable(
  'rooms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    house_id: uuid('house_id').notNull().references(() => houses.id),
    name: text('name').notNull(), // "Room 101", "Suite A", etc.
    floor: integer('floor'),
    capacity: integer('capacity').notNull(), // Max beds in room
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('rooms_org_id_idx').on(table.org_id),
    house_id_idx: index('rooms_house_id_idx').on(table.house_id),
    deleted_at_idx: index('rooms_deleted_at_idx').on(table.deleted_at),
  })
);

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [rooms.org_id],
    references: [organizations.id],
  }),
  house: one(houses, {
    fields: [rooms.house_id],
    references: [houses.id],
  }),
  beds: many(beds),
}));

// Beds
export const beds = pgTable(
  'beds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    room_id: uuid('room_id').notNull().references(() => rooms.id),
    name: text('name').notNull(), // "Bed A", "Bunk 1", etc.
    status: bedStatus('status').notNull().default('available'),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('beds_org_id_idx').on(table.org_id),
    room_id_idx: index('beds_room_id_idx').on(table.room_id),
    status_idx: index('beds_status_idx').on(table.status),
    deleted_at_idx: index('beds_deleted_at_idx').on(table.deleted_at),
  })
);

export const bedsRelations = relations(beds, ({ one }) => ({
  organization: one(organizations, {
    fields: [beds.org_id],
    references: [organizations.id],
  }),
  room: one(rooms, {
    fields: [beds.room_id],
    references: [rooms.id],
  }),
}));

