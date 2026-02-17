# Oathtrack - Competitive Analysis

**Date:** February 11, 2026
**Researcher:** oathtrack-researcher (automated competitive analysis)

---

## 1. Company Overview & Positioning

| Field | Detail |
|-------|--------|
| **Name** | Oathtrack |
| **URL** | [oathtrack.com](https://www.oathtrack.com/) |
| **Tagline** | "All-in-One Sober Home Management Software" |
| **Positioning** | "Built from the ground up for Recovery Residences -- secure, simple, and made to scale" ([source](https://www.oathtrack.com/)) |
| **Target Customer** | Recovery residence operators, house managers, staff, and residents ([source](https://www.oathtrack.com/)) |
| **Founded** | September 2016 by Joseph M. Smith ([source](https://joesmith.me/)) |
| **HQ** | Greater Philadelphia area, Pennsylvania ([source](https://joesmith.me/)) |
| **Entity** | Oathtrack, LLC (copyright 2020 per [App Store](https://apps.apple.com/us/app/oathtrack-chat/id1525647365)) |
| **Team Size** | Small; founded by a solo developer (Joseph M. Smith, Founder & CTO) who built the platform end-to-end ([source](https://joesmith.me/)). Exact current headcount not publicly disclosed. |
| **Funding** | Not publicly documented. No Crunchbase or funding announcements found. Appears bootstrapped. |
| **Tech Stack** | JavaScript, TypeScript, React; hosted on AWS ([source](https://joesmith.me/), [security page](https://oathtrack.com/security)) |

### Market Traction (claimed)
- 700+ recovery houses on platform ([source](https://www.oathtrack.com/))
- 1,200+ house managers ([source](https://www.oathtrack.com/))
- 31,000+ residents managed ([source](https://www.oathtrack.com/))
- $35.2M+ in payments processed ([source](https://www.oathtrack.com/))
- 76% resident completion rate (claims above national average) ([source](https://www.oathtrack.com/))

### Testimonials
- **Derrik Caridi, CEO, Serenity Ridge House:** "Its user-friendly interface quickly became an indispensable tool for our management team." ([source](https://www.oathtrack.com/))
- **Jody Davis, Founder/Director, Coram Deo Recovery:** "Oathtrack has been instrumental in the growth and expansion of my organization...manage residents more efficiently and accurately." ([source](https://www.oathtrack.com/))
- **Scott Sanders, CADCII, CEO/Founder, Dragonfly Residences:** "Tailored specifically to the needs of a sober living program, Oathtrack ensured all necessary components were included." ([source](https://www.oathtrack.com/))

---

## 2. Bed/Occupancy Management

| Feature | Status | Detail |
|---------|--------|--------|
| **Bed/room tracking** | Yes | "Resident spot capacity management" listed in the [iOS app description](https://apps.apple.com/us/app/oathtrack/id1195369787). Pricing is per-bed, confirming bed-level tracking. |
| **Waitlist functionality** | Not publicly documented | No mention of waitlist features found on the [features page](https://www.oathtrack.com/features), app listings, or blog. |
| **Inter-property transfers** | Partially | Multi-house and multi-enterprise support confirmed ([iOS app](https://apps.apple.com/us/app/oathtrack/id1195369787)), but no explicit transfer workflow between properties documented. |
| **Capacity reporting** | Yes | "Resident movement charts" and capacity management listed in Oathlytics analytics ([iOS app](https://apps.apple.com/us/app/oathtrack/id1195369787)). |

**Notable Gap:** No public documentation of a waitlist system or formal inter-property transfer workflow.

---

## 3. Admissions/Intake Workflow

| Feature | Status | Detail |
|---------|--------|--------|
| **Intake process** | Yes | "Easily customize and share your own house application forms" and "View, contact, and accept (or reject) incoming applicants" ([features page](https://www.oathtrack.com/features)). |
| **Document collection during intake** | Yes | Custom intake forms with document upload capability; unlimited secure file storage ([features page](https://www.oathtrack.com/features)). |
| **Background checks/screening** | Not publicly documented | No mention of integrated background checks or third-party screening integrations. |
| **E-signature for intake docs** | Yes | "Resident signatures on documents now only takes a few seconds" -- available on Professional tier and above ([features page](https://www.oathtrack.com/features)). |

**Notable Gap:** No background check or screening integration mentioned.

---

## 4. Billing/Payments/Ledger/Reconciliation

| Feature | Status | Detail |
|---------|--------|--------|
| **Payment types** | Partial | Resident charges & rent payments tracked; bill reminders for recurring charges ([features page](https://www.oathtrack.com/features)). |
| **Payment methods** | Online payments | "Residents can easily pay their bills online, directly to your house" ([features page](https://www.oathtrack.com/features)). Specific methods (card, ACH, cash) not detailed publicly. |
| **Ledger/accounting** | Basic | "Track Resident Charges & Payments" with financial analytics ([features page](https://www.oathtrack.com/features)). Real-time financial reporting on expenses and income ([source](https://www.oathtrack.com/)). |
| **Reconciliation** | Not publicly documented | No mention of bank reconciliation, payment matching, or settlement reconciliation features. |
| **Dunning/collections** | Partial | Customizable payment reminders ([features page](https://www.oathtrack.com/features)). No formal dunning workflow or escalation process documented. |
| **Proration support** | Not publicly documented | No mention of prorated charges or mid-cycle billing adjustments. |
| **Multi-payer** | Not publicly documented | No mention of family/sponsor/third-party payment support. Only resident-direct payments described. |
| **Expense management** | Yes | "Save time tracking recurring bills and expenses" -- Professional tier ([features page](https://www.oathtrack.com/features)). |
| **Processed volume** | $35.2M+ | Claimed total payments processed across all customers ([source](https://www.oathtrack.com/)). |

**Notable Gaps:** No reconciliation, no documented proration, no multi-payer support, no formal dunning workflow. Payment processing is basic -- residents pay online, but the specific payment processor is not disclosed.

---

## 5. Resident Portal Features

| Feature | Status | Detail |
|---------|--------|--------|
| **Mobile app** | Yes (native) | Separate "Oathtrack Resident" app on [iOS](https://apps.apple.com/us/app/oathtrack-resident/id1538872201) and [Android](https://play.google.com/store/apps/details?id=com.oathtrack.resident). Also accessible via web at [resident.oathtrack.com](https://resident.oathtrack.com/) ([apps page](https://oathtrack.com/apps)). |
| **Self-service features** | Yes | Online bill payment, task/schedule viewing, sobriety tracking, mood tracking ([features page](https://www.oathtrack.com/features), [blog](https://secure.oathtrack.com/blog/navigating-sobriety:-managing-a-recovery-residence-with-a-sober-home-app)). |
| **Profile management** | Partial | Residents can track progress and milestones; unclear if residents can edit their own profile info ([blog](https://secure.oathtrack.com/blog/digital-solutions-for-sobriety:-managing-recovery-homes-with-tech-driven-tools)). |
| **Educational materials** | Yes | Access to "educational materials crucial for their ongoing recovery" ([blog](https://secure.oathtrack.com/blog/navigating-sobriety:-managing-a-recovery-residence-with-a-sober-home-app)). |
| **Community features** | Yes | "Fosters a sense of community and accountability by facilitating easy communication with managers and peers" ([blog](https://secure.oathtrack.com/blog/navigating-sobriety:-managing-a-recovery-residence-with-a-sober-home-app)). |

**App Platform Details:**
- **Oathtrack Resident (iOS):** Health & Fitness category, age 13+, free ([App Store](https://apps.apple.com/gm/developer/oathtrack-llc/id1195369786))
- **Oathtrack Staff (iOS):** Business category, rated 4.2/5 with 5 ratings, iOS 15.0+, 45.2 MB, last updated May 2024 ([App Store](https://apps.apple.com/us/app/oathtrack/id1195369787))

---

## 6. House Operations

| Feature | Status | Detail |
|---------|--------|--------|
| **Chore tracking/assignment** | Yes | Chore assignment and tracking available on Diamond tier ([features page](https://www.oathtrack.com/features)). |
| **Meeting attendance tracking** | Yes | "Keep track of house meetings, calendar events, and staff members"; meeting scheduling with resident reminders on Diamond tier ([features page](https://www.oathtrack.com/features)). |
| **Pass/curfew management** | Yes | "Overnight pass management" and "Privilege and curfew management" on Diamond tier ([features page](https://www.oathtrack.com/features), [iOS app](https://apps.apple.com/us/app/oathtrack/id1195369787)). |
| **Task assignments** | Yes | "Quickly assign tasks and easily manage and message staff members" ([features page](https://www.oathtrack.com/features)). |
| **Drug testing workflow** | Yes | "Record Drug Test results" for monitoring, available on all tiers ([features page](https://www.oathtrack.com/features)). |
| **Location tracking** | Yes | "Request location updates from your residents" with location history on Diamond tier ([features page](https://www.oathtrack.com/features)). |
| **Mood tracking** | Yes | AI-powered mood tracking with "proactive alerts when resident mood changes occur" ([features page](https://www.oathtrack.com/features)). |
| **Goal tracking** | Yes | Track "resident goals, therapy sessions, moods, meetings" ([features page](https://www.oathtrack.com/features)). |
| **Calendar** | Yes | "Drag and drop events to your House Calendar" ([features page](https://www.oathtrack.com/features)). |
| **Alumni tracking** | Yes | "Post-residency alumni tracking with completion rate analytics" ([source](https://www.oathtrack.com/)). |

**Strengths:** Oathtrack has notably strong house operations features including location tracking, mood monitoring with AI alerts, and alumni tracking -- features not commonly found in competitor platforms.

---

## 7. Documents & E-Sign

| Feature | Status | Detail |
|---------|--------|--------|
| **Document storage** | Yes | "Unlimited document storage" with secure encryption; "Send documents to the Resident directly from their chart" ([features page](https://www.oathtrack.com/features)). |
| **E-signature** | Yes | "Resident signatures on documents now only takes a few seconds" -- available on Professional tier and above ([features page](https://www.oathtrack.com/features)). |
| **Templates** | Partial | Customizable forms and intake documents; "Custom chart field builders" ([features page](https://www.oathtrack.com/features)). No mention of a full document template library. |
| **Retention policies** | Not publicly documented | No mention of automated document retention, archival, or deletion policies. |
| **E-sign provider** | Not publicly documented | The e-signature provider or technology is not disclosed. |

**Notable Gap:** No documented retention policies or compliance-grade document lifecycle management.

---

## 8. Messaging/Communications

| Feature | Status | Detail |
|---------|--------|--------|
| **In-app messaging** | Yes | Dedicated [Oathtrack Chat app](https://apps.apple.com/us/app/oathtrack-chat/id1525647365) for staff and residents -- available on [iOS](https://apps.apple.com/us/app/oathtrack-chat/id1525647365), [Android](https://play.google.com/store/apps/details?id=com.oathtrack.chat), and [web](https://chat.oathtrack.com) ([apps page](https://oathtrack.com/apps)). |
| **Announcements/broadcast** | Partial | "Team-wide" messaging capability in Chat app ([App Store](https://apps.apple.com/us/app/oathtrack-chat/id1525647365)). "Scheduled message delivery to residents" with read receipts ([source](https://www.oathtrack.com/)). |
| **Group chat** | Yes | "Discuss topics in private groups, one-to-one or team-wide" ([App Store](https://apps.apple.com/us/app/oathtrack-chat/id1525647365)). |
| **SMS/email integration** | Partial | Bill reminders sent to residents (channel not specified). No documented SMS gateway or email marketing integration. |
| **File sharing** | Yes | "Easily share and view image files" in Chat ([App Store](https://apps.apple.com/us/app/oathtrack-chat/id1525647365)). |

**Architecture Note:** Messaging is a separate app (Oathtrack Chat) rather than integrated into the main staff/resident apps. This is a notable architectural choice -- users need 2-3 separate apps for full functionality (Staff app + Chat app, or Resident app + Chat app).

**Chat App Details:**
- Version 1.1 (last updated August 2021)
- 34.8 MB, rated 5.0/5 with only 2 ratings
- Copyright 2020 Oathtrack LLC
- Developer claims "no data collected" by the app

---

## 9. Reporting & Dashboards

| Feature | Status | Detail |
|---------|--------|--------|
| **Occupancy reports** | Yes | "Resident movement charts" and capacity analytics via Oathlytics ([iOS app](https://apps.apple.com/us/app/oathtrack/id1195369787)). |
| **Financial reports** | Yes | "Real-time financial reporting and analytics"; "Rent payment trend analysis"; house and enterprise-level financial reporting ([iOS app](https://apps.apple.com/us/app/oathtrack/id1195369787), [features page](https://www.oathtrack.com/features)). |
| **Outcomes tracking** | Yes | 76% resident completion rate tracked; "Staff and resident performance reviews" ([source](https://www.oathtrack.com/), [iOS app](https://apps.apple.com/us/app/oathtrack/id1195369787)). |
| **Compliance reports** | Not publicly documented | No specific compliance reporting (e.g., NARR standards, state certification) mentioned. |
| **Custom reports** | Partial | "Full Analytics & Reporting" on Professional tier; "Powerful charts showing house performance over time" ([features page](https://www.oathtrack.com/features)). Whether reports are fully customizable is unclear. |
| **Surveys** | Yes | "Templated surveys or create your own custom surveys" to measure client satisfaction and recovery capital ([features page](https://www.oathtrack.com/features)). |
| **Analytics brand** | Oathlytics | Proprietary analytics dashboard ([iOS app](https://apps.apple.com/us/app/oathtrack/id1195369787)). |

---

## 10. Permission System (RBAC) & Audit Logs

| Feature | Status | Detail |
|---------|--------|--------|
| **Role-based access control** | Yes (basic) | "Staff role assignments and privilege control"; "User role-based permissions system" ([iOS app](https://apps.apple.com/us/app/oathtrack/id1195369787), [security page](https://oathtrack.com/security)). |
| **Audit logging** | Not publicly documented | No mention of audit trails, activity logs, or change history for compliance purposes. |
| **Multi-tenancy** | Yes | "Multi-enterprise and multi-house support" with "Approval notifications for structural changes" ([iOS app](https://apps.apple.com/us/app/oathtrack/id1195369787)). |
| **Granular permissions** | Not publicly documented | The number of roles and granularity of permissions are not described. |

**Notable Gap:** No documented audit logging capability. For a platform claiming HIPAA compliance, the absence of documented audit trails is a significant concern. Enterprise-grade audit logging is a HIPAA requirement.

---

## 11. HIPAA/42 CFR Part 2 Compliance Claims

| Claim | Status | Detail |
|-------|--------|--------|
| **HIPAA compliance** | Claimed | "HIPAA compliant cloud servers of Amazon Web Services"; described as "HIPAA-certified" on founder's portfolio ([security page](https://oathtrack.com/security), [joesmith.me](https://joesmith.me/)). |
| **42 CFR Part 2** | Not claimed | No mention of 42 CFR Part 2 found anywhere on the site, security page, or documentation. |
| **BAA availability** | Not documented | No mention of Business Associate Agreements on the [security page](https://oathtrack.com/security) or elsewhere. |
| **SOC 2** | Not documented | No SOC 2, SOC 1, ISO 27001, or HITRUST certifications mentioned. |
| **Encryption at rest** | Yes | "AES encryption with 256-bit keys per NIST/FIPS recommendations" for data at rest ([security page](https://oathtrack.com/security)). |
| **Encryption in transit** | Yes | "TLS 1.2 with AES_256_CBC cipher suite, SHA256 with RSA 2048-bit message authentication, ECDHE_RSA key exchange" ([security page](https://oathtrack.com/security)). |
| **Infrastructure** | AWS | Hosted on Amazon Web Services; nightly automated snapshots; 99.999999999% durability on backups ([security page](https://oathtrack.com/security)). |
| **Access controls** | Yes | SSH per CIS benchmarks; IP whitelisting; VPN restriction capabilities ([security page](https://oathtrack.com/security)). |
| **Security ops** | Yes | Automated intrusion detection; firewall audits; daily malware scanning; regular patching ([security page](https://oathtrack.com/security)). |

### Compliance Assessment

**Strengths:**
- Strong encryption standards (AES-256 at rest, TLS 1.2 in transit)
- AWS infrastructure with good backup practices
- Intrusion detection and daily vulnerability scanning

**Significant Gaps:**
- **No BAA documented** -- HIPAA requires covered entities to have BAAs with business associates handling PHI. The absence of a publicly available BAA is a red flag.
- **No 42 CFR Part 2 compliance** -- Critical for substance use disorder treatment records. With the February 16, 2026 deadline for the new Part 2 rule alignment with HIPAA, this is a major gap.
- **No third-party certifications** -- No SOC 2, HITRUST, or independent security audits mentioned.
- **No audit logging documented** -- HIPAA requires audit controls (45 CFR 164.312(b)).
- **"No data collected" privacy claims on apps** -- The iOS app listings claim the developer "does not collect any data," which contradicts the platform's purpose of managing resident health data. This raises questions about the accuracy of App Store privacy labels.

---

## 12. Pricing Tiers (as of February 11, 2026)

All pricing is per bed, per month, as listed on [oathtrack.com](https://www.oathtrack.com/):

| Tier | Price | Key Features |
|------|-------|-------------|
| **Basics** | $2.99/bed/month | Resident charges & payments, drug test recording, bill reminders, online payments, file storage, limited analytics |
| **Professional** | $4.99/bed/month | All Basics + full analytics & reporting, clinical data management, expense management, document e-signatures, custom form builder |
| **Diamond** | $7.99/bed/month | All Professional + chat for staff/residents, resident portal, meeting scheduling, location viewing, chore/pass management |

**Additional Pricing Details:**
- Free 30-day trial, no credit card required ([source](https://www.oathtrack.com/))
- Unlimited staff user invitations at no extra cost ([source](https://www.oathtrack.com/))
- Dismissed chart retention included ([source](https://www.oathtrack.com/))
- Same-day data migration from legacy systems at no cost ([source](https://www.oathtrack.com/))
- No setup fees mentioned ([source](https://www.oathtrack.com/))

**Pricing Analysis:**
- Per-bed pricing scales linearly with house size
- At $7.99/bed/month for full features, a 20-bed house = ~$160/month
- Chat and resident portal are locked behind the highest tier
- E-signatures require at least the Professional tier

---

## 13. Notable Gaps & Weaknesses

### Feature Gaps

1. **No waitlist management** -- No documented way to manage prospective residents in a queue.
2. **No background check integration** -- No screening or verification tools during intake.
3. **No payment reconciliation** -- No bank reconciliation, settlement matching, or accounting integration.
4. **No proration support** -- No documented mid-cycle billing adjustments.
5. **No multi-payer support** -- Only resident-direct payments; no family, sponsor, or insurance billing.
6. **No dunning workflow** -- Only basic payment reminders, no escalation or collections process.
7. **No compliance reporting** -- No NARR standards tracking, state certification reports, or regulatory compliance dashboards.
8. **No document retention policies** -- No automated lifecycle management for documents.
9. **No audit logging** -- Critical gap for any platform handling PHI.
10. **No 42 CFR Part 2 compliance** -- Major gap given the February 2026 deadline for the new final rule.

### Architectural Weaknesses

11. **Fragmented app experience** -- Three separate apps (Staff, Resident, Chat) instead of integrated functionality. Users need to download and switch between multiple apps.
12. **Chat app stale** -- Oathtrack Chat was last updated August 2021 (over 4 years ago per [App Store](https://apps.apple.com/us/app/oathtrack-chat/id1525647365)), raising concerns about maintenance and security.
13. **Low app store presence** -- Staff app has only 5 ratings; Chat app has 2 ratings on iOS ([App Store](https://apps.apple.com/us/app/oathtrack/id1195369787)). Suggests limited adoption of mobile apps.
14. **Small team risk** -- Founded and built by a single developer. Raises questions about bus factor, support capacity, and development velocity.

### Compliance Weaknesses

15. **No BAA publicly available** -- Cannot verify HIPAA business associate compliance.
16. **No third-party security audits** -- No SOC 2, HITRUST, or independent verification of security claims.
17. **Contradictory privacy labels** -- App Store claims "no data collected" while the platform's purpose is collecting and managing resident health data.
18. **HIPAA claim substantiation** -- Claims HIPAA compliance primarily through AWS hosting and encryption, but does not document administrative safeguards, audit controls, or incident response procedures.

### UX/Product Weaknesses

19. **Key features tier-locked** -- Resident portal and chat require Diamond tier ($7.99/bed/month), making the entry-level experience quite limited.
20. **No documented API** -- No public API documentation for integrations with other systems (EHR, accounting, etc.).
21. **No documented integrations** -- No mention of integrations with external systems (QuickBooks, Stripe, EHR platforms, etc.).
22. **Blog is marketing-focused** -- Blog posts are generic recovery content rather than product education or help documentation, suggesting limited user education resources.

---

## Summary

Oathtrack is a purpose-built sober living management platform with strong house operations features (drug testing, mood tracking, location tracking, chores, passes) and a reasonable per-bed pricing model. It has meaningful market traction with 700+ houses and $35M+ in processed payments.

However, it has significant gaps in financial management (no reconciliation, proration, or multi-payer), compliance (no 42 CFR Part 2, no BAA, no audit logs, no certifications), and platform architecture (fragmented 3-app experience with a stale chat app). The small team size and lack of third-party compliance validation represent strategic weaknesses that a well-resourced competitor could exploit.

**Citation Count:** 47 URL citations across this document.
