import { pgEnum } from 'drizzle-orm/pg-core';

// Data sensitivity classification
export const sensitivityLevel = pgEnum('sensitivity_level', [
  'public',
  'internal',
  'confidential',
  'part2_protected',
]);

// User roles (RBAC)
export const userRole = pgEnum('user_role', [
  'super_admin',
  'org_owner',
  'property_manager',
  'house_manager',
  'case_manager',
  'staff',
  'resident',
  'family',
  'referral_source',
]);

// Bed status
export const bedStatus = pgEnum('bed_status', [
  'available',
  'occupied',
  'reserved',
  'maintenance',
  'out_of_service',
]);

// Admission status
export const admissionStatus = pgEnum('admission_status', [
  'active',
  'pending',
  'on_hold',
  'completed',
  'terminated',
]);

// Lead status
export const leadStatus = pgEnum('lead_status', [
  'new',
  'contacted',
  'qualified',
  'touring',
  'applied',
  'accepted',
  'deposit_pending',
  'converted',
  'lost',
]);

// Invoice status
export const invoiceStatus = pgEnum('invoice_status', [
  'draft',
  'pending',
  'paid',
  'partially_paid',
  'overdue',
  'void',
  'written_off',
]);

// Payment status
export const paymentStatus = pgEnum('payment_status', [
  'pending',
  'processing',
  'succeeded',
  'failed',
  'refunded',
  'disputed',
]);

// Payment method types
export const paymentMethodType = pgEnum('payment_method_type', [
  'card',
  'ach',
  'cash',
  'check',
  'wire',
  'cashapp',
  'venmo',
  'zelle',
  'money_order',
  'other',
]);

// Payment types (mapped to ledger accounts)
export const paymentType = pgEnum('payment_type', [
  'rent',
  'security_deposit',
  'program_fee',
  'service_fee',
  'damage',
  'late_fee',
  'other',
]);

// Account types (double-entry ledger)
export const accountType = pgEnum('account_type', [
  'asset',
  'liability',
  'equity',
  'revenue',
  'expense',
]);

// Chore status
export const choreStatus = pgEnum('chore_status', [
  'assigned',
  'in_progress',
  'completed',
  'verified',
  'failed',
  'skipped',
]);

// Meeting types
export const meetingType = pgEnum('meeting_type', [
  'house_meeting',
  'group_therapy',
  'aa_na',
  'life_skills',
  'one_on_one',
  'family_session',
  'other',
]);

// Pass types
export const passType = pgEnum('pass_type', [
  'day_pass',
  'overnight',
  'weekend',
  'extended',
  'medical',
  'work',
  'family_visit',
]);

// Pass status
export const passStatus = pgEnum('pass_status', [
  'requested',
  'approved',
  'denied',
  'active',
  'completed',
  'violated',
  'cancelled',
]);

// Drug test results
export const drugTestResult = pgEnum('drug_test_result', [
  'negative',
  'positive',
  'dilute',
  'invalid',
  'refused',
  'pending',
]);

// Drug test types
export const drugTestType = pgEnum('drug_test_type', [
  'urine',
  'breathalyzer',
  'oral_swab',
  'blood',
  'hair_follicle',
]);

// Incident severity
export const incidentSeverity = pgEnum('incident_severity', [
  'low',
  'medium',
  'high',
  'critical',
]);

// Incident types
export const incidentType = pgEnum('incident_type', [
  'relapse',
  'curfew_violation',
  'guest_policy',
  'contraband',
  'violence',
  'theft',
  'property_damage',
  'awol',
  'other',
]);

// Document types
export const documentType = pgEnum('document_type', [
  'intake_form',
  'resident_agreement',
  'house_rules',
  'consent_form',
  'release_of_info',
  'financial_agreement',
  'treatment_plan',
  'discharge_summary',
  'incident_report',
  'other',
]);

// Document status
export const documentStatus = pgEnum('document_status', [
  'draft',
  'pending_signature',
  'signed',
  'expired',
  'voided',
]);

// Signature method
export const signatureMethod = pgEnum('signature_method', [
  'electronic',
  'wet_signature',
  'click_to_sign',
]);

// Conversation types
export const conversationType = pgEnum('conversation_type', [
  'direct',
  'group',
  'announcement',
]);

// Message status
export const messageStatus = pgEnum('message_status', [
  'sent',
  'delivered',
  'read',
  'failed',
]);

// Consent types (42 CFR Part 2)
export const consentType = pgEnum('consent_type', [
  'general_disclosure',
  'treatment',
  'payment',
  'healthcare_operations',
  'research',
  'audit',
  'medical_emergency',
]);

// Consent status
export const consentStatus = pgEnum('consent_status', [
  'pending',
  'active',
  'revoked',
  'expired',
]);

// Disclosure purposes (42 CFR Part 2)
export const disclosurePurpose = pgEnum('disclosure_purpose', [
  'treatment',
  'payment',
  'healthcare_operations',
  'research',
  'audit',
  'court_order',
  'medical_emergency',
  'crime_on_premises',
  'other',
]);

// Breach types (HIPAA)
export const breachType = pgEnum('breach_type', [
  'unauthorized_access',
  'unauthorized_disclosure',
  'data_loss',
  'data_theft',
  'hacking',
  'phishing',
  'lost_device',
  'improper_disposal',
  'other',
]);

// Breach risk levels
export const breachRiskLevel = pgEnum('breach_risk_level', [
  'low',
  'medium',
  'high',
]);

// Audit log action types
export const auditAction = pgEnum('audit_action', [
  'create',
  'read',
  'update',
  'delete',
  'login',
  'logout',
  'export',
  'print',
  'share',
  'consent_given',
  'consent_revoked',
  'disclosure_made',
  'access_granted',
  'access_revoked',
]);

// File categories
export const fileCategory = pgEnum('file_category', [
  'document',
  'image',
  'video',
  'audio',
  'profile_photo',
  'attachment',
  'backup',
  'other',
]);

// Dunning action types
export const dunningActionType = pgEnum('dunning_action_type', [
  'email',
  'sms',
  'phone_call',
  'letter',
  'in_person',
  'collections_referral',
  'legal_action',
]);

// Task status
export const taskStatus = pgEnum('task_status', [
  'todo',
  'in_progress',
  'completed',
  'cancelled',
  'blocked',
]);

// Task priority
export const taskPriority = pgEnum('task_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);
