/**
 * Application-wide Constants
 *
 * Source: docs/04_COMPLIANCE.md Section 6 (RBAC)
 */

import type { UserRole, SensitivityLevel } from './types/index';

/**
 * All user roles in the system
 */
export const USER_ROLES: UserRole[] = [
  'platform_admin',
  'org_owner',
  'org_admin',
  'property_manager',
  'house_manager',
  'staff',
  'resident',
  'family_member',
  'referral_partner',
];

/**
 * Sensitivity levels ordered by strictness (highest to lowest)
 */
export const SENSITIVITY_LEVELS: SensitivityLevel[] = [
  'part2',
  'phi',
  'pii',
  'operational',
];

/**
 * 42 CFR Part 2 Redisclosure Notice
 * Source: 42 CFR 2.32
 */
export const PART2_REDISCLOSURE_NOTICE = `
This record is protected by federal law (42 CFR Part 2). Federal law prohibits any further disclosure of this record without the written consent of the person to whom it pertains, or as otherwise permitted by 42 CFR Part 2. A general authorization for the release of medical or other information is NOT sufficient for this purpose.
`.trim();

/**
 * Session timeout defaults
 */
export const SESSION_TIMEOUT = {
  DEFAULT_MINUTES: 15,
  MIN_MINUTES: 5,
  MAX_MINUTES: 30,
} as const;

/**
 * Rate limit defaults
 */
export const RATE_LIMITS = {
  READ_OPS: { limit: 100, window: 10 }, // 100 requests per 10 seconds
  WRITE_OPS: { limit: 30, window: 10 }, // 30 requests per 10 seconds
  AUTH_OPS: { limit: 5, window: 60 },   // 5 requests per 60 seconds
  EXPORT_OPS: { limit: 5, window: 60 }, // 5 requests per 60 seconds
  WEBHOOK: { limit: 50, window: 10 },   // 50 requests per 10 seconds
} as const;

/**
 * Audit log retention periods (in years)
 */
export const RETENTION_PERIODS = {
  AUDIT_LOGS: 6,
  CONSENT_RECORDS: 6,
  DISCLOSURE_RECORDS: 6,
  BREACH_RECORDS: 6,
  PART2_CONSENT: 6,
  MEDICAL_RECORDS: 6,
  FINANCIAL_RECORDS: 7,
  OPERATIONAL_RECORDS: 3,
} as const;

/**
 * Part 2 data field identifiers
 * Fields that require consent-gating
 */
export const PART2_FIELDS = [
  'drug_test_results',
  'sud_diagnosis',
  'treatment_referrals',
  'mat_records',
  'clinical_assessments',
  'progress_notes',
  'substance_use_history',
  'recovery_plan',
  'group_therapy_notes',
  'counseling_notes',
] as const;

/**
 * File upload limits
 */
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 50,
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
  ],
  PRESIGNED_URL_EXPIRY_MINUTES: 15,
} as const;

/**
 * Encryption settings
 */
export const ENCRYPTION = {
  ALGORITHM: 'aes-256-gcm',
  IV_LENGTH: 12, // 96 bits for AES-GCM
  AUTH_TAG_LENGTH: 16,
  KEY_LENGTH: 32, // 256 bits
} as const;

/**
 * Hash chain settings for audit logs
 */
export const HASH_CHAIN = {
  ALGORITHM: 'sha256',
  HMAC_ALGORITHM: 'sha256',
  VERIFICATION_INTERVAL_HOURS: 24,
} as const;

/**
 * Breach notification timelines (in hours)
 */
export const BREACH_NOTIFICATION = {
  INTERNAL_ALERT_HOURS: 0, // Immediate
  CUSTOMER_NOTIFICATION_HOURS: 24,
  INDIVIDUAL_NOTIFICATION_DAYS: 60,
} as const;
