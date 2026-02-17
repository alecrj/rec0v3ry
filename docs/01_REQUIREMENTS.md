# RecoveryOS - Product Requirements Document

> **Status**: Final
> **Owner**: product-lead
> **Last Updated**: 2026-02-11
> **Depends On**: [00_NORTH_STAR.md](00_NORTH_STAR.md), [04_COMPLIANCE.md](04_COMPLIANCE.md), [research/competitors.md](research/competitors.md), [research/gaps.md](research/gaps.md), [research/regulations.md](research/regulations.md)

---

## Table of Contents

1. [User Personas](#1-user-personas)
2. [Information Architecture](#2-information-architecture)
3. [Module 1: Organization & Property Management](#3-module-1-organization--property-management)
4. [Module 2: Occupancy & Bed Management](#4-module-2-occupancy--bed-management)
5. [Module 3: Admissions & Intake](#5-module-3-admissions--intake)
6. [Module 4: Billing & Payments](#6-module-4-billing--payments)
7. [Module 5: House Operations](#7-module-5-house-operations)
8. [Module 6: Documents & E-Sign](#8-module-6-documents--e-sign)
9. [Module 7: Messaging & Communications](#9-module-7-messaging--communications)
10. [Module 8: Reporting & Dashboards](#10-module-8-reporting--dashboards)
11. [Module 9: Compliance & Consent Management](#11-module-9-compliance--consent-management)
12. [Module 10: Permissions & Administration](#12-module-10-permissions--administration)
13. [Key User Flows](#13-key-user-flows)
14. [Screen Inventory](#14-screen-inventory)
15. [Non-Functional Requirements](#15-non-functional-requirements)
16. [Glossary](#16-glossary)

---

## 1. User Personas

### 1.1 Platform Admin

| Attribute | Detail |
|-----------|--------|
| **Role** | RecoveryOS staff |
| **Scope** | Platform-wide system configuration |
| **Access** | System settings, platform health, org management. No customer PHI. |
| **Primary tasks** | Onboard organizations, manage platform configuration, monitor system health, support escalation |
| **Platform** | Web (desktop) |

### 1.2 Org Owner

| Attribute | Detail |
|-----------|--------|
| **Role** | Recovery housing business owner |
| **Scope** | Organization-wide |
| **Access** | All org settings, billing, properties, compliance configuration, summary reports. Full PHI access within org. |
| **Primary tasks** | Configure organization, manage subscription, view cross-property dashboards, set compliance policies, manage BAAs |
| **Motivation** | Financial health, compliance confidence, business growth |
| **Platform** | Web CRM (desktop-first) |

### 1.3 Org Admin

| Attribute | Detail |
|-----------|--------|
| **Role** | Operations director or regional manager |
| **Scope** | Organization-wide |
| **Access** | User management, property configuration, resident records, compliance reports. Limited billing access. |
| **Primary tasks** | Manage staff accounts, configure properties/houses, generate compliance reports, oversee intake pipeline |
| **Motivation** | Operational efficiency across multiple properties |
| **Platform** | Web CRM (desktop-first) |

### 1.4 Property Manager

| Attribute | Detail |
|-----------|--------|
| **Role** | Manages one or more properties (each with multiple houses) |
| **Scope** | Assigned properties |
| **Access** | Full CRUD on residents, payments, operations, documents for assigned properties |
| **Primary tasks** | Occupancy management, financial oversight, staff scheduling, incident review, intake approvals |
| **Motivation** | Keep houses full, payments collected, operations running smoothly |
| **Platform** | Web CRM (desktop) + mobile for on-site |

### 1.5 House Manager

| Attribute | Detail |
|-----------|--------|
| **Role** | Day-to-day manager of a single house |
| **Scope** | Assigned house(s) |
| **Access** | Full CRUD on residents, operations, documents for assigned house. Create payments. |
| **Primary tasks** | Daily check-ins, chore management, drug testing, meeting tracking, pass management, incident reports, intake interviews |
| **Motivation** | Maintain house order, support resident recovery, minimize paperwork |
| **Platform** | Web CRM + mobile (split usage) |

### 1.6 Staff (House Monitor)

| Attribute | Detail |
|-----------|--------|
| **Role** | Part-time monitor, relief staff, or shift worker |
| **Scope** | Assigned house(s) |
| **Access** | Check-ins, curfew verification, chore verification, meeting attendance. No medical/clinical records, no financial data. |
| **Primary tasks** | Curfew check-ins, chore verification, meeting attendance logging, incident reporting |
| **Motivation** | Quick task completion, clear instructions |
| **Platform** | Mobile-primary |

### 1.7 Resident

| Attribute | Detail |
|-----------|--------|
| **Role** | Current resident of a sober living house |
| **Scope** | Own records only |
| **Access** | Own profile, payments, schedule, messages, documents, consent records |
| **Primary tasks** | Pay rent, view schedule/chores, communicate with house manager, sign documents, view own records |
| **Motivation** | Simple experience, privacy respected, pay rent easily |
| **Platform** | PWA (mobile-first, installable) |

### 1.8 Family Member / Sponsor

| Attribute | Detail |
|-----------|--------|
| **Role** | Family member or financial sponsor of a resident |
| **Scope** | Designated resident, consent-gated |
| **Access** | Payment portal for designated resident. Permitted updates per Part 2 consent. |
| **Primary tasks** | Make payments, view payment history, receive permitted updates |
| **Motivation** | Financial transparency, peace of mind, easy payments |
| **Platform** | PWA (mobile/desktop) |

### 1.9 Referral Partner

| Attribute | Detail |
|-----------|--------|
| **Role** | External treatment provider, case manager, or referring agency |
| **Scope** | Referred resident(s), consent-gated |
| **Access** | Consent-gated read access to referred resident's permitted records |
| **Primary tasks** | Check on referred resident's status, coordinate care (per consent), receive reports |
| **Motivation** | Continuity of care, regulatory compliance for their own organization |
| **Platform** | Limited web portal |

---

## 2. Information Architecture

### 2.1 Organizational Hierarchy

```
Platform (RecoveryOS)
  └── Organization (legal entity, e.g., "Hope Recovery LLC")
        ├── Compliance Settings (BAA, consent templates, retention policies)
        ├── Billing Account (Stripe Connect)
        ├── Property (physical location, e.g., "Riverside Campus")
        │     ├── House (individual home, e.g., "Riverside Men's House A")
        │     │     ├── Beds (bed-level tracking)
        │     │     ├── Residents (current)
        │     │     ├── Staff assignments
        │     │     └── House configuration (rules, curfew, chores)
        │     └── House (e.g., "Riverside Women's House B")
        └── Property (e.g., "Downtown Location")
              └── House (e.g., "Downtown Co-ed House")
```

### 2.2 Multi-Tenancy

- Every data record includes `org_id` foreign key
- Row-level security (RLS) enforced at database level
- Cross-org data access is impossible at the application layer
- Management companies can view rollup dashboards across their orgs
- Per-org encryption keys for field-level Part 2 encryption

Source: [04_COMPLIANCE.md](04_COMPLIANCE.md), Section 6.4

---

## 3. Module 1: Organization & Property Management

### 3.1 Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| ORG-01 | Organization setup | Create org with name, legal entity info, EIN, address, contact | P0 |
| ORG-02 | Organization settings | Timezone, date format, currency, default house rules template | P1 |
| ORG-03 | Compliance configuration | BAA tracking, consent templates, retention policies, Part 2 settings per org | P0 |
| ORG-04 | Subscription management | Plan selection, billing info (Stripe), usage dashboard | P0 |
| ORG-05 | Property CRUD | Create/edit/archive properties with address, capacity, type | P0 |
| ORG-06 | House CRUD | Create/edit/archive houses under properties with bed configuration | P0 |
| ORG-07 | Multi-org rollup | Dashboard aggregating metrics across organizations for management companies | P1 |
| ORG-08 | Org branding | Logo, color scheme applied to resident-facing UI | P2 |

### 3.2 Acceptance Criteria

- **ORG-01**: Org creation requires name, entity type, address, primary contact. EIN optional. Audit logged.
- **ORG-03**: Compliance config must include: default consent templates, retention policy per document type (with 6-year minimum for Part 2 records), BAA execution tracking.
- **ORG-05**: Property has address, capacity (computed from houses), status (active/archived). Archiving a property disables all houses under it.
- **ORG-06**: House has name, property association, bed count, gender restriction (male/female/co-ed), NARR level (1-4), status. Beds are individually addressable.

---

## 4. Module 2: Occupancy & Bed Management

### 4.1 Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| OCC-01 | Bed-level tracking | Each bed has status: available, occupied, reserved, maintenance, blocked | P0 |
| OCC-02 | Occupancy dashboard | Visual grid showing all beds across all houses/properties with color-coded status | P0 |
| OCC-03 | Bed assignment | Assign resident to specific bed at move-in; record move date | P0 |
| OCC-04 | Bed transfer | Move resident between beds/houses/properties with transfer date and reason | P0 |
| OCC-05 | Waitlist | Queue for applicants when houses are full; priority ordering; auto-notify on availability | P1 |
| OCC-06 | Capacity reporting | Occupancy rate per house/property/org; trend over time; vacancy forecasting | P0 |
| OCC-07 | Automated bed assignment | Suggest best bed based on gender, preferences, availability | P2 |
| OCC-08 | Move-out processing | Record discharge date, reason (completed, voluntary, involuntary, transfer); update bed status | P0 |

### 4.2 Acceptance Criteria

- **OCC-01**: Bed status changes are audit logged. Status transitions: available -> reserved -> occupied -> available; available -> maintenance -> available; available -> blocked -> available.
- **OCC-02**: Dashboard loads in < 2s for up to 500 beds. Filterable by property, house, status. Click-through to resident profile.
- **OCC-04**: Transfer records source bed, destination bed, transfer date, reason, staff who processed. Both source and destination house managers notified.
- **OCC-05**: Waitlist entries include applicant info, application date, priority score (manual or rule-based), notes. When bed becomes available, top waitlist entry is flagged for review. Notification sent to applicant.
- **OCC-08**: Move-out triggers: financial proration calculation, consent expiration review, document retention scheduling, alumni status assignment.

### 4.3 Competitive Parity

- Bed-level tracking: Matches SLA, Oathtrack, Oasis. Exceeds Sobriety Hub (facility-level only).
- Waitlist: Matches SLA. No other competitor has this.
- Transfer workflow: Exceeds all competitors (none have documented transfer workflows).

---

## 5. Module 3: Admissions & Intake

### 5.1 Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| ADM-01 | Lead tracking / CRM | Pipeline stages: inquiry -> screening -> interview -> approved -> admitted -> declined | P0 |
| ADM-02 | Digital intake forms | Configurable intake form with standard and custom fields | P0 |
| ADM-03 | Conditional form logic | Show/hide fields based on previous answers (e.g., show MAT questions only if MAT selected) | P1 |
| ADM-04 | Clinical assessments | Built-in templates: BARC-10, PHQ-9, GAD-7, ASI-Lite | P1 |
| ADM-05 | Background check integration | API integration with background check provider; results stored securely | P2 |
| ADM-06 | Document collection | Upload required docs (ID, insurance, court orders) during intake | P0 |
| ADM-07 | E-signature on intake | Resident signs intake forms, house rules, consent forms electronically | P0 |
| ADM-08 | Part 2 consent at intake | Intake includes creation of Part 2 consent records (42 CFR 2.31 elements) | P0 |
| ADM-09 | Eligibility screening | Rule-based screening criteria (age, gender, substance type, legal status) | P1 |
| ADM-10 | Automated follow-ups | Configurable reminders for incomplete applications, missing documents | P1 |
| ADM-11 | Referral source tracking | Track where leads come from (treatment center, self, court, family) for reporting | P0 |

### 5.2 Acceptance Criteria

- **ADM-01**: Pipeline is visually represented as a Kanban board. Each stage has configurable actions. Lead-to-admission conversion rate tracked.
- **ADM-02**: Form builder supports text, number, date, dropdown, checkbox, radio, file upload, signature fields. Forms are versionable.
- **ADM-08**: At intake, system MUST present Part 2 consent forms with all 9 required elements (42 CFR 2.31). Intake cannot complete without at least one active consent. Consent records link to resident profile.
- **ADM-11**: Referral sources are configurable per org. Reports show admission volume by referral source.

### 5.3 Competitive Parity

- CRM pipeline: Matches SLA. No other competitor has lead tracking.
- Conditional forms: Matches Sobriety Hub. No other competitor has this.
- Clinical assessments: Matches Sobriety Hub. No other competitor has built-in assessments.
- Part 2 consent at intake: UNIQUE. No competitor has this.

---

## 6. Module 4: Billing & Payments

This is the second-largest differentiator after compliance. Source: [gaps.md](research/gaps.md), Priority 2.

### 6.1 Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| PAY-01 | Stripe Connect onboarding | Each org connects Stripe account for direct payouts | P0 |
| PAY-02 | Rate configuration | Per-house or per-bed rate; weekly/biweekly/monthly billing cycles; custom rates per resident | P0 |
| PAY-03 | Automated invoicing | Invoices generated per billing cycle; sent to resident (and payers) | P0 |
| PAY-04 | Card payments | Accept credit/debit via Stripe | P0 |
| PAY-05 | ACH payments | Accept bank transfer via Stripe | P0 |
| PAY-06 | Cash/check recording | Manual entry of offline payments with receipt number | P0 |
| PAY-07 | External method recording | Record Venmo/Zelle/Cash App payments (amount, date, reference) | P1 |
| PAY-08 | Multi-payer support | Multiple payers per resident: self, family, sponsor, agency, insurance | P0 |
| PAY-09 | Split billing | Invoice split across payers (e.g., resident pays 60%, family pays 40%) | P1 |
| PAY-10 | Payment plans | Configurable installment schedules for overdue balances | P1 |
| PAY-11 | Automated proration | Mid-cycle move-in/out calculates prorated amount based on days | P0 |
| PAY-12 | Late fee automation | Configurable late fee (flat or percentage) applied after grace period | P0 |
| PAY-13 | Dunning escalation | Configurable ladder: reminder (day X) -> warning (day Y) -> suspension (day Z) -> discharge review (day W) | P0 |
| PAY-14 | Deposit management | Collect, hold, and refund security deposits; deposit ledger | P0 |
| PAY-15 | Double-entry ledger | Every money movement creates debit + credit entries; ledger is source of truth | P0 |
| PAY-16 | Bank reconciliation | Match ledger entries against Stripe payouts and bank statements | P1 |
| PAY-17 | Payment reminders | Automated reminders before due date (configurable: 3 days, 1 day, day-of) | P0 |
| PAY-18 | Resident payment portal | Residents pay via PWA; view balance, history, upcoming invoices | P0 |
| PAY-19 | Family payment portal | Family/sponsor can pay designated resident's invoices | P0 |
| PAY-20 | Financial reports | Revenue, collections, outstanding balances, aging report, per-house P&L | P0 |
| PAY-21 | Refund processing | Issue full or partial refunds via Stripe; ledger entries created automatically | P0 |
| PAY-22 | Accounting export | Export financial data in formats compatible with QuickBooks, Xero | P1 |

### 6.2 Acceptance Criteria

- **PAY-01**: Stripe Connect Express onboarding flow. Org owner completes Stripe identity verification. Platform fee configurable.
- **PAY-08**: Each resident has a payer list. Each payer has: name, relationship, contact info, payment method, responsibility percentage or fixed amount. Invoices split accordingly.
- **PAY-11**: Proration formula: `(daily_rate * days_in_period)` where `daily_rate = monthly_rate / days_in_month`. Proration applies to both move-in and move-out. Proration calculation visible on invoice.
- **PAY-13**: Dunning ladder is org-configurable. Default: reminder at day 1 past due, warning at day 7, account suspension at day 14, discharge review at day 30. Each step creates audit log entry and notification.
- **PAY-15**: Ledger uses double-entry accounting. Every transaction has at least one debit and one credit entry. Ledger always balances. No direct balance field -- balance computed from ledger entries.
- **PAY-16**: Reconciliation workflow: import Stripe payout report, match against ledger entries, flag unmatched items for review, generate reconciliation report.

### 6.3 Competitive Parity

- Reconciliation: UNIQUE. No competitor has this.
- Proration: UNIQUE. No competitor has this.
- Double-entry ledger: UNIQUE. No competitor has this.
- Multi-payer: Exceeds SLA (which has partial support). No other competitor.
- Dunning escalation: Exceeds all (SLA has partial reminders + late fees only).

---

## 7. Module 5: House Operations

### 7.1 Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| OPS-01 | Chore management | Define chore templates per house; assign chores to residents on rotation; verify completion | P0 |
| OPS-02 | Chore rotation | Auto-rotate chore assignments weekly/biweekly; fairness tracking | P0 |
| OPS-03 | Meeting attendance | Log attendance for house meetings, AA/NA meetings, therapy sessions; meeting types configurable | P0 |
| OPS-04 | Meeting requirements | Per-house minimum meeting requirements (e.g., 3 AA/NA per week); compliance tracking per resident | P0 |
| OPS-05 | Pass management | Request/approve overnight passes; track departure/return times; curfew exemptions | P0 |
| OPS-06 | Curfew management | Define curfew times per house; check-in logging; curfew violation alerts | P0 |
| OPS-07 | Drug testing | Record test date, type (urine, oral, breathalyzer), result, tested by; test scheduling | P0 |
| OPS-08 | Drug test scheduling | Configurable testing frequency per house (random or scheduled); resident notification | P1 |
| OPS-09 | Incident reports | Structured incident form: date, involved parties, description, severity, action taken, follow-up | P0 |
| OPS-10 | Task assignments | Assign arbitrary tasks to residents with due date and status tracking | P0 |
| OPS-11 | Maintenance requests | Residents submit requests; staff triages, assigns, resolves; photo uploads | P1 |
| OPS-12 | Daily check-in log | House monitor records which residents are present at check-in time | P0 |
| OPS-13 | Mood/wellness check | Optional daily check-in: mood rating (1-5), brief note. Trend visible to house manager. | P2 |
| OPS-14 | Alumni tracking | Track alumni status, milestones, outcomes after discharge | P2 |
| OPS-15 | Vehicle tracking | Log resident vehicles: make, model, plate, parking assignment | P2 |
| OPS-16 | House rules | Digital house rules per house; resident acknowledgment with e-signature | P0 |

### 7.2 Acceptance Criteria

- **OPS-01**: Chores have: name, description, location (e.g., kitchen), estimated time, frequency. Chore completion logged with timestamp, verified by staff or photo evidence.
- **OPS-04**: Meeting compliance dashboard shows each resident's status (on track / behind / non-compliant). Configurable alert thresholds. Weekly summary to house manager.
- **OPS-06**: Curfew defined per house (e.g., 10 PM Sun-Thu, 11 PM Fri-Sat). Check-in logged via staff action or resident self-check-in (geofence optional, P2). Violation auto-creates incident flag.
- **OPS-07**: Drug test results are Part 2 protected data. Access is consent-gated. Results encrypted at field level. Positive results trigger configurable workflow (notification to property manager, incident creation, or discharge review).
- **OPS-09**: Incidents have severity levels (low/medium/high/critical). High/critical auto-notify property manager. Incident resolution requires follow-up notes. All incidents audit logged.

### 7.3 Competitive Parity

- Chore management: Matches SLA, Oathtrack, Sobriety Hub. Exceeds Oasis (partial).
- Pass management: Matches Oathtrack, Sobriety Hub. SLA and Oasis lack this.
- Drug testing: Matches all competitors. RecoveryOS adds Part 2 compliance to test results.
- Mood tracking: Matches Oathtrack (AI-powered) and Sobriety Hub. RecoveryOS is P2.
- Incident reports: Matches SLA and Oasis. Oathtrack and Sobriety Hub lack this.
- Maintenance: Matches SLA and Sobriety Hub.

---

## 8. Module 6: Documents & E-Sign

### 8.1 Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| DOC-01 | Document storage | Upload, organize, retrieve documents per resident, house, or org | P0 |
| DOC-02 | Document templates | Configurable templates for common documents (intake forms, house rules, consent forms) | P0 |
| DOC-03 | E-signature (DocuSign) | Residents and staff sign documents electronically via DocuSign integration with identity verification | P0 |
| DOC-04 | Conditional form builder | Build forms with show/hide logic, required fields, conditional sections | P1 |
| DOC-05 | Retention policies | Per-document-type retention periods; automated retention scheduling | P0 |
| DOC-06 | Retention enforcement | Pre-destruction review workflow; legal hold override; destruction with audit record | P0 |
| DOC-07 | Version control | Document versions tracked; previous versions accessible; change history | P1 |
| DOC-08 | Part 2 consent documents | Pre-built consent form template with all 42 CFR 2.31 elements | P0 |
| DOC-09 | NARR document templates | Templates for NARR Level 1-4 documentation requirements | P1 |
| DOC-10 | Document categorization | Categories: intake, consent, clinical, financial, operational, legal | P0 |
| DOC-11 | Bulk document signing | Sign multiple documents in sequence during intake | P0 |
| DOC-12 | Document sharing | Share documents with external parties (with Part 2 consent check and redisclosure notice) | P1 |
| DOC-13 | Expiring document alerts | Alert when documents approach expiration (licenses, insurance, consents) | P0 |

### 8.2 Acceptance Criteria

- **DOC-03**: E-signatures powered by DocuSign API. Include: signer identity (authenticated user), timestamp, IP address, document hash. Signatures are legally binding under ESIGN Act / UETA. DocuSign provides audit trail, tamper-evident seal, and certificate of completion. DocuSign BAA required for HIPAA compliance.
- **DOC-05**: Default retention policies: Part 2 consent forms = 6 years from expiration/revocation; medical records = 6 years; financial records = 7 years; general operational = 3 years. Org can customize (cannot set below regulatory minimums).
- **DOC-06**: When retention expires: document flagged for review -> compliance officer approves destruction -> document crypto-shredded -> destruction recorded in audit log with document metadata (but not content).
- **DOC-08**: Consent form template pre-populates: patient name, disclosing entity (from org settings). Staff completes: recipient, purpose, information scope, expiration. Resident signs. All fields validated against 42 CFR 2.31 requirements.
- **DOC-12**: Sharing a document containing Part 2 data requires: active consent verified, redisclosure notice attached, disclosure logged for accounting purposes.

### 8.3 Competitive Parity

- Retention policies: UNIQUE. No competitor has this.
- Conditional forms: Matches Sobriety Hub. No other competitor.
- Part 2 consent templates: UNIQUE. No competitor has this.
- E-signature: DocuSign integration EXCEEDS all competitors (none disclose their e-sign provider). DocuSign provides enterprise-grade audit trail, HIPAA BAA, and legal defensibility.

---

## 9. Module 7: Messaging & Communications

### 9.1 Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| MSG-01 | Direct messages | 1:1 messaging between any users within the same org | P0 |
| MSG-02 | Group chat | Create group conversations for house, property, or custom groups | P0 |
| MSG-03 | House announcements | Broadcast messages to all residents of a house; read receipt tracking | P0 |
| MSG-04 | Org-wide announcements | Broadcast to all staff across org; or all residents across org | P1 |
| MSG-05 | Push notifications | Real-time push for messages, reminders, alerts (via PWA service worker) | P0 |
| MSG-06 | SMS gateway | Send SMS to residents who don't have app installed; receive replies | P1 |
| MSG-07 | Family/sponsor messaging | Consent-gated messaging channel between family and house manager | P0 |
| MSG-08 | Message retention | Messages retained per org retention policy; auto-purge on expiration | P1 |
| MSG-09 | Consent-gated content | Messages containing Part 2 data require active consent for recipient; system blocks otherwise | P0 |
| MSG-10 | Message search | Full-text search within own conversations | P1 |
| MSG-11 | File sharing in messages | Send images, documents via messages; files stored per retention policy | P1 |
| MSG-12 | Read receipts | Optional read receipts for direct messages and announcements | P2 |

### 9.2 Acceptance Criteria

- **MSG-01**: Messages delivered in real-time (< 1s). Messages stored server-side and synced across devices. Message history persists.
- **MSG-03**: Announcements are pinnable. Announcements support rich text (bold, lists, links). Read tracking shows which residents have seen the announcement.
- **MSG-07**: Family messaging requires active Part 2 consent designating the family member as an authorized recipient. Without consent, messaging channel is blocked with clear explanation. Consent status checked on every message send.
- **MSG-09**: Before displaying Part 2 data in any message context, system verifies active consent. If a consent is revoked mid-conversation, previously sent messages remain but new messages are blocked.

### 9.3 Competitive Parity

- Unified messaging: Exceeds all competitors. Oathtrack requires separate app. Oasis has none. SLA lacks group chat. Sobriety Hub lacks SMS and family messaging.
- Consent-gated messaging: UNIQUE. No competitor has this.
- SMS gateway: Matches SLA (which has SMS). Sobriety Hub claims but unverified.

---

## 10. Module 8: Reporting & Dashboards

### 10.1 Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| RPT-01 | Occupancy dashboard | Real-time occupancy rates per house/property/org; trends; vacancy forecast | P0 |
| RPT-02 | Financial dashboard | Revenue, collections, outstanding, aging report; per house/property/org | P0 |
| RPT-03 | Operations dashboard | Chore completion rates, meeting compliance, incident counts, drug test results summary | P0 |
| RPT-04 | Admissions dashboard | Pipeline metrics, lead-to-admission conversion, referral source breakdown | P1 |
| RPT-05 | Compliance dashboard | Consent status, expiring consents, disclosure counts, audit log summary, BAA status | P0 |
| RPT-06 | Outcomes tracking | Recovery milestones, program completion rates, length of stay, relapse rates (aggregate) | P1 |
| RPT-07 | Grant-ready reports | GPRA-compatible outcome measures; anonymized aggregate data; one-click export | P1 |
| RPT-08 | NARR compliance reports | Documentation completeness per NARR level requirements | P2 |
| RPT-09 | Custom report builder | Select dimensions, measures, filters; save and schedule reports | P2 |
| RPT-10 | Scheduled reports | Email reports on schedule (daily/weekly/monthly) to designated recipients | P2 |
| RPT-11 | Data export | Export any report as CSV, PDF, or JSON | P0 |
| RPT-12 | Multi-property comparisons | Compare metrics across houses/properties side-by-side | P1 |

### 10.2 Acceptance Criteria

- **RPT-01**: Dashboard shows: current occupancy (count and %), trend chart (30/60/90 days), vacancy count, waitlist count, average length of stay. Filterable by property/house.
- **RPT-02**: Financial dashboard shows: MTD revenue, MTD collections, collection rate, outstanding balance, aging buckets (0-30, 31-60, 61-90, 90+), top delinquent accounts.
- **RPT-05**: Compliance dashboard shows: active consent count by status, consents expiring within 30 days, disclosure count this period, audit log event counts by category, open incidents. Red/yellow/green status indicators.
- **RPT-07**: GPRA reports include: employment status at intake/discharge, housing stability, substance use frequency, arrests, mental health status. All data anonymized (no PII/Part 2 in export). Format compatible with SAMHSA GPRA reporting.
- **RPT-11**: All exports respect Part 2 compliance. Exports containing Part 2 data include redisclosure notice. Export events logged in audit trail.

### 10.3 Competitive Parity

- Outcomes tracking: Matches Sobriety Hub (best-in-class). Exceeds SLA, Oathtrack. Oasis has none.
- Grant-ready reports: Exceeds all. Sobriety Hub has "coming soon." No other competitor.
- Compliance dashboard: UNIQUE. No competitor has this.
- Custom report builder: Matches Sobriety Hub (which has insights builder).

---

## 11. Module 9: Compliance & Consent Management

Full compliance specification is in [04_COMPLIANCE.md](04_COMPLIANCE.md). This section covers the user-facing features.

### 11.1 Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| CMP-01 | Consent creation wizard | Step-by-step consent creation with all 42 CFR 2.31 required fields | P0 |
| CMP-02 | Consent dashboard | Per-resident view of all consents: active, expired, revoked | P0 |
| CMP-03 | Consent revocation | Resident can revoke consent; immediate effect on data access | P0 |
| CMP-04 | Consent expiration monitoring | Automated alerts for expiring consents (30-day, 7-day) | P0 |
| CMP-05 | Consent verification | System checks active consent before any Part 2 data disclosure | P0 |
| CMP-06 | Redisclosure notice | Automatic notice attachment on all Part 2 data exports, shares, prints | P0 |
| CMP-07 | Accounting of disclosures | Track all disclosures; generate patient-facing report on request | P0 |
| CMP-08 | Patient notice | Digital Part 2 notice presented at intake; version tracking; re-acknowledgment | P0 |
| CMP-09 | BAA tracking | Track BAAs with customers and subprocessors; expiration alerts | P1 |
| CMP-10 | Compliance officer dashboard | Org-level compliance overview: consents, disclosures, incidents, audit summary | P0 |
| CMP-11 | Audit log viewer | Compliance officer views audit logs filtered by date, user, event type, resource | P0 |
| CMP-12 | Data access requests | Resident requests access to own records; tracked with 30-day SLA | P1 |
| CMP-13 | Amendment requests | Resident requests amendment to records; approve/deny workflow | P1 |
| CMP-14 | Breach incident workflow | Create, assess, track, and notify for potential breaches | P0 |
| CMP-15 | Privacy practices notice | Digital NPP; version tracking; resident acknowledgment | P1 |
| CMP-16 | Break-glass access | Emergency access to records with mandatory justification and elevated logging | P0 |

### 11.2 Acceptance Criteria

- **CMP-01**: Consent wizard enforces all 9 required fields from 42 CFR 2.31. Cannot save with missing fields. Supports consent types: specific disclosure, TPO general, research. Template library for common scenarios.
- **CMP-03**: Revocation is immediate. System sets consent to revoked status, blocks future disclosures under this consent, notifies relevant staff, and creates audit log entry. Does not retroactively affect prior disclosures.
- **CMP-07**: Disclosure accounting report includes: date, recipient name, address (if known), description of info disclosed, purpose. Covers 6-year lookback period. Generated within 60 days of request. First request per 12-month period is free. Events logged.
- **CMP-14**: Breach workflow follows 04_COMPLIANCE.md Section 8: detection -> containment -> assessment (4-factor risk assessment) -> notification -> remediation -> post-incident. Timeline tracking with 60-day notification deadline.
- **CMP-16**: Break-glass requires: selection of reason (medical emergency, legal requirement, patient safety), mandatory free-text justification, MFA re-verification. Compliance officer notified immediately. All actions during break-glass session have elevated logging.

---

## 12. Module 10: Permissions & Administration

### 12.1 Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| ADM-01 | User invitation | Invite users via email with role assignment | P0 |
| ADM-02 | Role assignment | Assign one of 9 roles to each user; role determines access per RBAC matrix | P0 |
| ADM-03 | User deactivation | Deactivate user; immediately invalidate all sessions; preserve audit history | P0 |
| ADM-04 | Session management | View active sessions per user; force-logout capability; 15-min auto-logoff | P0 |
| ADM-05 | MFA enforcement | All users require MFA (TOTP, SMS, or passkey); configurable per org | P0 |
| ADM-06 | Password policy | Minimum 12 characters; no reuse of last 12 passwords; enforced via auth provider | P0 |
| ADM-07 | User activity log | Per-user audit trail accessible to org admin/owner | P0 |
| ADM-08 | Role-based UI | UI surfaces only features/data the user's role permits; no hidden-but-accessible elements | P0 |
| ADM-09 | API key management | API keys for integrations; scoped to org; rotatable; audit logged | P2 |
| ADM-10 | Single sign-on | SSO via SAML/OIDC for enterprise customers | P2 |

### 12.2 Acceptance Criteria

- **ADM-01**: Invitation email includes: link to create account, role description, org name. Link expires in 72 hours. Invitation tracked in admin panel.
- **ADM-03**: Deactivation is immediate. All active sessions terminated. User cannot log in. User's data and audit history preserved. Reactivation possible by org admin.
- **ADM-05**: MFA setup required at first login. Backup codes provided. Lost MFA recovery via org admin identity verification + new MFA setup.
- **ADM-08**: Every UI component checks the current user's role before rendering. API endpoints enforce the same access rules. No security-through-obscurity; server-side enforcement is authoritative.

---

## 13. Key User Flows

### 13.1 New Resident Intake (End-to-End)

```
1. Lead Created (ADM-01 pipeline)
   ├── Source tracked (referral, self, court)
   ├── Basic info captured
   └── Assigned to pipeline stage: "Inquiry"

2. Screening
   ├── Eligibility check (ADM-09)
   ├── Phone/video interview scheduled
   └── Pipeline stage: "Screening"

3. Approval
   ├── Property/house manager reviews
   ├── Bed assigned (OCC-03) or waitlisted (OCC-05)
   └── Pipeline stage: "Approved"

4. Intake Meeting
   ├── Part 2 patient notice presented (CMP-08)
   ├── Part 2 consent forms created and signed (CMP-01, DOC-08)
   ├── Privacy practices notice signed (CMP-15)
   ├── Intake form completed (ADM-02)
   ├── Clinical assessments completed if applicable (ADM-04)
   ├── House rules signed (OPS-16)
   ├── Required documents uploaded (ADM-06)
   └── All documents e-signed in sequence (DOC-11)

5. Financial Setup
   ├── Rate configured (PAY-02)
   ├── Payer(s) added (PAY-08)
   ├── Deposit collected (PAY-14)
   ├── First invoice generated (PAY-03)
   └── Family/sponsor payment access configured (PAY-19)

6. Move-In
   ├── Bed assignment confirmed (OCC-03)
   ├── Resident account activated
   ├── PWA onboarding (first login, set password, MFA)
   ├── Chore rotation updated (OPS-02)
   └── Pipeline stage: "Admitted"
```

### 13.2 Monthly Billing Cycle

```
1. Invoice Generation (automated, start of cycle)
   ├── System calculates amount per resident
   ├── Proration applied for mid-cycle changes (PAY-11)
   ├── Invoice split across payers (PAY-09)
   └── Invoices sent via email + in-app notification

2. Payment Collection
   ├── Residents/payers pay via portal (PAY-18, PAY-19)
   ├── Staff records cash/check payments (PAY-06)
   ├── Each payment creates ledger entries (PAY-15)
   └── Payment confirmation sent

3. Reminders (automated)
   ├── Pre-due reminder (3 days before)
   ├── Due date reminder (day of)
   └── Past-due reminders per dunning schedule (PAY-13)

4. Dunning Escalation (if unpaid)
   ├── Day 1: Past-due reminder
   ├── Day 7: Warning notice
   ├── Day 14: Account suspension (limited app access)
   └── Day 30: Discharge review (property manager notified)

5. Month-End
   ├── Financial reports generated (PAY-20)
   ├── Reconciliation against Stripe payouts (PAY-16)
   └── Aging report updated (RPT-02)
```

### 13.3 Drug Test with Positive Result

```
1. Test Administration
   ├── House manager selects resident, test type
   ├── Records result (positive/negative/inconclusive)
   ├── Result stored as Part 2 protected data (field-level encrypted)
   └── Audit log: drug_test_created

2. Positive Result Processing
   ├── Configurable workflow triggered:
   │   ├── Option A: Notification to property manager only
   │   ├── Option B: Auto-create incident report
   │   └── Option C: Initiate discharge review
   ├── Result visible only to staff with Part 2 access + active consent
   └── Audit log: drug_test_viewed (each access)

3. Disclosure (if needed)
   ├── System checks active consent for recipient
   ├── If consent valid: data disclosed with redisclosure notice
   ├── If no consent: disclosure blocked, staff notified
   └── Audit log: disclosure_made or disclosure_blocked_no_consent
```

### 13.4 Part 2 Consent Revocation

```
1. Resident Requests Revocation
   ├── Via resident portal or in-person (staff-assisted)
   ├── System confirms resident identity (authenticated session or staff verification)
   └── System displays consent details for confirmation

2. Revocation Processing
   ├── Consent status set to "revoked" immediately
   ├── All future disclosures under this consent blocked
   ├── Affected staff notified
   ├── Family/sponsor access gated by this consent is revoked
   └── Audit log: consent_revoked

3. Impact Assessment
   ├── System shows which data sharing is affected
   ├── Staff reviews remaining active consents
   └── If no remaining consents for a recipient, their access is fully blocked
```

### 13.5 Resident Discharge

```
1. Initiate Discharge
   ├── Reason selected: program completion, voluntary, involuntary, transfer, AMA
   ├── Discharge date set (current or future)
   └── Discharge notes recorded

2. Financial Close-Out
   ├── Final invoice generated with proration (PAY-11)
   ├── Outstanding balance calculated
   ├── Deposit refund processed minus deductions (PAY-14)
   └── Payer notifications sent

3. Operational Close-Out
   ├── Bed status updated to available (OCC-08)
   ├── Chore rotation updated (OPS-02)
   ├── Keys/property return recorded
   └── Waitlist checked for next admission (OCC-05)

4. Record Management
   ├── Resident status set to "alumni" or "discharged"
   ├── Active consents reviewed: expire or maintain per terms
   ├── Document retention scheduling triggered (DOC-05)
   ├── Records retained per retention policy (minimum 6 years for Part 2)
   └── Resident retains read-only access to own records

5. Outcomes Recording
   ├── Discharge assessment completed (if applicable)
   ├── Outcomes data captured for reporting (RPT-06)
   └── Alumni tracking initiated (if opted in, OPS-14)
```

---

## 14. Screen Inventory

### 14.1 Operator CRM (Web, Desktop-First)

| Area | Screen | Key Components |
|------|--------|----------------|
| **Dashboard** | Home | Occupancy summary, revenue today/MTD, action items, recent activity, expiring consents |
| **Occupancy** | Bed Grid | Visual bed map, color-coded status, click-to-assign |
| | Waitlist | Queue table, priority ordering, quick-admit action |
| **Admissions** | Pipeline Board | Kanban board with pipeline stages, lead cards, drag-and-drop |
| | Lead Detail | Contact info, referral source, notes, screening status, documents |
| | Intake Wizard | Multi-step form: info > consents > documents > financial > bed assignment |
| **Residents** | Resident List | Searchable/filterable table of all residents with status indicators |
| | Resident Profile | Tabs: overview, compliance, financials, operations, documents, messages, history |
| | Resident Overview | Photo, room, move-in date, key contacts, active consents summary |
| | Resident Compliance | Consent list, disclosure log, Part 2 data access log |
| | Resident Financials | Balance, payment history, upcoming invoices, payer list |
| | Resident Operations | Chore status, meeting compliance, pass history, drug test history, incidents |
| | Resident Documents | Document list by category, upload, sign, share |
| **Billing** | Invoice List | All invoices with status filter (draft, sent, paid, overdue, void) |
| | Invoice Detail | Line items, payments applied, balance, send/resend actions |
| | Payments | Payment log with method, amount, date, payer, receipt |
| | Ledger | Double-entry ledger view; debit/credit; filterable by account, date range |
| | Reconciliation | Stripe payout matching; unmatched items; reconciliation status |
| | Rate Configuration | Per-house rate table; custom resident rates |
| **Operations** | Chore Board | House view of chore assignments, completion status, rotation schedule |
| | Meeting Tracker | Meeting log; per-resident compliance status vs. requirements |
| | Pass Manager | Active/pending pass requests; approve/deny; history |
| | Drug Test Log | Test results list; schedule; result entry form |
| | Incident List | Incident log; severity filter; resolution status |
| | Daily Check-In | Attendance roster; mark present/absent |
| **Documents** | Document Library | Org-wide document list; filter by type, resident, status |
| | Template Manager | Create/edit document templates; conditional logic builder |
| | Retention Dashboard | Documents approaching retention expiry; legal holds; destruction queue |
| **Messages** | Inbox | Conversation list; unread indicators; search |
| | Conversation | Message thread; file attachments; Part 2 consent status indicator |
| | Announcements | Announcement list; read tracking; create new |
| **Reports** | Occupancy Report | Occupancy trends, charts, export |
| | Financial Report | Revenue, collections, aging, P&L; date range picker |
| | Operations Report | Chore completion, meeting compliance, incidents; house comparison |
| | Compliance Report | Consent status, disclosure counts, audit summary |
| | Outcomes Report | Recovery metrics, program completion, length of stay |
| | Grant Report | GPRA-compatible anonymized aggregate export |
| **Compliance** | Consent Manager | All consents across org; filter by status, resident, expiration |
| | Disclosure Log | All disclosures with details; exportable for accounting requests |
| | Audit Viewer | Searchable/filterable audit log (compliance officer only) |
| | BAA Tracker | List of BAAs with status, expiration, signed copies |
| | Breach Manager | Active/resolved breach incidents; assessment workflow |
| **Admin** | User Management | User list; invite, deactivate, role assignment |
| | Org Settings | General settings, compliance config, integrations |
| | Property/House Config | Hierarchy management; house settings |
| | Billing/Subscription | Plan, usage, invoices from RecoveryOS |

### 14.2 Resident PWA (Mobile-First)

| Screen | Key Components |
|--------|----------------|
| **Home** | Balance due, next chore, upcoming meetings, recent messages, quick-pay button |
| **Payments** | Current balance, payment button, payment history, upcoming invoices |
| **Schedule** | Chore assignments, meeting schedule, curfew times, pass status |
| **Messages** | Conversations, house announcements, notifications |
| **Documents** | My documents, pending signatures, consent records |
| **Profile** | Personal info (editable within permissions), emergency contacts, settings |
| **My Records** | View own records (Part 2 rights); request amendment; request accounting of disclosures |

### 14.3 Family/Sponsor Portal (Web/Mobile)

| Screen | Key Components |
|--------|----------------|
| **Home** | Consent status, payment summary, quick-pay |
| **Payments** | Make payment, payment history, upcoming invoices |
| **Messages** | Message thread with house manager (consent-gated) |
| **Updates** | Permitted updates per consent (e.g., general status, milestones) |

### 14.4 Referral Partner Portal (Web)

| Screen | Key Components |
|--------|----------------|
| **Dashboard** | Referred residents list, consent status |
| **Resident Status** | Consent-gated view of referred resident's permitted information |
| **Reports** | Aggregate outcomes for referred residents |

---

## 15. Non-Functional Requirements

### 15.1 Performance

| Requirement | Target |
|-------------|--------|
| Page load time | < 2s (First Contentful Paint) |
| API response time (p95) | < 500ms |
| Real-time message delivery | < 1s |
| Dashboard load with 500 beds | < 2s |
| Search results | < 1s |
| Concurrent users per org | 100+ without degradation |
| PDF report generation | < 10s for standard reports |

### 15.2 Availability

| Requirement | Target |
|-------------|--------|
| Uptime | 99.9% (8.7 hours downtime/year max) |
| Planned maintenance window | Sundays 2-6 AM ET, with 72-hour notice |
| Recovery Time Objective (RTO) | < 4 hours |
| Recovery Point Objective (RPO) | < 1 hour |

### 15.3 Scalability

| Dimension | Target |
|-----------|--------|
| Organizations | 10,000+ |
| Residents per org | 10,000+ |
| Concurrent users (platform) | 50,000+ |
| Audit log entries | 1B+ (with tiered storage) |
| File storage | Unlimited (S3-backed) |

### 15.4 Security

Full specification in [04_COMPLIANCE.md](04_COMPLIANCE.md). Summary:

- AES-256 encryption at rest; field-level encryption for Part 2 data
- TLS 1.2+ in transit; HSTS enforced
- MFA required for all users
- 15-minute session timeout (configurable 5-30 min)
- OWASP Top 10 mitigations
- Annual penetration testing
- SOC 2 Type II target (Year 1)

### 15.5 Accessibility

| Requirement | Standard |
|-------------|----------|
| WCAG compliance | 2.1 Level AA |
| Screen reader support | Full |
| Keyboard navigation | Full |
| Color contrast | Minimum 4.5:1 ratio |
| Responsive design | Desktop (1024px+), tablet (768px+), mobile (320px+) |

### 15.6 Browser/Platform Support

| Platform | Support |
|----------|---------|
| Chrome (latest 2 versions) | Full |
| Firefox (latest 2 versions) | Full |
| Safari (latest 2 versions) | Full |
| Edge (latest 2 versions) | Full |
| iOS Safari (PWA) | Full |
| Android Chrome (PWA) | Full |

### 15.7 Data Residency

- All data stored in US data centers
- No data transfer outside US without explicit consent
- Cloud provider must have HIPAA BAA and SOC 2 Type II

---

## 16. Glossary

| Term | Definition |
|------|-----------|
| **BAA** | Business Associate Agreement (45 CFR 164.504(e)) |
| **Break-glass** | Emergency access procedure bypassing normal access controls with elevated logging |
| **Dunning** | Escalating collection process for overdue payments |
| **GPRA** | Government Performance and Results Act; federal outcome reporting framework |
| **HIPAA** | Health Insurance Portability and Accountability Act (Public Law 104-191) |
| **MAT** | Medication-Assisted Treatment (e.g., methadone, buprenorphine) |
| **MFA** | Multi-Factor Authentication |
| **NARR** | National Alliance for Recovery Residences; certifies recovery homes at 4 levels |
| **NPP** | Notice of Privacy Practices (45 CFR 164.520) |
| **Part 2** | 42 CFR Part 2; federal regulations protecting SUD patient records |
| **PHI** | Protected Health Information (45 CFR 160.103) |
| **PII** | Personally Identifiable Information |
| **Proration** | Calculating partial-period charges for mid-cycle move-in/out |
| **PWA** | Progressive Web App; installable web application with offline capabilities |
| **QSOA** | Qualified Service Organization Agreement (42 CFR 2.11) |
| **RBAC** | Role-Based Access Control |
| **Redisclosure notice** | Required notice under 42 CFR 2.32 prohibiting further disclosure of Part 2 records |
| **RLS** | Row-Level Security; database-enforced data isolation |
| **SUD** | Substance Use Disorder |
| **TPO** | Treatment, Payment, and Health Care Operations |

---

*Document prepared by product-lead for RecoveryOS.*
*Cross-referenced with: 00_NORTH_STAR.md (vision), 04_COMPLIANCE.md (compliance spec), research/competitors.md (feature parity), research/gaps.md (differentiation), research/regulations.md (regulatory requirements).*
