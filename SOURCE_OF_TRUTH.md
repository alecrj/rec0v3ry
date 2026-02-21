# RecoveryOS - Source of Truth

> This is the SINGLE source of truth for project status.
> Read this FIRST at the start of EVERY session.
> Then read `docs/11_PRODUCT_RESET_PLAN.md` for the execution checklist.

## Current State
- **Phase**: PRODUCT RESET — Operator-first, money-first rebuild
- **Execution Plan**: `docs/11_PRODUCT_RESET_PLAN.md` — 92+ checkboxes, Phases A-J
- **Status**: Phases A-G2 COMPLETE (103 boxes). Web app fully functional end-to-end. Remaining: mobile (H), messaging polish (I), final ship (J) — 44 boxes.
- **Safety Commit**: `5fea1cc` — Phase G2 Wave 1 (pending new commit for Wave 2)
- **Blocking Issues**: None
- **Last Updated**: 2026-02-21
- **Design System**: "Obsidian" — Geist font, zinc dark (#09090B), indigo accent (#6366F1). See globals.css for tokens.
- **THE RULE**: Nothing gets checked off until it works with real data. No mock data. No faking it.

## Product Vision (2026-02-21 Reset)
- **Pitch**: "RecoveryOS runs your sober living business so you can focus on recovery."
- **Mobile-first**: Operators run business from phone. Web CRM for deep work/reports.
- **Money is the scoreboard**: Dashboard shows revenue, expenses, profit per house.
- **Automations are the killer feature**: Internal cron system (zero external dependency), presented as simple on/off toggles.
- **Build order**: Web app perfection first (G2), then React Native mobile (H), then polish + ship (I/J).
- **10-minute onboarding**: House name → bed count → rent amount → first resident → done.

## Execution Phases (from docs/11_PRODUCT_RESET_PLAN.md)
| Phase | What | Status |
|-------|------|--------|
| A | Simplify & Onboarding (strip compliance UI, 3-screen setup) | COMPLETE |
| B | Dashboard Rebuild (money-first command center) | COMPLETE |
| C | Expense Tracking (Plaid + manual, P&L per house) | COMPLETE |
| D | Payment Flow (Stripe + external recording + reminders) | COMPLETE |
| E | Automations (11 pre-built, internal cron, toggle UI) | COMPLETE |
| F | Referrals & Admissions (shareable intake link, referral tracking) | COMPLETE |
| G | DocuSign Integration (real e-signatures) | COMPLETE |
| G2 | Web App Perfection (end-to-end flows, real integrations) | **COMPLETE** — Wave 1 (G2-1 to G2-17) + Wave 2 (G2-18 to G2-32) |
| H | React Native Mobile App (Expo, operator + resident, App Store) | NOT STARTED |
| I | Messaging Polish (iMessage-style, push notifications) | NOT STARTED |
| J | Final Polish & Ship (E2E testing, app store submission) | NOT STARTED |

### Obsidian Design System (COMPLETE — 2026-02-20)

**What changed:**
- Font: Inter → Geist (Sans + Mono via `geist` npm package)
- Palette: White/stone → Zinc dark (#09090B bg, #18181B surface, #27272A borders)
- Accent: Green/emerald → Indigo (#6366F1 primary, #818CF8 hover)
- Structure: CrmHeader removed, sidebar same bg as page, no card wrappers
- Data: Mono font for numbers, divider-separated stats
- Clerk: dark theme (`@clerk/themes`)
- All 53+ files color-migrated (zero stone/slate/primary/bg-white remaining)
- `tsc --noEmit` clean, `next build` clean

**Component Library (`src/components/ui/`):** 10 components, all dark theme
- `button.tsx` — Indigo primary, zinc secondary, ghost, destructive
- `card.tsx` — ghost (invisible), surface (bg-zinc-900), outlined (border only)
- `badge.tsx` — Dark tint backgrounds (green-500/12, red-500/12, etc.)
- `input.tsx` — Dark inputs (bg-zinc-900, border-zinc-800), indigo focus
- `skeleton.tsx` — Dark shimmer (#18181B → #27272A)
- `stat-card.tsx` — Mono numbers, no boxes, uppercase labels
- `data-table.tsx` — Dark headers, sticky bg, indigo selection
- `empty-state.tsx` — Dark palette
- `page-header.tsx` — Title only, no description
- `toast.tsx` — Dark toast with colored accent bar

### Phase 5B-MUTATIONS — Frontend Write Wiring (COMPLETE)

**Problem**: All 40+ pages had real tRPC reads (`useQuery`) but ZERO writes — forms existed visually but no `useMutation` calls, no onClick handlers.

**Solution**: Wired all high-value mutations in one session. Created toast notification system for feedback.

**Toast System** (new):
- `src/components/ui/toast.tsx` — ToastProvider context + useToast() hook
- Supports success/error/warning/info with auto-dismiss (4s)
- Wrapped in `providers.tsx` inside QueryClientProvider

**Mutations Wired (12 files, 15 mutations)**:

| Page | Mutation | What It Does |
|------|----------|-------------|
| Invoice Create | `invoice.create` | Full line-item form → backend, with validation |
| Payment Checkout (PWA) | `payment.recordManual` | Select invoices, submit payment (Stripe placeholder) |
| Chores | `chore.updateAssignment` | Mark Done, Reassign buttons |
| Chores | `chore.verifyAssignment` | Verify completed chores |
| Consent Wizard | `consent.create` | 5-step wizard with full form state → backend |
| Consents List | `consent.revoke` | Revoke button with confirmation dialog |
| Passes | `pass.approve` | Approve pending pass requests |
| Passes | `pass.deny` | Deny with reason prompt |
| Passes | `pass.complete` | Check In returning residents |
| Curfew | `curfew.checkIn` | Record check-in for pending rows |
| Curfew | `curfew.checkIn` | Mark Excused (late rows, with reason) |
| Admissions Pipeline | `lead.updateStatus` | Move to Next Stage, Mark as Lost |
| Admissions Detail | `lead.convertToResident` | Full modal: house picker, dates, DOB |
| Resident Inbox | `message.send` | Send button + Enter key support |
| Resident Maintenance | `maintenance.create` | Already wired (confirmed) |

**Pattern**: Every mutation follows: `useMutation({ onSuccess: toast + invalidate, onError: toast })` with `disabled={mutation.isPending}` on buttons.

**Already Wired (no work needed)**: Messages Compose (`createConversation` + `sendMessage`), Resident Maintenance (`maintenance.create`), Admissions Pipeline create (`lead.create`).

**Remaining Unwired (lower priority)**:
- Drug Tests/Incidents/Check-ins "View" buttons — need detail pages (navigation)
- Document form modals (New Document, New Template, Edit Template, New Policy) — buttons exist but no onClick

### Phase 5C — Clean Slate Production (COMPLETE)

**Problem**: App didn't work from a clean/empty database. Setup required pre-existing seed data. Many Create forms were non-functional buttons. Maintenance page was 100% hardcoded mock data.

**Phase 1 - Onboarding Flow (Complete):**
- Setup page (`app/setup/page.tsx`) — Accepts org name, creates org + user + role from scratch
- Setup API (`api/setup-user/route.ts`) — POST creates org when none exists, generates slug
- Property create modal (`admin/properties/page.tsx`) — Full form → `property.create`
- House create modal (`admin/properties/[id]/page.tsx`) — `property.createHouseWithRooms` with auto room/bed generation
- Curfew config modal (`operations/curfew/page.tsx`) — `curfew.setHouseConfig` with house picker, weekday/weekend times
- Rate create form (`billing/rates/page.tsx`) — Cascading property→house dropdowns, `rate.create` + `rate.deactivate`
- Resident create modal (`residents/page.tsx`) — `resident.create` with all required fields
- Bed assignment (`occupancy/beds/page.tsx`) — `occupancy.assignBed` with resident/bed pickers

**Operator Setup Flow:** Sign up → setup org → create property → add house (auto rooms/beds) → configure curfew → create rate → add resident → assign bed

**Phase 2 - Empty States (Complete):**
- Dashboard onboarding checklist — Shows 5-step guide for new orgs (property → house → rates → resident)
- All CRM pages already had empty states from UI overhaul

**Phase 3 - Missing CRUD Forms (Complete):**
- Chores create modal (`operations/chores/page.tsx`) — Property→house cascade, `chore.create`
- Meetings create modal (`operations/meetings/page.tsx`) — Full form with type/datetime/location/mandatory, `meeting.create`
- Drug tests create modal (`operations/drug-tests/page.tsx`) — Resident picker, `drugTest.create` (Part 2 protected)
- Incidents create modal (`operations/incidents/page.tsx`) — Type/severity/datetime/description, `incident.create`
- Maintenance full rewrite (`operations/maintenance/page.tsx`) — Replaced hardcoded mock data with tRPC queries + create modal
- Maintenance detail rewrite (`operations/maintenance/[id]/page.tsx`) — `maintenance.getById` + `maintenance.update` for status changes

**Phase 4 - UI Polish (Complete):**
- Removed dashboard sparkline hardcoded data and fake trends
- All forms follow consistent pattern: modal → form → `useMutation` → toast → invalidate

**Build Status:** `tsc --noEmit` clean, `next build` clean — all 40+ pages compile

### Phase 5A Progress — Mock→tRPC Wiring (COMPLETE)

**ALL pages wired (30+ pages):**

| Area | Pages Wired | tRPC Routers Used |
|------|-------------|-------------------|
| Operations (7) | chores, meetings, passes, curfew, drug-tests, incidents, check-ins | chore, meeting, pass, curfew, drugTest, incident, checkIn |
| Billing (6) | overview, invoices list, invoice detail, new invoice, ledger, rates | invoice, payment, ledger, rate, resident |
| Compliance (3) | consents, dashboard, disclosures | consent, reporting, disclosure |
| Admin (2) | family portal, invite user | familyPortal, user, property |
| Admissions (1) | lead detail `[id]` | lead |
| Messages (3) | compose, inbox list, conversation detail | conversation, message |
| Residents (1) | list + detail | resident |
| PWA (7) | home, payments, pay, documents, maintenance, schedule, profile | user, resident, invoice, document, maintenance, meeting, chore |

**Backend additions for Phase 5A.3:**
- `disclosure.listAll` — org-wide disclosure listing (CRM admin view, no residentId required)
- `resident.getMyProfile` — resolves resident from auth context (`scopeType=resident` + `scopeId`)

### Earlier Phase 5A Changes
1. **Residents pages** - Created `/residents` list and `/residents/[id]` detail (resident router with 6 procedures)
2. **Setup flow fixed** - `setup-user` API now sets Clerk publicMetadata with dbUserId, orgId, role, scopeType, scopeId
3. **tRPC context enhanced** - Now resolves DB user ID from Clerk metadata, provides full UserContext type
4. **Proxy updated** - Redirects unauthenticated users to /setup, allows setup routes pre-DB-setup
5. **Setup page improved** - Checks existing status first, better UX with loading states

## DECISIONS
- **Workflow**: Agent teams for parallel work, Opus orchestrates. Sequential: read docs → backend → tsc → frontend → tsc → integration → next build → update SOURCE_OF_TRUTH.md
- **NotebookLM**: Authenticated and connected. Notebook created with Phase 1 research.

## Phase Progress
| Phase | Status | Method | Started | Completed | Validated |
|-------|--------|--------|---------|-----------|-----------|
| 0-BOOTSTRAP | Complete | Manual | 2026-02-10 | 2026-02-10 | 2026-02-10 |
| 1-RESEARCH | Complete | Agent Team (4) | 2026-02-10 | 2026-02-12 | 2026-02-12 |
| 2-PRD | Complete | Agent Team (2) | 2026-02-12 | 2026-02-12 | 2026-02-12 |
| 3-ARCHITECTURE | Complete | Agent Team (4) + direct writes | 2026-02-12 | 2026-02-12 | 2026-02-12 |
| 4-BUILD | Sprint 1-20 COMPLETE | Opus direct writes | 2026-02-12 | 2026-02-17 | - |
| 5-VERIFY | Ready | Verification | - | - | - |

## Active Subtasks
| ID | Title | Owner | Status | Blocked By |
|----|-------|-------|--------|------------|
| (none) | — | — | — | — |

## Remaining Sprint Plan (v1.0)
| Sprint | Module | What to Build | Est. Files |
|--------|--------|---------------|-----------|
| (none - all sprints complete!) | — | — | — |

## Completed Subtasks
| ID | Title | Phase | Completed |
|----|-------|-------|-----------|
| 001 | Create project foundation | 0 | 2026-02-10 |
| 105 | HIPAA + 42 CFR Part 2 Research | 1 | 2026-02-11 |
| 101-104 | Competitor analyses (4) | 1 | 2026-02-12 |
| 106-107 | Feature matrix + gaps analysis | 1 | 2026-02-12 |
| 201-204 | Canonical docs (North Star, Compliance, PRD, Roadmap) | 2 | 2026-02-12 |
| 301-304 | Architecture docs (Architecture, Data Model, Payments) + compliance review | 3 | 2026-02-12 |
| 401-406 | Sprint 1-2: Project scaffold, schema, tRPC infra, frontend shell, TS clean | 4 | 2026-02-12 |
| 407-410 | Sprint 3-4: Compliance routers, pages, Clerk webhook, seed script | 4 | 2026-02-12 |
| 411-414 | Sprint 5-6: Payment routers, billing pages, Stripe Connect, ledger | 4 | 2026-02-12 |
| 415 | Sprint 7-8: Document + esign routers, 5 CRM/PWA pages, DocuSign client, S3 client, webhook | 4 | 2026-02-17 |
| 416 | Sprint 9-10: Property + occupancy routers, bed grid, waitlist, property management pages | 4 | 2026-02-17 |
| 417 | Sprint 11-12: Lead + admission routers, lead pipeline, intake pages | 4 | 2026-02-17 |
| 418 | Sprint 13-14: 7 House Operations routers + 7 frontend pages (chores, meetings, passes, curfew, drug-tests, incidents, check-ins) | 4 | 2026-02-17 |
| 419 | Sprint 15-16: 3 Messaging routers (conversation, message, announcement) + 5 frontend pages (inbox, conversation, announcements, compose, resident inbox) | 4 | 2026-02-17 |
| 420 | Sprint 17-18: 3 Advanced Ops routers (drugTestSchedule, maintenance, familyPortal) + 6 frontend pages (drug test scheduling, maintenance list/detail, family portal admin, PWA maintenance, PWA family) | 4 | 2026-02-17 |
| 421 | Sprint 19: Reporting router (15 procedures: dashboard, occupancy/financial/ops/compliance summaries, trends, exports, disclosures accounting) + 5 pages (enhanced dashboard, occupancy/financial/ops/compliance reports) | 4 | 2026-02-17 |
| 422 | Sprint 20: E2E test suite (Playwright, 5 user flows, PWA tests, OWASP security tests, performance tests), audit log integrity verifier, compliance checklist script, CI/CD pipeline (GitHub Actions) | 4 | 2026-02-17 |

## Canonical Docs Status
| Doc | Status | Key Stats |
|-----|--------|-----------|
| docs/00_NORTH_STAR.md | **Complete** | Vision, 10 differentiators, 2x2 positioning |
| docs/01_REQUIREMENTS.md | **Complete** | 9 personas, 10 modules, 107 features, 50+ screens |
| docs/02_ARCHITECTURE.md | **Complete** | 1,238 lines: Next.js App Router, tRPC, RLS multi-tenancy, Clerk auth, HMAC audit chain, DocuSign, Inngest jobs |
| docs/03_DATA_MODEL.md | **Complete** | 2,076 lines: 50+ tables, RLS policies, field-level encryption, double-entry ledger, consent tables |
| docs/04_COMPLIANCE.md | **Complete** | 800 lines, HMAC audit logs, field-level encryption, 9-role RBAC, DocuSign BAA |
| docs/05_PAYMENTS.md | **Complete** | 1,554 lines: Stripe Connect Express, double-entry ledger, proration, dunning, reconciliation, PCI SAQ-A |
| docs/06_ROADMAP.md | **Complete** | 20 sprints to v1.0, 5 milestones, 5 agent team structure |

## Key Integration Decisions
- **E-Signature**: DocuSign (HIPAA BAA available, enterprise audit trail, tamper-evident seal)
- **Payments**: Stripe Connect (operator payouts, multi-payer)
- **Auth**: Clerk or Auth0 (HIPAA BAA available)
- **Database**: Neon PostgreSQL (HIPAA BAA available)
- **Hosting**: Vercel Enterprise (HIPAA BAA available)
- **File Storage**: S3-compatible with SSE-KMS encryption
- **Resident App**: Native mobile (iOS + Android) — NOT PWA. CRM remains desktop web (Next.js).

## Compliance Review Findings (Phase 3)
Non-blocking findings from compliance-reviewer to address during relevant sprints:
| ID | Severity | Finding |
|----|----------|---------|
| F2 | MEDIUM | Cache invalidation on consent revocation — Part 2 data responses must have `Cache-Control: no-store` |
| F1 | LOW | Sentry PII scrubbing needs explicit `beforeSend` hook |
| F3 | LOW | Need `FORCE ROW LEVEL SECURITY` on all tables, not just `ENABLE` |
| F4 | LOW | Child tables without `org_id` (invoice_line_items, etc.) — acceptable but document |
| F5 | LOW | `wellness_check_ins.mood_rating` not encrypted despite Part 2 context |
| F6 | INFO | Clerk webhook Svix signature verification not documented |
| F7 | INFO | Stripe Connected Account names shouldn't reference "sober living" |

## FULL AUDIT — What Works vs What Doesn't (2026-02-20)

### FULLY FUNCTIONAL (25+ pages — real data + working mutations)

| Area | Pages | What Works |
|------|-------|-----------|
| Dashboard | `/dashboard` | Real stats, activity feed, action items, onboarding checklist |
| Residents | `/residents` | List, search, create resident modal |
| Properties | `/admin/properties`, `/admin/properties/[id]` | List, create property, create house with auto rooms/beds |
| Rates | `/billing/rates` | List, create, deactivate |
| Invoices | `/billing/invoices`, `/billing/invoices/new` | List with search/filter, full line-item create form |
| Admissions | `/admissions`, `/admissions/[id]` | Kanban, create lead, move stages, convert to resident |
| Operations | chores, curfew, passes, drug-tests, incidents, maintenance (list+detail) | All have real reads + create/action mutations. Curfew has Configure modal. |
| Compliance | consents, audit-log, break-glass, disclosures, dashboard | Real data + revoke/activate mutations, resident picker |
| Documents | library, templates, signatures, retention | Real data from document/template/retention routers |
| Messages | compose, conversation detail | Create conversation, send messages |
| Reports | All 4 report pages | Real reporting data |
| PWA | home, payments, payments/pay, maintenance, schedule, profile, inbox | All real data, payment + maintenance mutations work |

### REAL DATA BUT PLACEHOLDER ACTIONS (buttons exist, mutations not wired)

| Page | What's Missing |
|------|---------------|
| `/documents/library` | Upload, New Document, View, Download buttons not wired |
| `/documents/templates` | New Template, Edit buttons not wired |
| `/documents/signatures` | Send for Signature, View buttons not wired |
| `/documents/retention` | New Policy button not wired |

### RECENTLY WIRED (Sprints C-E)

| Page | What's Working |
|------|---------------|
| `/billing/ledger` | Date range filter, CSV export with trial balance |
| `/compliance/disclosures` | CSV export with 42 CFR Part 2 redisclosure notice |
| PWA `/documents` | Sign Now (`esign.getSigningUrl`), View/Download (`document.getDownloadUrl`) |
| PWA `/family` | Pay Now (`payment.recordManual` modal), Send Message, Consent Details |

### 100% FAKE — HARDCODED MOCK DATA (no tRPC at all)

| Page | Status |
|------|--------|
| (none — all mock data removed!) | — |

### PREVIOUSLY MISSING — NOW COMPLETE

| Page | Status |
|------|--------|
| `/residents/[id]` | **Complete** — profile, admission, contacts, admission history, compliance status, quick actions |

---

## NEXT SESSION: Phase 6 — V1.0 Completion

### READ THIS FIRST
1. Read this file (SOURCE_OF_TRUTH.md) — the audit above is your roadmap
2. Run `/phase-status` to confirm
3. Work through sprints below in order

### Sprint Plan

**Sprint A — Must-Have (COMPLETE — 2026-02-20)**
1. ~~Resident Detail page~~ — already complete with profile, admission, contacts, history, compliance
2. ~~Invoice actions~~ — wired Send (`invoice.send`), Record Payment (`payment.recordManual` with modal), Void (`invoice.void` with confirm)
3. ~~Bed assignment~~ — wired Assign Bed modal (`occupancy.assignBed`) with resident/bed pickers
4. ~~User invite~~ — wired `user.invite` mutation with scope selection, redirects to user list
5. ~~Announcement creation~~ — wired create modal (`announcement.create`) with scope/priority/pin/draft + delete button
6. ~~Waitlist add~~ — wired add modal (`occupancy.addToWaitlist`) with resident picker, house, priority, date, notes
**Backend addition:** `property.listAllHouses` — returns all houses across all properties (for dropdowns)

**Sprint B — Operator daily actions (COMPLETE — 2026-02-20)**
7. ~~Record Payment from billing overview~~ — wired Record Payment modal (`payment.recordManual`) with resident picker, amount, method on `/billing`
8. ~~Meeting attendance roster~~ — wired Take Attendance modal (`meeting.recordAttendance`) with present/excused checkboxes per resident
9. ~~Drug test scheduling~~ — full rewrite from 100% mock → tRPC (`drugTestSchedule.list`, `.create`, `.update`, `.delete`, `.execute`) with stats, toggle active, run now
10. ~~Edit/deactivate users~~ — wired Edit Role modal (`user.updateRole`), Deactivate/Activate buttons (`user.deactivate`/`user.reactivate`) on `/admin/users`
11. ~~Family portal actions~~ — wired Add Contact modal (`familyPortal.upsertContact`), Manage modal (enable/disable portal, remove contact) on `/admin/family-portal`

**Sprint C — Documents module + Curfew Config (COMPLETE — 2026-02-20)**
12. ~~Wire document library~~ — rewired from mock to `document.list` with status/search filtering
13. ~~Wire document templates~~ — rewired from mock to `document.template.list` + `template.delete` mutation
14. ~~Wire document signatures~~ — rewired from mock to `document.list` (signature statuses) + `esign.voidEnvelope` mutation
15. ~~Wire document retention~~ — rewired from mock to `document.retention.list` + `retention.getExpiring`
16. ~~Configure Curfew~~ — built Configure Curfew modal (`curfew.setHouseConfig`) with house picker, weekday/weekend time inputs, loads existing config
17. ~~Replace all prompt() calls~~ — curfew excuse → modal, pass denial → modal, admissions mark-lost → modal
18. ~~PWA documents~~ — wired Sign Now (`esign.getSigningUrl`), View/Download (`document.getDownloadUrl`)

**Sprint D — PWA completion (COMPLETE — 2026-02-20)**
17. ~~PWA family portal~~ — wired Pay Now modal (`payment.recordManual`), Send Message (`conversation.create` + `message.send`), Add Payment Method (toast — Stripe pending), Consent Details modal (`familyPortal.getActiveConsents`)
18. ~~Consent renewal flow~~ — added `consent.renew` backend procedure, wired Renew button on `/compliance/consents` (modal with date picker), wired Renew on `/dashboard` (links to consents page). Also replaced `confirm()` with proper modal for revoke.
**Backend addition:** `consent.renew` — creates new active consent from expired/revoked, copies all 42 CFR 2.31 fields

**Sprint E — Polish (COMPLETE — 2026-02-20)**
19. ~~Revenue chart real historical data~~ — done (uses `reporting.getRevenueTrends`)
20. ~~Ledger export + date range filter~~ — date range picker (from/to), filters `listEntries` queries, CSV export with trial balance totals, filter badge with clear button
21. ~~Disclosure export~~ — client-side CSV export with 42 CFR Part 2 redisclosure notice prepended, exports all visible disclosures
22. ~~Responsive breakpoints~~ — CRM sidebar: mobile hamburger menu (< lg), overlay drawer with backdrop, auto-close on navigation, fixed top bar on mobile with logo; desktop unchanged (collapsible sidebar)

### Phase D-G: Product Reset Phases (COMPLETE — 2026-02-21)

**Phase D — Payment Flow:**
- `/settings/payments` — Stripe Connect onboarding, fee config (absorb vs pass-through), payment reminders, late fees
- Enhanced Record Payment modal — Cash App, Venmo, Zelle, Money Order + reference number + date picker
- `/api/cron/send-reminders` — reads org payment settings, sends in-app system messages
- `/api/cron/apply-late-fees` — daily late fee application with grace period, per-month dedup

**Phase E — Automations (internal cron, zero n8n cost):**
- `automation_configs` + `automation_logs` DB tables
- `automation` tRPC router — 6 procedures (list, toggle, getSettings, updateSettings, getLog, runNow)
- 11 automation definitions across 5 categories (payments, operations, occupancy, reports, admissions)
- `/settings/automations` — toggle page with category grouping, settings modals, run-now buttons
- `/api/cron/daily-digest` — bed occupancy, revenue, outstanding invoices, new leads

**Phase F — Referrals & Admissions:**
- `referral_sources` DB table + `referralSource` tRPC router (CRUD + stats)
- `/apply/[slug]` — public intake form (no auth required), creates lead in pipeline
- `/api/public/apply` — POST endpoint for public applications
- `/admissions/referrals` — referral source management with conversion stats

**Phase G — DocuSign Integration:**
- `/settings/docusign` — connection status, setup guide, template recommendations
- `DocumentStatusBadge` + `EnvelopeStatusBadge` reusable components
- 5 Quick-Start Templates (House Rules, Move-In, Financial, Emergency Contact, Drug Testing)
- Send from Template modal, multi-document signing, embedded signing (iframe)
- Enhanced webhook handler (envelope-sent, envelope-delivered events)

**Build verified:** `tsc --noEmit` clean, `next build` clean

### Phase G2 Wave 1 (COMPLETE — 2026-02-21)

**G2-1/G2-2 — Lead Conversion + Invite:**
- Enhanced `lead.convertToResident` — one-click: creates resident, assigns bed, generates invoice, sends welcome message
- `lead.sendInvite` — generates crypto invite token, builds `/register?invite=<token>` link
- Admissions detail page rewritten with ConvertToResidentModal (house/bed picker, invoice toggle, doc toggle)

**G2-3 to G2-6 — Shareable Intake Links:**
- Property slug auto-generation on create (`generateSlug` + `uniquePropertySlug`)
- `GET /api/public/org/[slug]` — public org lookup with properties
- `POST /api/public/apply` — public application endpoint (creates lead)
- `/apply/[slug]` — branded intake form with org name/logo, property selector
- `/apply/[slug]/[propertySlug]` — property-specific intake form
- `IntakeLinkCard` component — copy link, QR code (PNG download), website embed snippet
- Property detail page shows intake link + QR

**G2-7 to G2-12 — Dashboard Command Center:**
- RecordPaymentModal — resident picker, amount pre-fill, payment method, reference number
- AddResidentModal — quick-add from dashboard (uses `lead.quickCreate`)
- OutstandingBreakdown — drill-down showing who owes what, per-row "Record Payment"
- Action items with inline buttons (send reminder, review, etc.)
- EmptyStateChecklist — guided 4-step onboarding for new orgs
- `reporting.getActiveResidents` + `reporting.getOutstandingByResident` procedures

**G2-13 to G2-17 — Expense Tracking + Plaid:**
- PlaidLinkButton component (react-plaid-link), Plaid settings page
- Card-to-house mapping (`default_house_id` on plaid_items, auto-assigns during sync)
- Auto-categorization engine (`src/lib/auto-categorize.ts` — merchant→category rules)
- P&L per house page with date range picker, per-house cards, category breakdowns
- Manual expense entry with category/house/vendor/date

**Build verified:** `tsc --noEmit` clean (commit `5fea1cc`)

### Phase G2 Wave 2 (COMPLETE — 2026-02-21)

**Agent Team: g2-final** (5 Sonnet agents + Opus orchestrator)

**G2-18 to G2-20 — Stripe Payments End-to-End:**
- Resident Pay Now → Stripe Checkout (card + ACH + Apple Pay + Google Pay) → webhook → payment + ledger + invoice update
- Stripe Connect Express onboarding with complete/refresh return pages
- Fee config: absorb mode (platform takes fee from operator) vs pass-through (convenience fee added to resident)

**G2-21 to G2-23 — DocuSign End-to-End:**
- Send from template: operator picks template + resident → envelope created via DocuSign API
- Embedded signing: resident signs in-app with signing-complete return page (handles all event types)
- Webhook completion: downloads signed PDF → uploads to S3 (SSE-KMS) → updates document records

**G2-24 to G2-28 — Automation Crons (all 5 verified):**
- Chore auto-rotation (weekly, per-house round-robin)
- Random drug test selection (Fisher-Yates shuffle, 42 CFR Part 2 aware)
- Empty bed alert (calculates lost revenue, notifies waitlist)
- Auto-invoice generation (monthly, deduped by resident+period)
- Weekly P&L digest (revenue - expenses per house, system message to operators)

**NEW — Resident Wellness Check-in:**
- `wellness_check_ins` table + `wellness` tRPC router (checkIn, getDailyStatus, getMyHistory, getHouseSummary)
- Resident app: "How are you feeling today?" with 5 emoji tap targets, optional note, once per day
- Mood sparkline on resident home (14-day history)
- Operator dashboard: per-house satisfaction averages (low mood highlighted)

**NEW — Operator Dashboard Redesign (95% screen):**
- Money row: Revenue MTD, Collected, Outstanding (drill-down), Profit
- Beds + Leads: occupancy %, empty bed cost, pipeline counts, share intake link/QR
- Quick actions: Record Payment, Add Resident, Announce (broadcast), Log Expense
- Action items sorted by $ impact with inline action buttons
- House satisfaction from wellness data
- Messages preview with unread count

**UI/UX Polish:**
- 10 surgical fixes across CRM + PWA pages (text-white→zinc-100, invalid Tailwind classes, form input consistency, Next.js 15+ params types)

**Build verified:** `tsc --noEmit` clean, `next build` clean

### Future Features (NOT blocking V1.0)
- Real-time messaging (WebSocket/SSE)
- Push notifications (service worker / Twilio)
- Public application form (shareable link)
- Rental agreement PDF generation
- Document e-signature (DocuSign)
- Automated alerts (overdue, curfew, consents)
- Expense tracking (Plaid integration)

### BACKEND ROUTERS VERIFIED (All exist, all inputs documented)
| Router | Procedure | orgId | Key Fields |
|--------|-----------|-------|------------|
| property | `create` | auto | name, address_line1, city, state, zip |
| property | `createHouseWithRooms` | auto | propertyId, name, capacity, gender_restriction, rooms[] |
| property | `createRoom` | auto | houseId, name, floor, capacity |
| property | `createBed` | auto | roomId, name |
| resident | `create` | auto | firstName, lastName, dateOfBirth, email?, phone? |
| rate | `create` | auto | rateName, amount, billingFrequency, houseId?, effectiveFrom |
| chore | `create` | input | orgId, houseId, title, frequency? |
| meeting | `create` | input | orgId, title, meetingType, scheduledAt, houseId? |
| drugTest | `create` | input | orgId, residentId, testType, testDate, result? |
| incident | `create` | input | orgId, incidentType, severity, occurredAt, description |
| maintenance | `create` | input | orgId, houseId, title, description, priority |
| curfew | `setHouseConfig` | input | orgId, houseId, weekdayCurfew, weekendCurfew, effectiveFrom |

### KEY FILES FOR UI WORK
- Design tokens: `src/app/globals.css`
- Components: `src/components/ui/*.tsx`
- UI Plan: `docs/08_UI_OVERHAUL_PLAN.md`
- Import pattern: `import { Button, Card, StatCard } from "@/components/ui"`

### Key Patterns for Future Work
- **Newer routers** (ledger, rate, invoice, payment, reporting): get `orgId` from `ctx` automatically
- **Older routers** (operations, familyPortal): require `orgId` as input → get via `trpc.user.getCurrentUser.useQuery()` → `userData?.org_id`
- **Conditional queries**: `{ enabled: !!orgId }` to prevent queries with undefined params
- **Drizzle returns snake_case** from DB, **camelCase** from custom selects — match exactly
- **All pages need** `export const dynamic = "force-dynamic"` for Clerk
- **Resident identity**: No `user_id` on residents table; resolved via `scopeType === 'resident'` + `scopeId` from Clerk metadata → `resident.getMyProfile` procedure

### What's Been Built (Sprint 1-19)

**Project at `/Users/alec/RecoveryOS/app/`**

| Layer | What's Done | Files |
|-------|-------------|-------|
| **Schema** | 65+ tables (including drug_test_schedules, family_portal_tokens), 40+ enums, 150+ indexes, 100+ relations | `src/server/db/schema/*.ts` (18 files) |
| **tRPC Init** | Context, base/protected/part2 procedures | `src/server/trpc-init.ts`, `src/server/trpc.ts` |
| **Middleware** | Auth → Tenant → RBAC → Consent → Audit → Redisclosure → DisclosureTracking | `src/server/middleware/*.ts` (8 files) |
| **Routers** | consent, admin, org, user, disclosure, breach, audit, breakGlass, invoice, payment, ledger, rate, stripe, payer, document, esign, property, occupancy, lead, admission, chore, meeting, pass, curfew, drugTest, incident, checkIn, conversation, message, announcement, drugTestSchedule, maintenance, familyPortal, reporting | `src/server/routers/*.ts` (33 files) |
| **Shared Libs** | Types, constants, encryption (AES-256-GCM), errors (11 classes), Stripe client, ledger helpers, DocuSign client, S3 client, document versioning | `src/lib/*.ts` (9 files) |
| **CRM** | Desktop layout, sidebar (30+ links), header, dashboard | `src/components/layouts/*` |
| **Compliance Pages** | Dashboard, audit log viewer, break-glass log, disclosures, patient notice | `src/app/(crm)/compliance/**` (5 pages) |
| **Admin Pages** | User management, invite form, property management, property detail, family portal admin | `src/app/(crm)/admin/**` (5 pages) |
| **Billing Pages** | Overview dashboard, invoice list/detail/create, ledger view, rate config | `src/app/(crm)/billing/**` (6 pages) |
| **Document Pages** | Library, templates, retention dashboard, signature tracker | `src/app/(crm)/documents/**` (4 pages) |
| **Occupancy Pages** | Bed grid (visual, color-coded), waitlist management | `src/app/(crm)/occupancy/**` (2 pages) |
| **Admissions Pages** | Lead pipeline, admission detail | `src/app/(crm)/admissions/**` (2 pages) |
| **Operations Pages** | Chores, meetings, passes, curfew, drug tests, drug test scheduling, incidents, check-ins, maintenance list, maintenance detail | `src/app/(crm)/operations/**` (10 pages) |
| **Messaging Pages** | Inbox, conversation view, announcements, compose | `src/app/(crm)/messages/**` (4 pages) |
| **Reports Pages** | Enhanced dashboard with real data, occupancy report, financial report, operations report, compliance report | `src/app/(crm)/reports/**` + `dashboard` (5 pages) |
| **PWA** | Mobile layout, bottom nav, home, payments, documents, inbox, maintenance, family portal | `src/app/(resident)/**` (8 pages) |
| **Compliance UI** | 5-step consent wizard, status badges, redisclosure banner, patient notice | `src/components/compliance/*` (4 components) |
| **Auth** | Clerk login/register, proxy (middleware), webhook handler | `src/app/(auth)/**`, `src/proxy.ts`, `api/webhooks/clerk` |
| **API** | tRPC handler, health check, Clerk webhook, Stripe webhook, DocuSign webhook | `src/app/api/**` |
| **Scripts** | Seed data, audit integrity verifier, compliance checklist | `src/scripts/*.ts` (3 files) |
| **E2E Tests** | 5 user flows (intake, billing, drug-test, consent-revocation, discharge), PWA install/offline, OWASP security, performance metrics | `e2e/**/*.spec.ts` (8 files) |
| **CI/CD** | GitHub Actions (build, lint, test, security audit, compliance check, deploy) | `.github/workflows/ci.yml` |

### Key Architecture Patterns
- `trpc-init.ts` / `trpc.ts` split to avoid circular deps (middleware imports from trpc-init)
- DB client uses lazy Proxy (Neon connects on first request, not at module load)
- All external clients (Stripe, DocuSign, S3) use same lazy Proxy pattern
- Audit log `action` and `sensitivity_level` columns use `text` (not enums) for flexibility
- All routes are `force-dynamic` (Clerk needs runtime context)
- `middleware.ts` renamed to `proxy.ts` per Next.js 16
- CRM billing at `/billing/*`, resident payments at `/payments/*` (separate route groups)
- Double-entry ledger: every money movement creates debit+credit pair, balances always computed
- Retention policies enforce regulatory minimums (6yr Part 2, 6yr medical, 7yr financial, 3yr operational)

### Sprint 20: Launch Prep — COMPLETE

**E2E Test Suite** (DONE): Playwright configured with 8 test files
- `e2e/crm/intake.spec.ts` — New resident intake flow (lead → consent → bed assignment)
- `e2e/crm/billing-cycle.spec.ts` — Monthly billing (invoicing, payments, dunning)
- `e2e/crm/drug-test.spec.ts` — Drug test with Part 2 consent gating
- `e2e/crm/consent-revocation.spec.ts` — Immediate revocation + impact assessment
- `e2e/crm/discharge.spec.ts` — Full discharge flow (financial + operational + records)
- `e2e/pwa/install-offline.spec.ts` — PWA manifest, service worker, offline support
- `e2e/security/owasp.spec.ts` — OWASP Top 10 (access control, encryption, injection, auth)
- `e2e/performance/metrics.spec.ts` — FCP < 2s, API p95 < 500ms, Core Web Vitals

**Compliance Verification** (DONE): 2 scripts
- `src/scripts/verify-audit-integrity.ts` — HMAC hash chain verification (T10)
- `src/scripts/compliance-checklist.ts` — T1-T17, A1-A11, O1-O8 pre-launch checks

**CI/CD Pipeline** (DONE): GitHub Actions
- Build + type check → Lint → Security audit → E2E tests → Compliance check → Deploy

**New Scripts in package.json**:
- `npm run test:e2e` — Run Playwright tests
- `npm run verify:audit` — Verify audit log hash chain integrity
- `npm run verify:compliance` — Run pre-launch compliance checklist

---

### Sprint 19: Reporting — COMPLETE

**Backend** (DONE): 1 router with 15 procedures
- `reporting` — dashboard data, occupancy/financial/operations/compliance summaries, trends by period, top delinquent, chore completion by house, expiring consents, accounting of disclosures (CMP-07), data export (CSV/JSON with redisclosure notice)

**Frontend** (DONE): 5 pages
- CRM `/dashboard` — enhanced with real API data, action items, recent activity, expiring consents
- CRM `/reports/occupancy` — bed stats, status breakdown, property/house tables, trends
- CRM `/reports/financial` — invoiced/collected/outstanding, aging buckets, revenue trends, delinquent accounts
- CRM `/reports/operations` — chore completion, meeting attendance, incidents by severity, drug tests, passes
- CRM `/reports/compliance` — consent status, audit activity by sensitivity, breach incidents, expiring consents table

---

### Sprint 17-18: Advanced Ops — COMPLETE

**Backend** (DONE): 3 routers built and compiling
- `drugTestSchedule` — recurring schedules, random selection, calendar view
- `maintenance` — request CRUD, assignment, status workflow
- `familyPortal` — consent-gated access, contact management, portal tokens

**Frontend** (DONE): 6 pages
- CRM `/operations/drug-tests/scheduling` — schedule management, upcoming tests
- CRM `/operations/maintenance` — maintenance request list with filters
- CRM `/operations/maintenance/[id]` — request detail with activity log
- CRM `/admin/family-portal` — family contact management
- PWA `/maintenance` — resident maintenance request submission
- PWA `/family` — family portal with payments, messages, overview

**Schema Additions**:
- `drug_test_schedules` — recurring test configurations
- `drug_test_schedule_executions` — execution history
- `family_portal_tokens` — secure portal access tokens

### Workflow Per Session
1. Read SOURCE_OF_TRUTH.md + relevant roadmap section
2. Write backend routers → `tsc --noEmit`
3. Write frontend pages → `tsc --noEmit`
4. Write integration files if any → `next build`
5. Update SOURCE_OF_TRUTH.md before ending session
