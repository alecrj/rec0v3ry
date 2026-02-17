# RecoveryOS Frontend Shell

Production-quality frontend shell for RecoveryOS, a HIPAA-compliant sober living management platform.

## What Was Built

### Core Infrastructure
- **Root Layout** (`/src/app/layout.tsx`) - ClerkProvider, tRPC, TanStack Query, Inter font, PWA viewport config
- **Providers** (`/src/app/providers.tsx`) - Client component wrapping tRPC + QueryClient
- **Middleware** (`/src/middleware.ts`) - Clerk auth gating with public route matcher
- **Utilities** (`/src/lib/utils.ts`) - `cn()` utility for Tailwind class merging
- **tRPC Setup** (`/src/lib/trpc.ts`, `/src/server/routers/_app.ts`) - Type-safe API client foundation

### Auth System (Route Group: `/src/app/(auth)`)
- **Layout** - Centered card with RecoveryOS branding
- **Login Page** - Clerk SignIn component with custom styling
- **Register Page** - Clerk SignUp component with custom styling

### CRM (Operator Dashboard) - Route Group: `/src/app/(crm)`
- **Layout** - Desktop-first with collapsible sidebar + header
- **Sidebar Component** (`/src/components/layouts/crm-sidebar.tsx`) - Full navigation tree:
  - Dashboard
  - Occupancy (Bed Grid, Waitlist)
  - Admissions
  - Residents
  - Billing (Invoices, Payments, Ledger, Reconciliation, Rates)
  - Operations (Chores, Meetings, Passes, Drug Tests, Incidents, Check-ins)
  - Documents (Library, Templates, Retention)
  - Messages (Inbox, Announcements)
  - Reports (Occupancy, Financial, Operations, Compliance, Outcomes, Grants)
  - Compliance (Consents, Disclosures, Audit, BAA, Breaches)
  - Admin (Users, Settings, Properties, Subscription)
- **Header Component** (`/src/components/layouts/crm-header.tsx`) - Breadcrumbs, OrganizationSwitcher, notifications, UserButton
- **Dashboard Page** (`/src/app/(crm)/dashboard/page.tsx`) - Sprint 5 preview with:
  - Occupancy, Revenue MTD, Outstanding Invoices, Expiring Consents cards
  - Action Items panel
  - Recent Activity feed
  - Expiring Consents table

### Compliance UI (Sprint 2) - `/src/app/(crm)/compliance/consents`
- **Consents List Page** - Table with status badges, search, filters, export
- **Consent Wizard** (`/src/components/compliance/consent-wizard.tsx`) - 5-step creation flow:
  - Step 1: Patient name, DOB (42 CFR 2.31(a)(1))
  - Step 2: Disclosing entity, recipient name/address (42 CFR 2.31(a)(2-3))
  - Step 3: Purpose, scope of information (42 CFR 2.31(a)(4-5))
  - Step 4: Expiration, rights notice (42 CFR 2.31(a)(6-9))
  - Step 5: Review and signature capture
- **Status Badge Component** (`/src/components/compliance/consent-status-badge.tsx`) - Active (green), Expired (yellow), Revoked (red)
- **Redisclosure Banner** (`/src/components/compliance/redisclosure-banner.tsx`) - Full 42 CFR 2.32 notice text

### Resident PWA - Route Group: `/src/app/(resident)`
- **Layout** - Mobile-first with bottom tab navigation
- **Bottom Nav Component** (`/src/components/layouts/resident-nav.tsx`) - Home, Payments, Schedule, Messages, Profile
- **Home Page** - Welcome card, quick actions, today's schedule
- **Payments Page** - Account balance, payment methods, payment history

### PWA Configuration
- **Manifest** (`/public/manifest.json`) - PWA manifest with icons, shortcuts, categories
- **Viewport Meta** - Configured in root layout for proper mobile rendering
- **Safe Area Insets** - CSS utility for iOS notch support

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **API**: tRPC v11 with React Query
- **Auth**: Clerk (HIPAA BAA available)
- **Styling**: Tailwind CSS v4
- **Icons**: lucide-react
- **Utilities**: clsx + tailwind-merge
- **State**: TanStack Query (via tRPC)
- **Forms**: React Hook Form + Zod (to be implemented in Sprint 1-2)

## Styling Approach

### CRM (Operator Dashboard)
- **Desktop-first** - Optimized for 1920x1080+ screens
- **Color Scheme**:
  - Sidebar: `bg-slate-800`, `border-slate-700`
  - Primary: `blue-600`
  - Success/Active: `green-600`
  - Warning/Expired: `yellow-600`
  - Danger/Revoked: `red-600`
- **Typography**: Inter font family
- **Layout**: Fixed sidebar (64rem width), flex-1 main content

### Resident PWA
- **Mobile-first** - Optimized for 375px+ width
- **Layout**: Bottom navigation (fixed), scrollable content area with bottom padding
- **Cards**: Rounded corners, subtle borders, gradient headers
- **Touch targets**: Minimum 44px height for all interactive elements

## File Structure

```
/src
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (crm)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   └── compliance/
│   │       └── consents/page.tsx
│   ├── (resident)/
│   │   ├── layout.tsx
│   │   ├── home/page.tsx
│   │   └── payments/page.tsx
│   ├── layout.tsx
│   ├── providers.tsx
│   └── globals.css
├── components/
│   ├── layouts/
│   │   ├── crm-sidebar.tsx
│   │   ├── crm-header.tsx
│   │   └── resident-nav.tsx
│   └── compliance/
│       ├── consent-wizard.tsx
│       ├── consent-status-badge.tsx
│       └── redisclosure-banner.tsx
├── lib/
│   ├── utils.ts
│   └── trpc.ts
├── server/
│   └── routers/
│       └── _app.ts
└── middleware.ts
```

## Key Features

### 42 CFR Part 2 Compliance
- All required consent fields per 42 CFR 2.31
- Redisclosure notice banner with full statutory text
- Status tracking (Active, Expired, Revoked)
- Expiration date warnings
- Renewal workflows

### Multi-Tenant Ready
- Clerk OrganizationSwitcher in header
- All routes protected by auth middleware
- Organization context preserved across navigation

### Accessibility
- Semantic HTML throughout
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus management in modals/wizards

### Performance
- Server Components by default
- Client components only where needed (`"use client"`)
- Optimized bundle with tree-shaking
- React Query caching (60s stale time)

## Next Steps (Sprint 1-2)

1. **Backend Integration**
   - Implement tRPC routers (org, resident, billing, compliance)
   - Connect to Drizzle ORM + PostgreSQL
   - Add Clerk webhook handlers

2. **Form Validation**
   - Add Zod schemas for all forms
   - React Hook Form integration
   - Client + server validation

3. **Data Fetching**
   - Replace mock data with tRPC queries
   - Implement pagination
   - Add loading states

4. **Real-Time Features**
   - Connect Ably for live updates
   - Notification system
   - Presence indicators

5. **Missing Pages**
   - Implement all sidebar navigation pages
   - Resident PWA remaining pages (Schedule, Messages, Profile)
   - Family and Referral portals

## Environment Variables Required

```bash
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Database (Neon)
DATABASE_URL=

# AWS S3 (File Storage)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=

# Encryption (Field-level)
ENCRYPTION_KEY=

# Rate Limiting (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Running the App

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## PWA Installation

To test PWA functionality:
1. Run production build locally: `npm run build && npm start`
2. Open Chrome DevTools > Application > Manifest
3. Click "Add to home screen"
4. Test offline functionality (requires service worker implementation in Sprint 3)

## Compliance Notes

- All consent forms are designed to meet 42 CFR Part 2 Final Rule (effective Feb 16, 2026)
- Redisclosure notice text is verbatim from 42 CFR 2.32
- Patient rights notice covers all required elements per 42 CFR 2.31(a)(9)
- No placeholder data contains real PHI or Part 2 information
- All mock data uses realistic but fictional names/dates

## Production Readiness Checklist

Before deploying to production:
- [ ] Replace all mock data with real tRPC queries
- [ ] Add error boundaries for all route groups
- [ ] Implement loading skeletons
- [ ] Create 192x192 and 512x512 PWA icons
- [ ] Add service worker for offline support
- [ ] Configure Clerk production instance
- [ ] Set up Sentry error tracking
- [ ] Add analytics (PostHog or similar)
- [ ] Implement CSP headers
- [ ] Enable Vercel Web Analytics
- [ ] Test on iOS Safari, Chrome Android, desktop browsers
- [ ] Run Lighthouse audit (target: 90+ on all metrics)
- [ ] Validate WCAG 2.1 AA compliance

---

**Created**: 2026-02-12
**Sprint**: Phase 4 - Foundation (Sprint 1-2 prep)
**Compliance**: HIPAA + 42 CFR Part 2 ready
**Status**: Production-quality shell, ready for backend integration
