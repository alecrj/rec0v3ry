# RecoveryOS - Compliance & Security Requirements

> **Owner**: compliance-expert
> **Status**: Complete
> **Last Updated**: 2026-02-11
> **CRITICAL DEADLINE**: February 16, 2026 -- 42 CFR Part 2 accounting of disclosures + breach notification
> **Source Research**: docs/research/regulations.md (authoritative citations)

---

## Table of Contents

1. [Compliance Architecture Overview](#1-compliance-architecture-overview)
2. [HIPAA Requirements -- Software Implementation](#2-hipaa-requirements----software-implementation)
3. [42 CFR Part 2 Requirements -- Software Implementation](#3-42-cfr-part-2-requirements----software-implementation)
4. [Audit Logging Specification](#4-audit-logging-specification)
5. [Encryption Requirements](#5-encryption-requirements)
6. [Access Control & RBAC](#6-access-control--rbac)
7. [BAA & QSOA Requirements](#7-baa--qsoa-requirements)
8. [Incident Response & Breach Notification](#8-incident-response--breach-notification)
9. [Pre-Launch Compliance Checklist](#9-pre-launch-compliance-checklist)
10. [February 16, 2026 Deadline Checklist](#10-february-16-2026-deadline-checklist)

---

## 1. Compliance Architecture Overview

### RecoveryOS Regulatory Posture

RecoveryOS is a **HIPAA Business Associate** (45 CFR 164.502(e), 164.504(e)) and is subject to **42 CFR Part 2** because:

1. RecoveryOS creates, receives, maintains, and transmits PHI on behalf of covered entities (sober living facilities).
2. Most sober living facilities are federally assisted (Medicaid, SAMHSA grants, 501(c)(3) status) and hold themselves out as providing SUD treatment or recovery services, triggering 42 CFR Part 2 applicability (42 CFR 2.11, 2.12).
3. The mere fact that a person resides in a sober living facility identifies them as having or having had a substance use disorder -- making residency data itself Part 2 protected (42 CFR 2.12(a)(1)).

### Dual Compliance Framework

RecoveryOS must satisfy BOTH HIPAA and 42 CFR Part 2. Where requirements conflict, **Part 2 is stricter and controls**.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     RecoveryOS Compliance Layers                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Layer 1: Infrastructure Security                                   │
│  ├── Encryption at rest (AES-256) + in transit (TLS 1.2+)          │
│  ├── Cloud provider with BAA (SOC 2 Type II, HIPAA-eligible)       │
│  └── Network isolation, WAF, DDoS protection                       │
│                                                                     │
│  Layer 2: Application Security                                      │
│  ├── Authentication (MFA, unique user IDs)                          │
│  ├── Authorization (9-role RBAC, minimum necessary)                 │
│  ├── Session management (15-min auto-logoff)                        │
│  └── Input validation, OWASP Top 10 mitigations                    │
│                                                                     │
│  Layer 3: Data Protection                                           │
│  ├── Field-level encryption for SUD data                            │
│  ├── Part 2 data segmentation                                       │
│  ├── Consent-gated access to Part 2 records                        │
│  └── Redisclosure controls + notice attachment                      │
│                                                                     │
│  Layer 4: Audit & Accountability                                    │
│  ├── Immutable, append-only audit log                               │
│  ├── Accounting of disclosures (42 CFR 2.24)                       │
│  ├── 6-year retention                                               │
│  └── Compliance officer dashboard                                   │
│                                                                     │
│  Layer 5: Governance                                                │
│  ├── BAA/QSOA chain for all subprocessors                          │
│  ├── Breach notification procedures                                 │
│  ├── Annual risk assessment                                         │
│  └── Workforce training + sanctions                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Part 2 Data Classification

All data in RecoveryOS is classified by sensitivity level:

| Classification | Description | Examples | Protection Level |
|----------------|-------------|----------|-----------------|
| **Part 2 Protected** | Identifies person as having/having had SUD | Residency record, drug test results, treatment referrals, meeting attendance, intake assessments, progress notes, MAT records | Part 2 + HIPAA (strictest) |
| **PHI (non-Part 2)** | Health info not identifying SUD status | General medical conditions, allergies, emergency contacts with medical info | HIPAA |
| **PII** | Personally identifiable, not health-related | Name, address, phone, SSN, payment info | Standard security + PCI (for payment) |
| **Operational** | Non-sensitive operational data | House rules, chore schedules, maintenance requests (without SUD context) | Standard security |

**Source**: 42 CFR 2.11, 2.12; 45 CFR 160.103

---

## 2. HIPAA Requirements -- Software Implementation

### 2.1 Administrative Safeguards (45 CFR 164.308)

| Regulation | Requirement | RecoveryOS Implementation | Priority |
|------------|-------------|---------------------------|----------|
| **164.308(a)(1)(i)** Security Management Process | Risk analysis, risk management, sanction policy, activity review | Annual risk assessment procedure; automated anomaly detection on audit logs; sanction policy in BAA template; activity review dashboard for compliance officers | P0 |
| **164.308(a)(2)** Assigned Security Responsibility | Designate security official | Per-organization "Compliance Officer" role with elevated audit access; platform-level security officer at RecoveryOS | P0 |
| **164.308(a)(3)** Workforce Security | Authorization, clearance, termination procedures | RBAC with 9 roles; invitation-based onboarding with role assignment; immediate access revocation on termination (deactivate user, invalidate sessions) | P0 |
| **164.308(a)(4)** Information Access Management | Access authorization, establishment, modification | Role-based access policies (Section 6); access change requests logged in audit trail; periodic access review reports | P0 |
| **164.308(a)(5)** Security Awareness | Reminders, log-in monitoring, password management | In-app compliance tips for staff roles; failed login alerts; password complexity enforced via auth provider (min 12 chars, no reuse); MFA required | P1 |
| **164.308(a)(6)** Security Incident Procedures | Response and reporting | Automated incident detection (Section 8); incident response runbook; 60-day notification workflow | P0 |
| **164.308(a)(7)** Contingency Plan | Backup, disaster recovery, emergency mode | Automated daily backups with encryption; cross-region replication; documented RTO < 4 hours, RPO < 1 hour; emergency read-only mode | P0 |
| **164.308(a)(8)** Evaluation | Periodic evaluation | Annual compliance self-assessment; SOC 2 Type II audit (Year 1 target) | P1 |
| **164.308(b)(1)** BAA Contracts | Written contracts with BAs | BAA template for customers; BAA required from all subprocessors (Section 7) | P0 |

### 2.2 Technical Safeguards (45 CFR 164.312)

| Regulation | Requirement | RecoveryOS Implementation | Priority |
|------------|-------------|---------------------------|----------|
| **164.312(a)(1)** Access Control | Unique user ID, emergency access, auto-logoff, encryption | Unique UUID per user; break-glass emergency access with elevated logging; 15-minute session timeout (configurable per org, max 30 min); AES-256 encryption | P0 |
| **164.312(a)(2)(i)** Unique User Identification | Assign unique name/number | UUID assigned at user creation; no shared accounts permitted; service accounts tracked separately | P0 |
| **164.312(a)(2)(ii)** Emergency Access Procedure | Obtain ePHI during emergency | Break-glass procedure: designated admin can access any record with mandatory justification text, elevated audit logging, automatic compliance officer notification | P0 |
| **164.312(a)(2)(iii)** Automatic Logoff | Terminate session after inactivity | 15-minute idle timeout; session invalidation on server; re-authentication required; configurable per org (5-30 min range) | P0 |
| **164.312(a)(2)(iv)** Encryption and Decryption | Encrypt ePHI | AES-256 at rest; field-level encryption for Part 2 data; key management via AWS KMS (Section 5) | P0 |
| **164.312(b)** Audit Controls | Record and examine activity | Immutable audit log (Section 4); append-only; async writes; compliance dashboard | P0 |
| **164.312(c)(1)** Integrity | Authenticate ePHI | HMAC-SHA256 integrity verification on audit logs; database checksums; tamper detection alerts | P0 |
| **164.312(d)** Person/Entity Authentication | Verify identity | MFA required for all users (TOTP, SMS, or passkey); identity verification at account creation; session tokens with short TTL | P0 |
| **164.312(e)(1)** Transmission Security | Integrity controls, encryption | TLS 1.2+ with strong cipher suites (TLS_AES_256_GCM_SHA384); HSTS enforced; certificate pinning for mobile; no HTTP fallback | P0 |

### 2.3 Physical Safeguards (45 CFR 164.310)

| Regulation | Requirement | RecoveryOS Implementation | Priority |
|------------|-------------|---------------------------|----------|
| **164.310(a)(1)** Facility Access Controls | Contingency ops, security plan, access validation | Cloud provider responsibility: require SOC 2 Type II + HIPAA BAA from hosting provider; document in BAA chain | P0 |
| **164.310(d)(1)** Device and Media Controls | Disposal, re-use, accountability | Data destruction procedures for decommissioned infrastructure; crypto-shredding for deleted tenant data; media disposal attestation from cloud provider | P1 |

### 2.4 Privacy Rule Implementation (45 CFR 164.500-534)

| Regulation | Requirement | RecoveryOS Implementation | Priority |
|------------|-------------|---------------------------|----------|
| **164.524** Right of Access | Provide PHI access within 30 days | Self-service data export for residents (own records); admin export tool for operators; machine-readable format (JSON/CSV); 30-day SLA tracked in system | P0 |
| **164.526** Right of Amendment | Respond to amendments within 60 days | Amendment request workflow: resident submits request > admin reviews > approve/deny with reason > audit logged; amendment appended (original preserved) | P1 |
| **164.528** Accounting of Disclosures | 6-year accounting, 60-day response | Disclosure tracking system (Section 4); patient-facing disclosure report; automated generation on request | P0 |
| **164.502(b)** Minimum Necessary | Limit PHI to minimum necessary | RBAC enforcement (Section 6); API-level field filtering per role; query-level data scoping by tenant + role | P0 |
| **164.520** Notice of Privacy Practices | Provide notice describing practices | Digital NPP presented at intake; e-signature acknowledgment; version tracking; re-acknowledgment on updates | P1 |

---

## 3. 42 CFR Part 2 Requirements -- Software Implementation

### 3.1 Consent Management System (42 CFR 2.31)

This is the most critical Part 2 feature. No competitor implements this.

#### Consent Record Data Model

Every consent record MUST capture these 8 required elements plus metadata:

| Field | Regulation | Type | Required | Description |
|-------|-----------|------|----------|-------------|
| `id` | -- | UUID | Yes | Unique consent identifier |
| `patient_id` | 2.31(a)(1) | UUID (FK) | Yes | Reference to resident |
| `patient_name` | 2.31(a)(1) | string | Yes | Full legal name at time of consent |
| `disclosing_entity` | 2.31(a)(2) | string | Yes | Who is permitted to make disclosure |
| `recipient` | 2.31(a)(3) | string | Yes | Name or general designation of recipient(s) |
| `purpose` | 2.31(a)(4) | string | Yes | Purpose of the disclosure |
| `information_scope` | 2.31(a)(5) | string | Yes | What kind and how much info may be disclosed |
| `expiration_date` | 2.31(a)(6) | date/event | Yes | Date, event, or condition of expiration |
| `patient_signature` | 2.31(a)(7) | signature blob | Yes | Electronic signature with identity verification |
| `signature_date` | 2.31(a)(8) | timestamp | Yes | Date consent was signed |
| `revocation_notice` | 2.31(a)(9) | boolean | Yes | Statement that consent may be revoked |
| `status` | -- | enum | Yes | `active`, `expired`, `revoked` |
| `revoked_at` | -- | timestamp | No | When consent was revoked |
| `revoked_by` | -- | UUID | No | Who revoked (patient or authorized rep) |
| `consent_type` | -- | enum | Yes | `specific_disclosure`, `tpo_general`, `research` |
| `created_at` | -- | timestamp | Yes | Record creation time |
| `created_by` | -- | UUID | Yes | Staff who facilitated consent |
| `org_id` | -- | UUID | Yes | Multi-tenant scoping |

**Source**: 42 CFR 2.31 (Required Elements); 2024 Final Rule (89 FR 12472) permitting electronic signatures and general designation of recipients.

#### Consent Workflows

**Creation Flow:**
1. Staff selects resident and consent type
2. System presents form with all 8 required elements pre-labeled
3. Resident reviews, completes fields, provides e-signature
4. System validates all required fields present
5. System records consent with timestamp and staff witness
6. Audit log entry: `consent_created`
7. Consent becomes `active` immediately

**Revocation Flow:**
1. Resident (or authorized rep) requests revocation
2. System confirms identity
3. System sets `status = revoked`, records `revoked_at` and `revoked_by`
4. System immediately blocks further disclosures under this consent
5. Audit log entry: `consent_revoked`
6. Notification sent to staff/compliance officer
7. Revocation does NOT apply retroactively to prior disclosures (42 CFR 2.31(b))

**Expiration Monitoring:**
1. Nightly job checks all `active` consents against `expiration_date`
2. 30-day advance warning to compliance officer
3. 7-day advance warning to staff + resident
4. On expiration: `status = expired`, no further disclosures permitted
5. Audit log entry: `consent_expired`

**Pre-Disclosure Verification:**
1. Before ANY disclosure of Part 2 data, system checks:
   - Active consent exists for this resident
   - Consent covers this recipient
   - Consent covers this purpose
   - Consent has not expired or been revoked
2. If no valid consent: disclosure BLOCKED, audit log entry: `disclosure_blocked_no_consent`
3. If valid consent: disclosure proceeds with redisclosure notice attached

#### Consent UI Requirements

- Consent dashboard showing all consents per resident (active, expired, revoked)
- Consent creation wizard with required field validation
- Bulk consent management for intake (multiple consents needed at admission)
- Consent template library (common disclosure scenarios)
- Consent print/export for paper backup
- Resident-facing consent view in resident portal (read-only)

### 3.2 Redisclosure Controls (42 CFR 2.32)

#### Required Notice Text

Every disclosure of Part 2 records MUST include this notice, verbatim:

> "This record is protected by federal law (42 CFR Part 2). Federal law prohibits any further disclosure of this record without the written consent of the person to whom it pertains, or as otherwise permitted by 42 CFR Part 2. A general authorization for the release of medical or other information is NOT sufficient for this purpose."

**Source**: 42 CFR 2.32

#### Implementation

| Mechanism | Implementation | Priority |
|-----------|---------------|----------|
| **Exported documents** | Notice automatically appended as header/footer on all exports containing Part 2 data | P0 |
| **API responses** | Part 2 data responses include `x-redisclosure-notice` header; front-end renders notice banner | P0 |
| **Printed records** | Notice printed on every page of Part 2 records | P0 |
| **Shared reports** | Notice embedded in report header for any report containing Part 2 data | P0 |
| **Email/messaging** | If Part 2 data included in any communication, notice auto-prepended | P0 |
| **Family/sponsor portal** | Persistent notice banner on all Part 2 data views; consent-gated access | P0 |
| **Technical enforcement** | `is_part2` flag on data fields; middleware enforces notice inclusion | P0 |

#### 2024 Final Rule Modification (89 FR 12472)

Under the 2024 rule, once Part 2 records are disclosed for TPO pursuant to valid consent, HIPAA covered entities and business associates MAY redisclose for TPO without additional consent -- BUT must still include the redisclosure notice. RecoveryOS must track whether a recipient is a covered entity/BA to apply this correctly.

### 3.3 Accounting of Disclosures (42 CFR 2.24 -- effective February 16, 2026)

**This is a NEW requirement taking effect 5 days from today.**

#### Disclosure Log Data Model

| Field | Source | Type | Required | Description |
|-------|--------|------|----------|-------------|
| `id` | -- | UUID | Yes | Unique disclosure identifier |
| `patient_id` | 2.24 | UUID (FK) | Yes | Resident whose data was disclosed |
| `disclosure_date` | 2.24 | timestamp | Yes | When disclosure occurred |
| `recipient_name` | 2.24 | string | Yes | Name of person/entity receiving data |
| `recipient_address` | 2.24 | string | If known | Address of recipient |
| `description` | 2.24 | text | Yes | Description of information disclosed |
| `purpose` | 2.24 | text | Yes | Statement of purpose or copy of request |
| `consent_id` | -- | UUID (FK) | Yes | Reference to authorizing consent |
| `disclosed_by` | -- | UUID (FK) | Yes | User who performed disclosure |
| `disclosure_method` | -- | enum | Yes | `api`, `export`, `print`, `verbal`, `fax`, `email` |
| `data_categories` | -- | string[] | Yes | Categories of data disclosed |
| `org_id` | -- | UUID | Yes | Multi-tenant scoping |

**Source**: 42 CFR 2.24 (as amended by 2024 Final Rule, 89 FR 12472, 12562-12563)

#### Exceptions (Disclosures NOT requiring accounting)

Per the 2024 Final Rule alignment with HIPAA (45 CFR 164.528):

- Disclosures to the patient themselves
- Disclosures incident to an otherwise permitted disclosure
- Disclosures pursuant to written authorization (distinct from Part 2 consent)
- Disclosures for TPO (NOTE: this is a significant exception)
- Disclosures to persons involved in the patient's care

**Implementation**: Even for excepted disclosures, RecoveryOS will log them in the audit trail (Section 4) but will NOT include them in the patient-facing accounting of disclosures report.

#### Patient Request Workflow

1. Resident requests accounting of disclosures (in-app or written request)
2. System generates report covering requested time period (up to 6 years back)
3. Report includes: date, recipient, description, purpose for each non-excepted disclosure
4. Report delivered within 60 days (HIPAA timeline per 45 CFR 164.528)
5. First request in 12-month period: free; subsequent requests: reasonable cost-based fee permitted
6. Audit log entry: `accounting_requested`, `accounting_delivered`

### 3.4 Patient Notice Requirements (42 CFR 2.22 -- modified effective February 16, 2026)

#### Required Notice Content

Patients must receive a notice that includes:

| Element | Requirement |
|---------|-------------|
| Summary of Part 2 protections | Plain-language description of confidentiality rights |
| Right to revoke consent | Explanation of revocation process |
| Redisclosure notice text | Full 42 CFR 2.32 notice |
| Right to request accounting | How to request accounting of disclosures |
| Right to file complaint | SAMHSA and HHS complaint process |
| Breach notification rights | Right to be notified of breaches (post Feb 16, 2026) |

#### Implementation

- Digital notice presented at intake with e-signature acknowledgment
- Notice version tracking (when notice text changes, new acknowledgment required)
- Notice available in resident portal at all times
- Delivery confirmation logged in audit trail

### 3.5 Part 2 Data Segmentation

#### Technical Architecture

Part 2 data must be logically segmentable from non-Part 2 data to support:
- Consent-gated access (only users with valid consent can see Part 2 fields)
- Selective disclosure (share non-Part 2 data without exposing SUD status)
- Redisclosure control enforcement

| Approach | Implementation |
|----------|---------------|
| **Data tagging** | Every data field/record tagged with `sensitivity_level` enum: `part2`, `phi`, `pii`, `operational` |
| **Query filtering** | Middleware checks user consent/role before returning Part 2 fields; unauthorized fields omitted from response |
| **UI enforcement** | Part 2 fields rendered with visual indicator; hidden entirely for unauthorized users |
| **Export controls** | Export functions respect Part 2 segmentation; Part 2 data only included when valid consent verified |

---

## 4. Audit Logging Specification

### 4.1 Required Fields

Every audit log entry MUST contain:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique event ID | `a1b2c3d4-...` |
| `timestamp` | ISO 8601 (UTC) | When event occurred | `2026-02-11T14:30:00.000Z` |
| `user_id` | UUID | Who performed the action | `u-abc123` |
| `user_role` | enum | Role at time of action | `house_manager` |
| `user_email` | string | Email for human readability | `jane@example.com` |
| `org_id` | UUID | Organization context | `org-xyz789` |
| `action_type` | enum | What happened | `record_viewed`, `record_updated`, `disclosure_made` |
| `resource_type` | enum | Type of resource acted on | `resident`, `consent`, `drug_test`, `payment` |
| `resource_id` | UUID | Specific resource | `res-456` |
| `ip_address` | string | Client IP | `203.0.113.45` |
| `user_agent` | string | Client identifier | `Mozilla/5.0...` |
| `success` | boolean | Whether action succeeded | `true` |
| `failure_reason` | string | If failed, why | `insufficient_permissions` |
| `old_value` | JSON | Previous state (for updates) | `{"status": "active"}` |
| `new_value` | JSON | New state (for updates) | `{"status": "discharged"}` |
| `sensitivity_level` | enum | Data classification accessed | `part2`, `phi`, `pii`, `operational` |
| `consent_id` | UUID | Consent authorizing access (Part 2) | `con-789` |
| `session_id` | UUID | Session identifier | `sess-abc` |
| `request_id` | UUID | Request correlation ID | `req-def` |

**Source**: 45 CFR 164.312(b) (audit controls); 42 CFR 2.25 (audit requirements); 42 CFR 2.24 (accounting of disclosures)

### 4.2 Auditable Events

| Category | Events | Sensitivity |
|----------|--------|-------------|
| **Authentication** | `login_success`, `login_failure`, `logout`, `mfa_challenge`, `mfa_success`, `mfa_failure`, `password_change`, `password_reset`, `session_timeout`, `session_invalidated` | Standard |
| **Authorization** | `role_assigned`, `role_revoked`, `permission_changed`, `access_denied`, `break_glass_activated` | Standard |
| **Resident Records** | `resident_created`, `resident_viewed`, `resident_updated`, `resident_discharged`, `resident_deleted` | PHI/Part 2 |
| **Clinical Data** | `drug_test_created`, `drug_test_viewed`, `assessment_created`, `assessment_viewed`, `progress_note_created`, `progress_note_viewed` | Part 2 |
| **Consent** | `consent_created`, `consent_viewed`, `consent_revoked`, `consent_expired`, `consent_verified` | Part 2 |
| **Disclosures** | `disclosure_made`, `disclosure_blocked_no_consent`, `disclosure_blocked_expired_consent`, `redisclosure_notice_attached` | Part 2 |
| **Documents** | `document_uploaded`, `document_viewed`, `document_downloaded`, `document_signed`, `document_deleted`, `document_retention_expired` | Varies |
| **Payments** | `payment_created`, `payment_received`, `payment_refunded`, `invoice_generated`, `ledger_entry_created` | PII |
| **Communications** | `message_sent`, `announcement_created`, `sms_sent` | Varies |
| **Admin** | `user_created`, `user_deactivated`, `org_settings_changed`, `export_generated`, `report_generated`, `accounting_requested` | Standard |

### 4.3 Immutability Requirements

| Requirement | Implementation |
|-------------|---------------|
| **Append-only** | No UPDATE or DELETE operations on audit table; enforced at database level (REVOKE UPDATE, DELETE on audit table) |
| **Tamper detection** | Each entry includes HMAC-SHA256 hash chaining previous entry's hash (blockchain-like integrity chain) |
| **Integrity verification** | Nightly job verifies hash chain integrity; alert on any break |
| **Separate storage** | Audit logs stored in separate database/schema from application data; separate access credentials |
| **Write-only app access** | Application database user has INSERT-only permission on audit table; no SELECT (reads via separate read-only user for compliance dashboard) |
| **Backup isolation** | Audit log backups stored separately from application backups |

### 4.4 Retention

| Policy | Duration | Source |
|--------|----------|--------|
| **Audit logs** | 6 years minimum | 42 CFR 2.24 (accounting of disclosures retention); 45 CFR 164.528 |
| **Disclosure records** | 6 years from date of disclosure | 42 CFR 2.24 |
| **Consent records** | 6 years from expiration/revocation | 42 CFR 2.31 + retention best practice |
| **Breach records** | 6 years | 45 CFR 164.530(j) |
| **Security incident records** | 6 years | 45 CFR 164.530(j) |

Storage strategy: Hot storage (0-1 year), warm storage (1-3 years), cold/archive storage (3-6 years). All encrypted at rest.

### 4.5 Performance Requirements

| Requirement | Target |
|-------------|--------|
| **Write latency impact** | < 5ms added to request (async write via message queue) |
| **Write availability** | 99.99% (buffered locally if queue unavailable) |
| **Query performance** | < 2s for compliance dashboard queries (indexed by org_id, timestamp, user_id, resource_type) |
| **Storage growth** | Estimated 50-100 MB/org/year; plan for 10,000 orgs = 1 TB/year |

### 4.6 Access Control for Audit Logs

| Role | Audit Log Access |
|------|-----------------|
| Platform Admin | Full read access to all audit logs (RecoveryOS staff only) |
| Compliance Officer (per org) | Read access to own org's audit logs |
| Org Owner | Read access to summary audit reports (not raw logs) |
| All other roles | No audit log access |

---

## 5. Encryption Requirements

### 5.1 Data at Rest

| Layer | Algorithm | Key Management | Source |
|-------|-----------|---------------|--------|
| **Database (full)** | AES-256 | Cloud provider managed (AWS RDS/Neon encryption) | 45 CFR 164.312(a)(2)(iv) |
| **Field-level (Part 2 data)** | AES-256-GCM | Application-managed keys via AWS KMS; per-org key isolation | 42 CFR Part 2 (enhanced protection for SUD data) |
| **File storage** | AES-256 | S3 SSE-KMS with per-bucket keys | 45 CFR 164.312(a)(2)(iv) |
| **Backups** | AES-256 | Separate backup encryption key in KMS | 45 CFR 164.308(a)(7) |
| **Audit logs** | AES-256 | Separate audit key; different access policy | 45 CFR 164.312(b) |

#### Field-Level Encryption Targets

These fields receive application-layer encryption BEYOND database-level encryption:

| Field | Rationale |
|-------|-----------|
| Drug test results | Direct SUD evidence; highest sensitivity |
| SUD diagnosis codes | Direct SUD identification |
| Treatment referral details | Identifies SUD treatment providers |
| MAT medication records | Identifies opioid treatment |
| Clinical assessment scores | SUD severity indicators |
| Progress notes (clinical) | May contain SUD treatment details |

### 5.2 Data in Transit

| Requirement | Specification | Source |
|-------------|--------------|--------|
| **Protocol** | TLS 1.2 minimum; TLS 1.3 preferred | 45 CFR 164.312(e)(1) |
| **Cipher suites** | TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256 | NIST SP 800-52 Rev. 2 |
| **Certificate** | RSA 2048+ or ECDSA P-256+; auto-renewed (Let's Encrypt or ACM) | Industry standard |
| **HSTS** | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` | OWASP |
| **HTTP fallback** | Disabled; all HTTP redirects to HTTPS | 45 CFR 164.312(e)(1) |
| **API-to-API** | mTLS for service-to-service communication | Defense in depth |
| **Database connections** | SSL/TLS required; reject plaintext connections | 45 CFR 164.312(e)(1) |

### 5.3 Key Management

| Requirement | Implementation |
|-------------|---------------|
| **KMS provider** | AWS KMS (FIPS 140-2 Level 2 validated) |
| **Key hierarchy** | Master key (KMS) > Org-level data key > Field-level encryption |
| **Key rotation** | Automatic annual rotation for KMS master keys; data keys rotated on demand |
| **Key access** | IAM policies restricting key usage to application service roles only |
| **Key backup** | KMS handles key durability; cross-region key replication for DR |
| **Crypto-shredding** | On tenant deletion, destroy org-level data key (renders all encrypted data unrecoverable) |

**Source**: NIST SP 800-57 (Key Management Recommendations); 45 CFR 164.312(a)(2)(iv)

---

## 6. Access Control & RBAC

### 6.1 Role Definitions

RecoveryOS defines 9 roles organized by scope:

| Role | Scope | Description |
|------|-------|-------------|
| **Platform Admin** | Platform | RecoveryOS staff; system configuration, no customer PHI access |
| **Org Owner** | Organization | Organization owner; full org management, billing, compliance settings |
| **Org Admin** | Organization | Org-level administration; user management, property configuration |
| **Property Manager** | Property | Manages one or more properties; full access to property residents |
| **House Manager** | House | Day-to-day house operations; full access to house residents |
| **Staff** | House | Limited operational role; chores, meetings, check-ins |
| **Resident** | Self | Own records, payments, communications |
| **Family Member** | Designated | Consent-gated access to designated resident's permitted data |
| **Referral Partner** | Designated | Consent-gated access to referred resident's permitted data |

### 6.2 Data Access Matrix

**Source**: 45 CFR 164.502(b) (minimum necessary); 42 CFR 2.13 (Part 2 access restrictions)

| Data Category | Platform Admin | Org Owner | Org Admin | Property Mgr | House Mgr | Staff | Resident | Family | Referral |
|---------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **Org settings** | R | CRUD | CRUD | R | -- | -- | -- | -- | -- |
| **Property config** | -- | CRUD | CRUD | CRUD | R | -- | -- | -- | -- |
| **House config** | -- | CRUD | CRUD | CRUD | CRU | R | -- | -- | -- |
| **Resident profile (PII)** | -- | R | R | CRUD | CRUD | R | R (own) | -- | -- |
| **Resident health (PHI)** | -- | R | R | CRUD | CRUD | -- | R (own) | C* | -- |
| **SUD data (Part 2)** | -- | C* | C* | C* | C* | -- | R (own) | C* | C* |
| **Drug test results** | -- | R* | R* | CRUD* | CRUD* | R* | R (own) | -- | -- |
| **Consent records** | -- | R | R | CRUD | CRUD | R | R (own) | -- | -- |
| **Payment records** | -- | CRUD | CRUD | CRUD | CRU | R | R (own) | R* | -- |
| **Audit logs** | R (all) | -- | -- | -- | -- | -- | -- | -- | -- |
| **Audit logs (org)** | R (all) | R (summary) | -- | -- | -- | -- | -- | -- | -- |
| **Disclosures** | R (all) | R | R | R | R | -- | R (own) | -- | -- |
| **Communications** | -- | R | R | R | CRUD | CRU | CRU (own) | CR* | -- |

**Legend**: C=Create, R=Read, U=Update, D=Delete, *=Consent-gated (requires valid Part 2 consent), --=No access

### 6.3 Minimum Necessary Enforcement

| Mechanism | Implementation | Source |
|-----------|---------------|--------|
| **API field filtering** | Each role has a field whitelist per resource type; API strips unauthorized fields before response | 45 CFR 164.514(d) |
| **Query scoping** | All queries automatically scoped to user's org/property/house; enforced at middleware level | 45 CFR 164.502(b) |
| **Part 2 consent check** | Middleware verifies active consent before returning any Part 2 field; no consent = field omitted | 42 CFR 2.13 |
| **Purpose limitation** | API calls include `purpose` parameter for Part 2 data access; logged in audit trail | 42 CFR 2.31(a)(4) |
| **Aggregate-only access** | Reports for higher-level roles use aggregated/de-identified data where individual records unnecessary | 45 CFR 164.514(d) |

### 6.4 Multi-Tenancy Isolation

| Layer | Isolation Mechanism |
|-------|-------------------|
| **Database** | Row-level security (RLS) with `org_id` on every table; enforced at PostgreSQL level |
| **API** | Middleware extracts `org_id` from authenticated session; all queries filtered |
| **File storage** | Per-org S3 prefix with IAM policy isolation |
| **Encryption** | Per-org encryption keys in KMS |
| **Audit logs** | `org_id` on every audit entry; query-filtered for org-scoped access |

**Source**: 45 CFR 164.312(a)(1) (access control); multi-tenancy best practice for BA handling multiple covered entities.

---

## 7. BAA & QSOA Requirements

### 7.1 RecoveryOS as Business Associate

RecoveryOS executes BAAs with its covered entity customers (sober living facilities).

**Source**: 45 CFR 164.502(e), 164.504(e)

#### RecoveryOS BAA Template Must Include

| Element | Citation | Content |
|---------|----------|---------|
| Permitted uses/disclosures | 164.504(e)(2)(i) | Platform operation, support, analytics (de-identified only) |
| Prohibited uses/disclosures | 164.504(e)(2)(ii) | No use beyond contract scope; no sale of PHI |
| Safeguards | 164.504(e)(2)(ii)(A) | Reference to this compliance document; specific controls |
| Reporting obligations | 164.504(e)(2)(ii)(B) | 24-hour breach notification to covered entity; incident reports |
| Subcontractor requirements | 164.504(e)(2)(ii)(C) | All subprocessors bound by equivalent terms |
| Individual access rights | 164.504(e)(2)(ii)(D) | Data export capability; 30-day SLA |
| Amendment support | 164.504(e)(2)(ii)(E) | Amendment workflow available |
| Accounting of disclosures | 164.504(e)(2)(ii)(F) | Disclosure log available |
| HHS compliance review | 164.504(e)(2)(ii)(G) | Cooperation with HHS investigations |
| Termination provisions | 164.504(e)(2)(ii)(H) | Data return/destruction within 30 days; certification of destruction |
| **Part 2 addendum** | 42 CFR 2.11 (QSOA) | Part 2 obligations, redisclosure prohibition, resist legal proceedings |

### 7.2 Subprocessor BAA Requirements

Every third-party service handling PHI or Part 2 data MUST have:

1. Executed HIPAA BAA with RecoveryOS
2. Part 2/QSOA provisions (if handling SUD data)
3. Breach notification obligations (24-hour notification to RecoveryOS)
4. Encryption attestation (at rest and in transit)
5. SOC 2 Type II or equivalent certification

#### Subprocessor Assessment

| Service | Category | BAA Available | Part 2 Provisions | SOC 2 | Recommendation |
|---------|----------|:---:|:---:|:---:|----------------|
| **Neon** | Database (PostgreSQL) | Yes | Addendum needed | Yes | Primary DB -- execute BAA with Part 2 addendum |
| **Supabase** | Database (alternative) | Yes | Addendum needed | Yes | Alternative -- BAA available |
| **AWS (RDS, S3, KMS)** | Infrastructure | Yes | Addendum needed | Yes | Infrastructure backbone |
| **Clerk** | Authentication | Yes | Addendum needed | Yes | Primary auth -- HIPAA plan required |
| **Auth0** | Authentication (alt) | Yes | Addendum needed | Yes | Alternative -- HIPAA BAA on Enterprise plan |
| **Stripe** | Payments | Yes | N/A (no SUD data) | Yes | Payments -- standard BAA sufficient |
| **DocuSign** | E-Signature | Yes | Addendum needed | Yes | Document signing -- HIPAA BAA available, provides audit trail + tamper-evident seal |
| **Vercel** | Hosting | Yes (Enterprise) | Addendum needed | Yes | Hosting -- HIPAA on Enterprise plan |
| **SendGrid** | Email | Yes | Addendum needed | Yes | Transactional email -- BAA available |
| **Postmark** | Email (alternative) | Limited | Review needed | Partial | Alternative -- verify BAA scope |
| **Cloudflare R2** | Object storage | Yes | Addendum needed | Yes | File storage alternative to S3 |

**Action Required**: Before launch, execute BAAs with ALL selected subprocessors. Maintain BAA tracking spreadsheet with execution dates, renewal dates, and responsible contacts.

### 7.3 BAA Tracking System

RecoveryOS must track its own BAA chain:

| Record | Fields |
|--------|--------|
| **Upstream BAAs** (with customers) | Customer name, execution date, version, signed copy, renewal date |
| **Downstream BAAs** (with subprocessors) | Vendor name, service description, execution date, version, Part 2 provisions (Y/N), SOC 2 status, renewal date, breach contact |

Compliance officer dashboard displays BAA status with expiration alerts.

---

## 8. Incident Response & Breach Notification

### 8.1 Breach Definition

**Source**: 45 CFR 164.402; 42 CFR 2.16 (effective February 16, 2026)

A breach is the acquisition, access, use, or disclosure of PHI/Part 2 data in violation of applicable rules that compromises security or privacy.

**Exceptions** (45 CFR 164.402(1)):
1. Unintentional acquisition by workforce member acting in good faith within scope
2. Inadvertent disclosure between authorized persons within the same entity
3. Good faith belief that recipient could not reasonably retain the information

### 8.2 Breach Risk Assessment (45 CFR 164.402(2))

Upon discovering a potential breach, RecoveryOS must evaluate:

| Factor | Assessment |
|--------|-----------|
| Nature and extent of PHI involved | Types of identifiers; Part 2 data involved? |
| Unauthorized person who used/received PHI | Internal vs. external; capabilities of recipient |
| Whether PHI was actually acquired or viewed | Evidence of access vs. potential access |
| Extent to which risk has been mitigated | Actions taken to retrieve data, contain damage |

If assessment does not demonstrate LOW probability of compromise, treat as a breach.

### 8.3 Notification Timeline

| Notification | Recipient | Timeline | Source |
|-------------|-----------|----------|--------|
| RecoveryOS internal | Security team | Immediately upon detection | Internal policy |
| RecoveryOS to covered entity (customer) | Customer compliance contact | Within 24 hours of confirmation | BAA obligation |
| Covered entity to individuals | Affected individuals | Without unreasonable delay, max 60 days | 45 CFR 164.404 |
| Covered entity to HHS | HHS | Concurrent with individual notice (500+) or annual log (<500) | 45 CFR 164.408 |
| Covered entity to media | Prominent media outlets | Concurrent (if 500+ in a state/jurisdiction) | 45 CFR 164.406 |

### 8.4 Notification Content (45 CFR 164.404(c))

Individual breach notifications must include:
1. Brief description of breach, including date(s)
2. Types of PHI involved (names, SSNs, diagnoses, etc.)
3. Steps individuals should take to protect themselves
4. What the entity is doing to investigate, mitigate, and prevent recurrence
5. Contact information for questions (toll-free number, email, postal address)

### 8.5 Incident Response Procedures

RecoveryOS implements a 6-phase incident response plan:

| Phase | Actions | Responsible |
|-------|---------|-------------|
| **1. Detection** | Automated monitoring (anomalous access patterns, bulk exports, failed auth spikes); user reports; audit log review | Automated + Security Team |
| **2. Containment** | Isolate affected systems; revoke compromised credentials; block suspicious IPs; preserve evidence | Security Team |
| **3. Assessment** | Determine scope (records affected, data types, Part 2 data involved?); perform 4-factor risk assessment | Security Team + Compliance |
| **4. Notification** | Execute notification timeline (Section 8.3); prepare notification content; coordinate with affected customers | Compliance + Legal |
| **5. Remediation** | Fix root cause; patch vulnerabilities; update access controls; implement additional monitoring | Engineering + Security |
| **6. Post-Incident** | Document lessons learned; update risk assessment; revise procedures; retrain staff | Compliance |

### 8.6 Automated Detection Capabilities

RecoveryOS must implement these automated breach detection mechanisms:

| Detection | Trigger | Response |
|-----------|---------|----------|
| **Bulk data access** | Single user views 50+ resident records in 1 hour | Alert compliance officer; log escalation |
| **Off-hours access** | Part 2 data accessed outside business hours (configurable) | Flag for review; require MFA re-verification |
| **Geographic anomaly** | Login from unusual location | Step-up authentication; notify user |
| **Failed auth spike** | 10+ failed logins for single account in 5 minutes | Temporary account lock; alert admin |
| **Privilege escalation** | User role changed to higher level | Require admin approval; audit logged |
| **Export spike** | Multiple exports in short timeframe | Alert compliance officer |
| **Break-glass usage** | Emergency access activated | Immediate compliance officer notification |

---

## 9. Pre-Launch Compliance Checklist

Everything that MUST be completed before RecoveryOS handles real patient data.

### 9.1 Technical Controls

| # | Requirement | Citation | Status |
|---|-------------|----------|--------|
| T1 | AES-256 encryption at rest for all databases | 164.312(a)(2)(iv) | Pending |
| T2 | Field-level encryption for Part 2 data | 42 CFR Part 2 best practice | Pending |
| T3 | TLS 1.2+ for all data in transit | 164.312(e)(1) | Pending |
| T4 | Unique user IDs (UUID) | 164.312(a)(2)(i) | Pending |
| T5 | MFA for all users | 164.312(d) | Pending |
| T6 | 15-minute auto-logoff (configurable) | 164.312(a)(2)(iii) | Pending |
| T7 | RBAC with 9 roles implemented | 164.312(a)(1), 164.502(b) | Pending |
| T8 | Row-level security for multi-tenancy | 164.312(a)(1) | Pending |
| T9 | Immutable audit logging operational | 164.312(b), 2.25 | Pending |
| T10 | Audit log hash chain integrity verification | 164.312(c)(1) | Pending |
| T11 | Consent management system operational | 2.31 | Pending |
| T12 | Redisclosure notice auto-attachment | 2.32 | Pending |
| T13 | Accounting of disclosures tracking | 2.24 | Pending |
| T14 | Break-glass emergency access procedure | 164.312(a)(2)(ii) | Pending |
| T15 | Automated breach detection monitoring | 164.308(a)(1)(ii)(D) | Pending |
| T16 | Data backup and recovery tested | 164.308(a)(7) | Pending |
| T17 | Crypto-shredding for tenant deletion | Data disposal best practice | Pending |

### 9.2 Legal & Administrative

| # | Requirement | Citation | Status |
|---|-------------|----------|--------|
| A1 | BAA template drafted and reviewed by counsel | 164.504(e) | Pending |
| A2 | BAAs executed with ALL subprocessors | 164.308(b)(1) | Pending |
| A3 | Part 2/QSOA addendum for subprocessors handling SUD data | 2.11, 2.12(c)(4) | Pending |
| A4 | Security Risk Assessment completed | 164.308(a)(1)(ii)(A) | Pending |
| A5 | Security policies documented | 164.308(a)(1) | Pending |
| A6 | Incident response plan documented | 164.308(a)(6) | Pending |
| A7 | Breach notification procedures documented | 164.400-414 | Pending |
| A8 | Notice of Privacy Practices template | 164.520 | Pending |
| A9 | Part 2 patient notice template | 2.22 | Pending |
| A10 | Workforce sanction policy | 164.308(a)(1)(ii)(C) | Pending |
| A11 | Designated security official | 164.308(a)(2) | Pending |

### 9.3 Operational Readiness

| # | Requirement | Status |
|---|-------------|--------|
| O1 | Compliance officer role defined and staffed | Pending |
| O2 | Incident response team identified | Pending |
| O3 | Breach notification contacts established (HHS, legal counsel) | Pending |
| O4 | Staff security training materials created | Pending |
| O5 | Annual risk assessment schedule established | Pending |
| O6 | SOC 2 Type II audit engagement planned (Year 1) | Pending |
| O7 | Penetration testing completed | Pending |
| O8 | Disaster recovery drill completed | Pending |

---

## 10. February 16, 2026 Deadline Checklist

**5 DAYS REMAINING.** The following provisions take effect on February 16, 2026 per the 2024 Final Rule (89 FR 12472, 12562-12563).

### What Changes on February 16, 2026

| Provision | Citation | What It Means | RecoveryOS Must Have |
|-----------|----------|---------------|---------------------|
| **Accounting of Disclosures** | 42 CFR 2.24 | Patients can request a list of who their Part 2 data was disclosed to, when, and why | Disclosure tracking system; patient request workflow; 60-day response SLA; 6-year retention |
| **Modified Patient Notice** | 42 CFR 2.22 | Updated notice reflecting HIPAA alignment, accounting rights, breach notification rights | Updated patient notice template; delivery tracking; e-signature acknowledgment |
| **HIPAA Breach Notification** | 42 CFR 2.16 + 45 CFR 164.400 | Part 2 records now subject to HIPAA breach notification requirements | Breach detection for Part 2 data; notification workflow; risk assessment procedure; 60-day timeline |

### Implementation Priority for Feb 16 Deadline

Since RecoveryOS is pre-launch, these features must be in the v1.0 release. They are **P0** requirements -- the product cannot launch without them.

| Priority | Feature | Depends On | Build Complexity |
|----------|---------|------------|-----------------|
| **P0-A** | Disclosure tracking (log every disclosure with required fields) | Audit logging infrastructure (Section 4) | Medium -- data model + middleware |
| **P0-B** | Patient accounting request workflow | Disclosure tracking | Medium -- UI + report generation |
| **P0-C** | Updated Part 2 patient notice | Content drafting (legal review needed) | Low -- template + acknowledgment flow |
| **P0-D** | Breach detection for Part 2 data | Audit logging + Part 2 data tagging | High -- monitoring rules + alerting |
| **P0-E** | Breach notification workflow | Breach detection | Medium -- workflow + notification templates |

### What This Means for Build Order

The compliance infrastructure must be built FIRST in Phase 4, not retrofitted:

1. **Sprint 1**: Multi-tenant data model with `sensitivity_level` tagging, audit logging infrastructure, encryption setup
2. **Sprint 2**: RBAC, consent management, Part 2 data segmentation
3. **Sprint 3**: Disclosure tracking, redisclosure controls, breach detection
4. **Sprint 4**: Patient-facing flows (accounting requests, notices, consent management UI)

---

## Appendix A: Regulatory Reference Quick-Lookup

| Shorthand | Full Citation | Topic |
|-----------|--------------|-------|
| HIPAA-AC | 45 CFR 164.312(a)(1) | Access control |
| HIPAA-AU | 45 CFR 164.312(b) | Audit controls |
| HIPAA-IN | 45 CFR 164.312(c)(1) | Integrity |
| HIPAA-TX | 45 CFR 164.312(e)(1) | Transmission security |
| HIPAA-ID | 45 CFR 164.312(d) | Person/entity authentication |
| HIPAA-BR | 45 CFR 164.400-414 | Breach notification |
| HIPAA-MN | 45 CFR 164.502(b), 164.514(d) | Minimum necessary |
| HIPAA-BA | 45 CFR 164.504(e) | Business associate agreements |
| P2-CON | 42 CFR 2.31 | Consent requirements |
| P2-RED | 42 CFR 2.32 | Redisclosure prohibition |
| P2-AOD | 42 CFR 2.24 | Accounting of disclosures |
| P2-AUD | 42 CFR 2.25 | Audit requirements |
| P2-NOT | 42 CFR 2.22 | Patient notice |
| P2-QSO | 42 CFR 2.11, 2.12(c)(4) | QSOA requirements |
| P2-PEN | 42 USC 290dd-2(f) | Criminal penalties |

## Appendix B: Part 2 Data Identification Guide

For the engineering team -- how to determine if a data field is Part 2 protected:

**A data field is Part 2 protected if it could, alone or in combination with other available information, identify a person as having or having had a substance use disorder.**

| Test | Example | Part 2? |
|------|---------|---------|
| Does the field directly reference SUD? | Drug test result: positive for opioids | YES |
| Does the field reference SUD treatment? | Referral to XYZ Treatment Center | YES |
| Does the field, combined with facility context, reveal SUD? | Resident at "New Hope Sober Living" | YES |
| Is the field purely administrative without SUD context? | Room assignment "Bed 3" (no facility name) | NO |
| Could the field be in any healthcare setting? | Emergency contact: Jane Doe | NO (unless combined with facility identity) |

**When in doubt, treat it as Part 2 protected.** Over-protection has no regulatory penalty; under-protection carries criminal liability (42 USC 290dd-2(f)).

---

*Document prepared by compliance-expert agent for RecoveryOS.*
*All regulatory citations verified against authoritative federal sources.*
*This document serves as the compliance blueprint for engineering implementation in Phase 4.*
