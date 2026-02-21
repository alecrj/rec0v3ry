# RecoveryOS Phase 5: Polish & Launch Plan

> **Goal**: Production-ready desktop CRM, then native mobile apps
> **Created**: 2026-02-18
> **Status**: Active

---

## Overview

| Phase | Focus | Duration | Status |
|-------|-------|----------|--------|
| 5A | Critical Fixes | 1 day | 🟡 ~90% Done |
| 5B | UI Overhaul | 3-4 days | 🔴 Not Started |
| 5C | Core Features | 3-4 days | 🔴 Not Started |
| 5D | Integrations | 2-3 days | 🔴 Not Started |
| 5E | Testing & Launch | 2-3 days | 🔴 Not Started |
| 6 | Native Mobile Apps | 2-3 weeks | 🔴 Future |

---

## Phase 5A: Critical Fixes (Day 1)

### 5A.1 — Fix Broken Pages
- [x] Create `/residents` page (currently 404)
- [x] Create `/residents/[id]` detail page
- [x] Fix any other 404 routes
- [ ] Test all sidebar navigation links

### 5A.2 — Fix User Setup Flow
- [x] Update `setup-user` API to properly set scope_type/scope_id
- [x] Add error handling for edge cases
- [ ] Test full sign-up → dashboard flow

### 5A.3 — Wire Up Real Data (~90% done)
- [x] Dashboard stats → connect to `reporting.getDashboard`
- [x] Bed grid → connect to `occupancy.getBedGrid`
- [x] Residents list → connect to `resident.list`
- [x] Operations pages (7): chores, meetings, passes, curfew, drug-tests, incidents, check-ins
- [x] Billing pages (6): overview, invoices list, invoice detail, new invoice, ledger, rates
- [x] Compliance pages (2): consents, dashboard
- [x] Admin pages (2): family portal, invite user
- [x] Admissions: lead detail [id]
- [x] Messages: compose, inbox
- [ ] **Messages: conversation detail** (`messages/[conversationId]`) → `conversation.getById` + `message.list` + `message.send`
- [ ] **Compliance: disclosures** — check if needs wiring
- [ ] **Resident PWA pages** (~7 pages) — check each for mock data
- [ ] Final sweep — verify no remaining hardcoded mock data

### 5A.4 — Fix Clerk Integration
- [x] Remove OrganizationSwitcher dependency completely
- [x] Test sign-in/sign-out flow
- [x] Verify session handling works

---

## Phase 5B: UI Overhaul (Days 2-5)

### 5B.1 — Design System Refresh
- [ ] Update color palette (modern, vibrant but professional)
  - Primary: Blue gradient (not flat)
  - Accent: Teal/green for success states
  - Backgrounds: Subtle gradients, not flat gray
- [ ] Typography scale (better hierarchy)
- [ ] Spacing system (consistent 4px/8px grid)
- [ ] Shadow system (subtle, layered depth)
- [ ] Border radius (slightly larger, modern feel)

### 5B.2 — Component Library Polish
- [ ] Cards — glassmorphism option, better shadows
- [ ] Buttons — gradient fills, hover states, loading states
- [ ] Inputs — floating labels, better focus states
- [ ] Tables — sticky headers, row hover, better density
- [ ] Modals — slide-in animations, backdrop blur
- [ ] Navigation — active states, smooth transitions
- [ ] Loading states — skeletons everywhere

### 5B.3 — Page Redesigns
- [ ] **Dashboard** — KPI cards with sparklines, action items, activity feed
- [ ] **Bed Grid** — Visual redesign, drag-drop ready, status colors
- [ ] **Residents List** — Photo avatars, status badges, quick actions
- [ ] **Billing Overview** — Revenue charts, aging buckets visualization
- [ ] **Operations pages** — Kanban-style where appropriate
- [ ] **Compliance Dashboard** — Clean status indicators

### 5B.4 — Responsive Polish
- [ ] Sidebar collapse on smaller screens
- [ ] Table horizontal scroll
- [ ] Stack layouts on tablet
- [ ] Touch-friendly hit targets

---

## Phase 5C: Core Features (Days 6-9)

### 5C.1 — Payments (Stripe)
- [ ] Add Stripe API keys to env
- [ ] Stripe Connect onboarding for operators
- [ ] Payment checkout flow for residents
- [ ] Invoice → Payment linking
- [ ] Payment confirmation emails
- [ ] Webhook handling for payment events
- [ ] Refund flow
- [ ] Payment history display

### 5C.2 — Messaging System
- [ ] Real-time with Ably/Pusher
- [ ] Conversation list UI
- [ ] Message thread UI
- [ ] Send message flow
- [ ] Unread indicators
- [ ] Announcement broadcasts
- [ ] Message notifications (in-app)

### 5C.3 — Document Management
- [ ] S3 upload integration
- [ ] Document viewer
- [ ] E-signature flow (DocuSign)
- [ ] Template system
- [ ] Retention policy enforcement

### 5C.4 — Expense Tracking (Rocket Money style)
- [ ] Plaid integration setup
- [ ] Link bank account flow
- [ ] Transaction sync
- [ ] Auto-categorization (supplies, maintenance, utilities, etc.)
- [ ] Manual transaction entry
- [ ] Receipt photo upload
- [ ] Expense reports by property/house
- [ ] Export for accounting

---

## Phase 5D: Integrations (Days 10-12)

### 5D.1 — Email Notifications
- [ ] SendGrid setup
- [ ] Invoice sent notification
- [ ] Payment received notification
- [ ] Payment reminder (dunning)
- [ ] Document ready to sign
- [ ] New message notification
- [ ] Weekly summary for operators

### 5D.2 — SMS Notifications
- [ ] Twilio setup
- [ ] Payment reminder SMS
- [ ] Curfew reminder
- [ ] Drug test notification
- [ ] Emergency alerts

### 5D.3 — Background Jobs
- [ ] Inngest setup
- [ ] Scheduled invoice generation
- [ ] Payment reminder jobs
- [ ] Consent expiration checks
- [ ] Report generation

---

## Phase 5E: Testing & Launch Prep (Days 13-15)

### 5E.1 — Testing
- [ ] E2E tests passing with real auth
- [ ] Payment flow testing (Stripe test mode)
- [ ] Load testing key endpoints
- [ ] Security audit (OWASP checks)
- [ ] Accessibility audit (WCAG 2.1)

### 5E.2 — Documentation
- [ ] User guide for operators
- [ ] API documentation
- [ ] Deployment runbook
- [ ] Security incident response plan

### 5E.3 — Deployment
- [ ] Vercel production setup
- [ ] Environment variables configured
- [ ] Domain setup
- [ ] SSL verification
- [ ] BAA signed with Vercel (HIPAA)

### 5E.4 — Launch Checklist
- [ ] All compliance checks passing
- [ ] Audit log verification
- [ ] Backup/restore tested
- [ ] Monitoring setup (error tracking)
- [ ] Analytics setup

---

## Phase 6: Native Mobile Apps (Future - 2-3 weeks)

### Architecture Decision
**Recommended: React Native with Expo**
- Share some code/logic with web
- Single codebase for iOS + Android
- Faster development than pure native

### 6.1 — Resident App (iOS + Android)
- [ ] Expo project setup
- [ ] Authentication (Clerk React Native SDK)
- [ ] Home dashboard
- [ ] Payment screen (Stripe React Native)
- [ ] Schedule view
- [ ] Messages
- [ ] Document viewing/signing
- [ ] Push notifications
- [ ] Biometric auth (Face ID / fingerprint)
- [ ] App Store submission
- [ ] Play Store submission

### 6.2 — Operator App (iOS + Android)
- [ ] Separate app or same app with role switching?
- [ ] Quick stats dashboard
- [ ] Resident check-in/out
- [ ] Incident reporting
- [ ] Message responses
- [ ] Approval workflows (passes, etc.)
- [ ] Push notifications for alerts
- [ ] App Store submission
- [ ] Play Store submission

---

## Technical Requirements

### Environment Variables Needed
```bash
# Already have
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATABASE_URL=

# Need to add
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox

DOCUSIGN_INTEGRATION_KEY=
DOCUSIGN_SECRET_KEY=
DOCUSIGN_ACCOUNT_ID=

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=

SENDGRID_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

ABLY_API_KEY=

INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

### Third-Party Services
| Service | Purpose | Cost |
|---------|---------|------|
| Clerk | Auth | Free → $25/mo |
| Neon | Database | Free → $19/mo |
| Stripe | Payments | 2.9% + $0.30 |
| Plaid | Bank linking | ~$0.30/account |
| DocuSign | E-signatures | $10/mo |
| AWS S3 | File storage | ~$5/mo |
| SendGrid | Email | Free tier |
| Twilio | SMS | ~$0.01/msg |
| Ably | Real-time | Free → $25/mo |
| Vercel | Hosting | $20/mo (Pro) |

---

## Success Metrics

### Before Launch
- [ ] All pages load < 2 seconds
- [ ] Zero TypeScript errors
- [ ] All E2E tests pass
- [ ] Compliance checklist 100%
- [ ] 90+ Lighthouse score

### Post-Launch
- [ ] 99.9% uptime
- [ ] < 500ms API response times
- [ ] Zero data breaches
- [ ] Payment success rate > 98%

---

## Notes

- PWA code stays but won't be promoted — native apps are the focus
- Desktop CRM is primary interface for operators
- Native apps for on-the-go access (both roles)
- Can reuse tRPC API for mobile apps
