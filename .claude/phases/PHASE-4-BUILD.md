# Phase 4: Build (Full Product)

## Objective
Implement the complete product. Opus writes all files directly — no agent teams.

## Entry Criteria
- Phase 3 complete and validated
- All architecture approved by compliance-expert
- All architecture approved by payments-architect

## Method: Opus Direct Writes (Sequential)

One sprint pair per session:
1. Read SOURCE_OF_TRUTH.md + relevant roadmap section
2. Write backend routers → `tsc --noEmit`
3. Write frontend pages → `tsc --noEmit`
4. Write integration files if any → `next build`
5. Update SOURCE_OF_TRUTH.md before ending session

**Why no agent teams**: Subagents failed to write files in Sprint 7-8. Opus had to redo all work. Teams burn ~2x tokens with dispatch/monitor/fix overhead.

## Sprint Status

| Sprint | Module | Status | Files Added | Date |
|--------|--------|--------|-------------|------|
| 1-2 | Foundation (schema, tRPC, shell) | **Complete** | 63 | 2026-02-12 |
| 3-4 | Compliance (routers, pages, webhook) | **Complete** | +14 → 77 | 2026-02-12 |
| 5-6 | Payments (Stripe, ledger, billing) | **Complete** | +15 → 92 | 2026-02-12 |
| 7-8 | Documents & E-Sign | **Complete** | +11 → 103 | 2026-02-17 |
| 9-10 | Org + Occupancy | **Complete** | +6 → 109 | 2026-02-17 |
| 11-12 | Admissions CRM | **Next** | — | — |
| 13-14 | House Operations | Pending | — | — |
| 15-16 | Messaging | Pending | — | — |
| 17-18 | Advanced Ops | Pending | — | — |
| 19 | Reporting | Pending | — | — |
| 20 | Launch Prep | Pending | — | — |

## Current Stats
- 109 source files, 24,904 lines TypeScript
- Zero TS errors, clean `next build`
- 19 tRPC routers, 19 CRM pages, 3 PWA pages, 3 webhook handlers

## Build Order (Remaining)
1. **Sprint 9-10**: Org + Occupancy (property/house CRUD, bed grid, transfers, waitlist)
2. **Sprint 11-12**: Admissions CRM (lead pipeline, intake wizard, Part 2 consent at admission)
3. **Sprint 13-14**: House Operations (chores, meetings, passes, curfew, drug tests, incidents)
4. **Sprint 15-16**: Messaging (DM, group chat, announcements, push, consent-gated)
5. **Sprint 17-18**: Advanced Ops (drug test scheduling, family portal, maintenance)
6. **Sprint 19**: Reporting (all dashboards, data export)
7. **Sprint 20**: Launch Prep (E2E tests, security audit, performance)

## Exit Criteria
- All P0 features implemented per PRD (68 features)
- Zero TS errors, clean `next build`
- compliance-expert review on security-sensitive sprints
- All acceptance criteria from 06_ROADMAP.md met
