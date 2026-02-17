# RecoveryOS - Source of Truth

> This is the SINGLE source of truth for project status.
> Read this FIRST at the start of EVERY session.

## Current State
- **Phase**: PHASE-4-BUILD (Sprint 1-16 Complete)
- **Status**: Sprint 15-16 done! 3 messaging routers + 5 frontend pages. 135 source files. Zero TS errors, clean `next build`. Sprint 17-18 (Advanced Ops) next.
- **Blocking Issues**: None
- **Last Updated**: 2026-02-17

## DECISIONS
- **Workflow**: Opus direct writes, NO agent teams. One sprint pair per session. Sequential: read docs → backend → tsc → frontend → tsc → integration → next build → update SOURCE_OF_TRUTH.md
- **Why no teams**: Subagents failed to write files in Sprint 7-8; Opus had to redo everything. Teams burn ~2x tokens with dispatch/monitor/fix overhead.
- **NotebookLM**: Authenticated and connected. Notebook created with Phase 1 research.

## Phase Progress
| Phase | Status | Method | Started | Completed | Validated |
|-------|--------|--------|---------|-----------|-----------|
| 0-BOOTSTRAP | Complete | Manual | 2026-02-10 | 2026-02-10 | 2026-02-10 |
| 1-RESEARCH | Complete | Agent Team (4) | 2026-02-10 | 2026-02-12 | 2026-02-12 |
| 2-PRD | Complete | Agent Team (2) | 2026-02-12 | 2026-02-12 | 2026-02-12 |
| 3-ARCHITECTURE | Complete | Agent Team (4) + direct writes | 2026-02-12 | 2026-02-12 | 2026-02-12 |
| 4-BUILD | Sprint 1-14 Done | Opus direct writes | 2026-02-12 | - | - |
| 5-VERIFY | Pending | Verification | - | - | - |

## Active Subtasks
| ID | Title | Owner | Status | Blocked By |
|----|-------|-------|--------|------------|
| (none) | — | — | — | — |

## Remaining Sprint Plan (v1.0)
| Sprint | Module | What to Build | Est. Files |
|--------|--------|---------------|-----------|
| 17-18 | Advanced Ops | Drug test scheduling, family portal, maintenance | ~6 |
| 19 | Reporting | All dashboards, data export | ~6 |
| 20 | Launch Prep | E2E tests, security audit, performance | ~4 |

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

## Next Session Pickup Instructions

### READ THIS FIRST
1. Read this file (SOURCE_OF_TRUTH.md) for full context
2. Sprint 1-16 COMPLETE — clean `next build`, 135 files
3. Sprint 17-18 (Advanced Ops) is NEXT

### What's Been Built (Sprint 1-14)

**Project at `/Users/alec/RecoveryOS/app/`**

| Layer | What's Done | Files |
|-------|-------------|-------|
| **Schema** | 60+ tables, 40+ enums, 150+ indexes, 100+ relations | `src/server/db/schema/*.ts` (18 files) |
| **tRPC Init** | Context, base/protected/part2 procedures | `src/server/trpc-init.ts`, `src/server/trpc.ts` |
| **Middleware** | Auth → Tenant → RBAC → Consent → Audit → Redisclosure → DisclosureTracking | `src/server/middleware/*.ts` (8 files) |
| **Routers** | consent, admin, org, user, disclosure, breach, audit, breakGlass, invoice, payment, ledger, rate, stripe, payer, document, esign, property, occupancy, lead, admission, chore, meeting, pass, curfew, drugTest, incident, checkIn, conversation, message, announcement | `src/server/routers/*.ts` (29 files) |
| **Shared Libs** | Types, constants, encryption (AES-256-GCM), errors (11 classes), Stripe client, ledger helpers, DocuSign client, S3 client, document versioning | `src/lib/*.ts` (9 files) |
| **CRM** | Desktop layout, sidebar (30+ links), header, dashboard | `src/components/layouts/*` |
| **Compliance Pages** | Dashboard, audit log viewer, break-glass log, disclosures, patient notice | `src/app/(crm)/compliance/**` (5 pages) |
| **Admin Pages** | User management, invite form, property management, property detail | `src/app/(crm)/admin/**` (4 pages) |
| **Billing Pages** | Overview dashboard, invoice list/detail/create, ledger view, rate config | `src/app/(crm)/billing/**` (6 pages) |
| **Document Pages** | Library, templates, retention dashboard, signature tracker | `src/app/(crm)/documents/**` (4 pages) |
| **Occupancy Pages** | Bed grid (visual, color-coded), waitlist management | `src/app/(crm)/occupancy/**` (2 pages) |
| **Admissions Pages** | Lead pipeline, admission detail | `src/app/(crm)/admissions/**` (2 pages) |
| **Operations Pages** | Chores, meetings, passes, curfew, drug tests, incidents, check-ins | `src/app/(crm)/operations/**` (7 pages) |
| **Messaging Pages** | Inbox, conversation view, announcements, compose | `src/app/(crm)/messages/**` (4 pages) |
| **PWA** | Mobile layout, bottom nav, home, payments, documents, inbox | `src/app/(resident)/**` |
| **Compliance UI** | 5-step consent wizard, status badges, redisclosure banner, patient notice | `src/components/compliance/*` (4 components) |
| **Auth** | Clerk login/register, proxy (middleware), webhook handler | `src/app/(auth)/**`, `src/proxy.ts`, `api/webhooks/clerk` |
| **API** | tRPC handler, health check, Clerk webhook, Stripe webhook, DocuSign webhook | `src/app/api/**` |
| **Scripts** | Seed data (org, properties, houses, rooms, beds, users, roles, residents, consents, audit logs) | `src/scripts/seed.ts` |

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

### Sprint 17-18: Advanced Ops — What to Build Next

Read `docs/06_ROADMAP.md` Sprint 21-22 section for specs (v1.1 features).

**Backend**:
- Drug test scheduling (random + scheduled)
- Family portal messaging
- Maintenance request system

**Frontend**:
- Drug test scheduling interface
- Family portal pages
- Maintenance request workflow

---

### Sprint 15-16: Messaging — COMPLETE

**Backend** (DONE): 3 routers built and compiling
- `conversation` — DM, group chat, house channels, member management
- `message` — send/receive, encryption for Part 2, redisclosure notice
- `announcement` — broadcast, pinning, read tracking, drafts

**Frontend** (DONE): 5 pages
- CRM `/messages` — inbox with conversation list, filters
- CRM `/messages/[id]` — conversation thread view with members
- CRM `/messages/announcements` — announcement management
- CRM `/messages/compose` — new message/conversation creation
- PWA `/inbox` — resident messaging with announcements

**Key Features (from roadmap)**:
- MSG-01: Direct messages (1:1, real-time delivery)
- MSG-02: Group chat (house, property, custom groups)
- MSG-03: House announcements (pinnable, read tracking)
- MSG-07: Family/sponsor messaging (consent-gated)
- MSG-09: Consent-gated content (Part 2 verification)
- CMP-06: Redisclosure notice in messages

### Workflow Per Session
1. Read SOURCE_OF_TRUTH.md + relevant roadmap section
2. Write backend routers → `tsc --noEmit`
3. Write frontend pages → `tsc --noEmit`
4. Write integration files if any → `next build`
5. Update SOURCE_OF_TRUTH.md before ending session
