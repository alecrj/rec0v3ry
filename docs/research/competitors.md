# Competitor Feature Matrix

**Date:** February 11, 2026
**Phase:** 1-RESEARCH
**Sources:** Individual competitor analyses (competitor-*.md) with 148 total URL citations

---

## Executive Summary

Four competitors serve the sober living management software market. **Sober Living App** (by Behave Health) is the most established with 2,000+ facilities and a NARR partnership. **Oathtrack** has strong house operations features and meaningful traction (700+ houses, $35M+ processed). **Sobriety Hub** is the fastest-growing newcomer with strong outcomes tracking and transparent pricing. **Oasis** is a very early-stage entrant with AI call management but major gaps. **None have verified 42 CFR Part 2 compliance** -- the single largest opportunity for RecoveryOS given the February 16, 2026 deadline.

---

## Company Overview

| | Sober Living App | Oathtrack | Sobriety Hub | Oasis |
|---|---|---|---|---|
| **Parent** | Behave Health Corp | Oathtrack LLC | Sobriety Hub Software | Adventive (A.I. Connect Sales LLC) |
| **Founded** | ~2015 | 2016 | 2023 | 2023 |
| **HQ** | San Francisco, CA | Philadelphia, PA | St. Louis, MO | Arizona |
| **Team Size** | ~8-9 | Small (solo founder) | ~6 | ~4 |
| **Funding** | Bootstrapped | Bootstrapped | Not disclosed | Pre-seed (Aug 2024) |
| **Customers** | 2,000+ facilities | 700+ houses | 100+ homes | Not disclosed |
| **Residents** | 50,000+ | 31,000+ | Not disclosed | Not disclosed |
| **NARR Partnership** | Yes (19 state affiliates) | No | Yes (AzRHA, WAQRR) | No |
| **Revenue** | ~$902K | Not disclosed | Not disclosed | Not disclosed |

---

## 1. Bed/Occupancy Management

| Feature | Sober Living App | Oathtrack | Sobriety Hub | Oasis |
|---------|:---:|:---:|:---:|:---:|
| Bed-level tracking | Yes | Yes | No (facility-level) | Yes |
| Occupancy dashboard | Yes | Yes | Partial | Yes |
| Waitlist management | Yes | No | No | No |
| Inter-property transfers | Partial | Partial | No | No |
| Capacity reporting | Yes | Yes | Partial | Yes |
| Bed assignment automation | Yes | No | No | No |

**RecoveryOS Opportunity:** Only SLA has waitlist. No competitor has a complete transfer workflow. Bed-level tracking + waitlist + automated assignment = major differentiator.

---

## 2. Admissions/Intake

| Feature | Sober Living App | Oathtrack | Sobriety Hub | Oasis |
|---------|:---:|:---:|:---:|:---:|
| Lead tracking/CRM | Yes | No | No | No |
| Digital intake forms | Yes | Yes | Yes | Yes |
| Document collection | Yes | Yes | Yes | Yes |
| Background checks | Yes | No | No | No |
| E-signature | Yes | Yes (Pro+) | Yes | No |
| Eligibility screening | Yes | No | No | No |
| Automated follow-ups | Yes | No | No | No |
| Clinical assessments | No | No | Yes (BARC-10, PHQ-9, etc.) | No |
| Conditional form logic | No | No | Yes | No |
| AI call routing | No | No | No | Yes |

**RecoveryOS Opportunity:** SLA leads in admissions CRM. Sobriety Hub has best forms (conditional logic, clinical assessments). Combine both approaches + background checks + AI.

---

## 3. Billing/Payments

| Feature | Sober Living App | Oathtrack | Sobriety Hub | Oasis |
|---------|:---:|:---:|:---:|:---:|
| Card payments | Yes | Yes | Yes | No |
| ACH payments | Yes | Yes | Yes | No |
| Cash/check recording | Yes | No | Partial | No |
| External methods (Venmo, Zelle) | Yes | No | Yes (Cash App) | No |
| Automated invoicing | Yes | No | Yes | No |
| Payment reminders | Yes | Yes | Yes | No |
| Late fee automation | Yes | No | No | No |
| Multi-payer (family/sponsor) | Yes | No | No | No |
| Payment plans | Yes | No | No | No |
| Ledger/balance tracking | Yes | Basic | Partial | No (uses QuickBooks) |
| Reconciliation | No | No | No | No |
| Proration | No | No | No | No |
| Dunning escalation | Partial (reminders + late fees) | Partial (reminders only) | Partial (reminders only) | No |
| Accounting integrations | Yes (QB, Xero, Sage, NetSuite) | No | No | Add-on (QB, Xero) |
| PCI compliance | Yes | Not documented | Not documented | Not documented |

**RecoveryOS Opportunity:** NO competitor has reconciliation or proration. Only SLA has multi-payer. This is the weakest area across all competitors -- a full payments engine with Stripe Connect, double-entry ledger, reconciliation, proration, and multi-payer is a massive differentiator.

---

## 4. Resident Portal

| Feature | Sober Living App | Oathtrack | Sobriety Hub | Oasis |
|---------|:---:|:---:|:---:|:---:|
| Native mobile app | Yes (iOS + Android) | Yes (iOS + Android) | Yes (Android confirmed) | No (web only) |
| Web portal | Yes | Yes | Yes | Yes |
| Payment portal | Yes | Yes | Yes | No |
| Task/schedule viewing | Yes | Yes | Yes | Yes |
| In-app messaging | Yes | Yes (separate app) | Yes | No |
| Push notifications | Yes | Not documented | Yes | No |
| Sobriety tracking | No | Yes | Yes | No |
| Family portal | Yes | No | No | No |

**RecoveryOS Opportunity:** Only SLA has a family portal. Oathtrack's messaging requires a separate app (last updated 2021). Build a unified PWA with family access.

---

## 5. House Operations

| Feature | Sober Living App | Oathtrack | Sobriety Hub | Oasis |
|---------|:---:|:---:|:---:|:---:|
| Chore tracking | Yes | Yes (Diamond) | Yes | Partial |
| Meeting attendance | Partial (program only) | Yes | Yes | Yes |
| Pass management | No | Yes (Diamond) | Yes | No |
| Curfew management | Yes | Yes (Diamond) | No | No |
| Drug testing | Yes | Yes | Yes | Yes |
| Task assignments | Yes | Yes | Partial | Yes |
| Incident reports | Yes | No | No | Yes |
| Location tracking | No | Yes (Diamond) | No | No |
| Mood tracking | No | Yes (AI-powered) | Yes | No |
| Alumni tracking | No | Yes | No | No |
| Maintenance requests | Yes | No | Yes | No |
| Vehicle tracking | Yes | No | No | No |

**RecoveryOS Opportunity:** Oathtrack leads in house ops (location, mood, alumni) but locks features behind Diamond tier. Build comprehensive ops included at base tier.

---

## 6. Documents & E-Sign

| Feature | Sober Living App | Oathtrack | Sobriety Hub | Oasis |
|---------|:---:|:---:|:---:|:---:|
| Document storage | Yes | Yes (unlimited) | Yes | Yes |
| E-signature | Yes | Yes (Pro+) | Yes | No |
| Template library | Partial | Partial | Yes (clinical assessments) | Yes (DHS/AZRAH) |
| Conditional form logic | No | No | Yes | No |
| Retention policies | No | No | No | No |
| Version control | No | No | No | Partial |

**RecoveryOS Opportunity:** NO competitor has document retention policies -- critical for HIPAA (6-year retention) and 42 CFR Part 2. Sobriety Hub's conditional forms are best-in-class.

---

## 7. Messaging/Communications

| Feature | Sober Living App | Oathtrack | Sobriety Hub | Oasis |
|---------|:---:|:---:|:---:|:---:|
| In-app messaging | Yes | Yes (separate app) | Yes | No |
| Group chat | No | Yes | Yes | No |
| Announcements/broadcast | Partial | Partial | Yes | No |
| SMS integration | Yes | No | Claimed | No |
| Email integration | Yes | No | Yes | Partial |
| AI call management | No | No | No | Yes |
| Family communication | Yes | No | No | No |

**RecoveryOS Opportunity:** No competitor has a complete, unified communication system. Build integrated messaging with announcements, group chat, SMS, and family access.

---

## 8. Reporting & Dashboards

| Feature | Sober Living App | Oathtrack | Sobriety Hub | Oasis |
|---------|:---:|:---:|:---:|:---:|
| Occupancy reports | Yes | Yes | Partial | Yes |
| Financial reports | Yes | Yes | Partial | Partial |
| Outcomes tracking | Yes | Yes (76% completion) | Yes (best-in-class) | No |
| Compliance reports | Yes | No | No | Partial (DHS) |
| Custom report builder | No | Partial | Yes | No |
| Multi-property analytics | Yes | Yes | Partial | Yes |
| Grant-ready reports | No | No | Coming Soon | No |

**RecoveryOS Opportunity:** Sobriety Hub leads in outcomes. No competitor has comprehensive compliance reporting. Grant-ready reports are a recognized need (Sobriety Hub building it).

---

## 9. Permissions & Security

| Feature | Sober Living App | Oathtrack | Sobriety Hub | Oasis |
|---------|:---:|:---:|:---:|:---:|
| RBAC | Yes (granularity unclear) | Yes (basic) | Yes (3 tiers) | Yes (2 roles) |
| Custom roles | Partial | No | Partial | No |
| Audit logging | Claimed | No | Claimed | Yes (tamper-proof) |
| Multi-property | Yes | Yes | Yes | Yes |
| Multi-org | Not documented | Yes (multi-enterprise) | No | No |

**RecoveryOS Opportunity:** 9-role granular RBAC with custom permissions. Enterprise-grade audit logging with immutable, tamper-proof records. True multi-org, multi-property, multi-house hierarchy.

---

## 10. Compliance

| Feature | Sober Living App | Oathtrack | Sobriety Hub | Oasis |
|---------|:---:|:---:|:---:|:---:|
| HIPAA claimed | Yes | Yes | Yes | "Aligned" only |
| 42 CFR Part 2 claimed | Yes (unsubstantiated) | No | Mentioned once | No |
| BAA available | Not documented | Not documented | Not documented | Not documented |
| SOC 2 / HITRUST | No | No | No | No |
| Encryption at rest | Claimed | Yes (AES-256) | Claimed | Not documented |
| Encryption in transit | Claimed | Yes (TLS 1.2) | Claimed | Not documented |
| Consent management | Not documented | No | No | No |
| Breach notification | Not documented | Not documented | Not documented | Not documented |
| Third-party audit | No | No | No | No |
| Audit trail retention | Not documented | Not documented | Not documented | Not documented |

**RecoveryOS Opportunity: THIS IS THE #1 DIFFERENTIATOR.** No competitor has:
- Verified HIPAA compliance with public BAA
- Any 42 CFR Part 2 implementation (consent management, redisclosure controls)
- SOC 2 or third-party certification
- Documented breach notification procedures
- 6-year audit trail retention (required by 42 CFR Part 2)

---

## 11. Pricing Comparison (As of February 11, 2026)

| | Sober Living App | Oathtrack | Sobriety Hub | Oasis |
|---|---|---|---|---|
| **Model** | Not public (contact sales) | Per-bed/month | Per-user/month | Per-bed/month or lifetime |
| **Entry Price** | ~$10/feature/month (3rd party) | $2.99/bed/month | $20/user/month (Client Mgr) | $2.99/bed/month |
| **Full Price** | Not disclosed | $7.99/bed/month | $65/user/month (Full User) | $2.99/bed/month |
| **Lifetime Option** | No | No | No | $2.99/bed one-time |
| **Free Trial** | Yes | Yes (30 days) | Yes (30 days) | Not documented |
| **Resident App** | Free | Free | Free | Free (web only) |
| **Setup Fee** | None claimed | None | $250 | Not documented |
| **Contracts** | Cancel anytime | Not documented | Cancel anytime | Not documented |

**Example: 3-house operator, 60 beds, 4 staff:**
- Sober Living App: Unknown (requires sales call)
- Oathtrack: ~$480/month (Diamond tier)
- Sobriety Hub: ~$125-150/month (1 Full + 3 Client Mgr)
- Oasis: ~$180/month or $180 one-time

**RecoveryOS Opportunity:** Transparent pricing. Per-bed model at competitive rates. Include compliance features that others charge extra for or don't have at all.

---

## Summary: Competitive Landscape

| Strength | Leader | RecoveryOS Must Beat |
|----------|--------|---------------------|
| Market presence | Sober Living App (2,000+ facilities) | NARR partnership, customer base |
| House operations | Oathtrack (mood, location, alumni) | Feature depth at base tier |
| Intake forms | Sobriety Hub (conditional logic, clinical) | Form builder with assessments |
| Outcomes tracking | Sobriety Hub (automated from ops) | Grant-ready reports |
| Payments | Sober Living App (multi-payer, family portal) | Full engine with reconciliation |
| AI features | Oasis (call management) | AI-assisted operations |
| Pricing transparency | Sobriety Hub (public, simple) | Clear, competitive pricing |
| Compliance | **NONE** | **This is our moat** |

---

*Total citations across all competitor files: 148 URLs*
*Individual files: competitor-sober-living-app.md (48), competitor-oathtrack.md (47), competitor-sobriety-hub.md (24), competitor-oasis.md (29)*
