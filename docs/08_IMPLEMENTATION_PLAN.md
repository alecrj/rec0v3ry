# RecoveryOS: Definitive Implementation Plan

> **Created**: 2026-02-18
> **Based on**: Comprehensive codebase audit + UI library research
> **Goal**: Production-ready desktop CRM → Native mobile apps

---

## Executive Summary

### Current State (Audit Findings)
| Metric | Current | Target |
|--------|---------|--------|
| Pages with mock data | 51/56 (91%) | 0/56 (0%) |
| Pages using tRPC | 5/56 (9%) | 56/56 (100%) |
| Pages with loading states | 5/56 | 56/56 |
| Pages with error states | 1/56 | 56/56 |
| Accessibility attributes | 17 total | 500+ |
| Reusable components | 4 | 30+ |
| TODO items blocking features | 14 | 0 |

### Tech Stack Addition
| Library | Purpose | Why |
|---------|---------|-----|
| **shadcn/ui** | Component library | Tailwind-native, accessible, customizable, 66k GitHub stars |
| **Radix UI** | Primitives | AAA accessibility, shadcn foundation |
| **Framer Motion** | Animations | Smooth transitions, micro-interactions |
| **React Query** | Already have | Loading/error states built-in |
| **Recharts** | Charts | Works with shadcn theming |

---

## Phase 5A: Foundation Setup (Day 1)

### 5A.1 — Install shadcn/ui
```bash
npx shadcn-ui@latest init
```

Components to add:
- [ ] Button, Input, Label, Textarea
- [ ] Card, Badge, Avatar
- [ ] Table, DataTable
- [ ] Dialog, Sheet, Dropdown
- [ ] Tabs, Accordion
- [ ] Toast, Alert
- [ ] Skeleton (loading states)
- [ ] Form (with react-hook-form)

### 5A.2 — Create Base Components

| Component | File | Purpose |
|-----------|------|---------|
| `PageHeader` | `components/ui/page-header.tsx` | Consistent page titles |
| `DataTable` | `components/ui/data-table.tsx` | Sortable, filterable tables |
| `StatCard` | `components/ui/stat-card.tsx` | Dashboard KPI cards |
| `LoadingPage` | `components/ui/loading-page.tsx` | Full page skeleton |
| `ErrorState` | `components/ui/error-state.tsx` | Error with retry |
| `EmptyState` | `components/ui/empty-state.tsx` | No data placeholder |
| `ConfirmDialog` | `components/ui/confirm-dialog.tsx` | Delete confirmations |

### 5A.3 — Design Tokens (Theme)

```typescript
// tailwind.config.ts - Modern 2026 palette
colors: {
  // Primary - Deep blue with gradient capability
  primary: {
    50: '#eff6ff',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  // Accent - Teal for success/positive
  accent: {
    500: '#14b8a6',
    600: '#0d9488',
  },
  // Surface colors for depth
  surface: {
    DEFAULT: '#ffffff',
    raised: '#f8fafc',
    sunken: '#f1f5f9',
  }
}
```

---

## Phase 5B: Wire Up Real Data (Days 2-4)

### Priority 1: High-Traffic Pages

| Page | Router | Procedures Needed |
|------|--------|-------------------|
| `/dashboard` | reporting | ✅ Already done |
| `/occupancy/beds` | occupancy | `getBedGrid`, `assignBed`, `releaseBed` |
| `/occupancy/waitlist` | occupancy | `getWaitlist`, `addToWaitlist`, `removeFromWaitlist` |
| `/admissions` | lead | `list`, `getById`, `updateStage` |
| `/residents` | user | `getResidents`, `getResidentById` |
| `/billing/invoices` | invoice | `list`, `getById`, `create`, `markPaid` |

### Priority 2: Operations Pages

| Page | Router | Procedures Needed |
|------|--------|-------------------|
| `/operations/chores` | chore | `list`, `assign`, `complete`, `verify` |
| `/operations/meetings` | meeting | `list`, `recordAttendance` |
| `/operations/passes` | pass | `list`, `request`, `approve`, `deny` |
| `/operations/curfew` | curfew | `getLog`, `checkIn`, `checkOut` |
| `/operations/drug-tests` | drugTest | `list`, `schedule`, `recordResult` |
| `/operations/incidents` | incident | `list`, `create`, `update` |
| `/operations/check-ins` | checkIn | `list`, `create` |
| `/operations/maintenance` | maintenance | `list`, `create`, `assign`, `complete` |

### Priority 3: Admin & Compliance Pages

| Page | Router | Procedures Needed |
|------|--------|-------------------|
| `/admin/users` | user | `list`, `invite`, `updateRole`, `deactivate` |
| `/admin/properties` | property | `list`, `create`, `update` |
| `/compliance/consents` | consent | `list`, `getById`, `revoke` |
| `/compliance/audit-log` | audit | `list`, `export` |
| `/compliance/disclosures` | disclosure | `list`, `getAccountingReport` |
| `/compliance/break-glass` | breakGlass | `list`, `request`, `review` |

### Priority 4: Messaging & Documents

| Page | Router | Procedures Needed |
|------|--------|-------------------|
| `/messages` | conversation | `list`, `getUnreadCount` |
| `/messages/[id]` | message | `getThread`, `send`, `markRead` |
| `/messages/compose` | conversation | `create`, `getRecipients` |
| `/messages/announcements` | announcement | `list`, `create`, `publish` |
| `/documents/library` | document | `list`, `upload`, `download` |
| `/documents/templates` | document | `getTemplates`, `createFromTemplate` |
| `/documents/signatures` | esign | `getPending`, `getCompleted` |

### Implementation Pattern

```typescript
// Before (mock data)
const mockUsers = [
  { id: '1', name: 'John Doe', ... },
];

export default function UsersPage() {
  return <Table data={mockUsers} />;
}

// After (real data with loading/error states)
"use client";

import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/ui/data-table";
import { LoadingPage } from "@/components/ui/loading-page";
import { ErrorState } from "@/components/ui/error-state";

export default function UsersPage() {
  const { data, isLoading, error, refetch } = trpc.user.list.useQuery();

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return <DataTable data={data} columns={columns} />;
}
```

---

## Phase 5C: UI Overhaul (Days 5-8)

### 5C.1 — Dashboard Redesign

**Current Issues:**
- Flat gray cards
- No visual hierarchy
- Static numbers
- No sparklines/trends

**New Design:**
```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                                    [User Avatar] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 94%      │ │ $47.2K   │ │ 3        │ │ 12       │       │
│  │ Occupancy│ │ Revenue  │ │ Alerts   │ │ Expiring │       │
│  │ ▁▂▃▅▇   │ │ ▂▃▅▆▇   │ │          │ │ Consents │       │
│  │ +2% ↑    │ │ +8% ↑    │ │ View →   │ │ View →   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐   │
│  │ Action Items            │ │ Recent Activity         │   │
│  │ ○ 3 invoices overdue    │ │ • John paid $850       │   │
│  │ ○ 2 consents expiring   │ │ • New lead: Marcus R.  │   │
│  │ ○ Drug test scheduled   │ │ • Pass approved        │   │
│  └─────────────────────────┘ └─────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Occupancy by House                        [Filters] │   │
│  │ ████████████████░░ Serenity House    8/10          │   │
│  │ ██████████████████ Hope Manor        10/10         │   │
│  │ ████████████░░░░░░ Recovery Haven    6/10          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5C.2 — Bed Grid Redesign

**Current:** Flat table
**New:** Visual grid with drag-drop

```
┌─────────────────────────────────────────────────────────────┐
│  Bed Grid                              [House ▼] [Status ▼] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Serenity House - Room 101                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 🛏️ A    │ │ 🛏️ B    │ │ 🛏️ C    │ │ 🛏️ D    │           │
│  │ John S. │ │ Mike J. │ │ VACANT  │ │ David W.│           │
│  │ Day 45  │ │ Day 12  │ │         │ │ Day 89  │           │
│  │ ●──────│ │ ●──────│ │ ○ Empty │ │ ●──────│           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
│  Legend: ● Occupied  ○ Available  ◐ Reserved  ⊘ Maintenance│
└─────────────────────────────────────────────────────────────┘
```

### 5C.3 — Component Styling Guide

**Cards:**
```css
/* Modern card with subtle shadow and hover */
.card {
  @apply bg-white rounded-xl border border-slate-200/60;
  @apply shadow-sm hover:shadow-md transition-shadow;
  @apply p-6;
}

/* Glassmorphism variant for overlays */
.card-glass {
  @apply bg-white/80 backdrop-blur-sm;
  @apply border border-white/20;
}
```

**Buttons:**
```css
/* Primary with gradient */
.btn-primary {
  @apply bg-gradient-to-r from-blue-600 to-blue-700;
  @apply hover:from-blue-700 hover:to-blue-800;
  @apply text-white font-medium rounded-lg px-4 py-2;
  @apply shadow-sm hover:shadow transition-all;
}
```

**Tables:**
```css
/* Modern table with sticky header */
.table-modern {
  @apply w-full border-collapse;
}
.table-modern th {
  @apply sticky top-0 bg-slate-50/90 backdrop-blur;
  @apply text-left text-xs font-semibold text-slate-600 uppercase tracking-wide;
  @apply px-4 py-3 border-b border-slate-200;
}
.table-modern td {
  @apply px-4 py-3 border-b border-slate-100;
}
.table-modern tr:hover {
  @apply bg-slate-50/50;
}
```

---

## Phase 5D: Core Features (Days 9-12)

### 5D.1 — Payments (Stripe)

**Files to create/modify:**
- [ ] `src/app/(crm)/billing/setup/page.tsx` — Stripe Connect onboarding
- [ ] `src/app/(resident)/payments/checkout/page.tsx` — Payment checkout
- [ ] `src/components/billing/payment-form.tsx` — Stripe Elements form
- [ ] `src/server/routers/stripe.ts` — Wire up existing router

**Flow:**
1. Operator connects Stripe account (Connect onboarding)
2. System generates invoices
3. Resident opens app → sees invoice → clicks Pay
4. Stripe Checkout → Payment confirmed
5. Webhook updates ledger → Invoice marked paid

### 5D.2 — Messaging (Real-time)

**Option A: Ably** (recommended)
- Real-time pub/sub
- Presence detection (who's online)
- $25/mo for 10k messages

**Option B: Pusher**
- Similar to Ably
- Better docs

**Implementation:**
- [ ] Install Ably SDK
- [ ] Create `src/lib/ably.ts` client
- [ ] Add real-time subscription to message thread
- [ ] Add typing indicators
- [ ] Add read receipts

### 5D.3 — Expense Tracking (Plaid)

**New tables needed:**
```sql
linked_accounts (
  id, org_id, plaid_access_token, institution_name,
  account_name, account_type, last_synced
)

transactions (
  id, org_id, linked_account_id, plaid_transaction_id,
  amount, merchant, category, date, property_id, house_id,
  receipt_url, notes
)
```

**New router:** `src/server/routers/expense.ts`
- `linkAccount` — Plaid Link flow
- `syncTransactions` — Pull from Plaid
- `categorize` — Auto-categorize
- `getByProperty` — Filter by property
- `export` — CSV/PDF export

**New pages:**
- [ ] `/billing/expenses` — Transaction list
- [ ] `/billing/expenses/link` — Link bank account
- [ ] `/billing/expenses/reports` — Spend reports

---

## Phase 5E: Integrations (Days 13-15)

### 5E.1 — Email (SendGrid)

| Event | Email Template |
|-------|----------------|
| Invoice created | "Your rent invoice is ready" |
| Payment received | "Payment confirmed" |
| Payment reminder | "Rent due in 3 days" |
| Payment overdue | "Your rent is overdue" |
| Document ready | "Please sign your document" |
| New message | "You have a new message" |
| Weekly summary | "Your weekly RecoveryOS summary" |

### 5E.2 — SMS (Twilio)

| Event | SMS Template |
|-------|--------------|
| Payment reminder | "Reminder: Rent due in 3 days. Pay: [link]" |
| Curfew reminder | "Curfew at 10pm. Don't forget to check in." |
| Drug test | "Random drug test scheduled for tomorrow." |
| Emergency | "[URGENT] Please contact house manager." |

### 5E.3 — Background Jobs (Inngest)

| Job | Schedule | Action |
|-----|----------|--------|
| `generate-monthly-invoices` | 1st of month | Create invoices for all residents |
| `send-payment-reminders` | Daily | Email/SMS for upcoming due dates |
| `check-consent-expiration` | Daily | Alert for consents expiring in 30 days |
| `sync-plaid-transactions` | Every 6 hours | Pull new bank transactions |
| `generate-weekly-summary` | Sunday 8am | Email weekly reports to operators |

---

## Phase 5F: Polish & Accessibility (Days 16-18)

### 5F.1 — Accessibility Checklist

- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] All buttons have accessible names
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Focus indicators visible
- [ ] Keyboard navigation works
- [ ] Screen reader announces page changes
- [ ] Error messages are announced
- [ ] Loading states are announced
- [ ] Modals trap focus
- [ ] Skip links present

### 5F.2 — Performance

- [ ] Images optimized (next/image)
- [ ] Code splitting per route
- [ ] API response caching
- [ ] Skeleton loading (no layout shift)
- [ ] Lighthouse score > 90

### 5F.3 — Final QA

- [ ] All 56 pages load correctly
- [ ] All forms submit successfully
- [ ] All tRPC queries work
- [ ] Error states display correctly
- [ ] Mobile responsive (tablet+)
- [ ] Cross-browser (Chrome, Safari, Firefox)

---

## Phase 6: Native Mobile Apps (Week 4+)

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Shared API                        │
│              (tRPC + Next.js backend)                │
├─────────────────────────────────────────────────────┤
│                         │                            │
│    Desktop CRM          │       Mobile Apps          │
│    (Next.js Web)        │    (React Native/Expo)     │
│                         │                            │
│    ┌─────────────┐      │      ┌─────────────┐      │
│    │ Operators   │      │      │ Resident    │      │
│    │ Dashboard   │      │      │ App         │      │
│    └─────────────┘      │      └─────────────┘      │
│                         │                            │
│                         │      ┌─────────────┐      │
│                         │      │ Operator    │      │
│                         │      │ Mobile App  │      │
│                         │      └─────────────┘      │
└─────────────────────────────────────────────────────┘
```

### Resident App Screens
1. Home (dashboard, days sober, next payment)
2. Payments (pay rent, history)
3. Schedule (meetings, chores, appointments)
4. Messages (chat with staff)
5. Documents (view, sign)
6. Profile (settings, consent management)

### Operator Mobile App Screens
1. Quick Stats (occupancy, revenue, alerts)
2. Check-ins (curfew log, attendance)
3. Incidents (quick report)
4. Messages (respond to residents)
5. Approvals (passes, requests)
6. Notifications (push alerts)

---

## Files to Create/Modify Summary

### New Files (41)
```
src/components/ui/
├── page-header.tsx
├── data-table.tsx
├── stat-card.tsx
├── loading-page.tsx
├── error-state.tsx
├── empty-state.tsx
├── confirm-dialog.tsx
├── search-input.tsx
├── date-range-picker.tsx
├── status-badge.tsx
└── avatar-group.tsx

src/app/(crm)/residents/
├── page.tsx (NEW - currently 404)
└── [id]/page.tsx (NEW)

src/app/(crm)/billing/
├── expenses/page.tsx (NEW)
├── expenses/link/page.tsx (NEW)
└── setup/page.tsx (NEW - Stripe Connect)

src/app/(resident)/payments/
└── checkout/page.tsx (NEW)

src/server/routers/
└── expense.ts (NEW)

src/lib/
├── ably.ts (NEW)
└── plaid.ts (NEW)
```

### Files to Modify (51)
All pages currently using mock data need to be updated to use tRPC queries with loading/error states.

---

## Success Criteria

### Before Launch
- [ ] 0 pages with mock data
- [ ] 56/56 pages with loading states
- [ ] 56/56 pages with error states
- [ ] 0 TODO comments blocking features
- [ ] 100% tRPC router coverage
- [ ] Lighthouse score > 90
- [ ] WCAG AA compliance
- [ ] All E2E tests passing

### Post-Launch
- [ ] < 2s page load times
- [ ] 99.9% uptime
- [ ] < 500ms API response times
- [ ] Payment success rate > 98%

---

## Estimated Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 5A: Foundation | 1 day | shadcn setup, base components |
| 5B: Real Data | 3 days | All 51 pages wired to tRPC |
| 5C: UI Overhaul | 4 days | Modern design, all pages polished |
| 5D: Features | 4 days | Payments, messaging, expenses |
| 5E: Integrations | 3 days | Email, SMS, background jobs |
| 5F: Polish | 3 days | Accessibility, performance, QA |
| **Total** | **18 days** | Production-ready desktop CRM |
| Phase 6: Mobile | 2-3 weeks | iOS + Android apps |
