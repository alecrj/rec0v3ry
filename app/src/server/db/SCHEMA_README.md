# RecoveryOS Database Schema

> **Status**: Phase 4 - Implementation in progress
> **Based on**: `/Users/alec/RecoveryOS/docs/03_DATA_MODEL.md`

## Overview

This directory contains all Drizzle ORM schema definitions for RecoveryOS, a HIPAA-compliant sober living management platform.

## Schema Organization

### Core Schema Files

| File | Tables | Purpose |
|------|--------|---------|
| `enums.ts` | N/A | All pgEnum definitions (40+ enums) |
| `orgs.ts` | organizations, properties, houses, rooms, beds | Multi-tenant org hierarchy |
| `users.ts` | users, role_assignments, user_sessions | Authentication and RBAC |
| `residents.ts` | residents, admissions, leads, resident_contacts | Resident management |
| `resident-tracking.ts` | discharges, resident_status_history, waitlist_entries, bed_transfers | Extended resident tracking |

### Financial Schema

| File | Tables | Purpose |
|------|--------|---------|
| `payments.ts` | invoices, invoice_line_items, payments, ledger_accounts, ledger_entries, deposits, payer_configs, dunning_actions | Core payment system |
| `payment-extended.ts` | rate_configs, payment_methods, refunds, dunning_configs, reconciliation_records | Extended payment features |

### Operations Schema

| File | Tables | Purpose |
|------|--------|---------|
| `operations.ts` | chores, chore_assignments, meetings, meeting_attendance, passes, curfew_configs, drug_tests, incidents, daily_check_ins, tasks | Core house operations |
| `operations-extended.ts` | chore_templates, meeting_types, meeting_requirements, curfew_check_ins, maintenance_requests, vehicles, wellness_check_ins, clinical_assessments | Extended operations |

### Document & Communication Schema

| File | Tables | Purpose |
|------|--------|---------|
| `documents.ts` | documents, document_templates, signatures, retention_policies | Document management & e-sign |
| `documents-extended.ts` | document_versions | Document version control |
| `messaging.ts` | conversations, conversation_members, messages, announcements | Internal messaging |
| `messaging-extended.ts` | announcement_reads | Message tracking |

### Compliance Schema

| File | Tables | Purpose |
|------|--------|---------|
| `compliance.ts` | consents, consent_disclosures, patient_notices, breach_incidents, baa_records | 42 CFR Part 2 & HIPAA compliance |
| `compliance-extended.ts` | disclosure_accounting_requests, data_access_requests, break_glass_events | Extended compliance tracking |

### System Schema

| File | Tables | Purpose |
|------|--------|---------|
| `audit.ts` | audit_logs | Append-only audit trail with HMAC chain |
| `files.ts` | file_uploads | File storage tracking (S3) |
| `integrations.ts` | api_keys, webhooks, webhook_deliveries, integration_configs, notification_preferences, scheduled_jobs | Third-party integrations & background jobs |

## Key Design Principles

### 1. Multi-Tenancy
Every tenant-scoped table includes `org_id` with RLS enforcement at the database level.

### 2. Soft Deletes
Most tables use `deleted_at` timestamp instead of hard deletes. Deleted records are excluded by default queries.

### 3. Audit Columns
Every mutable table includes:
- `created_at`: Timestamp, defaults to now()
- `updated_at`: Timestamp, auto-updates on change
- `created_by`: UUID reference to users (nullable for system)
- `updated_by`: UUID reference to users (nullable for system)

### 4. Field-Level Encryption
Fields marked with `// ENCRYPTED: AES-256-GCM` are encrypted at the application layer before storage. These include:
- All Part 2 protected data (resident PHI)
- PII (names, emails, phones, SSN)
- Sensitive clinical data
- Breach incident details

### 5. Double-Entry Accounting
Financial transactions always produce balanced debit/credit entries in `ledger_entries`. No stored balance fields - balances are calculated from entries.

### 6. Immutable Audit Log
The `audit_logs` table is append-only with NO `updated_at`, NO `deleted_at`, NO modifications allowed. Includes HMAC hash chain for tamper detection.

## Important Notes

### Table Name Differences from Spec

Some table names differ from `03_DATA_MODEL.md` for clarity:

| Spec Name | Drizzle Schema Name | Reason |
|-----------|---------------------|--------|
| `accounts` | `ledgerAccounts` | Clarity (distinguish from user accounts) |
| `payers` | `payerConfigs` | Clarity (configuration for payers) |
| `user_sessions` | `userSessions` | Consistency (camelCase) |
| `role_assignments` | `roleAssignments` | Consistency (camelCase) |

### Compliance Findings to Address

Per Phase 3 compliance review findings, during Phase 4 implementation:

1. **F2 (MEDIUM)**: Cache invalidation on consent revocation - Part 2 data responses must have `Cache-Control: no-store`
2. **F3 (LOW)**: Need `FORCE ROW LEVEL SECURITY` on all tables, not just `ENABLE`
3. **F5 (LOW)**: `wellness_check_ins.mood_rating` not encrypted despite Part 2 context (consider encrypting)

### Database Setup

1. Set `DATABASE_URL` environment variable (Neon PostgreSQL)
2. Run migrations: `npm run db:push` (development) or `npm run db:migrate` (production)
3. Seed development data: `npm run db:seed`

## Migration Commands

```bash
# Generate migration from schema changes
npm run db:generate

# Push schema to database (development only)
npm run db:push

# Run pending migrations (production)
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## Related Documentation

- Full data model spec: `/Users/alec/RecoveryOS/docs/03_DATA_MODEL.md`
- Architecture: `/Users/alec/RecoveryOS/docs/02_ARCHITECTURE.md`
- Compliance requirements: `/Users/alec/RecoveryOS/docs/04_COMPLIANCE.md`
- Payment system design: `/Users/alec/RecoveryOS/docs/05_PAYMENTS.md`

## Schema Statistics

- **Total Tables**: 60+
- **Total Enums**: 40+
- **Encrypted Fields**: 50+ (application-layer AES-256-GCM)
- **Indexes**: 150+ (optimized for common queries)
- **Relations**: 100+ (fully typed Drizzle relations)

## Next Steps

Phase 4 implementation tasks:

1. ✅ Write all Drizzle schema files
2. ⏳ Generate initial migration
3. ⏳ Set up RLS policies (PostgreSQL functions)
4. ⏳ Implement field-level encryption service
5. ⏳ Create seed data for all 9 user roles
6. ⏳ Build tRPC routers using schema
