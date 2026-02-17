import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, date, time, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { choreStatus, meetingType, passType, passStatus, drugTestResult, drugTestType, incidentSeverity, incidentType, taskStatus, taskPriority } from './enums';
import { organizations, houses, rooms } from './orgs';
import { residents, admissions } from './residents';
import { users } from './users';

// Chores
export const chores = pgTable(
  'chores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    house_id: uuid('house_id').notNull().references(() => houses.id),
    title: text('title').notNull(),
    description: text('description'),
    area: text('area'), // 'kitchen', 'bathroom', 'common_area', etc.
    frequency: text('frequency'), // 'daily', 'weekly', 'monthly'
    estimated_duration_minutes: integer('estimated_duration_minutes'),
    instructions: text('instructions'),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('chores_org_id_idx').on(table.org_id),
    house_id_idx: index('chores_house_id_idx').on(table.house_id),
    deleted_at_idx: index('chores_deleted_at_idx').on(table.deleted_at),
  })
);

export const choresRelations = relations(chores, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [chores.org_id],
    references: [organizations.id],
  }),
  house: one(houses, {
    fields: [chores.house_id],
    references: [houses.id],
  }),
  assignments: many(choreAssignments),
}));

// Chore Assignments
export const choreAssignments = pgTable(
  'chore_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    chore_id: uuid('chore_id').notNull().references(() => chores.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    assigned_date: date('assigned_date').notNull(),
    due_date: date('due_date').notNull(),
    status: choreStatus('status').notNull().default('assigned'),
    completed_at: timestamp('completed_at'),
    verified_by: uuid('verified_by').references(() => users.id),
    verified_at: timestamp('verified_at'),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
  },
  (table) => ({
    org_id_idx: index('chore_assignments_org_id_idx').on(table.org_id),
    chore_id_idx: index('chore_assignments_chore_id_idx').on(table.chore_id),
    resident_id_idx: index('chore_assignments_resident_id_idx').on(table.resident_id),
    due_date_idx: index('chore_assignments_due_date_idx').on(table.due_date),
    status_idx: index('chore_assignments_status_idx').on(table.status),
  })
);

export const choreAssignmentsRelations = relations(choreAssignments, ({ one }) => ({
  organization: one(organizations, {
    fields: [choreAssignments.org_id],
    references: [organizations.id],
  }),
  chore: one(chores, {
    fields: [choreAssignments.chore_id],
    references: [chores.id],
  }),
  resident: one(residents, {
    fields: [choreAssignments.resident_id],
    references: [residents.id],
  }),
  verifier: one(users, {
    fields: [choreAssignments.verified_by],
    references: [users.id],
  }),
}));

// Meetings
export const meetings = pgTable(
  'meetings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    house_id: uuid('house_id').references(() => houses.id),
    title: text('title').notNull(),
    meeting_type: meetingType('meeting_type').notNull(),
    description: text('description'),
    scheduled_at: timestamp('scheduled_at').notNull(),
    duration_minutes: integer('duration_minutes').default(60),
    location: text('location'),
    facilitator_id: uuid('facilitator_id').references(() => users.id),
    is_mandatory: boolean('is_mandatory').default(false),
    is_recurring: boolean('is_recurring').default(false),
    recurrence_rule: text('recurrence_rule'), // iCal RRULE format
    notes: text('notes'), // ENCRYPTED: AES-256-GCM (meeting minutes)
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('meetings_org_id_idx').on(table.org_id),
    house_id_idx: index('meetings_house_id_idx').on(table.house_id),
    scheduled_at_idx: index('meetings_scheduled_at_idx').on(table.scheduled_at),
    deleted_at_idx: index('meetings_deleted_at_idx').on(table.deleted_at),
  })
);

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [meetings.org_id],
    references: [organizations.id],
  }),
  house: one(houses, {
    fields: [meetings.house_id],
    references: [houses.id],
  }),
  facilitator: one(users, {
    fields: [meetings.facilitator_id],
    references: [users.id],
  }),
  attendance: many(meetingAttendance),
}));

// Meeting Attendance
export const meetingAttendance = pgTable(
  'meeting_attendance',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    meeting_id: uuid('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    attended: boolean('attended').default(false),
    checked_in_at: timestamp('checked_in_at'),
    excused: boolean('excused').default(false),
    excuse_reason: text('excuse_reason'),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    org_id_idx: index('meeting_attendance_org_id_idx').on(table.org_id),
    meeting_id_idx: index('meeting_attendance_meeting_id_idx').on(table.meeting_id),
    resident_id_idx: index('meeting_attendance_resident_id_idx').on(table.resident_id),
  })
);

export const meetingAttendanceRelations = relations(meetingAttendance, ({ one }) => ({
  organization: one(organizations, {
    fields: [meetingAttendance.org_id],
    references: [organizations.id],
  }),
  meeting: one(meetings, {
    fields: [meetingAttendance.meeting_id],
    references: [meetings.id],
  }),
  resident: one(residents, {
    fields: [meetingAttendance.resident_id],
    references: [residents.id],
  }),
}));

// Passes (leave requests)
export const passes = pgTable(
  'passes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    pass_type: passType('pass_type').notNull(),
    status: passStatus('status').notNull().default('requested'),
    requested_at: timestamp('requested_at').defaultNow().notNull(),
    start_time: timestamp('start_time').notNull(),
    end_time: timestamp('end_time').notNull(),
    destination: text('destination'), // ENCRYPTED: AES-256-GCM
    purpose: text('purpose'),
    contact_during_pass: text('contact_during_pass'), // ENCRYPTED: AES-256-GCM (phone, etc.)
    approved_by: uuid('approved_by').references(() => users.id),
    approved_at: timestamp('approved_at'),
    denial_reason: text('denial_reason'),
    actual_return_time: timestamp('actual_return_time'),
    was_violated: boolean('was_violated').default(false),
    violation_notes: text('violation_notes'),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('passes_org_id_idx').on(table.org_id),
    resident_id_idx: index('passes_resident_id_idx').on(table.resident_id),
    status_idx: index('passes_status_idx').on(table.status),
    start_time_idx: index('passes_start_time_idx').on(table.start_time),
    deleted_at_idx: index('passes_deleted_at_idx').on(table.deleted_at),
  })
);

export const passesRelations = relations(passes, ({ one }) => ({
  organization: one(organizations, {
    fields: [passes.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [passes.resident_id],
    references: [residents.id],
  }),
  approver: one(users, {
    fields: [passes.approved_by],
    references: [users.id],
  }),
}));

// Curfew Configs (house-level or resident-specific)
export const curfewConfigs = pgTable(
  'curfew_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    house_id: uuid('house_id').references(() => houses.id),
    resident_id: uuid('resident_id').references(() => residents.id), // Null = house default
    weekday_curfew: time('weekday_curfew').notNull(), // e.g., '22:00:00'
    weekend_curfew: time('weekend_curfew').notNull(),
    effective_from: date('effective_from').notNull(),
    effective_until: date('effective_until'),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
  },
  (table) => ({
    org_id_idx: index('curfew_configs_org_id_idx').on(table.org_id),
    house_id_idx: index('curfew_configs_house_id_idx').on(table.house_id),
    resident_id_idx: index('curfew_configs_resident_id_idx').on(table.resident_id),
  })
);

export const curfewConfigsRelations = relations(curfewConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [curfewConfigs.org_id],
    references: [organizations.id],
  }),
  house: one(houses, {
    fields: [curfewConfigs.house_id],
    references: [houses.id],
  }),
  resident: one(residents, {
    fields: [curfewConfigs.resident_id],
    references: [residents.id],
  }),
}));

// Drug Tests
export const drugTests = pgTable(
  'drug_tests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    test_type: drugTestType('test_type').notNull(),
    test_date: timestamp('test_date').notNull(),
    result: drugTestResult('result'),
    substances_detected: jsonb('substances_detected'), // ENCRYPTED: AES-256-GCM - array of substances
    administered_by: uuid('administered_by').references(() => users.id),
    lab_name: text('lab_name'),
    lab_order_number: text('lab_order_number'),
    is_random: boolean('is_random').default(false),
    notes: text('notes'), // ENCRYPTED: AES-256-GCM
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('drug_tests_org_id_idx').on(table.org_id),
    resident_id_idx: index('drug_tests_resident_id_idx').on(table.resident_id),
    test_date_idx: index('drug_tests_test_date_idx').on(table.test_date),
    deleted_at_idx: index('drug_tests_deleted_at_idx').on(table.deleted_at),
  })
);

export const drugTestsRelations = relations(drugTests, ({ one }) => ({
  organization: one(organizations, {
    fields: [drugTests.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [drugTests.resident_id],
    references: [residents.id],
  }),
  administrator: one(users, {
    fields: [drugTests.administered_by],
    references: [users.id],
  }),
}));

// Incidents
export const incidents = pgTable(
  'incidents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    house_id: uuid('house_id').references(() => houses.id),
    resident_id: uuid('resident_id').references(() => residents.id), // Nullable if not resident-specific
    incident_type: incidentType('incident_type').notNull(),
    severity: incidentSeverity('severity').notNull(),
    occurred_at: timestamp('occurred_at').notNull(),
    location: text('location'),
    description: text('description').notNull(), // ENCRYPTED: AES-256-GCM
    action_taken: text('action_taken'), // ENCRYPTED: AES-256-GCM
    reported_by: uuid('reported_by').references(() => users.id),
    witnesses: jsonb('witnesses'), // Array of names/IDs
    police_involved: boolean('police_involved').default(false),
    police_report_number: text('police_report_number'),
    follow_up_required: boolean('follow_up_required').default(false),
    follow_up_notes: text('follow_up_notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('incidents_org_id_idx').on(table.org_id),
    house_id_idx: index('incidents_house_id_idx').on(table.house_id),
    resident_id_idx: index('incidents_resident_id_idx').on(table.resident_id),
    occurred_at_idx: index('incidents_occurred_at_idx').on(table.occurred_at),
    severity_idx: index('incidents_severity_idx').on(table.severity),
    deleted_at_idx: index('incidents_deleted_at_idx').on(table.deleted_at),
  })
);

export const incidentsRelations = relations(incidents, ({ one }) => ({
  organization: one(organizations, {
    fields: [incidents.org_id],
    references: [organizations.id],
  }),
  house: one(houses, {
    fields: [incidents.house_id],
    references: [houses.id],
  }),
  resident: one(residents, {
    fields: [incidents.resident_id],
    references: [residents.id],
  }),
  reporter: one(users, {
    fields: [incidents.reported_by],
    references: [users.id],
  }),
}));

// Daily Check-ins (wellness tracking)
export const dailyCheckIns = pgTable(
  'daily_check_ins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    check_in_date: date('check_in_date').notNull(),
    mood_rating: integer('mood_rating'), // 1-10 scale (not encrypted per compliance finding F5)
    cravings_rating: integer('cravings_rating'), // 1-10 scale
    sleep_hours: integer('sleep_hours'),
    attended_meeting: boolean('attended_meeting'),
    notes: text('notes'), // ENCRYPTED: AES-256-GCM
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    org_id_idx: index('daily_check_ins_org_id_idx').on(table.org_id),
    resident_id_idx: index('daily_check_ins_resident_id_idx').on(table.resident_id),
    check_in_date_idx: index('daily_check_ins_check_in_date_idx').on(table.check_in_date),
  })
);

export const dailyCheckInsRelations = relations(dailyCheckIns, ({ one }) => ({
  organization: one(organizations, {
    fields: [dailyCheckIns.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [dailyCheckIns.resident_id],
    references: [residents.id],
  }),
}));

// Tasks (general task management)
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    title: text('title').notNull(),
    description: text('description'),
    status: taskStatus('status').notNull().default('todo'),
    priority: taskPriority('priority').notNull().default('medium'),
    assigned_to: uuid('assigned_to').references(() => users.id),
    related_resident_id: uuid('related_resident_id').references(() => residents.id),
    related_house_id: uuid('related_house_id').references(() => houses.id),
    due_date: timestamp('due_date'),
    completed_at: timestamp('completed_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('tasks_org_id_idx').on(table.org_id),
    assigned_to_idx: index('tasks_assigned_to_idx').on(table.assigned_to),
    status_idx: index('tasks_status_idx').on(table.status),
    due_date_idx: index('tasks_due_date_idx').on(table.due_date),
    deleted_at_idx: index('tasks_deleted_at_idx').on(table.deleted_at),
  })
);

export const tasksRelations = relations(tasks, ({ one }) => ({
  organization: one(organizations, {
    fields: [tasks.org_id],
    references: [organizations.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigned_to],
    references: [users.id],
  }),
  relatedResident: one(residents, {
    fields: [tasks.related_resident_id],
    references: [residents.id],
  }),
  relatedHouse: one(houses, {
    fields: [tasks.related_house_id],
    references: [houses.id],
  }),
}));
