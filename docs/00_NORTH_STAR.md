# RecoveryOS - North Star

> **Status**: Final
> **Owner**: product-lead
> **Last Updated**: 2026-02-11

---

## 1. Mission

RecoveryOS exists because the recovery housing industry has operational software but zero compliance infrastructure.

Four competitors serve this market. All help operators manage beds, collect rent, and track chores. None can demonstrate HIPAA compliance with a public BAA. None implement 42 CFR Part 2 consent management, redisclosure controls, or accounting of disclosures. None hold SOC 2 or any third-party security certification. (See [competitors.md](research/competitors.md), Compliance section.)

This matters now. The 42 CFR Part 2 final rule (89 FR 12472) takes effect **February 16, 2026**, requiring accounting of disclosures and HIPAA breach notification for substance use disorder records. Every sober living facility that accepts Medicaid, SAMHSA grants, or holds tax-exempt status is subject to these rules. Their current software cannot help them comply. (See [regulations.md](research/regulations.md), 42 CFR Part 2 section.)

RecoveryOS is the first recovery housing platform built compliance-first: consent management in the data model, immutable audit logging, role-based access enforcing minimum necessary, and a public BAA from day one. On top of that foundation, we build the most complete operational and financial toolset in the market.

---

## 2. Vision

Recovery housing operators run compliant, efficient, financially healthy programs -- on one platform that replaces their patchwork of spreadsheets, QuickBooks, paper forms, and non-compliant software.

Operators stop worrying about regulatory exposure. House managers focus on residents, not paperwork. Residents interact with a simple app that respects their privacy. Families and sponsors pay and stay informed through consent-gated access. State agencies and grantors receive standardized outcome reports without operators scrambling at audit time.

---

## 3. Target Market

### Primary
Recovery housing operators: sober living homes, halfway houses, transitional living facilities, and recovery residences at all NARR certification levels (1-4).

### Segments

| Segment | Description | Size Signal |
|---------|-------------|-------------|
| **Single-house operators** | 1-2 houses, owner-operated | Largest by count; price-sensitive |
| **Multi-property operators** | 3-20 houses, dedicated staff | Core market; willing to pay for efficiency |
| **Management companies** | Multi-entity, multi-state, 20-100+ houses | Highest ARPU ($500-2,000/mo); underserved by all competitors |

### Key Personas

| Persona | Primary Need | Platform |
|---------|-------------|----------|
| **Owner/Operator** | Occupancy, revenue, compliance confidence | Web CRM (desktop) |
| **House Manager** | Daily ops, resident tracking, incident management | Web CRM + mobile |
| **House Monitor** | Check-ins, curfew, chore verification | Mobile |
| **Resident** | Pay rent, view schedule, communicate | PWA (mobile) |
| **Family/Sponsor** | Make payments, see permitted updates | PWA (mobile) |
| **External Provider** | Access consented information only | Limited web portal |

---

## 4. Positioning

**For** recovery housing operators who need to run compliant, efficient programs,
**RecoveryOS is** the all-in-one management platform
**that** combines verified regulatory compliance (HIPAA + 42 CFR Part 2) with a complete payments engine and operational toolkit,
**unlike** Sober Living App, Oathtrack, Sobriety Hub, and Oasis,
**which** offer operational features but cannot demonstrate compliance with the federal regulations that govern their customers' data.

---

## 5. Core Differentiators

Ranked by competitive impact. Source: [gaps.md](research/gaps.md), Top 10 Differentiators.

### 1. 42 CFR Part 2 Compliance
**What**: Consent management (all 2.31 elements), redisclosure controls (2.32 notice), accounting of disclosures (2.24), and Part 2-compliant breach notification.

**Why it matters**: The Feb 16, 2026 deadline means operators handling SUD records at federally assisted programs face criminal penalties (42 USC 290dd-2) for non-compliance. No competitor has any of this. This is not a feature -- it is a market requirement that creates permanent switching cost.

### 2. Double-Entry Payment Ledger with Reconciliation
**What**: Stripe Connect for direct operator payouts, automated proration, bank reconciliation, and a double-entry ledger as the source of truth for all money movement.

**Why it matters**: Operators currently cobble together their sober living app + QuickBooks + spreadsheets for financial management. No competitor offers reconciliation or proration. (See [competitors.md](research/competitors.md), Billing/Payments section -- every cell for reconciliation and proration is "No" across all four competitors.)

### 3. Multi-Org, Multi-Property, Multi-House Architecture
**What**: Organization > Property > House hierarchy with per-org compliance settings, entity-level financial isolation, and cross-org rollup dashboards.

**Why it matters**: Management companies running 10-50+ houses across multiple legal entities are the highest-value segment ($500-2,000/mo ARPU). No competitor has true multi-org support. SLA and Oathtrack have multi-property, but not multi-entity isolation with consolidated reporting.

### 4. Public BAA + SOC 2 Roadmap
**What**: BAA available on the website from launch. SOC 2 Type II audit in Year 1.

**Why it matters**: No competitor publishes a BAA. No competitor holds SOC 2 or any third-party certification. Operators who understand HIPAA liability (45 CFR 164.504(e)) cannot legally use a platform that won't sign a BAA. This is table stakes that nobody offers.

### 5. Complete Payment Lifecycle (Proration + Multi-Payer + Dunning)
**What**: Mid-cycle proration, multi-payer support (resident, family, sponsor, agency, insurance), configurable dunning ladder (reminder > warning > suspension > discharge), deposit lifecycle (collection, hold, refund).

**Why it matters**: Only SLA has multi-payer, and only partially. Mid-month move-ins require manual calculation everywhere. Family/sponsor payments are common but poorly supported. RecoveryOS handles the full lifecycle in one place.

### 6. Compliance-Grade Document Management
**What**: Configurable retention policies per document type, automated retention scheduling with pre-destruction review, legal hold, version history, consent document lifecycle management.

**Why it matters**: HIPAA requires 6-year retention of medical records. 42 CFR Part 2 requires retention of consent forms and disclosure records. No competitor has retention policies -- not one. Over-retention creates liability; under-retention creates violations.

### 7. 9-Role RBAC with Granular Permissions
**What**: Super Admin, Org Admin, Property Manager, House Manager, House Monitor, Resident, Alumni, Family Contact, External Provider -- each with minimum necessary access controls.

**Why it matters**: Competitors offer 2-3 roles. The minimum necessary standard (45 CFR 164.514(d)) requires limiting access to what each role needs. Part 2 data must be segregable with explicit authorization. Coarse RBAC cannot satisfy these requirements.

### 8. Immutable Audit Logging with 6-Year Retention
**What**: Append-only, tamper-evident audit log recording every access, modification, disclosure, consent action, and permission change. 6-year retention.

**Why it matters**: 42 CFR 2.25 requires formal audit policies. 42 CFR 2.24 (effective Feb 16, 2026) requires accounting of disclosures. HIPAA 164.312(b) requires audit controls. Competitors either claim audit logging without specifics or don't mention it at all.

### 9. Grant-Ready GPRA-Compatible Reports
**What**: Automated outcomes collection from daily operations, GPRA-compatible measures for federal reporting, one-click grant reports with anonymized aggregate data.

**Why it matters**: State-funded and Medicaid-connected programs need outcome data for SAMHSA grants and GPRA reporting. Sobriety Hub is "coming soon" on grant reports. Nobody else is close. This unlocks the entire state-funded program segment.

### 10. Unified Communications with Part 2 Consent Gating
**What**: DMs, group chat, house-wide announcements, SMS gateway, family/sponsor communication -- all in one app, all with Part 2-compliant consent checks.

**Why it matters**: Oathtrack requires a separate messaging app (last updated Aug 2021). Oasis has no messaging. SLA has no group chat. Sobriety Hub has no SMS or family messaging. No competitor gates communication on consent status, which is a Part 2 requirement when sharing SUD-related information.

---

## 6. Competitive Landscape

### Positioning Matrix

```
                    LOW COMPLIANCE ──────────────── HIGH COMPLIANCE
                    |                                      |
    BASIC           |  Oasis          |                    |
    FEATURES        |  (early stage)  |                    |
                    |                 |                    |
                    |-----------------|-------- -----------|
                    |                 |                    |
    MODERATE        |  Oathtrack      |  Sobriety Hub     |
    FEATURES        |  (strong ops)   |  (strong forms)   |
                    |                 |                    |
                    |-----------------|-------- -----------|
                    |                 |                    |
    COMPREHENSIVE   |  Sober Living   |                    |
    FEATURES        |  App            |   RecoveryOS      |
                    |  (most features)|   (TARGET)        |
                    |                 |                    |
                    LOW COMPLIANCE ──────────────── HIGH COMPLIANCE
```

RecoveryOS targets the upper-right quadrant: comprehensive features AND verified compliance. No competitor occupies this space. (Source: [gaps.md](research/gaps.md), Competitive Positioning Summary.)

### Per-Competitor Summary

| Competitor | Strength | Weakness | Customers |
|-----------|----------|----------|-----------|
| **Sober Living App** (Behave Health) | Most features, NARR partnership, 2,000+ facilities | No public BAA, no Part 2 implementation, opaque pricing | Largest installed base |
| **Oathtrack** | Strong house ops (location, mood, alumni), $35M+ processed | Best features locked behind Diamond tier, no compliance infrastructure, separate messaging app | 700+ houses |
| **Sobriety Hub** | Best forms (conditional logic, clinical assessments), transparent pricing, fast-growing | No Part 2, no reconciliation, no multi-org | 100+ homes, newest entrant |
| **Oasis** | AI call management, low pricing | Very early stage, no payments, no messaging, no e-sign | Undisclosed |

### What This Means
The market leader (SLA) won on features and NARR partnerships. Every competitor followed the same playbook: build operational tools, ignore compliance. The Feb 16, 2026 regulatory deadline changes the game. RecoveryOS enters with the compliance moat that none of them can quickly replicate, plus a payments engine and operational depth that matches or exceeds the market leader.

---

## 7. Product Principles

### Compliance by design, not bolted on
Consent management, audit logging, access controls, and encryption are in the data model and architecture -- not a checkbox added after launch. Every feature is designed through the lens of "does this satisfy HIPAA and 42 CFR Part 2?"

### Operator-first, resident-friendly
The primary experience is a desktop CRM for operators and house managers who spend hours daily managing their programs. The secondary experience is a PWA for residents that is simple, fast, and respects their privacy. Both are one platform -- no separate app downloads for messaging or other features.

### One platform replaces everything
Operators should not need QuickBooks for accounting, spreadsheets for reconciliation, DocuSign for forms, a separate app for messaging, and another tool for compliance. RecoveryOS handles billing, documents, e-sign, communications, compliance, and operations in one place.

### Transparent pricing
SLA requires a sales call for pricing. Oathtrack locks key features behind Diamond tier. RecoveryOS publishes pricing on the website. Compliance features are included, not upsold.

### Minimum viable bureaucracy
Recovery housing operators are not enterprise IT departments. Setup should take hours, not weeks. The platform should guide operators toward compliance without requiring them to become HIPAA experts. Smart defaults, not configuration marathons.

---

## 8. Success Metrics

### Year 1

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Facilities onboarded | 200+ | Establishes market presence |
| Monthly payment volume | $2M+ | Validates payments engine |
| BAA execution rate | 100% of customers | Compliance credibility |
| SOC 2 Type II | Achieved | First in market; verifiable trust |
| Uptime | 99.9% | Reliability for daily operations |

### Year 2

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Facilities onboarded | 1,000+ | Approaching SLA's early traction |
| Management company accounts | 20+ | Enterprise segment validation |
| NARR affiliate partnerships | 5+ states | Distribution channel |
| Monthly payment volume | $10M+ | Payments as revenue driver |
| Zero compliance incidents | 0 breaches | The moat holds |

### Leading Indicators
- **Operator time saved**: Reduction in hours spent on manual reconciliation, compliance paperwork, and multi-tool juggling.
- **Compliance confidence**: Operator-reported confidence in audit readiness (survey).
- **Feature completeness vs. competitors**: Maintain parity or lead in every category of [competitors.md](research/competitors.md) feature matrix.

---

## References

- [Competitor Feature Matrix](research/competitors.md) -- 148 URL citations across 4 competitor analyses
- [Competitive Gaps Analysis](research/gaps.md) -- Top 10 differentiators, 7 priority opportunities, underserved segments
- [Regulatory Research](research/regulations.md) -- HIPAA + 42 CFR Part 2 with authoritative federal citations
- 42 CFR Part 2 Final Rule: [89 FR 12472](https://www.federalregister.gov/documents/2024/02/16/2024-02544/confidentiality-of-substance-use-disorder-sud-patient-records)
- HIPAA Security Rule: [45 CFR Part 164, Subpart C](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- NARR Standards: [narronline.org](https://narronline.org/affiliate-services/standards-and-certification/)
