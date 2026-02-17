# RecoveryOS - Build Roadmap

> **Status**: Final
> **Owner**: product-lead
> **Last Updated**: 2026-02-12
> **Depends On**: [01_REQUIREMENTS.md](01_REQUIREMENTS.md) (107 features), [04_COMPLIANCE.md](04_COMPLIANCE.md) (compliance build order), [00_NORTH_STAR.md](00_NORTH_STAR.md) (priorities)

---

## Table of Contents

1. [Build Philosophy](#1-build-philosophy)
2. [Release Strategy](#2-release-strategy)
3. [Phase 4 Sprint Plan](#3-phase-4-sprint-plan)
4. [Agent Team Structure](#4-agent-team-structure)
5. [Dependency Map](#5-dependency-map)
6. [Milestone Definitions](#6-milestone-definitions)
7. [Risk Register](#7-risk-register)

---

## 1. Build Philosophy

### Compliance First, Then Features

Source: [04_COMPLIANCE.md](04_COMPLIANCE.md), Section 10.

The compliance infrastructure is not a feature module -- it is the foundation that every other module depends on. Sprints 1-4 are dedicated entirely to compliance infrastructure: multi-tenant data model, audit logging, encryption, RBAC, consent management, disclosure tracking, and breach detection. No user-facing operational feature touches resident data until the compliance foundation is verified.

### Build Order

1. **Compliance infrastructure** (Sprints 1-4): Multi-tenancy, audit logging, encryption, RBAC, consent management, disclosure tracking, breach detection, patient-facing compliance flows. Source: 04_COMPLIANCE.md Section 10.
2. **Core operations** (Sprints 5-8): Organization setup, occupancy management, admissions with intake. The features operators need to onboard their first house.
3. **Differentiators** (Sprints 9-12): Billing and payments engine -- double-entry ledger, Stripe Connect, proration, multi-payer, dunning. This is what no competitor has.
4. **Daily use** (Sprints 13-18): House operations, documents, and messaging. The features house managers use every day.
5. **Visibility** (Sprints 19-20): Reporting and dashboards. Requires data from all prior modules.
6. **Scale** (Sprint 21+): AI features, advanced analytics, NARR partnerships, SSO.

### Feature Priority Counts

From [01_REQUIREMENTS.md](01_REQUIREMENTS.md):

| Priority | Count | Ships In |
|----------|-------|----------|
| P0 | 68 features | v1.0 (Sprints 1-20) |
| P1 | 27 features | v1.1-v1.3 (Sprints 21-24) |
| P2 | 12 features | v2.0+ (post-launch) |

### Sprint Cadence

All sprints are **2 weeks**. 20 sprints (40 weeks) to v1.0 launch.

---

## 2. Release Strategy

### v1.0 - Launch (End of Sprint 20)

**Theme**: Complete, compliant recovery housing platform.

All P0 features across all 10 modules. An operator can:
- Set up their organization, properties, and houses
- Admit residents through a CRM pipeline with Part 2 consent
- Assign beds and track occupancy
- Collect payments via Stripe with a double-entry ledger
- Manage daily operations (chores, meetings, passes, curfew, drug testing)
- Store and e-sign documents with retention policies
- Message residents and families (consent-gated)
- View dashboards for occupancy, finance, operations, and compliance
- Manage consents, view disclosures, and run compliance reports
- All with 9-role RBAC, immutable audit logging, field-level encryption, and MFA

### v1.1 (Sprints 21-22)

**Theme**: Enhanced intake and operations.

P1 features: conditional form builder, clinical assessments (BARC-10, PHQ-9, GAD-7), drug test scheduling, eligibility screening, automated follow-ups, waitlist with priority scoring, maintenance requests, document version control, document sharing with Part 2 consent check.

### v1.2 (Sprints 23-24)

**Theme**: Grant readiness and enterprise.

P1 features: GPRA-compatible grant reports, BAA tracking dashboard, data access requests, amendment requests, privacy practices notice, multi-org rollup dashboard, outcomes tracking, SMS gateway, message search, file sharing in messages, split billing, payment plans, external payment recording, accounting export, multi-property comparisons, bank reconciliation, scheduled reports, org-wide announcements.

### v2.0+ (Post-Launch)

P2 features: automated bed assignment, background check integration, mood/wellness tracking, alumni tracking, vehicle tracking, NARR compliance reports, custom report builder, org branding, read receipts, API key management, SSO.

---

## 3. Phase 4 Sprint Plan

Each sprint is 2 weeks. 5 teammates work in parallel (see Section 4).

---

### Sprint 1: Data Model + Audit Logging + Encryption (Weeks 1-2)

**Goal**: Multi-tenant database, sensitivity tagging, immutable audit log, encryption at rest and in transit. No UI.

Source: [04_COMPLIANCE.md](04_COMPLIANCE.md) Section 10, Sprint 1.

| Deliverable | Owner | Acceptance Criteria |
|-------------|-------|---------------------|
| PostgreSQL schema with `org_id` on all tables | Backend | Every table has `org_id` FK; no table exists without it |
| Row-level security (RLS) policies | Backend | Query as Org A returns zero rows from Org B; tested with seed data |
| Sensitivity level enum on data fields (`part2`, `phi`, `pii`, `operational`) | Backend | Every column holding resident data tagged; middleware reads tags |
| Immutable audit log table | Backend | Append-only (REVOKE UPDATE/DELETE at DB level); hash chain linking each entry to previous |
| Audit log async write pipeline | Backend | Audit writes via message queue; < 5ms added latency; buffered if queue unavailable |
| AES-256 encryption at rest (database-level) | Integrations | Verified via cloud provider (Neon/Supabase encryption enabled) |
| Field-level encryption for Part 2 fields (AES-256-GCM) | Backend | Drug test results, SUD diagnosis codes, treatment referrals, MAT records, clinical assessments, progress notes encrypted at application layer; per-org keys via AWS KMS |
| TLS 1.2+ enforcement | Integrations | HTTP requests redirect to HTTPS; HSTS header set; no plaintext connections to DB |
| Next.js project scaffold (App Router + tRPC) | Frontend | Project builds, routes work, tRPC client/server connected |
| Auth provider integration (Clerk or Auth0) | Integrations | User registration, login, MFA challenge, password policy (12+ chars) working |

**Compliance checkpoint**: Audit log writes verified. RLS prevents cross-org access. Encryption at rest and in transit confirmed. MFA working.

---

### Sprint 2: RBAC + Consent Management + Part 2 Segmentation (Weeks 3-4)

**Goal**: 9-role access control, consent engine with all 42 CFR 2.31 elements, Part 2 data segmentation.

Source: [04_COMPLIANCE.md](04_COMPLIANCE.md) Sections 3.1, 6, 10 Sprint 2.

| Deliverable | Owner | Acceptance Criteria |
|-------------|-------|---------------------|
| 9-role RBAC middleware | Backend | Each role tested: permitted actions succeed, restricted actions return 403. Field-level filtering per role per resource type |
| API field filtering per role | Backend | House Monitor cannot see clinical fields; Family sees only consented fields; tested per RBAC matrix in 04_COMPLIANCE.md Section 6.2 |
| Consent record data model (all 2.31 fields) | Backend | `patient_name`, `disclosing_entity`, `recipient`, `purpose`, `information_scope`, `expiration_date`, `patient_signature`, `signature_date`, `revocation_notice` -- all required, validated |
| Consent CRUD API | Backend | Create, read, update (revoke only), list consents per resident. No delete. |
| Consent verification middleware | Backend | Every API endpoint returning Part 2 data checks active consent; no consent = fields omitted; `disclosure_blocked_no_consent` audit entry |
| Part 2 data segmentation | Backend | Queries can return non-Part-2 fields while omitting Part-2 fields for unauthorized users |
| Consent creation wizard UI | Frontend | Step-by-step form with all 9 required fields; validation prevents save with missing fields |
| Consent dashboard UI | Frontend | Per-resident view: active, expired, revoked consents with dates |
| Consent revocation flow | Backend + Frontend | Resident or staff revokes; status immediately set to `revoked`; future disclosures blocked; staff notified; audit logged |
| 15-minute session timeout | Backend | Configurable per org (5-30 min); server-side session invalidation; re-auth required |

**Compliance checkpoint**: Consent blocks unauthorized Part 2 access. RBAC enforced at API and UI level. Session timeout working.

---

### Sprint 3: Disclosure Tracking + Redisclosure Controls + Breach Detection (Weeks 5-6)

**Goal**: Accounting of disclosures (42 CFR 2.24), redisclosure notice enforcement (42 CFR 2.32), automated breach detection.

Source: [04_COMPLIANCE.md](04_COMPLIANCE.md) Sections 3.2, 3.3, 8.6, 10 Sprint 3.

| Deliverable | Owner | Acceptance Criteria |
|-------------|-------|---------------------|
| Disclosure log data model | Backend | Fields: `patient_id`, `disclosure_date`, `recipient_name`, `recipient_address`, `description`, `purpose`, `consent_id`, `disclosed_by`, `disclosure_method`, `data_categories` |
| Disclosure tracking middleware | Backend | Every API response, export, or share of Part 2 data creates disclosure log entry automatically |
| Redisclosure notice on exports | Backend | All exports/prints/shares containing Part 2 data include verbatim 42 CFR 2.32 notice as header |
| Redisclosure notice in API responses | Backend | `x-redisclosure-notice` header on Part 2 data responses; frontend renders notice banner |
| Redisclosure notice on printed records | Frontend | Notice printed on every page of Part 2 records |
| Automated breach detection: bulk access | Backend | Alert when single user views 50+ resident records in 1 hour |
| Automated breach detection: off-hours | Backend | Flag Part 2 access outside business hours (configurable); require MFA re-verification |
| Automated breach detection: failed auth spike | Backend | 10+ failed logins in 5 minutes triggers temporary account lock + admin alert |
| Automated breach detection: export spike | Backend | Multiple exports in short timeframe alerts compliance officer |
| Audit log hash chain integrity verifier | Backend | Nightly job verifies hash chain; alerts on any break |

**Compliance checkpoint**: Disclosure log captures every Part 2 data share. Redisclosure notice appears on all Part 2 outputs. Breach detection rules active.

---

### Sprint 4: Patient-Facing Compliance Flows (Weeks 7-8)

**Goal**: Patient notice, accounting request workflow, breach notification workflow, break-glass access, compliance officer dashboard.

Source: [04_COMPLIANCE.md](04_COMPLIANCE.md) Sections 3.3, 3.4, 8, 10 Sprint 4.

| Deliverable | Owner | Acceptance Criteria |
|-------------|-------|---------------------|
| Patient notice template (42 CFR 2.22) | Backend + Frontend | Digital notice with: Part 2 protections summary, right to revoke, redisclosure notice text, right to accounting, right to file complaint, breach notification rights |
| Patient notice delivery + e-signature | Frontend | Notice presented during intake; e-signature captured; delivery logged in audit trail |
| Patient notice version tracking | Backend | When notice text changes, system requires new acknowledgment from active residents |
| Accounting of disclosures request workflow | Backend + Frontend | Resident requests accounting; system generates report (date, recipient, description, purpose) for up to 6 years; delivered within 60 days; first request per 12-month period free |
| Breach incident workflow | Backend + Frontend | Create incident > 4-factor risk assessment > containment > notification > remediation > post-incident; 60-day notification deadline tracked |
| Break-glass emergency access | Backend + Frontend | Reason selection (medical emergency, legal, patient safety) + mandatory justification text + MFA re-verification; compliance officer notified immediately; elevated logging for all actions |
| Compliance officer dashboard | Frontend | Org-level overview: active consents, expiring consents (30-day), disclosure count, audit log summary by category, open breach incidents, BAA status |
| Audit log viewer | Frontend | Searchable/filterable by date, user, event type, resource type, sensitivity level; compliance officer role only |
| User invitation + deactivation | Backend + Frontend | Invite with role assignment; deactivate with immediate session invalidation; audit history preserved |

**Compliance checkpoint**: Full compliance infrastructure verified. System can handle real PHI. All 04_COMPLIANCE.md Section 9 technical controls (T1-T17) verified.

**MILESTONE M1: Compliance Foundation** -- see Section 6.

---

### Sprint 5: Organization + Property Management (Weeks 9-10)

**Goal**: Org, property, house, bed hierarchy. First operator can set up their account.

| ID | Feature | Owner | Acceptance Criteria |
|----|---------|-------|---------------------|
| ORG-01 | Organization setup | Backend + Frontend | Create org with name, entity type, address, contact. Audit logged. |
| ORG-03 | Compliance configuration | Backend + Frontend | Default consent templates, retention policies per doc type (6-year min for Part 2), BAA tracking |
| ORG-04 | Subscription management | Backend + Integrations | Stripe billing for RecoveryOS subscription; plan selection, payment method |
| ORG-05 | Property CRUD | Backend + Frontend | Create/edit/archive properties; address, capacity (computed), status |
| ORG-06 | House CRUD | Backend + Frontend | Create/edit/archive houses; name, property FK, bed count, gender, NARR level; beds individually addressable |

---

### Sprint 6: Occupancy + Bed Management (Weeks 11-12)

**Goal**: Bed tracking, occupancy dashboard, transfers, move-out processing.

| ID | Feature | Owner | Acceptance Criteria |
|----|---------|-------|---------------------|
| OCC-01 | Bed-level tracking | Backend + Frontend | Bed statuses: available, occupied, reserved, maintenance, blocked. Status changes audit logged. |
| OCC-02 | Occupancy dashboard | Frontend | Visual bed grid, color-coded by status, loads in < 2s for 500 beds, filterable by property/house |
| OCC-03 | Bed assignment | Backend + Frontend | Assign resident to specific bed; record move-in date |
| OCC-04 | Bed transfer | Backend + Frontend | Transfer between beds/houses/properties; records source, destination, date, reason, staff; both managers notified |
| OCC-06 | Capacity reporting | Backend + Frontend | Occupancy rate per house/property/org; trend over time |
| OCC-08 | Move-out processing | Backend + Frontend | Record discharge date + reason; triggers proration calc, consent review, retention scheduling, bed release |

---

### Sprint 7: Admissions CRM + Intake Forms (Weeks 13-14)

**Goal**: Lead pipeline, intake forms, document collection, referral tracking.

| ID | Feature | Owner | Acceptance Criteria |
|----|---------|-------|---------------------|
| ADM-01 | Lead tracking / CRM pipeline | Frontend | Kanban board: inquiry > screening > interview > approved > admitted > declined; drag-and-drop; conversion rate tracked |
| ADM-02 | Digital intake forms | Backend + Frontend | Form builder: text, number, date, dropdown, checkbox, radio, file upload, signature fields; versionable |
| ADM-06 | Document collection at intake | Frontend | Upload required docs (ID, insurance, court orders); checklist shows completion |
| ADM-11 | Referral source tracking | Backend | Configurable referral sources per org; admission volume by source in reports |

---

### Sprint 8: Intake Completion + E-Sign + Consent at Intake (Weeks 15-16)

**Goal**: Complete intake flow end-to-end. E-signature. Part 2 consent required at admission.

| ID | Feature | Owner | Acceptance Criteria |
|----|---------|-------|---------------------|
| ADM-07 | E-signature on intake | Backend + Frontend | Signer identity (authenticated user), timestamp, IP, document hash. ESIGN Act / UETA compliant. |
| ADM-08 | Part 2 consent at intake | Frontend | Intake wizard presents Part 2 consent forms; all 9 required elements; intake cannot complete without at least one active consent |
| DOC-08 | Part 2 consent form template | Backend + Frontend | Pre-populates patient name + disclosing entity; staff completes recipient, purpose, scope, expiration; resident signs; all fields validated against 42 CFR 2.31 |
| CMP-08 | Patient notice at intake | Frontend | Part 2 notice + NPP presented; e-signature acknowledgment; delivery logged |
| DOC-11 | Bulk document signing | Frontend | Sign multiple documents in sequence (house rules, consent, intake forms, NPP) |
| OPS-16 | House rules | Backend + Frontend | Digital house rules per house; resident acknowledgment with e-signature |

**MILESTONE M2: Core Operations** -- see Section 6.

---

### Sprint 9: Payments Foundation (Weeks 17-18)

**Goal**: Stripe Connect, rate configuration, double-entry ledger, invoicing.

| ID | Feature | Owner | Acceptance Criteria |
|----|---------|-------|---------------------|
| PAY-01 | Stripe Connect onboarding | Backend + Integrations | Express onboarding flow; org owner completes identity verification; platform fee configurable |
| PAY-02 | Rate configuration | Backend + Frontend | Per-house or per-bed rates; weekly/biweekly/monthly cycles; custom rates per resident |
| PAY-03 | Automated invoicing | Backend | Invoices generated per billing cycle; sent to resident and payers |
| PAY-15 | Double-entry ledger | Backend | Every money movement creates debit + credit entries; ledger always balances; no direct balance field |

---

### Sprint 10: Payment Collection + Proration (Weeks 19-20)

**Goal**: Accept payments, process refunds, handle mid-cycle changes.

| ID | Feature | Owner | Acceptance Criteria |
|----|---------|-------|---------------------|
| PAY-04 | Card payments via Stripe | Backend + Frontend | Credit/debit accepted; Stripe payment intent flow; receipt generated |
| PAY-05 | ACH payments via Stripe | Backend | Bank transfer accepted; ledger entry created |
| PAY-06 | Cash/check recording | Backend + Frontend | Manual entry with receipt number; ledger entry created |
| PAY-11 | Automated proration | Backend | `daily_rate = monthly_rate / days_in_month`; applies to move-in and move-out; visible on invoice |
| PAY-21 | Refund processing | Backend | Full or partial refunds via Stripe; ledger entries auto-created |

---

### Sprint 11: Payment Automation + Deposits (Weeks 21-22)

**Goal**: Late fees, reminders, deposits, resident payment portal.

| ID | Feature | Owner | Acceptance Criteria |
|----|---------|-------|---------------------|
| PAY-12 | Late fee automation | Backend | Configurable flat or percentage fee; applied after grace period; ledger entry |
| PAY-14 | Deposit management | Backend + Frontend | Collect, hold, refund deposits; deposit ledger; deductions at move-out |
| PAY-17 | Payment reminders | Backend | Automated: 3 days before, 1 day before, day-of due date; configurable per org |
| PAY-18 | Resident payment portal | Mobile (PWA) | View balance, payment history, upcoming invoices; pay via card or ACH |

---

### Sprint 12: Multi-Payer + Dunning + Financial Reports (Weeks 23-24)

**Goal**: Multi-payer support, dunning escalation, family portal, financial reporting.

| ID | Feature | Owner | Acceptance Criteria |
|----|---------|-------|---------------------|
| PAY-08 | Multi-payer support | Backend + Frontend | Multiple payers per resident; name, relationship, contact, payment method, responsibility % or fixed amount |
| PAY-13 | Dunning escalation | Backend | Configurable ladder: reminder (day X) > warning (day Y) > suspension (day Z) > discharge review (day W); each step creates audit log + notification |
| PAY-19 | Family payment portal | Mobile (PWA) | Family/sponsor pays designated resident's invoices; consent-gated access |
| PAY-20 | Financial reports | Backend + Frontend | Revenue, collections, outstanding balances, aging (0-30, 31-60, 61-90, 90+), per-house P&L |

**MILESTONE M3: Payments** -- see Section 6.

---

### Sprint 13: House Operations - Daily Management (Weeks 25-26)

**Goal**: Chores, meetings, tasks, check-ins.

| ID | Feature | Owner | Acceptance Criteria |
|----|---------|-------|---------------------|
| OPS-01 | Chore management | Backend + Frontend | Define chores per house; assign to residents; verify completion with timestamp |
| OPS-02 | Chore rotation | Backend | Auto-rotate weekly/biweekly; fairness tracking |
| OPS-03 | Meeting attendance | Backend + Frontend | Log attendance by meeting type (house, AA/NA, therapy); configurable types |
| OPS-04 | Meeting requirements | Backend + Frontend | Per-house minimums; per-resident compliance dashboard (on track / behind / non-compliant) |
| OPS-10 | Task assignments | Backend + Frontend | Assign tasks to residents with due date and status |
| OPS-12 | Daily check-in log | Backend + Frontend | House monitor marks present/absent at check-in time |

---

### Sprint 14: House Operations - Passes, Curfew, Drug Testing, Incidents (Weeks 27-28)

**Goal**: Pass management, curfew, drug testing with Part 2 compliance, incident reports.

| ID | Feature | Owner | Acceptance Criteria |
|----|---------|-------|---------------------|
| OPS-05 | Pass management | Backend + Frontend | Request/approve overnight passes; track departure/return times; curfew exemptions |
| OPS-06 | Curfew management | Backend + Frontend | Per-house curfew times (weekday/weekend); check-in logging; violation auto-creates incident flag |
| OPS-07 | Drug testing | Backend + Frontend | Record date, type, result, tester. Results are Part 2 protected (field-level encrypted). Positive result triggers configurable workflow. Access consent-gated. |
| OPS-09 | Incident reports | Backend + Frontend | Structured form: date, parties, description, severity (low/medium/high/critical), action, follow-up. High/critical auto-notify property manager. |

---

### Sprint 15: Documents - Storage + Templates + E-Sign (Weeks 29-30)

**Goal**: Document management with storage, templates, categorization, e-signature.

| ID | Feature | Owner | Acceptance Criteria |
|----|---------|-------|---------------------|
| DOC-01 | Document storage | Backend + Frontend | Upload, organize, retrieve per resident/house/org; encrypted at rest |
| DOC-02 | Document templates | Backend + Frontend | Configurable templates: intake forms, house rules, consent forms; reusable |
| DOC-03 | E-signature (standalone) | Backend + Frontend | E-sign any document outside of intake flow; identity, timestamp, IP, hash |
| DOC-10 | Document categorization | Backend + Frontend | Categories: intake, consent, clinical, financial, operational, legal |

---

### Sprint 16: Documents - Retention + Alerts (Weeks 31-32)

**Goal**: Retention policies, enforcement, expiration alerts.

| ID | Feature | Owner | Acceptance Criteria |
|----|---------|-------|---------------------|
| DOC-05 | Retention policies | Backend + Frontend | Per-document-type retention periods; Part 2 consent = 6 years, medical = 6 years, financial = 7 years, operational = 3 years; cannot set below regulatory minimums |
| DOC-06 | Retention enforcement | Backend | Pre-destruction review > compliance officer approves > crypto-shred > destruction audit logged with metadata |
| DOC-13 | Expiring document alerts | Backend | Alert when documents (licenses, insurance, consents) approach expiration |
| CMP-04 | Consent expiration monitoring | Backend | 30-day and 7-day alerts for expiring consents; weekly summary to compliance officer |

---

### Sprint 17: Messaging - Core (Weeks 33-34)

**Goal**: Direct messages, group chat, announcements, push notifications.

| ID | Feature | Owner | Acceptance Criteria |
|----|---------|-------|---------------------|
| MSG-01 | Direct messages | Backend + Frontend | 1:1 messaging within org; real-time delivery (< 1s); server-side storage; synced across devices |
| MSG-02 | Group chat | Backend + Frontend | Create group conversations for house, property, or custom groups |
| MSG-03 | House announcements | Backend + Frontend | Broadcast to all house residents; pinnable; rich text; read tracking |
| MSG-05 | Push notifications | Mobile (PWA) | Service worker; real-time push for messages, reminders, alerts |

---

### Sprint 18: Messaging - Consent Gating + Family (Weeks 35-36)

**Goal**: Consent-gated messaging, family/sponsor communication channel.

| ID | Feature | Owner | Acceptance Criteria |
|----|---------|-------|---------------------|
| MSG-07 | Family/sponsor messaging | Backend + Frontend | Consent-gated channel between family and house manager; requires active Part 2 consent designating family member; without consent, channel blocked with explanation |
| MSG-09 | Consent-gated content | Backend | Before displaying Part 2 data in messages, verify active consent; revoked consent blocks new messages but preserves history |
| CMP-06 | Redisclosure notice in messages | Backend | Part 2 data in messages auto-prepends redisclosure notice |

**MILESTONE M4: Full Platform** -- see Section 6.

---

### Sprint 19: Reporting + Dashboards (Weeks 37-38)

**Goal**: All dashboards and reporting.

| ID | Feature | Owner | Acceptance Criteria |
|----|---------|-------|---------------------|
| RPT-01 | Occupancy dashboard | Frontend | Occupancy count + %, trend chart (30/60/90 days), vacancy count, waitlist count, avg length of stay; filterable |
| RPT-02 | Financial dashboard | Frontend | MTD revenue, collections, collection rate, outstanding, aging buckets (0-30/31-60/61-90/90+), top delinquent |
| RPT-03 | Operations dashboard | Frontend | Chore completion rates, meeting compliance, incident counts, drug test summary |
| RPT-05 | Compliance dashboard | Frontend | Active consent count by status, expiring within 30 days, disclosure count, audit log summary, open incidents; red/yellow/green indicators |
| RPT-11 | Data export | Backend | CSV, PDF, JSON export for any report; Part 2 exports include redisclosure notice; export events audit logged |
| CMP-07 | Accounting of disclosures report | Backend + Frontend | Patient-facing report: date, recipient, description, purpose for each non-excepted disclosure; 6-year lookback; 60-day delivery |
| CMP-10 | Compliance officer dashboard | Frontend | Org-level compliance overview (consolidates RPT-05 + CMP-07 + audit viewer) |

---

### Sprint 20: Integration Testing + Launch Prep (Weeks 39-40)

**Goal**: End-to-end testing, security hardening, performance, launch readiness.

| Deliverable | Owner | Acceptance Criteria |
|-------------|-------|---------------------|
| End-to-end test suite | All | All 5 user flows from 01_REQUIREMENTS.md Section 13 pass |
| PWA install + offline testing | Mobile | Resident app installs on iOS Safari + Android Chrome; service worker caches critical assets |
| Resident onboarding flow polish | Frontend | First-login experience: set password, MFA setup, consent review, payment method |
| Family/sponsor portal polish | Frontend + Mobile | Family can register, pay, message (consent-gated) |
| Security audit (OWASP Top 10) | Backend | No critical/high vulnerabilities |
| Audit log integrity verification | Backend | Hash chain verified over full test dataset; no breaks |
| Performance testing | All | Page loads < 2s FCP; API p95 < 500ms; 500-bed dashboard < 2s; 100 concurrent users per org |
| BAA template finalization | Legal | Legal-reviewed BAA template with Part 2 addendum |
| Part 2 patient notice finalization | Legal | Legal-reviewed notice template |
| Compliance checklist verification | All | 04_COMPLIANCE.md Section 9: all T1-T17 (technical), A1-A11 (administrative), O1-O8 (operational) items checked |
| Deployment pipeline | Backend | Staging + production environments; CI/CD; zero-downtime deploys |
| Backup + DR drill | Backend | Backup restored successfully; RTO < 4 hours; RPO < 1 hour verified |

**MILESTONE M5: Launch Ready** -- see Section 6.

---

### Sprints 21-22: v1.1 (Enhanced Intake + Operations)

| ID | Feature | Module |
|----|---------|--------|
| ADM-03 | Conditional form logic | Admissions |
| ADM-04 | Clinical assessments (BARC-10, PHQ-9, GAD-7, ASI-Lite) | Admissions |
| ADM-09 | Eligibility screening | Admissions |
| ADM-10 | Automated follow-ups | Admissions |
| OCC-05 | Waitlist with priority scoring | Occupancy |
| OPS-08 | Drug test scheduling (random + scheduled) | Operations |
| OPS-11 | Maintenance requests | Operations |
| DOC-04 | Conditional form builder | Documents |
| DOC-07 | Version control | Documents |
| DOC-12 | Document sharing (with Part 2 consent check) | Documents |

### Sprints 23-24: v1.2 (Grant Readiness + Enterprise + Advanced Payments)

| ID | Feature | Module |
|----|---------|--------|
| RPT-04 | Admissions dashboard | Reporting |
| RPT-06 | Outcomes tracking (automated from daily ops) | Reporting |
| RPT-07 | Grant-ready GPRA reports | Reporting |
| RPT-12 | Multi-property comparisons | Reporting |
| RPT-10 | Scheduled reports | Reporting |
| CMP-09 | BAA tracking dashboard | Compliance |
| CMP-12 | Data access requests (30-day SLA) | Compliance |
| CMP-13 | Amendment requests | Compliance |
| CMP-15 | Privacy practices notice | Compliance |
| ORG-07 | Multi-org rollup dashboard | Org Mgmt |
| ORG-02 | Organization settings (advanced) | Org Mgmt |
| MSG-04 | Org-wide announcements | Messaging |
| MSG-06 | SMS gateway | Messaging |
| MSG-08 | Message retention policies | Messaging |
| MSG-10 | Message search | Messaging |
| MSG-11 | File sharing in messages | Messaging |
| PAY-07 | External payment recording (Venmo, Zelle, Cash App) | Billing |
| PAY-09 | Split billing | Billing |
| PAY-10 | Payment plans | Billing |
| PAY-16 | Bank reconciliation | Billing |
| PAY-22 | Accounting export (QuickBooks, Xero) | Billing |

### v2.0+ (Post-Launch)

| ID | Feature | Module |
|----|---------|--------|
| OCC-07 | Automated bed assignment | Occupancy |
| ADM-05 | Background check integration | Admissions |
| OPS-13 | Mood/wellness tracking | Operations |
| OPS-14 | Alumni tracking | Operations |
| OPS-15 | Vehicle tracking | Operations |
| RPT-08 | NARR compliance reports | Reporting |
| RPT-09 | Custom report builder | Reporting |
| ORG-08 | Org branding | Org Mgmt |
| MSG-12 | Read receipts | Messaging |
| ADM-09 | API key management | Permissions |
| ADM-10 | Single sign-on (SAML/OIDC) | Permissions |

---

## 4. Agent Team Structure

### Phase 4 Build Team (5 Teammates)

| Teammate | Tech Stack | Responsibility |
|----------|-----------|----------------|
| **frontend** | Next.js 14+ App Router, React, Tailwind CSS | All pages, components, dashboards, form builders, Kanban board. Desktop-first CRM layout. |
| **backend** | tRPC, PostgreSQL, Drizzle/Prisma, AWS KMS | Database schema, API routes, business logic, audit logging, encryption, RBAC middleware, consent engine, double-entry ledger, dunning engine |
| **mobile** | React (PWA), Service Worker, Web Push API | PWA optimization, resident portal, family portal, push notifications, offline support, install flow |
| **integrations** | Stripe Connect, Clerk/Auth0, AWS S3, SendGrid | Auth provider setup + BAA, Stripe Connect onboarding + payments, file storage (S3 with encryption), email transactional, SMS gateway (v1.2) |
| **compliance-verifier** | Test suites, security scanning | Verify every feature against 04_COMPLIANCE.md; test RBAC matrix, consent gating, audit log completeness, encryption, redisclosure notices, Part 2 data segmentation. Gates every PR. |

### Sprint Ownership by Teammate

```
Sprint 1-4:   backend (heavy) + integrations (auth, KMS) + frontend (scaffold, consent UI) + compliance-verifier (foundation testing)
Sprint 5-6:   backend (org/occupancy API) + frontend (org setup, bed grid) + compliance-verifier
Sprint 7-8:   backend (admissions API) + frontend (Kanban, intake wizard, e-sign) + compliance-verifier
Sprint 9-12:  backend (ledger, Stripe) + integrations (Stripe Connect) + frontend (payment UI) + mobile (resident portal, family portal) + compliance-verifier
Sprint 13-14: backend (ops API) + frontend (ops UI) + mobile (check-in, chores) + compliance-verifier (drug test Part 2 check)
Sprint 15-16: backend (retention, S3) + integrations (S3) + frontend (doc library, templates) + compliance-verifier
Sprint 17-18: backend (messaging API, consent gating) + frontend (chat UI) + mobile (push notifications) + compliance-verifier
Sprint 19:    frontend (dashboards) + backend (report queries, disclosure report) + compliance-verifier
Sprint 20:    all (testing, polish, security audit, launch prep)
```

### Team Lead Coordination

- **Daily**: Review PRs, resolve blockers, maintain task board
- **Per sprint**: Sprint demo, compliance checkpoint, update SOURCE_OF_TRUTH.md
- **Compliance-verifier gates**: No feature merges without compliance sign-off
- **Feature freeze**: End of Sprint 19. Sprint 20 is hardening only.

---

## 5. Dependency Map

### Critical Path

```
S1: Schema + RLS + Audit Log + Encryption
  └── S2: RBAC + Consent Management + Part 2 Segmentation
        └── S3: Disclosure Tracking + Redisclosure + Breach Detection
              └── S4: Patient-Facing Compliance (Notice, Accounting, Break-Glass)
                    └── S5-6: Org + Property + Occupancy
                          └── S7-8: Admissions + Intake + E-Sign + Consent at Intake
                                └── S9-12: Payments (Ledger, Stripe, Proration, Multi-Payer, Dunning)
                                      └── S13-14: House Operations
                                            └── S15-16: Documents + Retention
                                                  └── S17-18: Messaging + Consent Gating
                                                        └── S19: Reporting + Dashboards
                                                              └── S20: Launch Prep
```

### External Dependencies

| Dependency | Required By | Lead Time | Action |
|-----------|-------------|-----------|--------|
| Auth provider BAA (Clerk or Auth0) | Sprint 1 | 2-4 weeks | Initiate before Sprint 1; HIPAA plan required |
| AWS BAA (RDS, S3, KMS) | Sprint 1 | 1-2 weeks | Standard; request via AWS console |
| Stripe Connect application | Sprint 9 | 2-6 weeks | Apply during Sprint 5; sandbox available immediately |
| Legal review of BAA template | Sprint 20 | 4-6 weeks | Start during Sprint 14 |
| Legal review of consent templates | Sprint 4 | 4-6 weeks | Start before Sprint 1 |
| Legal review of Part 2 patient notice | Sprint 4 | 4-6 weeks | Start before Sprint 1 |
| SOC 2 Type II audit engagement | Post-launch | 3-6 months | Begin engagement during Sprint 15 |

### Parallel Work (Non-Blocking)

| Work Item | Can Start | Does Not Block |
|-----------|-----------|----------------|
| PWA scaffold + service worker | Sprint 1 | Sprint 17 (messaging push) |
| Document template content | Sprint 5 | Sprint 8 (intake uses templates) |
| Report query optimization | Sprint 9 | Sprint 19 (dashboards) |
| Stripe sandbox integration | Sprint 5 | Sprint 9 (production Stripe) |

---

## 6. Milestone Definitions

### M1: Compliance Foundation (End of Sprint 4)

**Gate**: System can securely handle real PHI and Part 2 data.

| Criterion | Evidence | North Star Tie |
|-----------|---------|----------------|
| Database with RLS | Cross-org queries return zero rows | Multi-tenancy isolation |
| Auth + MFA | Registration, login, MFA challenge, 15-min timeout | Security |
| 9 RBAC roles enforced | Each role tested per 04_COMPLIANCE.md Section 6.2 matrix | Differentiator #7 |
| Immutable audit log | Append-only verified; hash chain intact; 6-year retention configured | Differentiator #8 |
| Field-level encryption | Part 2 fields encrypted at application layer; per-org keys | Security |
| Consent CRUD | All 9 elements of 42 CFR 2.31 captured; revocation immediate | Differentiator #1 |
| Consent verification | Part 2 access without consent returns 403; audit logged | Differentiator #1 |
| Disclosure tracking | Every Part 2 data share logged with required fields | Differentiator #1 |
| Redisclosure notice | All Part 2 outputs include 42 CFR 2.32 notice | Differentiator #1 |
| Breach detection | Automated monitoring rules active; alerts fire correctly | Security |
| Break-glass access | Emergency access with justification + elevated logging | Compliance |
| Compliance dashboard | Compliance officer can view consents, disclosures, audit summary | Differentiator #1 |

### M2: Core Operations (End of Sprint 8)

**Gate**: First operators can onboard and admit residents.

| Criterion | Evidence | North Star Tie |
|-----------|---------|----------------|
| Org + property + house setup | Operator creates full hierarchy with beds | Multi-org architecture |
| Bed-level tracking | Visual grid, status management, transfers | Feature parity (SLA, Oathtrack) |
| End-to-end intake | Lead > screening > approval > consent > intake form > bed assignment | Best-of-breed intake |
| Part 2 consent at admission | Intake requires consent; no admission without it | Differentiator #1 |
| E-signature | All intake documents signed electronically | Feature parity |
| Occupancy dashboard | Real-time, < 2s for 500 beds | Performance target |

### M3: Payments (End of Sprint 12)

**Gate**: Revenue-generating platform.

| Criterion | Evidence | North Star Tie |
|-----------|---------|----------------|
| Stripe Connect | Operator receives direct payouts | Differentiator #2 |
| Double-entry ledger | Every payment creates balanced entries; no balance field | Differentiator #2 |
| Automated invoicing | Invoices generated per cycle; sent to payers | Feature parity |
| Proration | Mid-cycle move-in/out correctly calculated | Differentiator #5 |
| Multi-payer | Resident, family, sponsor, agency each pay their share | Differentiator #5 |
| Dunning escalation | Configurable ladder fires at correct intervals | Differentiator #5 |
| Family payment portal | Family member can pay via PWA | Feature parity (vs SLA) |
| Financial reports | Revenue, collections, aging reports accurate | Feature parity |

### M4: Full Platform (End of Sprint 18)

**Gate**: Feature-complete for v1.0 launch.

| Criterion | Evidence | North Star Tie |
|-----------|---------|----------------|
| All P0 features functional | 68 features pass acceptance criteria | Feature completeness |
| House operations | Chores, meetings, passes, curfew, drug tests, incidents working | Feature parity |
| Drug test Part 2 compliance | Results encrypted; access consent-gated | Differentiator #1 |
| Documents with retention | Upload, sign, retain, destroy with audit trail | Differentiator #6 |
| Unified messaging | DM, group, announcements, family (consent-gated) | Differentiator #10 |
| Consent-gated messaging | Part 2 data in messages requires consent | Differentiator #10 |

### M5: Launch Ready (End of Sprint 20)

**Gate**: Production deployment approved.

| Criterion | Evidence | North Star Tie |
|-----------|---------|----------------|
| All user flows tested | 5 key flows pass end-to-end | Quality |
| Performance targets | < 2s FCP, < 500ms API p95, 500-bed dashboard < 2s | 99.9% uptime |
| Security audit | OWASP Top 10 verified; no critical/high findings | Security |
| Compliance checklist | 04_COMPLIANCE.md Section 9 all items checked | BAA execution rate: 100% |
| Audit log integrity | Hash chain verified over full dataset | Differentiator #8 |
| Backup + DR tested | RTO < 4h, RPO < 1h verified | 99.9% uptime |
| BAA template ready | Legal-reviewed with Part 2 addendum | Differentiator #4 |
| PWA installable | iOS Safari + Android Chrome | Resident-friendly |
| Year 1 target enabled | 200+ facilities capacity; $2M/mo payment volume supported | North Star success metrics |

---

## 7. Risk Register

| # | Risk | Impact | Probability | Mitigation | Owner |
|---|------|--------|-------------|------------|-------|
| R1 | Auth provider BAA negotiation delay | Sprint 1 blocked; cannot handle PHI | Low | Both Clerk and Auth0 offer HIPAA plans; initiate before Sprint 1; have backup provider identified | Integrations |
| R2 | Stripe Connect application delay | Sprint 9 blocked; no payments | Medium | Apply during Sprint 5 (4 sprints lead time); sandbox available immediately for development | Integrations |
| R3 | Field-level encryption performance | Slow queries on Part 2 data (> 500ms) | Medium | Benchmark in Sprint 1; consider encrypted search indexes; cache decrypted data in memory per-request; avoid encrypting fields used in WHERE clauses | Backend |
| R4 | Audit log storage growth | Cost escalation at 10K orgs | Low | Tiered storage from Sprint 1: hot (0-1y), warm (1-3y), cold/S3 Glacier (3-6y); estimated 1 TB/year at 10K orgs | Backend |
| R5 | Compliance-verifier bottleneck | PRs blocked; sprint velocity drops | Medium | Automated compliance test suite (RBAC matrix tests, consent gating tests, audit log completeness checks) reduces manual review to edge cases only | Compliance-verifier |
| R6 | Legal review delays (BAA, consent templates, patient notice) | Sprint 4 or Sprint 20 blocked | Medium | Start legal engagement before Sprint 1; use well-known templates as starting point; build with placeholder text, swap in finalized text later | Team lead |
| R7 | 42 CFR Part 2 interpretation ambiguity | Over- or under-engineering compliance features | Medium | Compliance-expert subagent reviews all designs; legal counsel for gray areas; principle: when in doubt, over-protect (no regulatory penalty for over-protection; criminal liability for under-protection per 42 USC 290dd-2) | Compliance-verifier |
| R8 | Sprint 20 scope creep from testing | Launch delay | High | Sprint 20 is hardening ONLY -- no new features. Bug fixes only. Feature freeze at end of Sprint 19. Untestable P0 features escalated during sprint, not deferred to Sprint 20. | Team lead |
| R9 | PWA limitations on iOS | Push notifications, install flow degraded on iOS | Medium | Test on iOS Safari from Sprint 1; design graceful degradation; push notification fallback to SMS for iOS users (v1.2) | Mobile |
| R10 | Stripe Connect compliance (PCI) | Payment data handling violations | Low | Never store card data server-side; use Stripe.js + Elements for PCI compliance; Stripe handles PCI DSS; document in compliance chain | Integrations |

---

## Summary: What Ships When

| Release | Sprints | Duration | Theme | Key Deliverables |
|---------|---------|----------|-------|------------------|
| M1 | S1-4 | 8 weeks | Compliance Foundation | Audit log, RBAC, encryption, consent, disclosures, breach detection, break-glass |
| M2 | S5-8 | 8 weeks | Core Operations | Org/property/house setup, occupancy, admissions CRM, intake with consent + e-sign |
| M3 | S9-12 | 8 weeks | Payments | Double-entry ledger, Stripe Connect, proration, multi-payer, dunning, family portal |
| M4 | S13-18 | 12 weeks | Full Platform | House ops, documents + retention, messaging with consent gating |
| **v1.0** | S19-20 | 4 weeks | Launch | Dashboards, reporting, testing, security audit, launch prep |
| **v1.1** | S21-22 | 4 weeks | Enhanced Intake | Conditional forms, clinical assessments, waitlist, drug test scheduling |
| **v1.2** | S23-24 | 4 weeks | Enterprise + Grants | GPRA reports, bank reconciliation, SMS, multi-org rollup, accounting export |
| **v2.0+** | Post | Ongoing | Scale | AI features, alumni, SSO, custom reports, NARR partnerships |

**Total v1.0**: 68 P0 features across 10 modules in 20 two-week sprints (40 weeks).

**Phase 4 Agent Team**: 5 teammates (frontend, backend, mobile, integrations, compliance-verifier) working in parallel with compliance-verifier gating every merge.

---

*Document prepared by product-lead for RecoveryOS.*
*Cross-referenced with: 01_REQUIREMENTS.md (feature specs + IDs), 04_COMPLIANCE.md (compliance build order + Section 10 sprint alignment), 00_NORTH_STAR.md (success metrics + differentiators).*
