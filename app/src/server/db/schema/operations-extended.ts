import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, date, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { choreStatus, meetingType, incidentSeverity } from './enums';
import { organizations, houses } from './orgs';
import { residents } from './residents';
import { users } from './users';

// Chore Templates (reusable chore definitions)
export const choreTemplates = pgTable(
  'chore_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    house_id: uuid('house_id').references(() => houses.id),
    title: text('title').notNull(),
    description: text('description'),
    area: text('area'),
    frequency: text('frequency'),
    estimated_duration_minutes: integer('estimated_duration_minutes'),
    instructions: text('instructions'),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
  },
  (table) => ({
    org_id_idx: index('chore_templates_org_id_idx').on(table.org_id),
    house_id_idx: index('chore_templates_house_id_idx').on(table.house_id),
  })
);

export const choreTemplatesRelations = relations(choreTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [choreTemplates.org_id],
    references: [organizations.id],
  }),
  house: one(houses, {
    fields: [choreTemplates.house_id],
    references: [houses.id],
  }),
}));

// Meeting Types (configurable meeting categories)
export const meetingTypes = pgTable(
  'meeting_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    name: text('name').notNull(),
    description: text('description'),
    default_duration_minutes: integer('default_duration_minutes').default(60),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    org_id_idx: index('meeting_types_org_id_idx').on(table.org_id),
  })
);

export const meetingTypesRelations = relations(meetingTypes, ({ one }) => ({
  organization: one(organizations, {
    fields: [meetingTypes.org_id],
    references: [organizations.id],
  }),
}));

// Meeting Requirements (required attendance tracking)
export const meetingRequirements = pgTable(
  'meeting_requirements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    house_id: uuid('house_id').references(() => houses.id),
    meeting_type: meetingType('meeting_type').notNull(),
    required_per_week: integer('required_per_week'),
    required_per_month: integer('required_per_month'),
    is_mandatory: boolean('is_mandatory').default(false),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    org_id_idx: index('meeting_requirements_org_id_idx').on(table.org_id),
    house_id_idx: index('meeting_requirements_house_id_idx').on(table.house_id),
  })
);

export const meetingRequirementsRelations = relations(meetingRequirements, ({ one }) => ({
  organization: one(organizations, {
    fields: [meetingRequirements.org_id],
    references: [organizations.id],
  }),
  house: one(houses, {
    fields: [meetingRequirements.house_id],
    references: [houses.id],
  }),
}));

// Curfew Check-ins (daily curfew compliance)
export const curfewCheckIns = pgTable(
  'curfew_check_ins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    check_in_date: date('check_in_date').notNull(),
    expected_curfew_time: timestamp('expected_curfew_time').notNull(),
    actual_check_in_time: timestamp('actual_check_in_time'),
    was_on_time: boolean('was_on_time'),
    was_excused: boolean('was_excused').default(false),
    excuse_reason: text('excuse_reason'),
    verified_by: uuid('verified_by').references(() => users.id),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    org_id_idx: index('curfew_check_ins_org_id_idx').on(table.org_id),
    resident_id_idx: index('curfew_check_ins_resident_id_idx').on(table.resident_id),
    check_in_date_idx: index('curfew_check_ins_check_in_date_idx').on(table.check_in_date),
  })
);

export const curfewCheckInsRelations = relations(curfewCheckIns, ({ one }) => ({
  organization: one(organizations, {
    fields: [curfewCheckIns.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [curfewCheckIns.resident_id],
    references: [residents.id],
  }),
  verifier: one(users, {
    fields: [curfewCheckIns.verified_by],
    references: [users.id],
  }),
}));

// Maintenance Requests
export const maintenanceRequests = pgTable(
  'maintenance_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    house_id: uuid('house_id').notNull().references(() => houses.id),
    reported_by_resident_id: uuid('reported_by_resident_id').references(() => residents.id),
    reported_by_user_id: uuid('reported_by_user_id').references(() => users.id),
    title: text('title').notNull(),
    description: text('description').notNull(),
    location: text('location'), // Specific area/room
    priority: text('priority').default('medium'), // 'low', 'medium', 'high', 'urgent'
    status: text('status').default('open'), // 'open', 'in_progress', 'completed', 'cancelled'
    assigned_to: uuid('assigned_to').references(() => users.id),
    completed_at: timestamp('completed_at'),
    completion_notes: text('completion_notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    org_id_idx: index('maintenance_requests_org_id_idx').on(table.org_id),
    house_id_idx: index('maintenance_requests_house_id_idx').on(table.house_id),
    status_idx: index('maintenance_requests_status_idx').on(table.status),
  })
);

export const maintenanceRequestsRelations = relations(maintenanceRequests, ({ one }) => ({
  organization: one(organizations, {
    fields: [maintenanceRequests.org_id],
    references: [organizations.id],
  }),
  house: one(houses, {
    fields: [maintenanceRequests.house_id],
    references: [houses.id],
  }),
  reporterResident: one(residents, {
    fields: [maintenanceRequests.reported_by_resident_id],
    references: [residents.id],
  }),
  reporterUser: one(users, {
    fields: [maintenanceRequests.reported_by_user_id],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [maintenanceRequests.assigned_to],
    references: [users.id],
  }),
}));

// Vehicles (resident vehicle tracking)
export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    make: text('make').notNull(),
    model: text('model').notNull(),
    year: integer('year'),
    color: text('color'),
    license_plate: text('license_plate').notNull(), // ENCRYPTED: AES-256-GCM
    is_approved: boolean('is_approved').default(false),
    parking_space: text('parking_space'),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('vehicles_org_id_idx').on(table.org_id),
    resident_id_idx: index('vehicles_resident_id_idx').on(table.resident_id),
  })
);

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  organization: one(organizations, {
    fields: [vehicles.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [vehicles.resident_id],
    references: [residents.id],
  }),
}));

// Wellness Check-ins (mental health tracking)
export const wellnessCheckIns = pgTable(
  'wellness_check_ins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    check_in_date: date('check_in_date').notNull(),
    mood_rating: integer('mood_rating'), // 1-10 scale (NOTE: Compliance finding F5 - consider encrypting)
    stress_level: integer('stress_level'), // 1-10 scale
    sleep_quality: integer('sleep_quality'), // 1-10 scale
    physical_health: integer('physical_health'), // 1-10 scale
    cravings_intensity: integer('cravings_intensity'), // 1-10 scale
    support_needed: boolean('support_needed').default(false),
    notes: text('notes'), // ENCRYPTED: AES-256-GCM
    follow_up_required: boolean('follow_up_required').default(false),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    org_id_idx: index('wellness_check_ins_org_id_idx').on(table.org_id),
    resident_id_idx: index('wellness_check_ins_resident_id_idx').on(table.resident_id),
    check_in_date_idx: index('wellness_check_ins_check_in_date_idx').on(table.check_in_date),
  })
);

export const wellnessCheckInsRelations = relations(wellnessCheckIns, ({ one }) => ({
  organization: one(organizations, {
    fields: [wellnessCheckIns.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [wellnessCheckIns.resident_id],
    references: [residents.id],
  }),
}));

// Clinical Assessments
export const clinicalAssessments = pgTable(
  'clinical_assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    assessment_type: text('assessment_type').notNull(), // 'intake', 'progress', '30_day', '90_day', 'discharge'
    assessment_date: date('assessment_date').notNull(),
    assessor_id: uuid('assessor_id').notNull().references(() => users.id),
    assessment_data: jsonb('assessment_data').notNull(), // ENCRYPTED: AES-256-GCM - structured assessment responses
    summary: text('summary'), // ENCRYPTED: AES-256-GCM
    recommendations: text('recommendations'), // ENCRYPTED: AES-256-GCM
    next_assessment_date: date('next_assessment_date'),
    document_id: uuid('document_id'), // References documents table
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
  },
  (table) => ({
    org_id_idx: index('clinical_assessments_org_id_idx').on(table.org_id),
    resident_id_idx: index('clinical_assessments_resident_id_idx').on(table.resident_id),
    assessment_date_idx: index('clinical_assessments_assessment_date_idx').on(table.assessment_date),
  })
);

export const clinicalAssessmentsRelations = relations(clinicalAssessments, ({ one }) => ({
  organization: one(organizations, {
    fields: [clinicalAssessments.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [clinicalAssessments.resident_id],
    references: [residents.id],
  }),
  assessor: one(users, {
    fields: [clinicalAssessments.assessor_id],
    references: [users.id],
  }),
}));

// Drug Test Schedules (recurring/random test configurations)
export const drugTestSchedules = pgTable(
  'drug_test_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    house_id: uuid('house_id').references(() => houses.id), // Null = org-wide
    name: text('name').notNull(),
    description: text('description'),
    schedule_type: text('schedule_type').notNull(), // 'random', 'scheduled', 'weekly', 'monthly'
    test_type: text('test_type').notNull().default('urine'), // 'urine', 'breathalyzer', etc.
    // For random schedules
    random_percentage: integer('random_percentage'), // % of residents per execution
    random_min_per_execution: integer('random_min_per_execution'),
    random_max_per_execution: integer('random_max_per_execution'),
    // For scheduled/recurring
    recurrence_rule: text('recurrence_rule'), // iCal RRULE format
    day_of_week: jsonb('day_of_week'), // Array of days: ['monday', 'wednesday', 'friday']
    day_of_month: jsonb('day_of_month'), // Array of days: [1, 15] for 1st and 15th
    time_of_day: text('time_of_day'), // HH:MM format
    // Configuration
    is_active: boolean('is_active').default(true),
    notify_residents: boolean('notify_residents').default(false), // Should residents be notified?
    advance_notice_hours: integer('advance_notice_hours'), // How far in advance to notify
    last_executed_at: timestamp('last_executed_at'),
    next_execution_at: timestamp('next_execution_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    org_id_idx: index('drug_test_schedules_org_id_idx').on(table.org_id),
    house_id_idx: index('drug_test_schedules_house_id_idx').on(table.house_id),
    schedule_type_idx: index('drug_test_schedules_schedule_type_idx').on(table.schedule_type),
    next_execution_idx: index('drug_test_schedules_next_execution_idx').on(table.next_execution_at),
  })
);

export const drugTestSchedulesRelations = relations(drugTestSchedules, ({ one }) => ({
  organization: one(organizations, {
    fields: [drugTestSchedules.org_id],
    references: [organizations.id],
  }),
  house: one(houses, {
    fields: [drugTestSchedules.house_id],
    references: [houses.id],
  }),
}));

// Drug Test Schedule Executions (log of each schedule run)
export const drugTestScheduleExecutions = pgTable(
  'drug_test_schedule_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    schedule_id: uuid('schedule_id').notNull().references(() => drugTestSchedules.id),
    executed_at: timestamp('executed_at').defaultNow().notNull(),
    residents_selected: integer('residents_selected').notNull(),
    residents_tested: integer('residents_tested').default(0),
    status: text('status').notNull().default('pending'), // 'pending', 'in_progress', 'completed'
    notes: text('notes'),
    created_by: uuid('created_by'),
  },
  (table) => ({
    schedule_id_idx: index('drug_test_schedule_executions_schedule_id_idx').on(table.schedule_id),
    executed_at_idx: index('drug_test_schedule_executions_executed_at_idx').on(table.executed_at),
  })
);

export const drugTestScheduleExecutionsRelations = relations(drugTestScheduleExecutions, ({ one }) => ({
  organization: one(organizations, {
    fields: [drugTestScheduleExecutions.org_id],
    references: [organizations.id],
  }),
  schedule: one(drugTestSchedules, {
    fields: [drugTestScheduleExecutions.schedule_id],
    references: [drugTestSchedules.id],
  }),
}));

// Family Portal Access Tokens (secure access for family members)
export const familyPortalTokens = pgTable(
  'family_portal_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    org_id: uuid('org_id').notNull().references(() => organizations.id),
    contact_id: uuid('contact_id').notNull().references(() => residents.id), // References resident_contacts via resident
    resident_id: uuid('resident_id').notNull().references(() => residents.id),
    token_hash: text('token_hash').notNull(), // Hashed access token
    email: text('email').notNull(),
    is_active: boolean('is_active').default(true),
    last_accessed_at: timestamp('last_accessed_at'),
    expires_at: timestamp('expires_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    created_by: uuid('created_by'),
  },
  (table) => ({
    org_id_idx: index('family_portal_tokens_org_id_idx').on(table.org_id),
    resident_id_idx: index('family_portal_tokens_resident_id_idx').on(table.resident_id),
    token_hash_idx: index('family_portal_tokens_token_hash_idx').on(table.token_hash),
  })
);

export const familyPortalTokensRelations = relations(familyPortalTokens, ({ one }) => ({
  organization: one(organizations, {
    fields: [familyPortalTokens.org_id],
    references: [organizations.id],
  }),
  resident: one(residents, {
    fields: [familyPortalTokens.resident_id],
    references: [residents.id],
  }),
}));
