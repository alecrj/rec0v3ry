/**
 * Shared TypeScript Types
 *
 * Type definitions shared across client and server.
 * Source: docs/04_COMPLIANCE.md Section 6 (RBAC)
 */

/**
 * User roles in the system
 * Source: docs/04_COMPLIANCE.md Section 6.1
 */
export type UserRole =
  | 'platform_admin'
  | 'org_owner'
  | 'org_admin'
  | 'property_manager'
  | 'house_manager'
  | 'staff'
  | 'resident'
  | 'family_member'
  | 'referral_partner';

/**
 * Data sensitivity levels
 * Source: docs/04_COMPLIANCE.md Section 1
 */
export type SensitivityLevel =
  | 'part2'        // 42 CFR Part 2 protected (strictest)
  | 'phi'          // HIPAA Protected Health Information
  | 'pii'          // Personally Identifiable Information
  | 'operational'; // Non-sensitive operational data

/**
 * Permission actions
 */
export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'export'
  | 'print'
  | 'share';

/**
 * Resource types in the system
 */
export type ResourceType =
  | 'org'
  | 'property'
  | 'house'
  | 'resident'
  | 'bed'
  | 'admission'
  | 'invoice'
  | 'payment'
  | 'ledger'
  | 'chore'
  | 'meeting'
  | 'pass'
  | 'drug_test'
  | 'incident'
  | 'document'
  | 'message'
  | 'consent'
  | 'disclosure'
  | 'audit_log'
  | 'user'
  | 'expense'
  | 'plaid_connection'
  | 'report';

/**
 * Permission definition
 */
export interface Permission {
  action: PermissionAction;
  resource: ResourceType;
  scope?: 'own' | 'house' | 'property' | 'org' | 'platform';
}

/**
 * Consent status
 */
export type ConsentStatus =
  | 'active'
  | 'expired'
  | 'revoked';

/**
 * Consent type
 */
export type ConsentType =
  | 'specific_disclosure'
  | 'tpo_general'
  | 'research';

/**
 * Audit action types
 * Source: docs/04_COMPLIANCE.md Section 4.2
 */
export type AuditAction =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'mfa_challenge'
  | 'mfa_success'
  | 'mfa_failure'
  | 'password_change'
  | 'password_reset'
  | 'session_timeout'
  | 'session_invalidated'
  | 'role_assigned'
  | 'role_revoked'
  | 'permission_changed'
  | 'access_denied'
  | 'break_glass_activated'
  | 'resident_created'
  | 'resident_viewed'
  | 'resident_updated'
  | 'resident_discharged'
  | 'resident_deleted'
  | 'drug_test_created'
  | 'drug_test_viewed'
  | 'assessment_created'
  | 'assessment_viewed'
  | 'progress_note_created'
  | 'progress_note_viewed'
  | 'consent_created'
  | 'consent_viewed'
  | 'consent_revoked'
  | 'consent_expired'
  | 'consent_verified'
  | 'disclosure_made'
  | 'disclosure_blocked_no_consent'
  | 'disclosure_blocked_expired_consent'
  | 'redisclosure_notice_attached'
  | 'document_uploaded'
  | 'document_viewed'
  | 'document_downloaded'
  | 'document_signed'
  | 'document_deleted'
  | 'document_retention_expired'
  | 'payment_created'
  | 'payment_received'
  | 'payment_refunded'
  | 'invoice_generated'
  | 'ledger_entry_created'
  | 'message_sent'
  | 'announcement_created'
  | 'sms_sent'
  | 'user_created'
  | 'user_deactivated'
  | 'org_settings_changed'
  | 'export_generated'
  | 'report_generated'
  | 'accounting_requested';

/**
 * Error codes for structured error handling
 */
export enum ErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONSENT_REQUIRED = 'CONSENT_REQUIRED',
  CONSENT_EXPIRED = 'CONSENT_EXPIRED',
  CONSENT_REVOKED = 'CONSENT_REVOKED',
  INVALID_INPUT = 'INVALID_INPUT',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TENANT_MISMATCH = 'TENANT_MISMATCH',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  MFA_REQUIRED = 'MFA_REQUIRED',
}

/**
 * Session timeout configuration
 */
export const SESSION_CONFIG = {
  DEFAULT_TIMEOUT_MS: 15 * 60 * 1000, // 15 minutes
  MIN_TIMEOUT_MS: 5 * 60 * 1000,      // 5 minutes
  MAX_TIMEOUT_MS: 30 * 60 * 1000,     // 30 minutes
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;
