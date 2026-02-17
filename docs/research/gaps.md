# Competitive Gaps Analysis

**Date:** February 11, 2026
**Phase:** 1-RESEARCH
**Input:** competitors.md feature matrix, regulations.md compliance requirements

---

## The RecoveryOS Thesis

Every competitor in the sober living software market has built operational tools while ignoring the regulatory foundation. With the 42 CFR Part 2 final rule taking effect February 16, 2026, the entire market is exposed. RecoveryOS will be the first platform built compliance-first, with a payments engine and operational depth that matches or exceeds every competitor.

---

## Priority 1: Compliance Moat (No Competitor Has This)

### Gap: Zero verified 42 CFR Part 2 compliance across the market

**What's missing from ALL competitors:**
- No consent management for SUD records (required by 42 CFR 2.31)
- No redisclosure prohibition controls (42 CFR 2.32)
- No accounting of disclosures (42 CFR 2.24 -- effective Feb 16, 2026)
- No Part 2-compliant breach notification procedures
- No 6-year audit trail retention
- No BAA publicly available from any competitor
- No SOC 2 or third-party security certification from any competitor
- No consent tracking, revocation workflows, or minimum necessary access controls

**Why it matters:**
- February 16, 2026 deadline makes this immediately urgent
- Recovery housing operators handling SUD records ARE subject to 42 CFR Part 2 when receiving federal assistance (Medicaid, SAMHSA grants, etc.)
- Criminal penalties for 42 CFR Part 2 violations (42 USC 290dd-2)
- Operators who understand the risk will actively seek compliant software
- This creates switching cost: once on a compliant platform, moving to a non-compliant one is a liability

**RecoveryOS approach:**
- Consent management built into the data model (consent records, expiration, revocation)
- Redisclosure notice automatically attached to shared records
- Immutable audit log with 6-year retention
- Role-based access enforcing minimum necessary standard
- BAA available on website from day one
- SOC 2 Type II audit planned for Year 1

**Competitive advantage:** Existential -- this is not a feature, it's a market requirement that nobody meets.

---

## Priority 2: Payments Engine (Weakest Area Across All Competitors)

### Gap: No competitor has reconciliation, proration, or a true ledger

**What's missing:**
| Missing Feature | SLA | Oathtrack | Sobriety Hub | Oasis |
|----------------|:---:|:---------:|:------------:|:-----:|
| Bank reconciliation | No | No | No | No |
| Payment proration | No | No | No | No |
| Double-entry ledger | No | No | No | No |
| Multi-payer with split billing | Partial | No | No | No |
| Dunning escalation workflow | Partial | No | No | No |
| Deposit management + refunds | Not documented | No | No | No |
| Stripe Connect for operators | No | No | No | No |

**Why it matters:**
- Operators spend hours on manual reconciliation with spreadsheets
- Mid-month move-ins/outs require manual proration calculations
- Family/sponsor/agency payments are common but only SLA partially supports them
- No competitor offers operator-controlled Stripe Connect for direct payouts
- Financial accuracy is critical for audit trails and compliance

**RecoveryOS approach:**
- Double-entry ledger as source of truth for all money movement
- Stripe Connect giving operators direct payout control
- Automated proration for mid-cycle changes
- Multi-payer support (resident, family, sponsor, agency, insurance)
- Configurable dunning ladder (reminder > warning > suspension > discharge)
- Bank reconciliation tools
- Full deposit lifecycle (collection, hold, refund)

**Competitive advantage:** Transformational -- operators currently cobble together QuickBooks + spreadsheets + their sober living app. RecoveryOS replaces all of it.

---

## Priority 3: Enterprise Architecture (Multi-Org Gap)

### Gap: No competitor supports true multi-organization management

**Current state:**
- SLA: Multi-property, but multi-org not documented
- Oathtrack: Claims "multi-enterprise" but details unclear
- Sobriety Hub: Single-org only
- Oasis: Multi-house but not multi-org

**Why it matters:**
- Management companies operate multiple brands/entities across states
- Each entity may have separate licensing, compliance requirements, and financial reporting
- Franchise models require org-level isolation with rollup reporting
- Growth operators need to add new entities without re-implementing

**RecoveryOS approach:**
- Organization > Property > House hierarchy
- Per-organization compliance settings, BAAs, and consent templates
- Cross-org rollup dashboards for management companies
- Entity-level financial isolation with consolidated reporting
- 9 user roles with organization-scoped RBAC

**Competitive advantage:** Unlocks the enterprise/management company segment that no competitor serves well.

---

## Priority 4: Document Lifecycle (Universal Gap)

### Gap: No competitor has document retention policies or compliance-grade document management

**What's missing from ALL competitors:**
- No automated retention scheduling (HIPAA requires 6 years for medical records)
- No legal hold capabilities
- No document destruction workflows with audit trails
- No version history with change tracking
- No Part 2 consent document lifecycle management

**Why it matters:**
- HIPAA requires 6-year retention of medical records
- 42 CFR Part 2 requires retention of consent forms and disclosure records
- State laws may require longer retention
- Over-retention creates liability; under-retention creates compliance violations
- Operators currently have no automated way to manage this

**RecoveryOS approach:**
- Configurable retention policies per document type
- Automated retention scheduling with pre-destruction review
- Legal hold override for litigation
- Version history with field-level change tracking
- Consent document lifecycle (creation > active > expired > archived)
- Destruction workflow with immutable audit record

**Competitive advantage:** Compliance-grade document management that no competitor offers.

---

## Priority 5: Unified Communications (Fragmented Across Market)

### Gap: No competitor has a complete, integrated communication system

**Current state:**
- SLA: In-app messaging + SMS + family communication, but no group chat or broadcast
- Oathtrack: Messaging requires a SEPARATE app (last updated Aug 2021)
- Sobriety Hub: Best messaging (DM, group chat, announcements) but no SMS or family
- Oasis: No messaging at all (only AI call system)

**RecoveryOS approach:**
- Unified messaging in a single app (no separate downloads)
- Direct messages, group chats, house-wide announcements
- SMS gateway for residents without the app
- Family/sponsor communication channel with Part 2-compliant access controls
- Message retention with audit trail
- Consent-gated communication (Part 2 compliance)

**Competitive advantage:** Only platform where ALL communication happens in one place with compliance built in.

---

## Priority 6: Outcomes & Grant Readiness

### Gap: Only Sobriety Hub has meaningful outcomes tracking; grant-ready reports don't exist yet

**Current state:**
- Sobriety Hub: Best-in-class outcomes (automated from daily ops, custom insights builder)
- SLA: Basic outcome metrics
- Oathtrack: 76% completion rate tracked, but limited reporting
- Oasis: No outcomes tracking

**RecoveryOS approach:**
- Automated outcomes collection from daily operations (like Sobriety Hub)
- GPRA-compatible outcome measures for federal reporting
- One-click grant reports with anonymized, aggregate data
- Compliance reports for NARR certification, state licensing, and federal grants
- Exportable data for research partnerships

**Competitive advantage:** Grant-ready reports that Sobriety Hub promises but hasn't delivered. GPRA compatibility for federal grantees.

---

## Priority 7: Best-of-Breed Intake

### Gap: Each competitor excels at one piece of intake; none have it all

**Best features to combine:**
| Feature | Best Implementation | Source |
|---------|-------------------|--------|
| Admissions CRM + lead tracking | Sober Living App | competitor-sober-living-app.md |
| Conditional form logic | Sobriety Hub | competitor-sobriety-hub.md |
| Clinical assessments (BARC-10, PHQ-9) | Sobriety Hub | competitor-sobriety-hub.md |
| Background check integration | Sober Living App | competitor-sober-living-app.md |
| AI call routing | Oasis | competitor-oasis.md |
| E-signature on intake | All except Oasis | multiple |

**RecoveryOS approach:**
- Full admissions CRM with pipeline stages
- Conditional form builder with clinical assessment templates
- Integrated background check API
- E-signature with Part 2 consent forms built in
- AI-assisted intake screening (future)

---

## Underserved Market Segments

### 1. Management Companies (Multi-Entity Operators)
- No competitor supports true multi-org architecture
- These operators manage 10-50+ houses across multiple entities
- They need consolidated reporting, entity isolation, and franchise-like management
- High ARPU potential ($500-2,000/month)

### 2. State-Funded / Medicaid-Connected Programs
- These programs are DEFINITELY subject to 42 CFR Part 2
- No competitor can demonstrate Part 2 compliance
- GPRA reporting requirements go unmet
- Grant applications need outcome data that only Sobriety Hub partially provides

### 3. NARR Level 3-4 Certified Homes
- Higher certification levels require more documentation
- No competitor provides NARR-specific compliance tracking
- These homes have clinical staff needing clinical tools (assessments, treatment plans)

### 4. Family/Sponsor Payers
- Only SLA has a family portal
- Families paying rent want visibility and payment control
- Sponsors and agencies need reporting on their funded residents
- Part 2 consent is required for sharing info with payers

---

## Competitive Positioning Summary

```
                    LOW COMPLIANCE ──────────────── HIGH COMPLIANCE
                    │                                      │
    BASIC           │  Oasis          │                    │
    FEATURES        │  (early stage)  │                    │
                    │                 │                    │
                    ├─────────────────┼────────────────────┤
                    │                 │                    │
    MODERATE        │  Oathtrack      │  Sobriety Hub     │
    FEATURES        │  (strong ops)   │  (strong forms)   │
                    │                 │                    │
                    ├─────────────────┼────────────────────┤
                    │                 │                    │
    COMPREHENSIVE   │  Sober Living   │                    │
    FEATURES        │  App            │   RecoveryOS      │
                    │  (most features)│   (TARGET)        │
                    │                 │                    │
                    LOW COMPLIANCE ──────────────── HIGH COMPLIANCE
```

RecoveryOS targets the upper-right quadrant: comprehensive features AND verified compliance. No competitor occupies this space.

---

## Top 10 Differentiators (Ranked by Impact)

1. **42 CFR Part 2 compliance** -- Only platform with consent management, redisclosure controls, and accounting of disclosures
2. **Double-entry payment ledger with reconciliation** -- No competitor has this
3. **Multi-org, multi-property, multi-house architecture** -- Enterprise segment unlocked
4. **Public BAA + SOC 2 roadmap** -- Verifiable compliance, not self-attested claims
5. **Proration + multi-payer + dunning** -- Complete payment lifecycle
6. **Document retention policies** -- Compliance-grade document lifecycle
7. **9-role RBAC with granular permissions** -- vs 2-3 roles from competitors
8. **Immutable audit logging with 6-year retention** -- Required by regulation, offered by none
9. **Grant-ready GPRA-compatible reports** -- Unlocks state-funded programs
10. **Unified communications with Part 2 consent gating** -- All messaging in one app with compliance

---

*Cross-referenced with: docs/research/regulations.md (HIPAA + 42 CFR Part 2 requirements)*
*Based on: 148 URL citations across 4 competitor analyses*
