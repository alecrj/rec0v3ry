# RecoveryOS - Sober Living Management Platform

## Current State
> See SOURCE_OF_TRUTH.md for live status. Read it FIRST every session.

## What We're Building
The best all-in-one recovery housing management platform:
- Operator CRM (web, desktop-first)
- Resident App (PWA)
- Payments + Ledger (Stripe)
- Documents + E-Sign
- House Operations (chores, meetings, passes, curfew)
- Messaging + Announcements
- Audit Logging (enterprise-grade)
- HIPAA + 42 CFR Part 2 Compliance

## Prime Directives
1. **Research before planning** - Use NotebookLM for deep regulatory research
2. **Compliance by design** - The compliance-expert subagent reviews ALL architecture
3. **Citations for all claims** - No regulatory statement without authoritative source
4. **Parallel execution** - Use Agent Teams for research and implementation
5. **Context preserved** - Everything important goes in repo, not chat

## Canonical Docs (7 max)
| Doc | Purpose | Owner |
|-----|---------|-------|
| docs/00_NORTH_STAR.md | Vision, differentiation | planner |
| docs/01_REQUIREMENTS.md | Full PRD, personas, flows, screens | planner |
| docs/02_ARCHITECTURE.md | System design, tech stack | architect |
| docs/03_DATA_MODEL.md | Schema, multi-tenant, indexes | architect |
| docs/04_COMPLIANCE.md | HIPAA, 42 CFR Part 2, security | compliance-expert |
| docs/05_PAYMENTS.md | Stripe, ledger, reconciliation | payments-architect |
| docs/06_ROADMAP.md | Build order (full product) | planner |

## Research Docs (Phase 1)
| Doc | Purpose |
|-----|---------|
| docs/research/competitors.md | Feature matrix with citations |
| docs/research/regulations.md | HIPAA, 42 CFR Part 2 with authoritative citations |
| docs/research/gaps.md | How we beat each competitor specifically |

## Custom Subagents (Persistent Memory)
Use these for specialized work. They accumulate knowledge across sessions.

| Agent | When to Use |
|-------|-------------|
| compliance-expert | ANY security, audit, HIPAA, 42 CFR Part 2 decision |
| payments-architect | Stripe, ledger, billing, reconciliation |
| research-analyst | Competitor research with citations |
| verifier | Quality checks, security audits, test verification |

## Agent Teams - When to Spawn
- **Phase 1 Research**: 5 teammates (4 competitors + 1 regulations) in parallel
- **Phase 4 Build**: 5 teammates (backend, frontend, mobile, integrations, compliance-verifier)

## Key Commands
- `/phase-status` - Current phase and next actions
- `/research [topic]` - Deep research using NotebookLM
- `/verify-compliance` - Run compliance verification

## Critical Rules
1. NO subtask complete without validation with evidence
2. NO phase transition without checkpoint pass
3. ALL compliance claims cite HHS.gov or Federal Register
4. ALL competitor claims link to source URL
5. compliance-expert subagent MUST review:
   - Every data model design
   - Every API endpoint design
   - Every storage/encryption decision
   - Every third-party integration
6. 42 CFR Part 2 deadline: February 16, 2026 - design for this NOW

## Tech Stack (Decided in Phase 3)
- Frontend: Next.js 14+ (App Router)
- Backend: Next.js API Routes + tRPC
- Database: PostgreSQL (Neon or Supabase)
- Auth: Clerk or Auth0 (HIPAA BAA available)
- Payments: Stripe Connect
- Storage: S3-compatible with encryption at rest
- Mobile: PWA (React, installable)

## MCP Servers Available
@notebooklm - Deep research with NotebookLM
@github - Repository management
@stripe - Payment integration (Phase 4+)
@postgres - Database queries

## The Build - Full Product, Not MVP
We are building the complete platform:
- Multi-org, multi-property, multi-house
- 9 user roles with granular RBAC
- Complete payments engine (all payment types, proration, dunning)
- Full document management with e-sign
- Comprehensive house operations
- Enterprise audit logging
- Compliance-grade security
