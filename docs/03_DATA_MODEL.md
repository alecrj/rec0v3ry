# RecoveryOS - PostgreSQL Data Model

> **Status**: Complete
> **Owner**: data-modeler
> **Last Updated**: 2026-02-12
> **Depends On**: [01_REQUIREMENTS.md](01_REQUIREMENTS.md), [04_COMPLIANCE.md](04_COMPLIANCE.md)

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Shared Types & Enums](#2-shared-types--enums)
3. [Multi-Tenant Hierarchy](#3-multi-tenant-hierarchy)
4. [Users & Authentication](#4-users--authentication)
5. [Residents & Admissions](#5-residents--admissions)
6. [Payments & Double-Entry Ledger](#6-payments--double-entry-ledger)
7. [House Operations](#7-house-operations)
8. [Documents & E-Sign](#8-documents--e-sign)
9. [Messaging & Communications](#9-messaging--communications)
10. [Compliance & Consent (42 CFR Part 2)](#10-compliance--consent-42-cfr-part-2)
11. [Audit Log](#11-audit-log)
12. [Files & Storage](#12-files--storage)
13. [Integrations](#13-integrations)
14. [Row-Level Security Policies](#14-row-level-security-policies)
15. [Index Strategy Summary](#15-index-strategy-summary)

---

## 1. Design Principles

- **Multi-tenancy**: Every tenant-scoped table includes `org_id` with Row-Level Security (RLS) enforced at the database level.
- **UUIDs**: All primary keys use `gen_random_uuid()` for globally unique, non-sequential identifiers.
- **Soft delete**: Most tables use a `deleted_at` timestamp instead of hard deletes. Deleted records are excluded by default queries.
- **Audit columns**: Every mutable table includes `created_at`, `updated_at`, `created_by`, `updated_by`.
- **Double-entry ledger**: Financial transactions always produce balanced debit/credit entries. No stored balance fields.
- **Immutable audit log**: Append-only table with HMAC-SHA256 chain for tamper detection.
- **Field-level encryption**: Columns containing Part 2 / SUD data are marked with `-- ENCRYPTED` comments and use application-layer AES-256-GCM encryption before storage.
- **Sensitivity tagging**: A `sensitivity_level` enum classifies data for consent-gated access and redisclosure controls.

---

## 2. Shared Types & Enums

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- exclusion constraints

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE sensitivity_level AS ENUM (
  'operational', 'pii', 'phi', 'part2'
);

CREATE TYPE user_role AS ENUM (
  'platform_admin', 'org_owner', 'org_admin',
  'property_manager', 'house_manager', 'staff',
  'resident', 'family_member', 'referral_partner'
);

CREATE TYPE bed_status AS ENUM (
  'available', 'occupied', 'reserved', 'maintenance', 'blocked'
);

CREATE TYPE gender_restriction AS ENUM (
  'male', 'female', 'co_ed'
);

CREATE TYPE resident_status AS ENUM (
  'applicant', 'waitlisted', 'approved', 'active',
  'suspended', 'discharged', 'alumni'
);

CREATE TYPE admission_stage AS ENUM (
  'inquiry', 'screening', 'interview', 'approved',
  'admitted', 'declined', 'withdrawn'
);

CREATE TYPE discharge_reason AS ENUM (
  'program_completion', 'voluntary', 'involuntary',
  'transfer', 'ama', 'other'
);

CREATE TYPE consent_status AS ENUM (
  'active', 'expired', 'revoked'
);

CREATE TYPE consent_type AS ENUM (
  'specific_disclosure', 'tpo_general', 'research'
);

CREATE TYPE disclosure_method AS ENUM (
  'api', 'export', 'print', 'verbal', 'fax', 'email', 'portal'
);

CREATE TYPE payment_method_type AS ENUM (
  'card', 'ach', 'cash', 'check', 'venmo', 'zelle', 'cash_app', 'other'
);

CREATE TYPE invoice_status AS ENUM (
  'draft', 'sent', 'paid', 'partially_paid', 'overdue', 'void'
);

CREATE TYPE ledger_entry_type AS ENUM (
  'debit', 'credit'
);

CREATE TYPE account_type AS ENUM (
  'asset', 'liability', 'revenue', 'expense', 'equity'
);

CREATE TYPE billing_cycle AS ENUM (
  'weekly', 'biweekly', 'monthly'
);

CREATE TYPE dunning_step AS ENUM (
  'reminder', 'warning', 'suspension', 'discharge_review'
);

CREATE TYPE incident_severity AS ENUM (
  'low', 'medium', 'high', 'critical'
);

CREATE TYPE drug_test_type AS ENUM (
  'urine', 'oral', 'breathalyzer', 'hair'
);

CREATE TYPE drug_test_result AS ENUM (
  'positive', 'negative', 'inconclusive', 'refused'
);

CREATE TYPE pass_status AS ENUM (
  'requested', 'approved', 'denied', 'active', 'completed', 'cancelled'
);

CREATE TYPE chore_frequency AS ENUM (
  'daily', 'weekly', 'biweekly', 'monthly'
);

CREATE TYPE channel_type AS ENUM (
  'direct', 'group', 'house', 'property', 'org'
);

CREATE TYPE document_category AS ENUM (
  'intake', 'consent', 'clinical', 'financial',
  'operational', 'legal', 'narr'
);

CREATE TYPE signature_status AS ENUM (
  'pending', 'signed', 'declined', 'expired'
);

CREATE TYPE breach_phase AS ENUM (
  'detection', 'containment', 'assessment',
  'notification', 'remediation', 'post_incident', 'closed'
);

CREATE TYPE maintenance_priority AS ENUM (
  'low', 'medium', 'high', 'urgent'
);

CREATE TYPE maintenance_status AS ENUM (
  'submitted', 'triaged', 'in_progress', 'resolved', 'closed'
);

CREATE TYPE webhook_event AS ENUM (
  'resident.created', 'resident.updated', 'resident.discharged',
  'payment.received', 'payment.failed',
  'invoice.created', 'invoice.overdue',
  'consent.created', 'consent.revoked', 'consent.expired',
  'incident.created', 'drug_test.created'
);
```

---

## 3. Multi-Tenant Hierarchy

```sql
-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  legal_name    TEXT,
  entity_type   TEXT,                -- LLC, Corp, 501c3, etc.
  ein           TEXT,                -- ENCRYPTED (PII)
  address       JSONB NOT NULL,      -- {street, city, state, zip}
  phone         TEXT,
  email         TEXT,
  timezone      TEXT NOT NULL DEFAULT 'America/New_York',
  date_format   TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
  logo_file_id  UUID,               -- FK to files
  branding      JSONB,              -- {primary_color, secondary_color}
  stripe_account_id   TEXT,         -- Stripe Connect account
  stripe_onboarded    BOOLEAN NOT NULL DEFAULT FALSE,
  platform_fee_pct    NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
  subscription_plan   TEXT,
  subscription_status TEXT,
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_organizations_deleted ON organizations (deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- PROPERTIES
-- ============================================================
CREATE TABLE properties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     JSONB NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active', -- active, archived
  capacity    INT,                            -- computed from houses
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID,
  updated_by  UUID,
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_properties_org ON properties (org_id);
CREATE INDEX idx_properties_deleted ON properties (org_id, deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- HOUSES
-- ============================================================
CREATE TABLE houses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  gender_restriction  gender_restriction NOT NULL DEFAULT 'co_ed',
  narr_level          SMALLINT CHECK (narr_level BETWEEN 1 AND 4),
  bed_count           INT NOT NULL DEFAULT 0,
  curfew_config       JSONB,  -- {sun_thu: "22:00", fri_sat: "23:00"}
  house_rules_doc_id  UUID,   -- FK to documents
  settings            JSONB NOT NULL DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID,
  updated_by          UUID,
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_houses_org ON houses (org_id);
CREATE INDEX idx_houses_property ON houses (property_id);
CREATE INDEX idx_houses_deleted ON houses (org_id, deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- BEDS
-- ============================================================
CREATE TABLE beds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id    UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,          -- "Bed 1", "Room A - Bed 2"
  status      bed_status NOT NULL DEFAULT 'available',
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_beds_house ON beds (house_id);
CREATE INDEX idx_beds_org_status ON beds (org_id, status) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_beds_house_label ON beds (house_id, label) WHERE deleted_at IS NULL;
```

---

## 4. Users & Authentication

```sql
-- ============================================================
-- USERS
-- Users are managed by external auth provider (Clerk/Auth0).
-- This table stores application-level user data.
-- ============================================================
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID REFERENCES organizations(id) ON DELETE SET NULL,
  external_auth_id  TEXT UNIQUE NOT NULL,   -- Clerk/Auth0 user ID
  email             TEXT NOT NULL,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  phone             TEXT,
  avatar_file_id    UUID,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  mfa_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at     TIMESTAMPTZ,
  deactivated_at    TIMESTAMPTZ,
  deactivated_by    UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_users_email ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_org ON users (org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_external ON users (external_auth_id);

-- ============================================================
-- ROLE ASSIGNMENTS
-- A user can have multiple roles (e.g., house_manager for house A,
-- staff for house B). Scope determines what the role applies to.
-- ============================================================
CREATE TABLE role_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          user_role NOT NULL,
  scope_type    TEXT,       -- 'organization', 'property', 'house', 'resident'
  scope_id      UUID,       -- ID of the scoped entity
  granted_by    UUID REFERENCES users(id),
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ,
  revoked_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_role_assignments_user ON role_assignments (user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_role_assignments_org ON role_assignments (org_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_role_assignments_scope ON role_assignments (scope_type, scope_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX idx_role_unique_active ON role_assignments (user_id, role, scope_type, scope_id)
  WHERE revoked_at IS NULL;

-- ============================================================
-- USER SESSIONS
-- Track active sessions for security management.
-- ============================================================
CREATE TABLE user_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id        UUID REFERENCES organizations(id),
  ip_address    INET,
  user_agent    TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  ended_at      TIMESTAMPTZ,
  end_reason    TEXT   -- 'logout', 'timeout', 'force_logout', 'deactivation'
);

CREATE INDEX idx_sessions_user ON user_sessions (user_id) WHERE ended_at IS NULL;
CREATE INDEX idx_sessions_expires ON user_sessions (expires_at) WHERE ended_at IS NULL;
```

---

## 5. Residents & Admissions

```sql
-- ============================================================
-- RESIDENTS
-- Core resident record. Linked to a user account for portal access.
-- ============================================================
CREATE TABLE residents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id),            -- portal login
  house_id          UUID REFERENCES houses(id),            -- current house
  bed_id            UUID REFERENCES beds(id),              -- current bed
  first_name        TEXT NOT NULL,                         -- ENCRYPTED (PII)
  last_name         TEXT NOT NULL,                         -- ENCRYPTED (PII)
  date_of_birth     DATE,                                  -- ENCRYPTED (PII)
  gender            TEXT,
  phone             TEXT,                                  -- ENCRYPTED (PII)
  email             TEXT,                                  -- ENCRYPTED (PII)
  ssn_last4         TEXT,                                  -- ENCRYPTED (PII)
  photo_file_id     UUID,
  emergency_contact JSONB,                                 -- ENCRYPTED (PII) {name, phone, relationship}
  medical_info      JSONB,                                 -- ENCRYPTED (PHI)
  sud_info          JSONB,                                 -- ENCRYPTED (Part 2) {diagnosis, substances, mat_medications}
  status            resident_status NOT NULL DEFAULT 'applicant',
  move_in_date      DATE,
  move_out_date     DATE,
  sensitivity_level sensitivity_level NOT NULL DEFAULT 'part2',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID,
  updated_by        UUID,
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_residents_org ON residents (org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_residents_house ON residents (house_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_residents_status ON residents (org_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_residents_user ON residents (user_id);

-- ============================================================
-- ADMISSIONS (Lead / CRM Pipeline)
-- ============================================================
CREATE TABLE admissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id     UUID REFERENCES residents(id),
  stage           admission_stage NOT NULL DEFAULT 'inquiry',
  referral_source TEXT,             -- treatment_center, self, court, family, other
  referral_detail TEXT,             -- specific source name
  target_house_id UUID REFERENCES houses(id),
  target_bed_id   UUID REFERENCES beds(id),
  screening_notes TEXT,             -- ENCRYPTED (Part 2)
  interview_date  TIMESTAMPTZ,
  interview_notes TEXT,             -- ENCRYPTED (Part 2)
  decision_date   TIMESTAMPTZ,
  decision_by     UUID REFERENCES users(id),
  decision_notes  TEXT,
  priority_score  INT,
  sensitivity_level sensitivity_level NOT NULL DEFAULT 'part2',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID,
  updated_by      UUID,
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_admissions_org ON admissions (org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_admissions_stage ON admissions (org_id, stage) WHERE deleted_at IS NULL;
CREATE INDEX idx_admissions_resident ON admissions (resident_id);

-- ============================================================
-- DISCHARGES
-- ============================================================
CREATE TABLE discharges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id     UUID NOT NULL REFERENCES residents(id),
  house_id        UUID NOT NULL REFERENCES houses(id),
  bed_id          UUID REFERENCES beds(id),
  discharge_date  DATE NOT NULL,
  reason          discharge_reason NOT NULL,
  notes           TEXT,
  processed_by    UUID NOT NULL REFERENCES users(id),
  financial_settled BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_refund_amount NUMERIC(10,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID
);

CREATE INDEX idx_discharges_org ON discharges (org_id);
CREATE INDEX idx_discharges_resident ON discharges (resident_id);

-- ============================================================
-- RESIDENT STATUS HISTORY (Temporal)
-- ============================================================
CREATE TABLE resident_status_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id   UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  status        resident_status NOT NULL,
  house_id      UUID REFERENCES houses(id),
  bed_id        UUID REFERENCES beds(id),
  effective_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at      TIMESTAMPTZ,
  reason        TEXT,
  changed_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_history_resident ON resident_status_history (resident_id, effective_at DESC);
CREATE INDEX idx_status_history_org ON resident_status_history (org_id);

-- ============================================================
-- WAITLIST
-- ============================================================
CREATE TABLE waitlist_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id     UUID NOT NULL REFERENCES residents(id),
  admission_id    UUID REFERENCES admissions(id),
  target_house_id UUID REFERENCES houses(id),
  priority_score  INT NOT NULL DEFAULT 0,
  position        INT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'waiting', -- waiting, offered, admitted, expired, withdrawn
  offered_at      TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID
);

CREATE INDEX idx_waitlist_org ON waitlist_entries (org_id) WHERE status = 'waiting';
CREATE INDEX idx_waitlist_house ON waitlist_entries (target_house_id) WHERE status = 'waiting';

-- ============================================================
-- BED TRANSFERS
-- ============================================================
CREATE TABLE bed_transfers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id       UUID NOT NULL REFERENCES residents(id),
  from_house_id     UUID NOT NULL REFERENCES houses(id),
  from_bed_id       UUID NOT NULL REFERENCES beds(id),
  to_house_id       UUID NOT NULL REFERENCES houses(id),
  to_bed_id         UUID NOT NULL REFERENCES beds(id),
  transfer_date     DATE NOT NULL,
  reason            TEXT,
  processed_by      UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transfers_resident ON bed_transfers (resident_id);
CREATE INDEX idx_transfers_org ON bed_transfers (org_id);
```

---

## 6. Payments & Double-Entry Ledger

Every financial event produces balanced debit and credit entries in `ledger_entries`. There are no stored balance fields; balances are always computed from the ledger.

```sql
-- ============================================================
-- CHART OF ACCOUNTS
-- Per-org account structure for double-entry bookkeeping.
-- ============================================================
CREATE TABLE accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,           -- "1000", "4000", etc.
  name          TEXT NOT NULL,           -- "Accounts Receivable", "Rent Revenue"
  account_type  account_type NOT NULL,
  parent_id     UUID REFERENCES accounts(id),
  is_system     BOOLEAN NOT NULL DEFAULT FALSE,  -- system-generated, non-deletable
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_accounts_org_code ON accounts (org_id, code) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_org_type ON accounts (org_id, account_type);

-- ============================================================
-- LEDGER ENTRIES (Double-Entry Core)
-- Immutable. No UPDATE or DELETE allowed.
-- Every transaction_group_id has entries that sum to zero
-- (total debits = total credits).
-- ============================================================
CREATE TABLE ledger_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id),
  account_id            UUID NOT NULL REFERENCES accounts(id),
  entry_type            ledger_entry_type NOT NULL, -- debit or credit
  amount                NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency              TEXT NOT NULL DEFAULT 'USD',
  transaction_group_id  UUID NOT NULL,              -- groups balanced entries
  entry_date            DATE NOT NULL,
  description           TEXT NOT NULL,
  reference_type        TEXT,    -- 'invoice', 'payment', 'refund', 'deposit', 'fee', 'adjustment'
  reference_id          UUID,    -- FK to the source record
  resident_id           UUID REFERENCES residents(id),
  posted_by             UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No updated_at, no deleted_at: ledger entries are immutable.
  -- Corrections are made by posting reversing entries.
);

CREATE INDEX idx_ledger_org ON ledger_entries (org_id);
CREATE INDEX idx_ledger_account ON ledger_entries (account_id, entry_date);
CREATE INDEX idx_ledger_txn ON ledger_entries (transaction_group_id);
CREATE INDEX idx_ledger_resident ON ledger_entries (resident_id);
CREATE INDEX idx_ledger_reference ON ledger_entries (reference_type, reference_id);
CREATE INDEX idx_ledger_date ON ledger_entries (org_id, entry_date);

-- ============================================================
-- RATE CONFIGURATIONS
-- ============================================================
CREATE TABLE rate_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id        UUID REFERENCES houses(id),
  bed_id          UUID REFERENCES beds(id),
  resident_id     UUID REFERENCES residents(id),   -- custom per-resident rate
  name            TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  billing_cycle   billing_cycle NOT NULL DEFAULT 'monthly',
  effective_from  DATE NOT NULL,
  effective_to    DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID,
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_rates_org ON rate_configs (org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rates_house ON rate_configs (house_id) WHERE deleted_at IS NULL;

-- ============================================================
-- PAYERS
-- Multiple payers per resident (self, family, sponsor, agency).
-- ============================================================
CREATE TABLE payers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id         UUID NOT NULL REFERENCES residents(id),
  user_id             UUID REFERENCES users(id),     -- linked user account (for family portal)
  name                TEXT NOT NULL,
  relationship        TEXT NOT NULL,                  -- self, parent, spouse, sponsor, agency
  email               TEXT,
  phone               TEXT,
  responsibility_pct  NUMERIC(5,2),                  -- percentage (e.g., 60.00)
  responsibility_amt  NUMERIC(10,2),                 -- fixed amount alternative
  is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_payers_resident ON payers (resident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payers_org ON payers (org_id) WHERE deleted_at IS NULL;

-- ============================================================
-- PAYMENT METHODS
-- ============================================================
CREATE TABLE payment_methods (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payer_id          UUID NOT NULL REFERENCES payers(id) ON DELETE CASCADE,
  method_type       payment_method_type NOT NULL,
  stripe_payment_method_id TEXT,      -- Stripe PM ID for card/ACH
  last_four         TEXT,
  brand             TEXT,             -- visa, mastercard, etc.
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_pm_payer ON payment_methods (payer_id) WHERE deleted_at IS NULL;

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id       UUID NOT NULL REFERENCES residents(id),
  invoice_number    TEXT NOT NULL,
  status            invoice_status NOT NULL DEFAULT 'draft',
  billing_period_start DATE NOT NULL,
  billing_period_end   DATE NOT NULL,
  due_date          DATE NOT NULL,
  subtotal          NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid       NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_due        NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes             TEXT,
  sent_at           TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  voided_at         TIMESTAMPTZ,
  voided_by         UUID,
  voided_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID,
  deleted_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_invoices_number ON invoices (org_id, invoice_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_resident ON invoices (resident_id);
CREATE INDEX idx_invoices_org_status ON invoices (org_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_due ON invoices (org_id, due_date) WHERE status IN ('sent', 'overdue', 'partially_paid');

-- ============================================================
-- INVOICE LINE ITEMS
-- ============================================================
CREATE TABLE invoice_line_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  quantity      NUMERIC(10,4) NOT NULL DEFAULT 1,
  unit_price    NUMERIC(10,2) NOT NULL,
  total         NUMERIC(10,2) NOT NULL,
  line_type     TEXT NOT NULL,   -- 'rent', 'late_fee', 'deposit', 'program_fee', 'proration', 'other'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_line_items_invoice ON invoice_line_items (invoice_id);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id            UUID REFERENCES invoices(id),
  resident_id           UUID NOT NULL REFERENCES residents(id),
  payer_id              UUID REFERENCES payers(id),
  payment_method_id     UUID REFERENCES payment_methods(id),
  amount                NUMERIC(10,2) NOT NULL,
  method_type           payment_method_type NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_charge_id      TEXT,
  status                TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, cancelled
  receipt_number        TEXT,
  reference_number      TEXT,                            -- for cash/check/external
  notes                 TEXT,
  transaction_group_id  UUID,        -- links to ledger_entries
  paid_at               TIMESTAMPTZ,
  failed_at             TIMESTAMPTZ,
  failure_reason        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID
);

CREATE INDEX idx_payments_org ON payments (org_id);
CREATE INDEX idx_payments_invoice ON payments (invoice_id);
CREATE INDEX idx_payments_resident ON payments (resident_id);
CREATE INDEX idx_payments_stripe ON payments (stripe_payment_intent_id);

-- ============================================================
-- REFUNDS
-- ============================================================
CREATE TABLE refunds (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_id            UUID NOT NULL REFERENCES payments(id),
  amount                NUMERIC(10,2) NOT NULL,
  reason                TEXT NOT NULL,
  stripe_refund_id      TEXT,
  status                TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed
  transaction_group_id  UUID,
  refunded_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID NOT NULL
);

CREATE INDEX idx_refunds_payment ON refunds (payment_id);
CREATE INDEX idx_refunds_org ON refunds (org_id);

-- ============================================================
-- DEPOSITS
-- ============================================================
CREATE TABLE deposits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id     UUID NOT NULL REFERENCES residents(id),
  amount          NUMERIC(10,2) NOT NULL,
  collected_at    TIMESTAMPTZ,
  refund_amount   NUMERIC(10,2),
  deduction_amount NUMERIC(10,2),
  deduction_notes TEXT,
  refunded_at     TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'held', -- held, partially_refunded, refunded, forfeited
  transaction_group_id UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID
);

CREATE INDEX idx_deposits_resident ON deposits (resident_id);
CREATE INDEX idx_deposits_org ON deposits (org_id);

-- ============================================================
-- DUNNING ACTIONS
-- ============================================================
CREATE TABLE dunning_actions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id   UUID NOT NULL REFERENCES residents(id),
  invoice_id    UUID NOT NULL REFERENCES invoices(id),
  step          dunning_step NOT NULL,
  days_overdue  INT NOT NULL,
  action_taken  TEXT NOT NULL,
  notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  escalated_to  UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID
);

CREATE INDEX idx_dunning_invoice ON dunning_actions (invoice_id);
CREATE INDEX idx_dunning_resident ON dunning_actions (resident_id);

-- ============================================================
-- DUNNING CONFIGS (per org)
-- ============================================================
CREATE TABLE dunning_configs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  step          dunning_step NOT NULL,
  days_after_due INT NOT NULL,
  action        TEXT NOT NULL,            -- 'send_reminder', 'send_warning', 'suspend_account', 'discharge_review'
  template      TEXT,                      -- notification template
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_dunning_config_org_step ON dunning_configs (org_id, step);

-- ============================================================
-- RECONCILIATION
-- ============================================================
CREATE TABLE reconciliation_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  stripe_payout_id  TEXT,
  stripe_amount     NUMERIC(12,2),
  ledger_amount     NUMERIC(12,2),
  variance          NUMERIC(12,2),
  status            TEXT NOT NULL DEFAULT 'pending', -- pending, matched, unmatched, resolved
  resolved_by       UUID REFERENCES users(id),
  resolved_at       TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recon_org ON reconciliation_records (org_id);
```

---

## 7. House Operations

```sql
-- ============================================================
-- CHORE TEMPLATES
-- ============================================================
CREATE TABLE chore_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id      UUID NOT NULL REFERENCES houses(id),
  name          TEXT NOT NULL,
  description   TEXT,
  location      TEXT,             -- kitchen, bathroom, common area
  estimated_min INT,              -- estimated minutes
  frequency     chore_frequency NOT NULL DEFAULT 'daily',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID,
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_chore_templates_house ON chore_templates (house_id) WHERE deleted_at IS NULL;

-- ============================================================
-- CHORE ASSIGNMENTS
-- ============================================================
CREATE TABLE chore_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  chore_template_id UUID NOT NULL REFERENCES chore_templates(id),
  resident_id       UUID NOT NULL REFERENCES residents(id),
  assigned_date     DATE NOT NULL,
  due_date          DATE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'assigned', -- assigned, completed, missed, excused
  completed_at      TIMESTAMPTZ,
  verified_by       UUID REFERENCES users(id),
  verified_at       TIMESTAMPTZ,
  photo_file_id     UUID,           -- photo evidence
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chore_asgn_resident ON chore_assignments (resident_id, assigned_date);
CREATE INDEX idx_chore_asgn_org ON chore_assignments (org_id, assigned_date);
CREATE INDEX idx_chore_asgn_pending ON chore_assignments (org_id, due_date)
  WHERE status = 'assigned';

-- ============================================================
-- MEETING TYPES
-- ============================================================
CREATE TABLE meeting_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,       -- "AA/NA", "House Meeting", "Therapy", "IOP"
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_meeting_types_org ON meeting_types (org_id) WHERE deleted_at IS NULL;

-- ============================================================
-- MEETING REQUIREMENTS (per house)
-- ============================================================
CREATE TABLE meeting_requirements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id          UUID NOT NULL REFERENCES houses(id),
  meeting_type_id   UUID NOT NULL REFERENCES meeting_types(id),
  min_per_week      INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_meeting_req_unique ON meeting_requirements (house_id, meeting_type_id);

-- ============================================================
-- MEETING ATTENDANCE
-- ============================================================
CREATE TABLE meeting_attendance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id       UUID NOT NULL REFERENCES residents(id),
  meeting_type_id   UUID NOT NULL REFERENCES meeting_types(id),
  meeting_date      DATE NOT NULL,
  meeting_name      TEXT,              -- specific meeting name
  meeting_location  TEXT,
  attended          BOOLEAN NOT NULL DEFAULT TRUE,
  verified_by       UUID REFERENCES users(id),
  notes             TEXT,
  sensitivity_level sensitivity_level NOT NULL DEFAULT 'part2', -- meeting attendance can identify SUD
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID
);

CREATE INDEX idx_attendance_resident ON meeting_attendance (resident_id, meeting_date);
CREATE INDEX idx_attendance_org ON meeting_attendance (org_id, meeting_date);

-- ============================================================
-- PASSES
-- ============================================================
CREATE TABLE passes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id     UUID NOT NULL REFERENCES residents(id),
  house_id        UUID NOT NULL REFERENCES houses(id),
  status          pass_status NOT NULL DEFAULT 'requested',
  pass_type       TEXT NOT NULL DEFAULT 'overnight', -- overnight, day, extended
  departure_date  TIMESTAMPTZ NOT NULL,
  return_date     TIMESTAMPTZ NOT NULL,
  actual_return   TIMESTAMPTZ,
  destination     TEXT,
  reason          TEXT,
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  denied_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID
);

CREATE INDEX idx_passes_resident ON passes (resident_id);
CREATE INDEX idx_passes_house ON passes (house_id, status);

-- ============================================================
-- CURFEW CHECK-INS
-- ============================================================
CREATE TABLE curfew_check_ins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id   UUID NOT NULL REFERENCES residents(id),
  house_id      UUID NOT NULL REFERENCES houses(id),
  check_in_date DATE NOT NULL,
  check_in_time TIME NOT NULL,
  curfew_time   TIME NOT NULL,           -- what the curfew was
  is_violation  BOOLEAN NOT NULL DEFAULT FALSE,
  checked_by    UUID REFERENCES users(id),
  method        TEXT DEFAULT 'staff',    -- staff, self_checkin
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_curfew_resident ON curfew_check_ins (resident_id, check_in_date);
CREATE INDEX idx_curfew_house ON curfew_check_ins (house_id, check_in_date);
CREATE INDEX idx_curfew_violations ON curfew_check_ins (org_id, check_in_date)
  WHERE is_violation = TRUE;

-- ============================================================
-- DRUG TESTS
-- ============================================================
CREATE TABLE drug_tests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id     UUID NOT NULL REFERENCES residents(id),
  house_id        UUID NOT NULL REFERENCES houses(id),
  test_date       DATE NOT NULL,
  test_type       drug_test_type NOT NULL,
  result          drug_test_result NOT NULL,            -- ENCRYPTED (Part 2)
  substances      TEXT[],                                -- ENCRYPTED (Part 2) detected substances
  tested_by       UUID NOT NULL REFERENCES users(id),
  notes           TEXT,                                  -- ENCRYPTED (Part 2)
  follow_up_action TEXT,
  incident_id     UUID,                                  -- auto-created incident for positive
  sensitivity_level sensitivity_level NOT NULL DEFAULT 'part2',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID
);

CREATE INDEX idx_drug_tests_resident ON drug_tests (resident_id, test_date);
CREATE INDEX idx_drug_tests_org ON drug_tests (org_id, test_date);
CREATE INDEX idx_drug_tests_house ON drug_tests (house_id, test_date);

-- ============================================================
-- INCIDENT REPORTS
-- ============================================================
CREATE TABLE incident_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id        UUID NOT NULL REFERENCES houses(id),
  severity        incident_severity NOT NULL,
  incident_date   TIMESTAMPTZ NOT NULL,
  description     TEXT NOT NULL,
  involved_residents UUID[],            -- resident IDs involved
  involved_staff  UUID[],              -- staff IDs involved
  action_taken    TEXT,
  follow_up_notes TEXT,
  follow_up_date  DATE,
  resolved        BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES users(id),
  sensitivity_level sensitivity_level NOT NULL DEFAULT 'operational',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID NOT NULL
);

CREATE INDEX idx_incidents_org ON incident_reports (org_id);
CREATE INDEX idx_incidents_house ON incident_reports (house_id, incident_date);
CREATE INDEX idx_incidents_unresolved ON incident_reports (org_id, severity)
  WHERE resolved = FALSE;

-- ============================================================
-- DAILY CHECK-INS
-- ============================================================
CREATE TABLE daily_check_ins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id      UUID NOT NULL REFERENCES houses(id),
  resident_id   UUID NOT NULL REFERENCES residents(id),
  check_date    DATE NOT NULL,
  is_present    BOOLEAN NOT NULL,
  checked_by    UUID REFERENCES users(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_checkin_house ON daily_check_ins (house_id, check_date);
CREATE UNIQUE INDEX idx_daily_checkin_unique ON daily_check_ins (resident_id, check_date);

-- ============================================================
-- TASKS (Generic Assignments)
-- ============================================================
CREATE TABLE tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id      UUID REFERENCES houses(id),
  assigned_to   UUID NOT NULL REFERENCES residents(id),
  assigned_by   UUID NOT NULL REFERENCES users(id),
  title         TEXT NOT NULL,
  description   TEXT,
  due_date      DATE,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_tasks_resident ON tasks (assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_org ON tasks (org_id) WHERE deleted_at IS NULL;

-- ============================================================
-- MAINTENANCE REQUESTS
-- ============================================================
CREATE TABLE maintenance_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id        UUID NOT NULL REFERENCES houses(id),
  submitted_by    UUID NOT NULL REFERENCES users(id),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  priority        maintenance_priority NOT NULL DEFAULT 'medium',
  status          maintenance_status NOT NULL DEFAULT 'submitted',
  assigned_to     UUID REFERENCES users(id),
  photo_file_ids  UUID[],
  resolution_notes TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_maintenance_house ON maintenance_requests (house_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_maintenance_org ON maintenance_requests (org_id, status) WHERE deleted_at IS NULL;

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE vehicles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id     UUID NOT NULL REFERENCES residents(id),
  make            TEXT NOT NULL,
  model           TEXT NOT NULL,
  year            INT,
  color           TEXT,
  license_plate   TEXT NOT NULL,
  state           TEXT,
  parking_spot    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_vehicles_resident ON vehicles (resident_id) WHERE deleted_at IS NULL;

-- ============================================================
-- MOOD / WELLNESS CHECK-INS
-- ============================================================
CREATE TABLE wellness_check_ins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id     UUID NOT NULL REFERENCES residents(id),
  check_date      DATE NOT NULL,
  mood_rating     SMALLINT NOT NULL CHECK (mood_rating BETWEEN 1 AND 5),
  notes           TEXT,                     -- ENCRYPTED (Part 2)
  sensitivity_level sensitivity_level NOT NULL DEFAULT 'part2',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wellness_resident ON wellness_check_ins (resident_id, check_date);
CREATE UNIQUE INDEX idx_wellness_unique ON wellness_check_ins (resident_id, check_date);

-- ============================================================
-- CLINICAL ASSESSMENTS
-- ============================================================
CREATE TABLE clinical_assessments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id       UUID NOT NULL REFERENCES residents(id),
  assessment_type   TEXT NOT NULL,     -- 'BARC-10', 'PHQ-9', 'GAD-7', 'ASI-Lite', 'custom'
  assessment_date   DATE NOT NULL,
  scores            JSONB NOT NULL,    -- ENCRYPTED (Part 2) {total: 12, subscales: {...}}
  responses         JSONB,             -- ENCRYPTED (Part 2) individual item responses
  administered_by   UUID REFERENCES users(id),
  notes             TEXT,              -- ENCRYPTED (Part 2)
  sensitivity_level sensitivity_level NOT NULL DEFAULT 'part2',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID
);

CREATE INDEX idx_assessments_resident ON clinical_assessments (resident_id, assessment_date);
CREATE INDEX idx_assessments_org ON clinical_assessments (org_id, assessment_type);
```

---

## 8. Documents & E-Sign

```sql
-- ============================================================
-- DOCUMENT TEMPLATES
-- ============================================================
CREATE TABLE document_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category        document_category NOT NULL,
  content         JSONB NOT NULL,          -- template schema/fields
  form_logic      JSONB,                   -- conditional show/hide rules
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  version         INT NOT NULL DEFAULT 1,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  requires_signature BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID,
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_doc_templates_org ON document_templates (org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_doc_templates_category ON document_templates (org_id, category) WHERE deleted_at IS NULL;

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id       UUID REFERENCES document_templates(id),
  resident_id       UUID REFERENCES residents(id),
  house_id          UUID REFERENCES houses(id),
  title             TEXT NOT NULL,
  category          document_category NOT NULL,
  version           INT NOT NULL DEFAULT 1,
  file_id           UUID,                              -- FK to files
  form_data         JSONB,                             -- completed form data
  status            TEXT NOT NULL DEFAULT 'draft',     -- draft, pending_signature, signed, archived
  sensitivity_level sensitivity_level NOT NULL DEFAULT 'operational',
  retention_policy_id UUID,
  retention_expires_at TIMESTAMPTZ,
  legal_hold        BOOLEAN NOT NULL DEFAULT FALSE,
  destroyed_at      TIMESTAMPTZ,
  destroyed_by      UUID,
  destruction_reason TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID,
  updated_by        UUID,
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_docs_org ON documents (org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_docs_resident ON documents (resident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_docs_category ON documents (org_id, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_docs_retention ON documents (retention_expires_at)
  WHERE retention_expires_at IS NOT NULL AND destroyed_at IS NULL;

-- ============================================================
-- DOCUMENT VERSIONS
-- ============================================================
CREATE TABLE document_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version       INT NOT NULL,
  file_id       UUID,
  form_data     JSONB,
  change_notes  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID
);

CREATE INDEX idx_doc_versions ON document_versions (document_id, version);

-- ============================================================
-- DOCUMENT SIGNATURES (DocuSign Integration)
-- ============================================================
CREATE TABLE document_signatures (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id         UUID NOT NULL REFERENCES documents(id),
  signer_user_id      UUID REFERENCES users(id),
  signer_name         TEXT NOT NULL,
  signer_email        TEXT NOT NULL,
  signer_role         TEXT NOT NULL,        -- 'resident', 'staff', 'witness'
  status              signature_status NOT NULL DEFAULT 'pending',
  docusign_envelope_id TEXT,
  docusign_recipient_id TEXT,
  signed_at           TIMESTAMPTZ,
  ip_address          INET,
  document_hash       TEXT,                 -- SHA-256 of document at time of signing
  certificate_url     TEXT,                 -- DocuSign certificate of completion
  declined_reason     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_doc_sigs_document ON document_signatures (document_id);
CREATE INDEX idx_doc_sigs_signer ON document_signatures (signer_user_id);
CREATE INDEX idx_doc_sigs_envelope ON document_signatures (docusign_envelope_id);

-- ============================================================
-- RETENTION POLICIES
-- ============================================================
CREATE TABLE retention_policies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_category document_category NOT NULL,
  retention_years   INT NOT NULL,
  min_retention_years INT NOT NULL,   -- regulatory minimum (cannot go below)
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_retention_org_cat ON retention_policies (org_id, document_category);
```

---

## 9. Messaging & Communications

```sql
-- ============================================================
-- CHANNELS
-- ============================================================
CREATE TABLE channels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_type    channel_type NOT NULL,
  name            TEXT,                  -- for group/house/property channels
  house_id        UUID REFERENCES houses(id),
  property_id     UUID REFERENCES properties(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID,
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_channels_org ON channels (org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_channels_house ON channels (house_id);

-- ============================================================
-- CHANNEL PARTICIPANTS
-- ============================================================
CREATE TABLE channel_participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  role        TEXT NOT NULL DEFAULT 'member',  -- member, admin
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at     TIMESTAMPTZ,
  muted       BOOLEAN NOT NULL DEFAULT FALSE,
  last_read_at TIMESTAMPTZ
);

CREATE INDEX idx_participants_channel ON channel_participants (channel_id) WHERE left_at IS NULL;
CREATE INDEX idx_participants_user ON channel_participants (user_id) WHERE left_at IS NULL;
CREATE UNIQUE INDEX idx_participants_unique ON channel_participants (channel_id, user_id) WHERE left_at IS NULL;

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_id        UUID NOT NULL REFERENCES channels(id),
  sender_id         UUID NOT NULL REFERENCES users(id),
  content           TEXT NOT NULL,
  content_type      TEXT NOT NULL DEFAULT 'text',  -- text, file, system
  file_ids          UUID[],
  parent_message_id UUID REFERENCES messages(id),  -- for threading
  contains_part2    BOOLEAN NOT NULL DEFAULT FALSE,
  consent_id        UUID,              -- consent authorizing Part 2 content
  sensitivity_level sensitivity_level NOT NULL DEFAULT 'operational',
  edited_at         TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_channel ON messages (channel_id, created_at DESC);
CREATE INDEX idx_messages_org ON messages (org_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages (sender_id);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE announcements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id        UUID REFERENCES houses(id),      -- null = org-wide
  property_id     UUID REFERENCES properties(id),  -- null = org-wide
  target_audience TEXT NOT NULL DEFAULT 'all',      -- all, staff, residents
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  published_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID NOT NULL,
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_announcements_org ON announcements (org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_announcements_house ON announcements (house_id) WHERE deleted_at IS NULL;

-- ============================================================
-- ANNOUNCEMENT READS
-- ============================================================
CREATE TABLE announcement_reads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  read_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_ann_reads_unique ON announcement_reads (announcement_id, user_id);
```

---

## 10. Compliance & Consent (42 CFR Part 2)

```sql
-- ============================================================
-- CONSENTS (42 CFR 2.31 - All 8+1 Required Elements)
-- ============================================================
CREATE TABLE consents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id         UUID NOT NULL REFERENCES residents(id),
  -- Required element 1: Name of the patient (2.31(a)(1))
  patient_name        TEXT NOT NULL,
  -- Required element 2: Disclosing entity (2.31(a)(2))
  disclosing_entity   TEXT NOT NULL,
  -- Required element 3: Recipient (2.31(a)(3))
  recipient_name      TEXT NOT NULL,
  recipient_type      TEXT,              -- individual, organization, general_designation
  recipient_address   TEXT,
  -- Required element 4: Purpose (2.31(a)(4))
  purpose             TEXT NOT NULL,
  -- Required element 5: Information scope (2.31(a)(5))
  information_scope   TEXT NOT NULL,
  -- Required element 6: Expiration (2.31(a)(6))
  expiration_date     DATE,
  expiration_event    TEXT,              -- event or condition trigger
  -- Required element 7: Signature (2.31(a)(7))
  signature_id        UUID REFERENCES document_signatures(id),
  -- Required element 8: Signature date (2.31(a)(8))
  signature_date      DATE NOT NULL,
  -- Required element 9: Revocation notice statement (2.31(a)(9))
  revocation_notice_included BOOLEAN NOT NULL DEFAULT TRUE,
  -- Status tracking
  consent_type        consent_type NOT NULL,
  status              consent_status NOT NULL DEFAULT 'active',
  revoked_at          TIMESTAMPTZ,
  revoked_by          UUID REFERENCES users(id),
  revocation_reason   TEXT,
  expired_at          TIMESTAMPTZ,
  -- Metadata
  template_id         UUID REFERENCES document_templates(id),
  document_id         UUID REFERENCES documents(id),  -- signed consent document
  facilitating_staff  UUID REFERENCES users(id),
  sensitivity_level   sensitivity_level NOT NULL DEFAULT 'part2',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID
);

CREATE INDEX idx_consents_resident ON consents (resident_id);
CREATE INDEX idx_consents_org ON consents (org_id);
CREATE INDEX idx_consents_active ON consents (org_id, status) WHERE status = 'active';
CREATE INDEX idx_consents_expiration ON consents (expiration_date)
  WHERE status = 'active' AND expiration_date IS NOT NULL;

-- ============================================================
-- DISCLOSURES (42 CFR 2.24 - Accounting of Disclosures)
-- Effective February 16, 2026.
-- ============================================================
CREATE TABLE disclosures (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id       UUID NOT NULL REFERENCES residents(id),
  consent_id        UUID NOT NULL REFERENCES consents(id),
  disclosure_date   TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipient_name    TEXT NOT NULL,
  recipient_address TEXT,
  description       TEXT NOT NULL,       -- description of information disclosed
  purpose           TEXT NOT NULL,
  disclosure_method disclosure_method NOT NULL,
  data_categories   TEXT[] NOT NULL,     -- categories of data disclosed
  disclosed_by      UUID NOT NULL REFERENCES users(id),
  redisclosure_notice_included BOOLEAN NOT NULL DEFAULT TRUE,
  -- Accounting exemptions (per 2024 Final Rule)
  is_exempt_from_accounting BOOLEAN NOT NULL DEFAULT FALSE,
  exemption_reason  TEXT,                -- 'tpo', 'patient_self', 'authorized_person'
  sensitivity_level sensitivity_level NOT NULL DEFAULT 'part2',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No updated_at, no deleted_at: disclosures are immutable records.
);

CREATE INDEX idx_disclosures_resident ON disclosures (resident_id, disclosure_date);
CREATE INDEX idx_disclosures_org ON disclosures (org_id, disclosure_date);
CREATE INDEX idx_disclosures_consent ON disclosures (consent_id);
CREATE INDEX idx_disclosures_accounting ON disclosures (resident_id, disclosure_date)
  WHERE is_exempt_from_accounting = FALSE;

-- ============================================================
-- DISCLOSURE ACCOUNTING REQUESTS
-- Patient requests for accounting of disclosures.
-- ============================================================
CREATE TABLE disclosure_accounting_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id     UUID NOT NULL REFERENCES residents(id),
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  due_date        DATE NOT NULL,           -- 60 days from request
  delivered_at    TIMESTAMPTZ,
  report_file_id  UUID,                    -- generated report
  is_first_in_period BOOLEAN NOT NULL DEFAULT TRUE,
  fee_charged     NUMERIC(10,2),
  status          TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, delivered, overdue
  processed_by    UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_acct_requests_resident ON disclosure_accounting_requests (resident_id);
CREATE INDEX idx_acct_requests_org ON disclosure_accounting_requests (org_id, status);

-- ============================================================
-- PATIENT NOTICES (42 CFR 2.22)
-- ============================================================
CREATE TABLE patient_notices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id       UUID NOT NULL REFERENCES residents(id),
  notice_version    INT NOT NULL,
  notice_type       TEXT NOT NULL,           -- 'part2_patient', 'npp', 'house_rules'
  acknowledged      BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at   TIMESTAMPTZ,
  signature_id      UUID REFERENCES document_signatures(id),
  delivery_method   TEXT NOT NULL DEFAULT 'in_app',  -- in_app, email, print
  delivered_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_notices_resident ON patient_notices (resident_id);
CREATE INDEX idx_patient_notices_org ON patient_notices (org_id);

-- ============================================================
-- BAA TRACKING
-- ============================================================
CREATE TABLE baa_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID REFERENCES organizations(id),  -- null for platform-level BAAs
  direction         TEXT NOT NULL,          -- 'upstream' (with customer) or 'downstream' (with vendor)
  counterparty_name TEXT NOT NULL,
  service_description TEXT,
  execution_date    DATE NOT NULL,
  renewal_date      DATE,
  expiration_date   DATE,
  has_part2_addendum BOOLEAN NOT NULL DEFAULT FALSE,
  has_qsoa          BOOLEAN NOT NULL DEFAULT FALSE,
  soc2_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  breach_contact    TEXT,
  signed_copy_file_id UUID,
  status            TEXT NOT NULL DEFAULT 'active', -- active, expired, terminated
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID
);

CREATE INDEX idx_baa_org ON baa_records (org_id);
CREATE INDEX idx_baa_expiration ON baa_records (expiration_date) WHERE status = 'active';

-- ============================================================
-- BREACH INCIDENTS
-- ============================================================
CREATE TABLE breach_incidents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phase                 breach_phase NOT NULL DEFAULT 'detection',
  detected_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  detected_by           UUID REFERENCES users(id),
  detection_method      TEXT,              -- 'automated', 'user_report', 'audit_review'
  description           TEXT NOT NULL,
  records_affected_count INT,
  data_types_involved   TEXT[],
  part2_data_involved   BOOLEAN NOT NULL DEFAULT FALSE,
  -- 4-factor risk assessment
  phi_nature            TEXT,              -- types of PHI involved
  unauthorized_person   TEXT,              -- who received/accessed
  actually_viewed       BOOLEAN,
  mitigation_steps      TEXT,
  risk_level            TEXT,              -- 'low', 'medium', 'high'
  -- Notification tracking
  notification_deadline DATE,             -- 60 days from discovery
  customers_notified_at TIMESTAMPTZ,
  individuals_notified_at TIMESTAMPTZ,
  hhs_notified_at       TIMESTAMPTZ,
  media_notified_at     TIMESTAMPTZ,
  -- Resolution
  root_cause            TEXT,
  remediation_actions   TEXT,
  lessons_learned       TEXT,
  closed_at             TIMESTAMPTZ,
  closed_by             UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID
);

CREATE INDEX idx_breaches_org ON breach_incidents (org_id);
CREATE INDEX idx_breaches_open ON breach_incidents (phase) WHERE phase != 'closed';

-- ============================================================
-- DATA ACCESS REQUESTS (HIPAA Right of Access)
-- ============================================================
CREATE TABLE data_access_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resident_id     UUID NOT NULL REFERENCES residents(id),
  request_type    TEXT NOT NULL,       -- 'access', 'amendment', 'restriction'
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  description     TEXT NOT NULL,
  due_date        DATE NOT NULL,       -- 30 days for access, 60 for amendment
  status          TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, approved, denied, delivered
  decision_reason TEXT,
  processed_by    UUID REFERENCES users(id),
  completed_at    TIMESTAMPTZ,
  export_file_id  UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_requests_org ON data_access_requests (org_id, status);
CREATE INDEX idx_access_requests_resident ON data_access_requests (resident_id);

-- ============================================================
-- BREAK-GLASS ACCESS LOG
-- ============================================================
CREATE TABLE break_glass_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  reason          TEXT NOT NULL,          -- 'medical_emergency', 'legal_requirement', 'patient_safety'
  justification   TEXT NOT NULL,          -- mandatory free-text
  mfa_verified    BOOLEAN NOT NULL DEFAULT TRUE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  session_id      UUID,
  resources_accessed JSONB,              -- [{resource_type, resource_id, action}]
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_break_glass_org ON break_glass_events (org_id);
CREATE INDEX idx_break_glass_user ON break_glass_events (user_id);
```

---

## 11. Audit Log

```sql
-- ============================================================
-- AUDIT LOG (Append-Only, Immutable, HMAC Chain)
--
-- CRITICAL CONSTRAINTS:
-- - No UPDATE or DELETE operations permitted
-- - Application connects with INSERT-only privileges
-- - Reads via separate read-only database user
-- - HMAC chain links each entry to the previous for tamper detection
-- ============================================================
CREATE TABLE audit_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_num      BIGSERIAL,                             -- monotonic for HMAC chain ordering
  org_id            UUID NOT NULL,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id           UUID,
  user_role         user_role,
  user_email        TEXT,
  action_type       TEXT NOT NULL,                         -- e.g., 'record_viewed', 'consent_created'
  resource_type     TEXT NOT NULL,                         -- e.g., 'resident', 'consent', 'drug_test'
  resource_id       UUID,
  ip_address        INET,
  user_agent        TEXT,
  success           BOOLEAN NOT NULL DEFAULT TRUE,
  failure_reason    TEXT,
  old_value         JSONB,
  new_value         JSONB,
  sensitivity_level sensitivity_level NOT NULL DEFAULT 'operational',
  consent_id        UUID,                                  -- authorizing consent for Part 2 access
  session_id        UUID,
  request_id        UUID,
  is_break_glass    BOOLEAN NOT NULL DEFAULT FALSE,
  -- HMAC integrity chain
  prev_hash         TEXT,                                  -- HMAC of previous entry
  entry_hash        TEXT NOT NULL                          -- HMAC-SHA256(prev_hash + entry data)
);

-- In production, partition by month:
-- CREATE TABLE audit_log (...) PARTITION BY RANGE (timestamp);

CREATE INDEX idx_audit_org_ts ON audit_log (org_id, timestamp DESC);
CREATE INDEX idx_audit_user ON audit_log (user_id, timestamp DESC);
CREATE INDEX idx_audit_resource ON audit_log (resource_type, resource_id, timestamp DESC);
CREATE INDEX idx_audit_action ON audit_log (org_id, action_type, timestamp DESC);
CREATE INDEX idx_audit_sensitivity ON audit_log (org_id, sensitivity_level, timestamp DESC);
CREATE INDEX idx_audit_sequence ON audit_log (sequence_num);
CREATE INDEX idx_audit_session ON audit_log (session_id);

-- Privilege restrictions (run as superuser):
-- REVOKE UPDATE, DELETE ON audit_log FROM app_role;
-- GRANT INSERT ON audit_log TO app_role;
-- GRANT SELECT ON audit_log TO audit_reader_role;
```

---

## 12. Files & Storage

```sql
-- ============================================================
-- FILES
-- Stores metadata. Actual content lives in S3-compatible storage.
-- ============================================================
CREATE TABLE files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by     UUID REFERENCES users(id),
  filename        TEXT NOT NULL,
  content_type    TEXT NOT NULL,        -- MIME type
  size_bytes      BIGINT NOT NULL,
  storage_key     TEXT NOT NULL,        -- S3 key
  storage_bucket  TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  sensitivity_level sensitivity_level NOT NULL DEFAULT 'operational',
  is_encrypted    BOOLEAN NOT NULL DEFAULT FALSE,
  encryption_key_id TEXT,              -- KMS key reference
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_files_org ON files (org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_storage ON files (storage_bucket, storage_key);
```

---

## 13. Integrations

```sql
-- ============================================================
-- API KEYS
-- ============================================================
CREATE TABLE api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  key_hash      TEXT NOT NULL,          -- SHA-256 of the API key (never store plaintext)
  key_prefix    TEXT NOT NULL,          -- first 8 chars for identification
  scopes        TEXT[] NOT NULL,        -- e.g., ['residents:read', 'payments:write']
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID NOT NULL REFERENCES users(id),
  revoked_at    TIMESTAMPTZ,
  revoked_by    UUID REFERENCES users(id)
);

CREATE INDEX idx_api_keys_org ON api_keys (org_id) WHERE is_active = TRUE;
CREATE INDEX idx_api_keys_prefix ON api_keys (key_prefix);

-- ============================================================
-- WEBHOOKS
-- ============================================================
CREATE TABLE webhooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  events        webhook_event[] NOT NULL,
  secret_hash   TEXT NOT NULL,           -- for HMAC verification
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  failure_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID NOT NULL REFERENCES users(id),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_webhooks_org ON webhooks (org_id) WHERE deleted_at IS NULL;

-- ============================================================
-- WEBHOOK DELIVERIES
-- ============================================================
CREATE TABLE webhook_deliveries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id    UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event         webhook_event NOT NULL,
  payload       JSONB NOT NULL,
  response_code INT,
  response_body TEXT,
  delivered_at  TIMESTAMPTZ,
  attempts      INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending, delivered, failed, exhausted
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_webhook ON webhook_deliveries (webhook_id, created_at DESC);
CREATE INDEX idx_deliveries_retry ON webhook_deliveries (next_retry_at) WHERE status = 'pending';

-- ============================================================
-- INTEGRATION CONFIGS
-- Per-org settings for third-party services.
-- ============================================================
CREATE TABLE integration_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,          -- 'stripe', 'docusign', 'sendgrid', 'twilio'
  config          JSONB NOT NULL DEFAULT '{}',  -- ENCRYPTED at rest (may contain tokens)
  is_active       BOOLEAN NOT NULL DEFAULT FALSE,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_integrations_org_provider ON integration_configs (org_id, provider);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE notification_preferences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL,       -- 'push', 'email', 'sms', 'in_app'
  event_type  TEXT NOT NULL,       -- matches audit action_type categories
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_notif_prefs_unique ON notification_preferences (user_id, channel, event_type);

-- ============================================================
-- SCHEDULED JOBS
-- ============================================================
CREATE TABLE scheduled_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id),
  job_type        TEXT NOT NULL,          -- 'invoice_generation', 'dunning', 'consent_expiry_check', 'retention_check'
  schedule_cron   TEXT NOT NULL,          -- cron expression
  last_run_at     TIMESTAMPTZ,
  next_run_at     TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  config          JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_next_run ON scheduled_jobs (next_run_at) WHERE is_active = TRUE;
```

---

## 14. Row-Level Security Policies

All tenant-scoped tables enforce RLS via `org_id`. The application sets `app.current_org_id` on each database connection.

```sql
-- ============================================================
-- Enable RLS on all tenant-scoped tables
-- ============================================================
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE curfew_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE disclosure_accounting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE baa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_glass_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Tenant isolation policies
-- The application sets: SET app.current_org_id = '<uuid>';
-- on every connection before executing queries.
-- ============================================================
CREATE POLICY tenant_isolation ON properties
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON houses
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON beds
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON residents
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON admissions
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON discharges
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON resident_status_history
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON waitlist_entries
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON bed_transfers
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON accounts
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON ledger_entries
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON rate_configs
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON payers
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON invoices
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON payments
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON consents
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON disclosures
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON drug_tests
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON incident_reports
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON documents
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON channels
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON messages
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON audit_log
  USING (org_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY tenant_isolation ON files
  USING (org_id = current_setting('app.current_org_id')::UUID);

-- ============================================================
-- Audit log: INSERT-only for app role
-- ============================================================
CREATE POLICY audit_insert_only ON audit_log
  FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================
-- Ledger entries: INSERT-only (immutable)
-- ============================================================
CREATE POLICY ledger_insert_only ON ledger_entries
  FOR INSERT
  WITH CHECK (org_id = current_setting('app.current_org_id')::UUID);

-- ============================================================
-- Platform admin bypass
-- Platform admins use a separate database role with policies
-- allowing cross-org access to non-PHI administrative tables.
-- Enforced at the database role level, not via RLS bypass.
-- ============================================================
```

---

## 15. Index Strategy Summary

| Table | Index Purpose | Type |
|-------|--------------|------|
| `residents` | Org + status lookup | B-tree, partial (deleted_at IS NULL) |
| `residents` | House membership | B-tree |
| `admissions` | Pipeline stage filtering | B-tree on (org_id, stage) |
| `invoices` | Overdue invoice queries | B-tree on (org_id, due_date) with status filter |
| `ledger_entries` | Account balance computation | B-tree on (account_id, entry_date) |
| `ledger_entries` | Transaction group lookups | B-tree on (transaction_group_id) |
| `ledger_entries` | Per-resident financial history | B-tree on (resident_id) |
| `consents` | Active consent verification | B-tree on (org_id, status) filtered to active |
| `consents` | Expiration monitoring | B-tree on (expiration_date) filtered to active |
| `disclosures` | Accounting of disclosures report | B-tree on (resident_id, disclosure_date) filtered non-exempt |
| `audit_log` | Compliance dashboard queries | B-tree on (org_id, timestamp DESC) |
| `audit_log` | Per-user activity log | B-tree on (user_id, timestamp DESC) |
| `audit_log` | Resource access history | B-tree on (resource_type, resource_id, timestamp DESC) |
| `audit_log` | HMAC chain verification | B-tree on (sequence_num) |
| `drug_tests` | Per-resident test history | B-tree on (resident_id, test_date) |
| `messages` | Channel message loading | B-tree on (channel_id, created_at DESC) |
| `chore_assignments` | Per-resident schedule | B-tree on (resident_id, assigned_date) |
| `beds` | Availability queries | B-tree on (org_id, status) |
| `curfew_check_ins` | Violation reporting | B-tree on (org_id, check_in_date) filtered to violations |

---

## Appendix A: Sensitivity Level Guide

Every table or column handling patient data includes a `sensitivity_level` classifier. The application layer uses this to enforce:

| Level | Access Control | Encryption | Audit | Redisclosure Notice |
|-------|---------------|------------|-------|-------------------|
| `operational` | RBAC only | Database-level only | Standard | No |
| `pii` | RBAC only | Database-level only | Standard | No |
| `phi` | RBAC + minimum necessary | Database + field-level | PHI-level | No |
| `part2` | RBAC + active consent required | Database + field-level (AES-256-GCM) | Part 2-level | Yes (42 CFR 2.32) |

## Appendix B: Encrypted Field Registry

Fields marked `-- ENCRYPTED` use application-layer AES-256-GCM encryption with per-org keys managed via AWS KMS. The database stores ciphertext; decryption happens in the application layer after consent verification.

| Table | Column(s) | Sensitivity |
|-------|----------|-------------|
| `organizations` | `ein` | PII |
| `residents` | `first_name`, `last_name`, `date_of_birth`, `phone`, `email`, `ssn_last4`, `emergency_contact`, `medical_info` | PII/PHI |
| `residents` | `sud_info` | Part 2 |
| `admissions` | `screening_notes`, `interview_notes` | Part 2 |
| `drug_tests` | `result`, `substances`, `notes` | Part 2 |
| `clinical_assessments` | `scores`, `responses`, `notes` | Part 2 |
| `wellness_check_ins` | `notes` | Part 2 |
| `integration_configs` | `config` | System |

## Appendix C: Table Count

| Category | Count |
|----------|-------|
| Multi-Tenant Hierarchy | 4 |
| Users & Auth | 3 |
| Residents & Admissions | 6 |
| Payments & Ledger | 13 |
| House Operations | 15 |
| Documents & E-Sign | 5 |
| Messaging | 5 |
| Compliance & Consent | 8 |
| Audit Log | 1 |
| Files & Storage | 1 |
| Integrations | 6 |
| **Total** | **67** |

---

*Document prepared by data-modeler for RecoveryOS.*
*Schema designed for PostgreSQL 15+ with RLS, partitioning support, and HIPAA/42 CFR Part 2 compliance.*
*Cross-referenced with: 01_REQUIREMENTS.md (107 features), 04_COMPLIANCE.md (audit, consent, encryption), PHASE-3-ARCHITECTURE.md (deliverable spec).*
