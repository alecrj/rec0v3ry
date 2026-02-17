# RecoveryOS - System Architecture

> **Status**: Final
> **Owner**: system-architect
> **Last Updated**: 2026-02-12
> **Depends On**: [01_REQUIREMENTS.md](01_REQUIREMENTS.md) (107 features), [04_COMPLIANCE.md](04_COMPLIANCE.md) (compliance spec), [06_ROADMAP.md](06_ROADMAP.md) (build order)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Service Boundaries & Module Structure](#3-service-boundaries--module-structure)
4. [Next.js App Router Layout](#4-nextjs-app-router-layout)
5. [tRPC API Architecture](#5-trpc-api-architecture)
6. [Authentication Architecture](#6-authentication-architecture)
7. [Authorization & RBAC](#7-authorization--rbac)
8. [Multi-Tenancy](#8-multi-tenancy)
9. [Audit Logging Architecture](#9-audit-logging-architecture)
10. [Background Job Architecture](#10-background-job-architecture)
11. [File Storage Architecture](#11-file-storage-architecture)
12. [Real-Time Architecture](#12-real-time-architecture)
13. [DocuSign Integration](#13-docusign-integration)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Security Architecture](#15-security-architecture)
16. [Observability & Monitoring](#16-observability--monitoring)

---

## 1. Architecture Overview

RecoveryOS is a **modular monolith** deployed as a single Next.js application on Vercel Enterprise. The monolith pattern is chosen over microservices because:

- A 5-person engineering team cannot maintain inter-service infrastructure
- All modules share the same compliance infrastructure (audit logging, RBAC, consent gating)
- Single deployment eliminates distributed transaction complexity for the double-entry ledger
- Module boundaries are enforced at the code level, allowing future extraction if needed

### High-Level Architecture

```
                                   ┌─────────────────────────────┐
                                   │       CDN / Edge Layer       │
                                   │  Vercel Edge Network + WAF   │
                                   └──────────────┬──────────────┘
                                                  │
                              ┌───────────────────┼───────────────────┐
                              │                   │                   │
                    ┌─────────▼──────┐  ┌────────▼────────┐  ┌──────▼──────────┐
                    │  Operator CRM  │  │  Resident PWA   │  │ Family/Referral  │
                    │  (Desktop Web) │  │  (Mobile Web)   │  │    Portal        │
                    │  Next.js SSR   │  │  Next.js SSR    │  │  Next.js SSR     │
                    └─────────┬──────┘  └────────┬────────┘  └──────┬──────────┘
                              │                   │                   │
                              └───────────────────┼───────────────────┘
                                                  │
                              ┌───────────────────▼───────────────────┐
                              │          Next.js API Layer            │
                              │                                       │
                              │  ┌─────────────────────────────────┐  │
                              │  │         tRPC Routers            │  │
                              │  │  org | resident | billing |     │  │
                              │  │  ops | docs | messaging |      │  │
                              │  │  compliance | admin | reports   │  │
                              │  └──────────────┬──────────────────┘  │
                              │                 │                     │
                              │  ┌──────────────▼──────────────────┐  │
                              │  │      Middleware Pipeline         │  │
                              │  │  Auth → Tenant → RBAC →         │  │
                              │  │  Consent → Audit → Response     │  │
                              │  └──────────────┬──────────────────┘  │
                              └─────────────────┼─────────────────────┘
                                                │
                ┌───────────────┬───────────────┼───────────────┬───────────────┐
                │               │               │               │               │
        ┌───────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
        │  PostgreSQL  │ │   AWS S3   │ │   Clerk    │ │   Stripe   │ │  DocuSign   │
        │  (Neon)      │ │ (Files +   │ │  (Auth +   │ │  Connect   │ │ (E-Sign)    │
        │              │ │  Encrypt)  │ │   MFA)     │ │ (Payments) │ │             │
        │  App Data    │ └────────────┘ └────────────┘ └────────────┘ └─────────────┘
        │  Audit Logs  │
        │  RLS         │       ┌───────────────┬───────────────┐
        └──────────────┘       │               │               │
                        ┌──────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
                        │  Inngest    │ │  Ably       │ │  Upstash   │
                        │ (Jobs +     │ │ (Real-time  │ │  Redis     │
                        │  Cron)      │ │  Messaging) │ │ (Cache +   │
                        └─────────────┘ └─────────────┘ │  Rate Lim) │
                                                        └────────────┘
```

### Request Flow

Every request follows this pipeline:

```
Client Request
  → Vercel Edge (WAF, DDoS, GeoIP)
  → Next.js Middleware (auth check, rate limit)
  → tRPC Handler
    → Auth Middleware (verify Clerk session, extract user)
    → Tenant Middleware (resolve org_id, set RLS)
    → RBAC Middleware (check role + permissions for endpoint)
    → Consent Middleware (verify Part 2 consent if accessing SUD data)
    → Business Logic (module handler)
    → Audit Middleware (async write to audit log)
  → Response (with redisclosure headers if Part 2 data)
```

---

## 2. Tech Stack

### Core Application

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Framework** | Next.js | 14+ (App Router) | SSR for SEO and performance; App Router for layouts, streaming, Server Components; dominant React meta-framework |
| **API** | tRPC | v11 | End-to-end type safety between client and server; eliminates API contract drift; built-in middleware support |
| **Language** | TypeScript | 5.x | Type safety across entire stack; required for tRPC; catches errors at compile time |
| **ORM** | Drizzle ORM | Latest | Type-safe SQL queries; lightweight (no query engine runtime); first-class PostgreSQL support; schema-as-code with migrations |
| **Styling** | Tailwind CSS | v4 | Utility-first; consistent design system; excellent tree-shaking; dominant in Next.js ecosystem |
| **UI Components** | shadcn/ui | Latest | Accessible, composable components built on Radix UI; copy-paste model avoids dependency lock-in; Tailwind-native |
| **Forms** | React Hook Form + Zod | Latest | Performant form handling; Zod schemas shared between client validation and tRPC input validation |
| **State** | TanStack Query (via tRPC) | v5 | Server state management through tRPC's React Query integration; handles caching, refetching, optimistic updates |

### Infrastructure

| Service | Provider | Rationale |
|---------|----------|-----------|
| **Hosting** | Vercel Enterprise | HIPAA BAA available; edge network; serverless scaling; native Next.js support; zero-config CI/CD |
| **Database** | Neon PostgreSQL | HIPAA BAA available; serverless PostgreSQL; branching for dev/staging; connection pooling via built-in proxy; auto-scaling |
| **Auth** | Clerk | HIPAA BAA available (HIPAA plan); MFA built-in (TOTP, SMS, passkey); session management; user management UI; webhook events |
| **Payments** | Stripe Connect | PCI DSS Level 1; BAA available; Connect Express for operator payouts; client-side tokenization (PCI scope reduction) |
| **File Storage** | AWS S3 | HIPAA BAA via AWS BAA; SSE-KMS encryption; IAM-based access; lifecycle policies for tiered storage |
| **E-Signature** | DocuSign | HIPAA BAA available; ESIGN Act / UETA compliance; audit trail + tamper-evident seal; certificate of completion |
| **Background Jobs** | Inngest | Event-driven; durable execution; cron scheduling; Vercel-native; automatic retries; step functions for multi-step workflows |
| **Real-Time** | Ably | HIPAA BAA available (enterprise); pub/sub messaging; presence; serverless-compatible; 99.999% uptime SLA |
| **Cache / Rate Limit** | Upstash Redis | Serverless Redis; HIPAA-eligible; per-request pricing; built-in rate limiting SDK (`@upstash/ratelimit`) |
| **Email** | SendGrid | HIPAA BAA available; transactional email; delivery tracking; template support |
| **Key Management** | AWS KMS | FIPS 140-2 Level 2 validated; per-org key isolation; automatic rotation; IAM access policies |
| **DNS / CDN** | Vercel (Cloudflare-backed) | Edge caching; automatic HTTPS; DDoS protection |

### BAA Chain

Every provider handling PHI or Part 2 data has a signed BAA. Source: [04_COMPLIANCE.md](04_COMPLIANCE.md), Section 7.

```
RecoveryOS BAA Chain:
  RecoveryOS ←BAA→ Customer (sober living facility)
  RecoveryOS ←BAA→ Neon (database)
  RecoveryOS ←BAA→ Vercel Enterprise (hosting)
  RecoveryOS ←BAA→ Clerk (auth, HIPAA plan)
  RecoveryOS ←BAA→ AWS (S3, KMS)
  RecoveryOS ←BAA→ DocuSign (e-signatures)
  RecoveryOS ←BAA→ Ably Enterprise (real-time)
  RecoveryOS ←BAA→ SendGrid (email)
  RecoveryOS ←BAA→ Stripe (payments, no SUD data)
```

---

## 3. Service Boundaries & Module Structure

### Monorepo Structure

The codebase is organized as a modular monolith within a single Next.js application. Module boundaries are enforced through directory structure and import rules (ESLint `no-restricted-imports`).

```
recoveryos/
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── (auth)/                 # Auth pages (login, register, MFA)
│   │   ├── (crm)/                  # Operator CRM (desktop-first)
│   │   ├── (resident)/             # Resident PWA portal
│   │   ├── (family)/               # Family/sponsor portal
│   │   ├── (referral)/             # Referral partner portal
│   │   ├── api/                    # API routes
│   │   │   └── trpc/[trpc]/        # tRPC catch-all handler
│   │   └── layout.tsx              # Root layout
│   │
│   ├── server/                     # Server-side code
│   │   ├── routers/                # tRPC routers (one per module)
│   │   │   ├── org.ts
│   │   │   ├── property.ts
│   │   │   ├── house.ts
│   │   │   ├── resident.ts
│   │   │   ├── occupancy.ts
│   │   │   ├── admission.ts
│   │   │   ├── billing.ts
│   │   │   ├── ledger.ts
│   │   │   ├── operations.ts
│   │   │   ├── document.ts
│   │   │   ├── messaging.ts
│   │   │   ├── consent.ts
│   │   │   ├── compliance.ts
│   │   │   ├── report.ts
│   │   │   └── admin.ts
│   │   ├── middleware/             # tRPC middleware stack
│   │   │   ├── auth.ts             # Clerk session verification
│   │   │   ├── tenant.ts           # org_id resolution + RLS
│   │   │   ├── rbac.ts             # Role + permission check
│   │   │   ├── consent.ts          # Part 2 consent verification
│   │   │   ├── audit.ts            # Audit log writer
│   │   │   ├── rateLimit.ts        # Upstash rate limiting
│   │   │   └── redisclosure.ts     # Part 2 redisclosure header
│   │   ├── services/               # Business logic (per module)
│   │   │   ├── org/
│   │   │   ├── resident/
│   │   │   ├── billing/
│   │   │   ├── consent/
│   │   │   ├── audit/
│   │   │   └── ...
│   │   ├── db/                     # Drizzle schema + queries
│   │   │   ├── schema/             # Table definitions
│   │   │   ├── migrations/         # SQL migrations
│   │   │   ├── client.ts           # Neon connection
│   │   │   └── rls.ts              # RLS policy setup
│   │   ├── integrations/           # Third-party clients
│   │   │   ├── stripe.ts
│   │   │   ├── docusign.ts
│   │   │   ├── s3.ts
│   │   │   ├── kms.ts
│   │   │   ├── ably.ts
│   │   │   ├── sendgrid.ts
│   │   │   └── inngest.ts
│   │   └── trpc.ts                 # tRPC initialization + context
│   │
│   ├── lib/                        # Shared utilities
│   │   ├── constants.ts
│   │   ├── errors.ts               # Error codes + types
│   │   ├── encryption.ts           # Field-level encrypt/decrypt
│   │   ├── validation/             # Zod schemas (shared client+server)
│   │   └── types/                  # Shared TypeScript types
│   │
│   ├── components/                 # React components
│   │   ├── ui/                     # shadcn/ui primitives
│   │   ├── layouts/                # CRM layout, resident layout
│   │   ├── forms/                  # Form components
│   │   ├── dashboards/             # Dashboard widgets
│   │   └── compliance/             # Consent UI, redisclosure banners
│   │
│   └── hooks/                      # Custom React hooks
│       ├── useTRPC.ts
│       ├── useAuth.ts
│       └── useRealtime.ts
│
├── inngest/                        # Background job definitions
│   ├── functions/
│   │   ├── billing.ts              # Invoice generation, dunning
│   │   ├── consent.ts              # Expiration monitoring
│   │   ├── audit.ts                # Hash chain verification
│   │   ├── retention.ts            # Document retention enforcement
│   │   ├── notifications.ts        # Email/SMS/push
│   │   └── breach-detection.ts     # Anomaly detection rules
│   └── client.ts
│
├── public/                         # Static assets
│   ├── manifest.json               # PWA manifest
│   └── sw.js                       # Service worker
│
├── drizzle.config.ts               # Drizzle ORM config
├── next.config.ts                  # Next.js config
├── tailwind.config.ts              # Tailwind config
└── tsconfig.json
```

### Module Dependency Rules

Modules communicate only through their public service interfaces. Direct database access from routers is prohibited -- routers call services, services call the database layer.

```
Router → Service → DB/Integration
  ↑         ↑         ↑
  │         │         └── Only accesses own module's tables
  │         └── Contains business logic + validation
  └── Handles request/response + middleware

Cross-module calls go through service interfaces:
  billing.service → resident.service.getById()     (OK)
  billing.router  → resident.db.select()            (PROHIBITED)
```

Inter-module dependencies:

| Module | Depends On | Reason |
|--------|-----------|--------|
| All modules | `audit` | Every state change logs to audit |
| All modules | `tenant` | All queries scoped by org_id |
| `resident` | `consent`, `org` | Consent gating on Part 2 fields |
| `billing` | `resident`, `org`, `ledger` | Invoicing requires resident + org data |
| `operations` | `resident`, `org` | Operations target residents |
| `document` | `resident`, `consent`, `org` | Doc access requires consent check |
| `messaging` | `resident`, `consent`, `org` | Consent-gated messaging |
| `compliance` | `consent`, `audit`, `resident` | Compliance dashboards aggregate |
| `admission` | `resident`, `consent`, `occupancy`, `document` | Intake creates resident, consent, bed assignment, docs |
| `report` | All modules | Reporting aggregates across modules |

---

## 4. Next.js App Router Layout

### Route Groups

Route groups use parenthesized directories to organize layouts without affecting URL structure.

```
src/app/
├── (auth)/                             # Authentication pages
│   ├── login/page.tsx                  # /login
│   ├── register/page.tsx               # /register
│   ├── mfa/page.tsx                    # /mfa
│   ├── forgot-password/page.tsx        # /forgot-password
│   └── layout.tsx                      # Minimal layout (no sidebar)
│
├── (crm)/                              # Operator CRM (desktop-first)
│   ├── layout.tsx                      # CRM shell: sidebar + header + notifications
│   ├── dashboard/page.tsx              # /dashboard
│   ├── occupancy/
│   │   ├── page.tsx                    # /occupancy (bed grid)
│   │   └── waitlist/page.tsx           # /occupancy/waitlist
│   ├── admissions/
│   │   ├── page.tsx                    # /admissions (Kanban pipeline)
│   │   ├── [leadId]/page.tsx           # /admissions/:leadId
│   │   └── intake/[residentId]/page.tsx # /admissions/intake/:residentId
│   ├── residents/
│   │   ├── page.tsx                    # /residents (list)
│   │   └── [residentId]/
│   │       ├── page.tsx                # /residents/:id (overview tab)
│   │       ├── compliance/page.tsx     # /residents/:id/compliance
│   │       ├── financials/page.tsx     # /residents/:id/financials
│   │       ├── operations/page.tsx     # /residents/:id/operations
│   │       ├── documents/page.tsx      # /residents/:id/documents
│   │       └── messages/page.tsx       # /residents/:id/messages
│   ├── billing/
│   │   ├── invoices/page.tsx           # /billing/invoices
│   │   ├── payments/page.tsx           # /billing/payments
│   │   ├── ledger/page.tsx             # /billing/ledger
│   │   ├── reconciliation/page.tsx     # /billing/reconciliation
│   │   └── rates/page.tsx              # /billing/rates
│   ├── operations/
│   │   ├── chores/page.tsx             # /operations/chores
│   │   ├── meetings/page.tsx           # /operations/meetings
│   │   ├── passes/page.tsx             # /operations/passes
│   │   ├── drug-tests/page.tsx         # /operations/drug-tests
│   │   ├── incidents/page.tsx          # /operations/incidents
│   │   └── check-ins/page.tsx          # /operations/check-ins
│   ├── documents/
│   │   ├── page.tsx                    # /documents (library)
│   │   ├── templates/page.tsx          # /documents/templates
│   │   └── retention/page.tsx          # /documents/retention
│   ├── messages/
│   │   ├── page.tsx                    # /messages (inbox)
│   │   ├── [conversationId]/page.tsx   # /messages/:id
│   │   └── announcements/page.tsx      # /messages/announcements
│   ├── reports/
│   │   ├── occupancy/page.tsx          # /reports/occupancy
│   │   ├── financial/page.tsx          # /reports/financial
│   │   ├── operations/page.tsx         # /reports/operations
│   │   ├── compliance/page.tsx         # /reports/compliance
│   │   ├── outcomes/page.tsx           # /reports/outcomes
│   │   └── grants/page.tsx             # /reports/grants
│   ├── compliance/
│   │   ├── consents/page.tsx           # /compliance/consents
│   │   ├── disclosures/page.tsx        # /compliance/disclosures
│   │   ├── audit/page.tsx              # /compliance/audit
│   │   ├── baa/page.tsx                # /compliance/baa
│   │   └── breaches/page.tsx           # /compliance/breaches
│   └── admin/
│       ├── users/page.tsx              # /admin/users
│       ├── settings/page.tsx           # /admin/settings
│       ├── properties/page.tsx         # /admin/properties
│       └── subscription/page.tsx       # /admin/subscription
│
├── (resident)/                         # Resident PWA
│   ├── layout.tsx                      # Mobile-first layout with bottom nav
│   ├── home/page.tsx                   # /home (balance, chores, messages)
│   ├── payments/page.tsx               # /payments
│   ├── schedule/page.tsx               # /schedule
│   ├── messages/page.tsx               # /messages
│   ├── documents/page.tsx              # /documents
│   ├── profile/page.tsx                # /profile
│   └── records/page.tsx                # /records (Part 2 rights)
│
├── (family)/                           # Family/Sponsor Portal
│   ├── layout.tsx                      # Simple layout with consent banner
│   ├── home/page.tsx                   # /family/home
│   ├── payments/page.tsx               # /family/payments
│   ├── messages/page.tsx               # /family/messages
│   └── updates/page.tsx                # /family/updates
│
├── (referral)/                         # Referral Partner Portal
│   ├── layout.tsx
│   ├── dashboard/page.tsx              # /referral/dashboard
│   ├── residents/[id]/page.tsx         # /referral/residents/:id
│   └── reports/page.tsx                # /referral/reports
│
├── api/
│   ├── trpc/[trpc]/route.ts            # tRPC catch-all
│   ├── webhooks/
│   │   ├── clerk/route.ts              # Clerk webhook handler
│   │   ├── stripe/route.ts             # Stripe webhook handler
│   │   ├── docusign/route.ts           # DocuSign Connect webhook
│   │   └── inngest/route.ts            # Inngest webhook handler
│   └── health/route.ts                 # Health check endpoint
│
└── layout.tsx                          # Root layout (providers, fonts)
```

### Middleware

Next.js middleware runs at the edge before every request. It handles authentication gating and route protection.

```typescript
// src/middleware.ts
// Runs on Vercel Edge Runtime for every request

export default clerkMiddleware((auth, req) => {
  // Public routes: login, register, health check, webhooks
  // Protected routes: everything else requires authenticated session
  // Portal routing: redirect users to their role-appropriate portal
  //   - Resident role → (resident) routes
  //   - Family role → (family) routes
  //   - Referral role → (referral) routes
  //   - Staff/Manager/Admin roles → (crm) routes
});
```

### Layout Hierarchy

```
RootLayout (providers: Clerk, tRPC, TanStack Query, theme)
  ├── AuthLayout (minimal: centered card, no navigation)
  ├── CRMLayout (sidebar navigation, header with org switcher, notification bell)
  ├── ResidentLayout (bottom tab navigation, mobile-optimized)
  ├── FamilyLayout (simple header, consent status banner)
  └── ReferralLayout (minimal navigation, consent-gated views)
```

---

## 5. tRPC API Architecture

### Router Structure

The root router merges all module routers. Each router has nested sub-routers for related operations.

```typescript
// src/server/routers/_app.ts
export const appRouter = router({
  org:        orgRouter,        // Organization CRUD, settings, compliance config
  property:   propertyRouter,   // Property CRUD
  house:      houseRouter,      // House CRUD, bed configuration
  resident:   residentRouter,   // Resident profile, status, history
  occupancy:  occupancyRouter,  // Bed tracking, assignments, transfers, waitlist
  admission:  admissionRouter,  // Lead pipeline, intake, forms
  billing:    billingRouter,    // Invoices, payments, rates, deposits
  ledger:     ledgerRouter,     // Double-entry ledger, reconciliation
  operations: operationsRouter, // Chores, meetings, passes, curfew, drug tests, incidents
  document:   documentRouter,   // Storage, templates, signing, retention
  messaging:  messagingRouter,  // DMs, groups, announcements
  consent:    consentRouter,    // Part 2 consent CRUD, verification
  compliance: complianceRouter, // Disclosures, audit log, breaches, BAA
  report:     reportRouter,     // Dashboard data, exports
  admin:      adminRouter,      // Users, roles, sessions, platform config
});
```

### Endpoint Naming Convention

All endpoints follow the pattern: `module.entity.action`

```
org.get                     # Get current org
org.update                  # Update org settings
property.list               # List properties in org
property.create             # Create property
house.getById               # Get house by ID
resident.list               # List residents (paginated, filtered)
resident.getById            # Get resident profile
resident.create             # Create resident record
billing.invoice.list        # List invoices
billing.invoice.create      # Generate invoice
billing.payment.record      # Record a payment
ledger.entries.list         # List ledger entries
operations.chore.assign     # Assign chore to resident
operations.drugTest.create  # Record drug test result
consent.create              # Create Part 2 consent
consent.revoke              # Revoke consent
compliance.disclosure.list  # List disclosures for accounting
compliance.audit.query      # Query audit log
```

### Middleware Stack

tRPC middleware executes in order for every procedure call. The stack is composable -- each procedure declares which middleware it needs.

```typescript
// Base procedure: auth + tenant + audit (applies to everything)
const baseProcedure = t.procedure
  .use(authMiddleware)        // Verify Clerk session, extract userId
  .use(tenantMiddleware)      // Resolve org_id from session, set RLS
  .use(auditMiddleware);      // Log action after handler completes

// Protected procedure: adds RBAC check
const protectedProcedure = baseProcedure
  .use(rbacMiddleware);       // Check role has permission for this action

// Part 2 procedure: adds consent verification + redisclosure
const part2Procedure = protectedProcedure
  .use(consentMiddleware)     // Verify active Part 2 consent
  .use(redisclosureMiddleware); // Attach redisclosure notice to response
```

### Error Handling

All errors use tRPC error codes with structured error bodies for client-side handling.

| Error Code | HTTP Status | Usage |
|-----------|-------------|-------|
| `UNAUTHORIZED` | 401 | Session expired or missing |
| `FORBIDDEN` | 403 | Role lacks permission, consent missing, or cross-tenant access attempt |
| `NOT_FOUND` | 404 | Resource does not exist within tenant |
| `BAD_REQUEST` | 400 | Input validation failure (Zod) |
| `CONFLICT` | 409 | Duplicate resource, state conflict (e.g., revoking already-revoked consent) |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled error (logged, not exposed to client) |

Error response shape:

```typescript
{
  code: "FORBIDDEN",
  message: "Active Part 2 consent required to access this data",
  data: {
    errorCode: "CONSENT_REQUIRED",     // Machine-readable error code
    resourceType: "drug_test",         // What resource was being accessed
    requiredConsent: "specific_disclosure" // What type of consent is needed
  }
}
```

### Pagination

All list endpoints use cursor-based pagination for consistent performance with large datasets.

```typescript
// Input schema (shared across all list endpoints)
const paginationInput = z.object({
  cursor: z.string().uuid().optional(),  // ID of last item from previous page
  limit: z.number().min(1).max(100).default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Response shape
{
  items: T[],
  nextCursor: string | null,   // null = no more pages
  totalCount: number,          // Total matching items (for UI display)
}
```

### Rate Limiting

Rate limits are enforced at two levels:

| Level | Implementation | Limits |
|-------|---------------|--------|
| **Edge** | Vercel WAF | 1000 req/min per IP (DDoS protection) |
| **API** | Upstash `@upstash/ratelimit` | Per-user, per-endpoint limits |

Per-endpoint rate limits:

| Category | Limit | Window |
|----------|-------|--------|
| Read operations | 100 | 10 seconds |
| Write operations | 30 | 10 seconds |
| Auth operations | 5 | 60 seconds |
| Export/report | 5 | 60 seconds |
| Webhook processing | 50 | 10 seconds |

Rate limit responses include `Retry-After` header and `X-RateLimit-Remaining`.

---

## 6. Authentication Architecture

### Clerk Integration

Clerk handles all identity management: registration, login, MFA, session management, and user metadata.

```
┌──────────────────────────────────────────────────────┐
│                    Clerk Auth Flow                     │
├──────────────────────────────────────────────────────┤
│                                                       │
│  1. User visits RecoveryOS                            │
│  2. Clerk middleware checks session cookie             │
│  3. No session → redirect to /login                   │
│  4. User enters email + password                      │
│  5. Clerk verifies credentials                        │
│  6. MFA challenge (TOTP / SMS / Passkey)              │
│  7. MFA verified → session created                    │
│  8. Session cookie set (HttpOnly, Secure, SameSite)   │
│  9. User redirected to role-appropriate portal         │
│                                                       │
│  Session Properties:                                  │
│  ├── userId: UUID (Clerk user ID)                     │
│  ├── orgId: UUID (active organization)                │
│  ├── role: enum (one of 9 roles)                      │
│  ├── permissions: string[] (granular permissions)      │
│  ├── sessionId: UUID (for audit trail)                │
│  └── expiresAt: timestamp (15-min sliding window)     │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### MFA Requirements

Source: [04_COMPLIANCE.md](04_COMPLIANCE.md), Section 2.2 (45 CFR 164.312(d))

| Requirement | Implementation |
|-------------|---------------|
| MFA required for all users | Enforced at Clerk organization level; no opt-out |
| Supported methods | TOTP (authenticator app), SMS, Passkey (WebAuthn) |
| MFA at first login | Clerk enrollment flow on first sign-in |
| Backup codes | 10 single-use backup codes generated at MFA setup |
| Lost MFA recovery | Org admin identity verification + new MFA setup |
| Step-up authentication | Re-verify MFA for sensitive actions (break-glass, role change, export) |

### Session Management

| Parameter | Value | Source |
|-----------|-------|--------|
| Session timeout | 15 minutes idle (configurable 5-30 min per org) | 45 CFR 164.312(a)(2)(iii) |
| Session storage | Clerk-managed (server-side) | -- |
| Cookie attributes | `HttpOnly`, `Secure`, `SameSite=Strict` | OWASP |
| Concurrent sessions | Allowed (mobile + desktop); viewable in admin | -- |
| Force logout | Org admin can invalidate all sessions for a user | 45 CFR 164.308(a)(3) |
| Session invalidation | Immediate on deactivation, password change, or MFA reset | -- |

### User Provisioning

```
Invitation Flow:
  1. Org admin creates invitation (email, role, scope)
  2. Clerk sends invitation email with magic link
  3. User clicks link → Clerk registration form
  4. Password creation (min 12 chars, no reuse of last 12)
  5. MFA enrollment (mandatory)
  6. Account activated; role assigned in RecoveryOS
  7. Audit log: user_created

Deactivation Flow:
  1. Org admin deactivates user
  2. RecoveryOS calls Clerk API to ban user
  3. All active sessions invalidated immediately
  4. User cannot log in
  5. User data and audit history preserved
  6. Audit log: user_deactivated
```

### Clerk Webhooks

Clerk sends webhook events for user lifecycle changes. RecoveryOS processes these to keep local state synchronized.

| Clerk Event | RecoveryOS Action |
|-------------|-------------------|
| `user.created` | Create local user record with Clerk ID mapping |
| `user.updated` | Sync profile changes (email, name) |
| `user.deleted` | Soft-delete local user; preserve audit trail |
| `session.created` | Log `login_success` audit event |
| `session.ended` | Log `logout` or `session_timeout` audit event |
| `organization.membership.created` | Assign role in RecoveryOS |
| `organization.membership.deleted` | Revoke role; audit log |

---

## 7. Authorization & RBAC

### Permission Model

RecoveryOS uses a role-based access control (RBAC) model with 9 roles. Permissions are defined per role per resource type per action. The RBAC matrix from [04_COMPLIANCE.md](04_COMPLIANCE.md) Section 6.2 is the authoritative source.

```
Permission = Role + Resource + Action + Scope

Example:
  house_manager + resident + read + assigned_houses
  property_manager + resident + read + assigned_properties
  org_owner + resident + read + entire_org
```

### Role Hierarchy

Roles have a scope hierarchy. Higher-scoped roles inherit access to resources within their scope.

```
Platform Admin ──→ Platform scope (no PHI access)
Org Owner ────────→ Organization scope
Org Admin ────────→ Organization scope (limited billing)
Property Manager ─→ Assigned properties scope
House Manager ────→ Assigned houses scope
Staff ────────────→ Assigned houses scope (limited access)
Resident ─────────→ Own records only
Family Member ────→ Designated resident (consent-gated)
Referral Partner ─→ Referred residents (consent-gated)
```

### RBAC Middleware Implementation

The RBAC middleware resolves the required permission for each tRPC procedure and checks it against the user's role and scope.

```typescript
// Permission declaration on procedures
export const residentRouter = router({
  list: protectedProcedure
    .meta({ permission: "resident:read", scope: "house" })
    .query(async ({ ctx }) => { /* ... */ }),

  getById: protectedProcedure
    .meta({ permission: "resident:read", scope: "house" })
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  update: protectedProcedure
    .meta({ permission: "resident:write", scope: "house" })
    .input(updateResidentSchema)
    .mutation(async ({ ctx, input }) => { /* ... */ }),
});
```

```typescript
// RBAC middleware checks permission against role + scope
const rbacMiddleware = t.middleware(async ({ ctx, meta, next }) => {
  const { permission, scope } = meta;
  const { user } = ctx; // From auth middleware

  // 1. Check role has this permission
  if (!hasPermission(user.role, permission)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  // 2. Check scope (user can only access resources in their scope)
  //    house_manager → only assigned houses
  //    property_manager → only assigned properties
  //    org_owner → entire org
  const scopeFilter = resolveScopeFilter(user, scope);
  ctx.scopeFilter = scopeFilter; // Used by service layer to filter queries

  return next({ ctx });
});
```

### Field-Level Filtering

Beyond resource-level RBAC, the system filters individual fields based on the user's role. This enforces the minimum necessary standard (45 CFR 164.502(b)).

```typescript
// Field whitelist per role per resource
const fieldAccess = {
  resident: {
    staff: ["id", "firstName", "lastName", "bedId", "choreStatus", "checkInStatus"],
    house_manager: ["id", "firstName", "lastName", "bedId", "phone", "email",
                    "moveInDate", "status", /* + ops fields */],
    property_manager: ["*"],  // All non-Part2 fields
    org_owner: ["*"],
  }
};

// Part 2 fields are ALWAYS consent-gated regardless of role
const part2Fields = ["drugTestResults", "sudDiagnosis", "treatmentReferrals",
                     "matRecords", "clinicalAssessments", "progressNotes"];
```

---

## 8. Multi-Tenancy

### Approach: Row-Level Security (RLS)

Every table includes `org_id` as a required foreign key. PostgreSQL RLS policies enforce that queries only return rows matching the current session's org_id. This provides database-level isolation -- even a bug in application code cannot leak cross-tenant data.

Source: [04_COMPLIANCE.md](04_COMPLIANCE.md), Section 6.4

### RLS Implementation

```sql
-- Example: Enable RLS on residents table
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see residents in their own org
CREATE POLICY tenant_isolation ON residents
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- Set org_id at the start of every database session
-- (done by tenant middleware before any queries)
SET LOCAL app.current_org_id = '<org_id>';
```

### Tenant Resolution Flow

```
1. Clerk session contains orgId (user's active organization)
2. Tenant middleware extracts orgId from Clerk session
3. Middleware calls SET LOCAL app.current_org_id = orgId
4. All subsequent queries in this request are automatically filtered by RLS
5. No application code needs to manually add WHERE org_id = ? clauses
   (though service code adds them as defense-in-depth)
```

### Cross-Org Isolation

| Layer | Mechanism |
|-------|-----------|
| Database | RLS policies on every table; `org_id` FK required |
| API | Tenant middleware sets RLS context; defense-in-depth `org_id` in queries |
| File Storage | Per-org S3 prefix: `s3://bucket/{org_id}/...`; IAM scoping |
| Encryption | Per-org data encryption keys in AWS KMS |
| Audit Logs | `org_id` on every audit entry; query filtering |
| Cache | Cache keys prefixed with `org:{org_id}:` |

### Management Company Support

Management companies managing multiple organizations can view rollup dashboards. This is implemented via a `management_group` table linking orgs, with a separate dashboard that queries across permitted orgs (bypassing single-org RLS with explicit multi-org authorization).

```
management_groups
  ├── id: UUID
  ├── name: string
  └── created_at: timestamp

management_group_memberships
  ├── group_id: UUID (FK → management_groups)
  ├── org_id: UUID (FK → organizations)
  └── role: enum (owner, viewer)
```

---

## 9. Audit Logging Architecture

### Design Principles

Source: [04_COMPLIANCE.md](04_COMPLIANCE.md), Section 4

The audit log is the compliance backbone of RecoveryOS. It satisfies HIPAA audit controls (45 CFR 164.312(b)), Part 2 audit requirements (42 CFR 2.25), and accounting of disclosures (42 CFR 2.24).

| Principle | Implementation |
|-----------|---------------|
| **Append-only** | `REVOKE UPDATE, DELETE ON audit_log FROM app_user`; enforced at PostgreSQL level |
| **Tamper-evident** | HMAC-SHA256 hash chain: each entry's hash includes the previous entry's hash |
| **Separate storage** | Audit tables in a dedicated schema (`audit`); separate DB credentials |
| **Write-only app access** | Application DB user has `INSERT` only on audit tables; reads via separate read-only user for compliance dashboard |
| **High availability** | Async writes via Inngest event; local buffer if queue unavailable |

### Write Pipeline

```
tRPC Handler completes
  → Audit middleware captures: action, resource, user, changes, timestamp
  → Inngest event emitted: "audit/log.write"
  → Inngest function processes event:
      1. Retrieve previous entry's hash for this org
      2. Compute HMAC-SHA256 of current entry + previous hash
      3. INSERT into audit_log table (write-only connection)
      4. If INSERT fails, retry with exponential backoff (3 attempts)
      5. If retries exhausted, write to local fallback file + alert

Write latency impact: < 5ms (async, non-blocking)
```

### Hash Chain Integrity

```
Entry N:
  hash_n = HMAC-SHA256(
    key = org_audit_key,
    data = concat(entry_n.timestamp, entry_n.user_id, entry_n.action,
                  entry_n.resource_id, entry_n.old_value, entry_n.new_value,
                  hash_n-1)
  )

Verification:
  - Nightly Inngest cron job iterates entire chain per org
  - Recomputes each hash from stored fields + previous hash
  - Any mismatch → alert compliance officer + platform admin
  - Verification results stored for audit readiness
```

### Audit Log Schema

See [04_COMPLIANCE.md](04_COMPLIANCE.md), Section 4.1 for field definitions. Key additions for the architecture:

```sql
CREATE TABLE audit.log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
  org_id          UUID NOT NULL,
  user_id         UUID NOT NULL,
  user_role       TEXT NOT NULL,
  user_email      TEXT NOT NULL,
  action_type     TEXT NOT NULL,      -- enum: login_success, record_viewed, etc.
  resource_type   TEXT NOT NULL,      -- enum: resident, consent, drug_test, etc.
  resource_id     UUID,
  ip_address      INET NOT NULL,
  user_agent      TEXT,
  success         BOOLEAN NOT NULL DEFAULT true,
  failure_reason  TEXT,
  old_value       JSONB,
  new_value       JSONB,
  sensitivity     TEXT NOT NULL,      -- enum: part2, phi, pii, operational
  consent_id      UUID,               -- FK to consent authorizing Part 2 access
  session_id      UUID NOT NULL,
  request_id      UUID NOT NULL,
  hash            TEXT NOT NULL,       -- HMAC-SHA256 chain hash
  prev_hash       TEXT NOT NULL        -- Previous entry's hash (empty string for first)
);

-- Indexes for compliance dashboard queries
CREATE INDEX idx_audit_org_ts ON audit.log (org_id, timestamp DESC);
CREATE INDEX idx_audit_org_user ON audit.log (org_id, user_id, timestamp DESC);
CREATE INDEX idx_audit_org_resource ON audit.log (org_id, resource_type, resource_id);
CREATE INDEX idx_audit_org_action ON audit.log (org_id, action_type, timestamp DESC);
CREATE INDEX idx_audit_org_sensitivity ON audit.log (org_id, sensitivity, timestamp DESC);

-- Permissions: app user can only INSERT
REVOKE ALL ON audit.log FROM app_user;
GRANT INSERT ON audit.log TO app_user;

-- Read access only for compliance dashboard queries
GRANT SELECT ON audit.log TO audit_reader;
```

### Tiered Storage

| Tier | Age | Storage | Access Pattern |
|------|-----|---------|---------------|
| Hot | 0-12 months | Neon PostgreSQL | Real-time queries, compliance dashboard |
| Warm | 1-3 years | Neon PostgreSQL (separate table partition) | Accounting of disclosures requests |
| Cold | 3-6 years | AWS S3 (Parquet format, encrypted) | Regulatory audits, legal discovery |

Table partitioning by month enables efficient archival:

```sql
CREATE TABLE audit.log (/* ... */) PARTITION BY RANGE (timestamp);

-- Partitions created monthly by Inngest cron
CREATE TABLE audit.log_2026_02 PARTITION OF audit.log
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

---

## 10. Background Job Architecture

### Inngest

Inngest is an event-driven workflow engine that integrates natively with Next.js on Vercel. It provides durable execution, automatic retries, cron scheduling, and step functions.

```
Inngest Architecture:

Application Code → inngest.send("event/name", data)
                          │
                          ▼
                  ┌───────────────┐
                  │ Inngest Cloud │  (receives events, schedules functions)
                  └──────┬────────┘
                         │
                         ▼
                  ┌──────────────────┐
                  │ /api/inngest     │  (Next.js webhook endpoint)
                  │ (function runner) │
                  └──────────────────┘
```

### Job Categories

| Category | Trigger | Functions |
|----------|---------|-----------|
| **Billing** | Cron + Events | `billing/invoice.generate` (monthly cron), `billing/late-fee.apply`, `billing/dunning.escalate`, `billing/reminder.send` |
| **Consent** | Cron + Events | `consent/expiration.check` (daily cron), `consent/expiration.notify`, `consent/revocation.process` |
| **Audit** | Events | `audit/log.write` (every request), `audit/hash-chain.verify` (nightly cron), `audit/archive.monthly` (monthly cron) |
| **Retention** | Cron | `retention/document.check` (weekly cron), `retention/document.destroy` (after approval) |
| **Notifications** | Events | `notification/email.send`, `notification/sms.send`, `notification/push.send` |
| **Breach Detection** | Cron + Events | `breach/bulk-access.detect`, `breach/off-hours.detect`, `breach/auth-spike.detect`, `breach/export-spike.detect` |
| **Stripe** | Webhooks | `stripe/payment.succeeded`, `stripe/payout.completed`, `stripe/dispute.created` |
| **DocuSign** | Webhooks | `docusign/envelope.completed`, `docusign/envelope.declined` |

### Cron Schedule

| Job | Schedule | Description |
|-----|----------|-------------|
| `consent/expiration.check` | Daily at 2:00 AM UTC | Find consents expiring within 30/7 days; send alerts |
| `billing/invoice.generate` | Per org billing cycle | Generate invoices for all residents in org |
| `billing/dunning.escalate` | Daily at 8:00 AM UTC | Check overdue invoices against dunning ladder |
| `billing/reminder.send` | Daily at 9:00 AM UTC | Send pre-due and due-date payment reminders |
| `audit/hash-chain.verify` | Nightly at 3:00 AM UTC | Verify integrity of audit log hash chain |
| `audit/archive.monthly` | 1st of month at 4:00 AM UTC | Move old audit logs to warm/cold storage |
| `retention/document.check` | Weekly on Sunday at 5:00 AM UTC | Flag documents with expired retention for review |
| `breach/bulk-access.detect` | Every 15 minutes | Check for anomalous bulk data access patterns |

### Retry and Failure Handling

| Parameter | Value |
|-----------|-------|
| Max retries | 3 (exponential backoff: 30s, 2m, 10m) |
| Dead letter | Failed events stored in Inngest dashboard; alerts sent to platform admin |
| Idempotency | All job functions are idempotent (safe to retry); use `step.run()` for individual step idempotency |

---

## 11. File Storage Architecture

### AWS S3 with Encryption

All file storage uses AWS S3 with server-side encryption via KMS.

```
S3 Bucket Structure:
recoveryos-files-{env}/
  ├── {org_id}/
  │   ├── residents/
  │   │   └── {resident_id}/
  │   │       ├── intake/           # Intake documents
  │   │       ├── clinical/         # Clinical records (Part 2)
  │   │       ├── financial/        # Payment receipts
  │   │       ├── legal/            # Consent forms, court orders
  │   │       └── operational/      # General docs
  │   ├── templates/                # Document templates
  │   ├── signatures/               # DocuSign completed envelopes
  │   └── exports/                  # Generated reports
  └── audit-archives/              # Cold storage audit logs
      └── {org_id}/
          └── {year}/{month}/
```

### Access Control

| Mechanism | Purpose |
|-----------|---------|
| Pre-signed URLs | All file access through time-limited signed URLs (15-min expiry); no direct S3 access |
| IAM policies | Application role has access to `recoveryos-files-*` bucket only |
| Org-scoped access | Service layer verifies `org_id` before generating signed URL |
| Part 2 consent check | Files tagged as `clinical` or `part2` require active consent before URL generation |
| Audit logging | Every file upload, download, and delete logged in audit trail |

### Encryption

| Layer | Method |
|-------|--------|
| At rest | S3 SSE-KMS with per-org KMS keys |
| In transit | TLS 1.2+ (S3 endpoint enforced) |
| Part 2 files | Double encryption: S3 SSE-KMS + application-layer AES-256-GCM envelope encryption |

### File Upload Flow

```
1. Client requests upload URL:
   tRPC: document.getUploadUrl({ fileName, category, residentId })
2. Server checks RBAC permissions + consent (if Part 2)
3. Server generates S3 pre-signed PUT URL (15-min expiry)
4. Client uploads directly to S3 (no server proxy; reduced latency)
5. S3 applies SSE-KMS encryption on write
6. Client notifies server of upload completion
7. Server records file metadata in documents table
8. Audit log: document_uploaded
```

### Retention Enforcement

Files are managed by retention policies defined per document category:

```
retention_policies:
  part2_consent:  6 years from expiration/revocation
  medical_record: 6 years
  financial:      7 years
  operational:    3 years
```

When retention expires:
1. Inngest cron flags document for review
2. Compliance officer reviews and approves destruction
3. System performs crypto-shredding: delete the per-org KMS key version used to encrypt the file
4. S3 object deleted
5. Audit log: `document_destroyed` (with metadata but not content)

---

## 12. Real-Time Architecture

### Ably for Messaging and Notifications

Ably provides managed real-time pub/sub that works with Vercel's serverless architecture. HIPAA BAA is available on Ably's enterprise plan.

```
Real-Time Architecture:

Server-Side (tRPC mutation)                   Client-Side
  │                                               │
  │  1. Message saved to DB                       │
  │  2. Ably REST API: publish to channel         │
  │                                               │
  │         ┌───────────────┐                     │
  │────────→│  Ably Cloud   │─────────────────────│
  │         │  (Pub/Sub)    │     WebSocket        │
  │         └───────────────┘     Connection       │
  │                                               │
  │                                    3. Client receives message
  │                                    4. React state updates
  │                                    5. UI re-renders
```

### Channel Structure

Channels are scoped by org and resource to enforce isolation:

```
Channel naming: {org_id}:{resource}:{scope}

Examples:
  org-123:dm:user-a:user-b          # Direct message between two users
  org-123:group:group-456           # Group chat channel
  org-123:house:house-789           # House-wide announcements
  org-123:notifications:user-a     # Personal notification feed
```

### Authorization

Ably token authentication ensures users can only subscribe to channels they are authorized to access:

```
1. Client requests Ably token from RecoveryOS API
2. tRPC endpoint checks user's role and scope
3. Server generates Ably token with channel capabilities:
   - house_manager for house-789 → can publish/subscribe to org:house:house-789
   - resident → can subscribe to own DM channels and house channel
   - family → can subscribe to approved messaging channel only (consent-gated)
4. Token expires with user session; re-authenticated on session refresh
```

### Consent Gating for Real-Time

Messages containing Part 2 data are consent-gated:

```
1. Before publishing to a channel with Part 2 data:
   - Server checks active consent for all channel subscribers
   - If any subscriber lacks consent, message is blocked
   - Blocked message logged: disclosure_blocked_no_consent
2. On consent revocation:
   - User removed from channel capabilities
   - Existing messages remain (already disclosed)
   - No new messages delivered
```

### Push Notifications (PWA)

The PWA uses the Web Push API with a service worker for push notifications:

```
1. User grants notification permission in PWA
2. Service worker registers with Push API
3. Push subscription sent to RecoveryOS server (stored per device)
4. When notification needed:
   - Inngest function: notification/push.send
   - Server sends push via Web Push protocol (VAPID keys)
   - Service worker receives and displays notification
5. Notification content is generic (no PHI/Part 2 data in push payload)
   - Example: "You have a new message" (not "Drug test result posted")
```

---

## 13. DocuSign Integration

### Architecture

DocuSign provides legally binding e-signatures with HIPAA BAA, audit trail, tamper-evident seal, and certificate of completion.

```
DocuSign Integration Flow:

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  RecoveryOS  │────→│  DocuSign    │────→│   Signer     │
│  Server      │     │  eSignature  │     │  (Resident)  │
│              │←────│  REST API    │←────│              │
└──────────────┘     └──────────────┘     └──────────────┘

1. Server creates envelope via DocuSign API
2. DocuSign hosts signing ceremony (embedded or remote)
3. Signer completes signature
4. DocuSign sends webhook (Connect) to RecoveryOS
5. Server downloads signed document + certificate of completion
6. Signed document stored in S3 (encrypted)
7. Audit log: document_signed
```

### Envelope Creation

```typescript
// DocuSign envelope creation for intake documents
{
  emailSubject: "RecoveryOS - Documents for Signature",
  documents: [
    { documentId: "1", name: "House Rules", /* base64 content */ },
    { documentId: "2", name: "Part 2 Consent Form", /* base64 content */ },
    { documentId: "3", name: "Privacy Notice", /* base64 content */ },
  ],
  recipients: {
    signers: [{
      email: resident.email,
      name: resident.fullName,
      recipientId: "1",
      clientUserId: resident.id,  // Embedded signing
      tabs: { signHereTabs: [/* per document */] },
    }],
    certifiedDeliveries: [{
      email: houseManager.email,  // CC copy
      recipientId: "2",
    }],
  },
  status: "sent",
  eventNotification: {
    url: "https://app.recoveryos.com/api/webhooks/docusign",
    events: ["envelope-completed", "envelope-declined", "envelope-voided"],
  },
}
```

### Embedded Signing

For intake workflows, signatures are embedded within the RecoveryOS UI (no redirect to DocuSign):

```
1. Server creates envelope with clientUserId (enables embedded signing)
2. Server requests signing URL from DocuSign
3. Client renders DocuSign signing ceremony in iframe
4. Resident signs documents in sequence (DOC-11: bulk signing)
5. DocuSign posts completion webhook
6. Server downloads signed documents and stores in S3
```

### Document Security

| Measure | Implementation |
|---------|---------------|
| Tamper-evident seal | DocuSign applies digital seal; any modification invalidates signature |
| Certificate of completion | PDF with: signer identity, timestamp, IP address, signing events |
| Audit trail | DocuSign maintains its own audit trail; RecoveryOS logs additionally |
| BAA | DocuSign BAA covers all documents processed through the platform |
| Retention | Signed documents retained per RecoveryOS retention policies; also available in DocuSign account |

---

## 14. Deployment Architecture

### Vercel Enterprise

```
Deployment Architecture:

┌─────────────────────────────────────────────────────────────┐
│                    Vercel Enterprise                         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Production   │  │   Staging    │  │   Preview    │     │
│  │  (main)       │  │  (staging)   │  │  (PR-based)  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│  ┌──────▼────────────────────────────────────▼───────┐     │
│  │              Vercel Edge Network                   │     │
│  │        (CDN, WAF, DDoS, Edge Middleware)           │     │
│  └────────────────────────┬──────────────────────────┘     │
│                           │                                 │
│  ┌────────────────────────▼──────────────────────────┐     │
│  │           Serverless Functions (Node.js 20)       │     │
│  │     (API routes, tRPC handlers, SSR pages)        │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│  HIPAA BAA: Yes (Enterprise plan)                           │
│  SOC 2 Type II: Yes                                         │
│  Data Residency: US regions                                 │
└─────────────────────────────────────────────────────────────┘

External Services:
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Neon    │  │  AWS S3  │  │  Clerk   │  │  Stripe  │
│  (DB)    │  │  + KMS   │  │  (Auth)  │  │  (Pay)   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### Environment Strategy

| Environment | Branch | Database | Purpose |
|-------------|--------|----------|---------|
| Production | `main` | Neon production branch | Live customer data |
| Staging | `staging` | Neon staging branch | Pre-release verification with seed data |
| Preview | PR branches | Neon dev branch (shared) | PR review with synthetic data; no PHI |

### CI/CD Pipeline

```
Developer pushes to branch
  → GitHub Actions:
      1. TypeScript type check (tsc --noEmit)
      2. ESLint + Prettier
      3. Unit tests (Vitest)
      4. Integration tests (against Neon dev branch)
      5. Compliance test suite (RBAC matrix, consent gating, audit completeness)
  → Vercel Preview Deployment (automatic)
  → PR Review + Compliance-verifier sign-off
  → Merge to staging
  → Vercel Staging Deployment (automatic)
  → Staging smoke tests
  → Merge to main
  → Vercel Production Deployment (automatic, zero-downtime)
```

### Database Migrations

Drizzle ORM generates SQL migrations from schema changes. Migrations run automatically on deployment:

```
1. Developer modifies schema in src/server/db/schema/
2. Run: drizzle-kit generate:pg (generates SQL migration file)
3. Migration reviewed in PR (compliance-verifier checks for RLS, org_id, audit columns)
4. On deployment: migration runs against target Neon branch
5. Neon handles zero-downtime migrations for non-breaking changes
6. Breaking changes use staged rollout: add column → deploy code → remove old column
```

### Backup and Disaster Recovery

Source: [04_COMPLIANCE.md](04_COMPLIANCE.md), Section 2.1 (45 CFR 164.308(a)(7))

| Metric | Target | Implementation |
|--------|--------|---------------|
| RPO | < 1 hour | Neon continuous WAL archival; point-in-time recovery to any second |
| RTO | < 4 hours | Restore from Neon backup; redeploy on Vercel; DNS propagation |
| Backup encryption | AES-256 | Neon encrypts all backups; separate from application keys |
| Cross-region | US East + US West | Neon read replica in secondary region; S3 cross-region replication |
| DR drills | Quarterly | Restore to staging environment; verify data integrity |

---

## 15. Security Architecture

### Defense in Depth

```
┌──────────────────────────────────────────────────────────────┐
│ Layer 1: Edge (Vercel)                                       │
│   WAF rules, DDoS protection, GeoIP filtering, rate limiting │
├──────────────────────────────────────────────────────────────┤
│ Layer 2: Transport                                           │
│   TLS 1.2+ (HSTS), certificate management, no HTTP fallback  │
├──────────────────────────────────────────────────────────────┤
│ Layer 3: Authentication (Clerk)                              │
│   MFA required, session management, password policy           │
├──────────────────────────────────────────────────────────────┤
│ Layer 4: Authorization (RBAC)                                │
│   9 roles, field-level filtering, scope enforcement           │
├──────────────────────────────────────────────────────────────┤
│ Layer 5: Data Access (Consent + RLS)                         │
│   Part 2 consent gating, tenant isolation, minimum necessary  │
├──────────────────────────────────────────────────────────────┤
│ Layer 6: Data Protection (Encryption)                        │
│   AES-256 at rest, field-level encryption, KMS key isolation  │
├──────────────────────────────────────────────────────────────┤
│ Layer 7: Audit & Detection                                   │
│   Immutable audit log, HMAC integrity, anomaly detection      │
└──────────────────────────────────────────────────────────────┘
```

### Input Validation

All user input is validated at multiple layers:

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| Client | Zod schema (React Hook Form) | Immediate user feedback |
| tRPC | Zod input validation | Server-side enforcement (authoritative) |
| Database | Constraints, CHECK, NOT NULL | Last-resort data integrity |

Validation schemas are defined once in `src/lib/validation/` and shared between client and server via tRPC's type inference.

### OWASP Top 10 Mitigations

| Vulnerability | Mitigation |
|--------------|-----------|
| **A01: Broken Access Control** | RLS, RBAC middleware, scope filtering, consent gating |
| **A02: Cryptographic Failures** | AES-256, TLS 1.2+, KMS key management, no secrets in code |
| **A03: Injection** | Drizzle ORM (parameterized queries), Zod input validation, no raw SQL |
| **A04: Insecure Design** | Threat modeling per module, compliance-verifier review, break-glass logging |
| **A05: Security Misconfiguration** | Infrastructure-as-code (Vercel), HSTS, security headers, no default credentials |
| **A06: Vulnerable Components** | Dependabot, weekly dependency audits, lockfile integrity |
| **A07: Auth Failures** | Clerk (managed auth), MFA required, session timeout, brute-force protection |
| **A08: Data Integrity Failures** | HMAC audit chain, signed deployments (Vercel), Drizzle migration review |
| **A09: Logging Failures** | Comprehensive audit log, async write with buffering, 6-year retention |
| **A10: SSRF** | No user-controlled URLs in server requests; S3 pre-signed URLs for file access |

### Security Headers

Applied via Next.js `next.config.ts`:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' https://js.clerk.dev; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY (except DocuSign signing iframe: ALLOW-FROM docusign.net)
X-XSS-Protection: 0 (rely on CSP instead)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Field-Level Encryption

Source: [04_COMPLIANCE.md](04_COMPLIANCE.md), Section 5

Part 2 data receives application-layer encryption beyond database-level encryption:

```
Encryption Flow:
  1. Service layer receives plaintext Part 2 field
  2. Generate random IV (96-bit for AES-256-GCM)
  3. Retrieve org-level data encryption key (DEK) from cache or KMS
  4. Encrypt: AES-256-GCM(plaintext, DEK, IV) → ciphertext + auth tag
  5. Store in DB: base64(IV || ciphertext || auth_tag)

Decryption Flow:
  1. Service layer retrieves encrypted field from DB
  2. Verify user has RBAC permission + active consent
  3. Retrieve DEK from cache or KMS
  4. Decode: extract IV, ciphertext, auth_tag
  5. Decrypt: AES-256-GCM-decrypt(ciphertext, DEK, IV, auth_tag) → plaintext
  6. If auth_tag verification fails → tamper alert
```

Key hierarchy:

```
AWS KMS Master Key (per-region, auto-rotated annually)
  └── Org-Level Data Encryption Key (generated per org, stored encrypted in DB)
        └── Used for all Part 2 field encryption within that org
```

### Crypto-Shredding

On tenant deletion, the org-level DEK is destroyed via KMS `ScheduleKeyDeletion`. This renders all encrypted Part 2 data permanently unrecoverable without touching individual records.

---

## 16. Observability & Monitoring

### Stack

| Tool | Purpose |
|------|---------|
| **Vercel Analytics** | Web vitals, page load performance, serverless function duration |
| **Vercel Logs** | Application logs, function invocations, edge middleware logs |
| **Sentry** | Error tracking, performance monitoring, release tracking |
| **Inngest Dashboard** | Background job monitoring, failure tracking, retry visibility |
| **Upstash Console** | Redis usage, rate limit metrics |
| **AWS CloudWatch** | S3 access logs, KMS usage, IAM events |
| **Custom Compliance Dashboard** | Audit log summaries, breach detection alerts, consent metrics |

### Key Metrics

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| API response time (p95) | Vercel + Sentry | > 500ms |
| Error rate | Sentry | > 1% of requests |
| Serverless function cold starts | Vercel | > 3s (provisioned concurrency if persistent) |
| Database connection pool | Neon | > 80% utilization |
| Audit log write failures | Inngest | Any failure (P0 alert) |
| Hash chain integrity break | Inngest cron | Any break (P0 alert) |
| Breach detection trigger | Custom | Any trigger (immediate notification) |
| Failed login spike | Custom | > 10 in 5 min per account |
| Uptime | Vercel + external probe | < 99.9% monthly |

### Logging Standards

Application logs use structured JSON:

```json
{
  "level": "info",
  "message": "Consent created",
  "timestamp": "2026-02-11T14:30:00.000Z",
  "requestId": "req-123",
  "orgId": "org-456",
  "userId": "user-789",
  "action": "consent.create",
  "duration_ms": 45
}
```

PHI and Part 2 data are NEVER included in application logs. Logs contain only:
- Request metadata (IDs, timestamps, durations)
- Error types and codes (no error messages containing user data)
- Performance metrics
- System events

Detailed access records are in the audit log (Section 9), not application logs.

### Health Check

```
GET /api/health

Response:
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "cache": "connected",
    "auth": "connected",
    "storage": "connected"
  },
  "timestamp": "2026-02-11T14:30:00.000Z"
}
```

Health check does not expose PHI, internal architecture details, or version information beyond the application version.

---

## Appendix A: Technology Decision Records

### ADR-001: Modular Monolith over Microservices

**Decision**: Build as a modular monolith deployed on Vercel.

**Context**: 5-person engineering team building a compliance-critical platform. All modules share audit logging, RBAC, consent gating, and multi-tenancy infrastructure.

**Rationale**:
- Shared compliance middleware cannot be duplicated across services
- Double-entry ledger requires transactional consistency (no distributed transactions)
- Team size does not justify inter-service operational overhead
- Module boundaries enforced at code level enable future extraction
- Vercel serverless functions scale individual API routes independently

**Trade-offs**: Cannot independently scale modules; all modules share the same deployment. Acceptable given projected load (50K concurrent users across all orgs).

### ADR-002: Drizzle ORM over Prisma

**Decision**: Use Drizzle ORM for database access.

**Context**: Need type-safe SQL with PostgreSQL-specific features (RLS, partitioning, JSONB).

**Rationale**:
- No query engine runtime (Prisma requires a Rust binary; problematic on serverless)
- First-class PostgreSQL features: RLS, custom types, raw SQL escape hatch
- Schema-as-TypeScript code; shared types between schema and application
- Lighter bundle size (critical for serverless cold starts)
- SQL-like API gives direct control over generated queries

### ADR-003: Ably over WebSocket Server

**Decision**: Use Ably managed pub/sub for real-time features.

**Context**: Vercel serverless functions cannot maintain persistent WebSocket connections. Need real-time messaging with HIPAA BAA.

**Rationale**:
- Vercel has no persistent process for WebSocket server
- Ably provides managed pub/sub with 99.999% SLA
- Enterprise plan includes HIPAA BAA
- Token-based auth integrates with existing RBAC
- Presence API for online status (future feature)

**Alternative considered**: Server-Sent Events (SSE) via Next.js streaming. Rejected for messaging because SSE is unidirectional (server-to-client only) and does not support channel-based pub/sub.

### ADR-004: Inngest over Custom Queue

**Decision**: Use Inngest for background jobs and scheduled tasks.

**Context**: Need durable background job execution compatible with Vercel serverless.

**Rationale**:
- Native Vercel integration (no separate infrastructure)
- Event-driven architecture aligns with audit logging pattern
- Built-in cron scheduling for recurring jobs
- Step functions for multi-step workflows (billing cycle, breach response)
- Automatic retries with exponential backoff
- Dashboard for job monitoring and debugging

### ADR-005: Clerk over Auth0

**Decision**: Use Clerk for authentication and user management.

**Context**: Need HIPAA-compliant auth provider with MFA, session management, and organization support.

**Rationale**:
- HIPAA BAA available on HIPAA plan
- Native Next.js SDK with App Router support
- Built-in MFA (TOTP, SMS, Passkey)
- Organization model maps to RecoveryOS org concept
- Pre-built UI components for login, registration, MFA
- Webhook events for user lifecycle sync
- Session management with configurable timeout

---

## Appendix B: Feature-to-Architecture Mapping

This table maps PRD modules to the architectural components that support them.

| PRD Module | tRPC Router | Database Tables | External Services | Real-Time | Background Jobs |
|-----------|-------------|----------------|-------------------|-----------|-----------------|
| Org Management (M1) | `org`, `property`, `house` | organizations, properties, houses, beds | Clerk (orgs) | -- | -- |
| Occupancy (M2) | `occupancy` | beds, bed_assignments, waitlist | -- | Bed status updates | -- |
| Admissions (M3) | `admission` | leads, intake_forms, referral_sources | DocuSign | Pipeline updates | Follow-up reminders |
| Billing (M4) | `billing`, `ledger` | invoices, payments, ledger_entries, deposits, payers | Stripe Connect | Payment confirmations | Invoice generation, dunning, reminders |
| Operations (M5) | `operations` | chores, meetings, passes, drug_tests, incidents, check_ins | -- | Incident alerts | Chore rotation |
| Documents (M6) | `document` | documents, templates, signatures, retention_policies | DocuSign, S3 | -- | Retention enforcement |
| Messaging (M7) | `messaging` | messages, conversations, participants, announcements | Ably, SendGrid | Message delivery | SMS gateway |
| Reporting (M8) | `report` | (reads from all tables) | -- | -- | Scheduled reports |
| Compliance (M9) | `consent`, `compliance` | consents, disclosures, breach_incidents, baa_records | -- | Consent alerts | Consent expiration, breach detection |
| Permissions (M10) | `admin` | users, roles, sessions | Clerk | Session updates | -- |

---

*Document prepared by system-architect for RecoveryOS.*
*Cross-referenced with: 01_REQUIREMENTS.md (107 features, 50+ screens), 04_COMPLIANCE.md (compliance spec), 06_ROADMAP.md (build order, sprint plan).*
