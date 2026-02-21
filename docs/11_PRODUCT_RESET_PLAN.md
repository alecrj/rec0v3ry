# RecoveryOS — The Ship Plan

> **"RecoveryOS runs your sober living business so you can focus on recovery."**
>
> Last Updated: 2026-02-21

---

## The Product in One Paragraph

One app for sober home operators and residents. Operators open their phone and instantly see: how much money came in, who hasn't paid, which beds are empty and how much revenue that's costing them, and what needs attention today. Expenses track automatically from their linked bank card. Rent reminders send themselves. Empty bed alerts calculate lost revenue and ping the waitlist. Chores rotate automatically. Drug tests select randomly. A weekly P&L lands in their inbox every Monday. Documents get signed through DocuSign. Residents pay rent, see their chores, and message their house manager — all in the same app. The operator's job goes from 2 hours of daily admin to 5 minutes of approving things the system already handled.

---

## Design Principles

1. **Phone-first** — The operator runs their business from their phone. The web CRM exists for deep work (reports, setup, bulk actions) but the daily experience is mobile.
2. **Money is the scoreboard** — Every screen connects to revenue. Empty beds show lost dollars. Late payments show outstanding dollars. The P&L is the most important number in the app.
3. **10-minute onboarding** — "What's your house called?" → "How many beds?" → "What's rent?" → "Add your first resident" → Done. Everything else comes later.
4. **Automations feel like magic, not configuration** — Simple on/off toggles. No workflow builder. The operator never sees n8n. Things just happen.
5. **Residents are customers** — Happy residents stay longer = more revenue. The resident experience should be simple, respectful, and useful — not a surveillance tool.
6. **One app, two experiences** — Operators and residents both use RecoveryOS. Role determines what you see. One download, one login.

---

## Execution Tracker

### Phase A: Simplify & Onboarding
**Goal**: Strip compliance UI, fix onboarding to 10 minutes, clean up language

- [x] A1. Move compliance pages into `/settings/compliance/` (audit-log, break-glass, consents, disclosures, compliance dashboard)
- [x] A2. Update sidebar — remove compliance section, ensure Settings contains compliance links
- [x] A3. Strip compliance jargon from all daily-use pages (no "42 CFR", "Part 2", "PHI", "redisclosure")
- [x] A4. Simplify role labels in UI: Owner, Manager, Staff, Resident, Family (not "Org Admin", "House Monitor", etc.)
- [x] A5. Rebuild setup flow — 3 screens max:
  - Screen 1: "Name your organization" + "Your name"
  - Screen 2: "Add your first house" — name, address, bed count, rent amount
  - Screen 3: "Add your first resident" — name, phone, email, move-in date, bed
  - Auto-creates: org, property, house, rooms, beds, rate, resident, bed assignment
- [x] A6. Remove onboarding checklist from dashboard (replaced by new setup flow)
- [x] A7. Clean build (`tsc --noEmit` + `next build`)

### Phase B: Dashboard Rebuild
**Goal**: Operator opens app → knows exactly how their business is doing in 5 seconds

- [x] B1. **Money row** — Revenue MTD | Collected MTD | Outstanding | Profit MTD (once expenses exist)
  - All numbers in large mono font, green/red indicators
  - Outstanding amount is a tappable link → shows who owes what
- [x] B2. **Beds row** — X/Y Beds Filled (occupancy %) | Empty Beds = $X,XXX/mo lost revenue
  - Lost revenue calculated from: empty beds x house rate
  - Tappable → goes to bed grid
- [x] B3. **Action items** (sorted by money impact):
  - "3 residents are late on rent — $2,100 outstanding" → tap to see list, tap to send reminder
  - "2 beds empty for 10+ days — $3,000 lost" → tap to see waitlist
  - "5 maintenance requests pending" → tap to see list
  - "New applicant: James R." → tap to review
  - "3 chores incomplete today" → tap to see list
- [x] B4. **Quick actions bar** — Record Payment, Log Expense, Add Resident, Send Announcement
- [x] B5. **House cards** — If operator has multiple houses, show swipeable cards per house with mini-stats (beds, revenue, outstanding)
- [x] B6. Wire all dashboard data to real tRPC queries (reporting router + new queries as needed)
- [x] B7. Clean build

### Phase C: Expense Tracking
**Goal**: "I finally know if I'm making money" — real P&L per house

**Backend:**
- [x] C1. Design and create DB tables: `expenses`, `expense_categories`, `plaid_items`, `plaid_transactions`
- [x] C2. Build `expense` tRPC router:
  - `create` — manual expense entry (amount, categoryId, houseId, date, description, receiptUrl?)
  - `list` — filterable by house, category, date range
  - `update` — edit expense
  - `delete` — remove expense
  - `getCategories` — list expense categories
  - `getPandL` — revenue vs expenses for date range, per house/property/org
  - `getMonthlySummary` — monthly breakdown for trends
- [x] C3. Seed default expense categories: Rent/Mortgage, Utilities, Repairs/Maintenance, Supplies, Food, Insurance, Payroll/Staff, Marketing, Legal/Professional, Other

**Plaid Integration:**
- [x] C4. Set up Plaid API credentials (sandbox → development → production)
- [x] C5. Build Plaid Link component — "Connect your bank or card"
- [x] C6. Build `plaid` tRPC router:
  - `createLinkToken` — initiate Plaid Link
  - `exchangeToken` — exchange public token for access token
  - `getConnections` — list connected accounts
  - `removeConnection` — disconnect an account
  - `syncTransactions` — pull new transactions from Plaid
- [x] C7. Auto-categorization engine — merchant name → category mapping (simple rules table)
- [x] C8. Transaction assignment — operator reviews Plaid transactions, assigns to house + confirms category

**Frontend:**
- [x] C9. Expense list page — filterable table, "Add Expense" button, category badges
- [x] C10. Manual expense form — amount, category dropdown, house dropdown, date, description
- [x] C11. P&L page — per-house profit/loss, monthly trend chart, category breakdown
  - Big number at top: "House A: +$4,200 profit this month"
  - Revenue bar vs Expense bar visualization
  - Category breakdown: "Utilities: $340 | Repairs: $520 | Supplies: $180"
- [x] C12. Plaid connection page (in Settings) — connect/disconnect accounts, view synced transactions
- [x] C13. Transaction review page — unassigned Plaid transactions, assign house + confirm category
- [x] C14. P&L number on dashboard (wire to Phase B profit display)
- [x] C15. Clean build

### Phase D: Payment Flow
**Goal**: Get paid easier, track everything in one place

**In-app payments:**
- [x] D1. Stripe Checkout integration — resident taps "Pay" → Stripe hosted page → card or ACH
- [x] D2. Stripe webhook handler — payment success → auto-create payment record + ledger entries
- [x] D3. Fee configuration — operator chooses: absorb fees / pass convenience fee to resident
- [x] D4. Apple Pay + Google Pay support through Stripe Checkout

**External payment recording:**
- [x] D5. Enhanced "Record Payment" flow — one screen:
  - Select resident (searchable dropdown)
  - Amount (pre-filled from outstanding balance)
  - Method: Cash App | Venmo | Zelle | Cash | Check | Money Order | Other
  - Optional reference number
  - Date (defaults to today)
  - One tap: done
- [x] D6. Record payment accessible from: dashboard quick action, resident profile, billing page, invoice detail

**Reminders & automation:**
- [x] D7. Payment reminder settings — operator configures: X days before due, day of, X days after
- [x] D8. Reminder delivery — in-app notification to resident (with payment link if Stripe enabled)
- [x] D9. Late fee configuration — flat amount or percentage, grace period days
- [x] D10. Late fee auto-application — runs daily, applies fee, creates invoice line item
- [x] D11. Clean build

### Phase E: n8n Automations
**Goal**: The house runs itself — operator just approves things

**Infrastructure (built as internal cron system, no external n8n needed):**
- [x] E1. ~~Set up n8n instance~~ → Built as internal Vercel Cron + automation router (zero cost)
- [x] E2. Cron secret authentication system for API routes
- [x] E3. Build webhook endpoints for event triggers (cron routes + manual runNow)
- [x] E4. Build `automation` tRPC router:
  - `list` — all available automations with on/off status
  - `toggle` — enable/disable an automation
  - `getLog` — recent automation runs with status
  - `getSettings` — per-automation settings (e.g., reminder schedule, digest time)
  - `updateSettings` — update automation settings
  - `runNow` — manually trigger any automation

**Automations page:**
- [x] E5. `/settings/automations` page — clean list of automations, each with:
  - Name + description
  - On/off toggle
  - "Last run: 2 hours ago" status
  - Settings button (for configurable ones like reminder schedule)
  - Run Now button for testing
  - No workflow builder, no complexity — just toggles

**Pre-built automations (11 defined, 3 with full cron implementations):**
- [x] E6. **Daily Digest** — Cron → gathers bed/revenue/applicant stats → system message to operators
- [x] E7. **Rent Reminders** — Cron → checks invoice due dates → sends in-app reminders per org settings
- [x] E8. **Payment Received** — Defined in automation system (triggered via Stripe webhook)
- [x] E9. **Empty Bed Alert** — Defined in automation system (triggered on bed vacancy)
- [x] E10. **Late Payment Escalation** — Cron → applies late fees → sends in-app notification
- [x] E11. **Random Drug Test Selection** — Defined in automation system with frequency/percentage settings
- [x] E12. **Chore Auto-Rotation** — Defined in automation system with rotation day setting
- [x] E13. **Meeting Compliance Check** — Defined in automation system
- [x] E14. **Weekly P&L Report** — Defined in automation system with send day/time settings
- [x] E15. **New Applicant Alert** — Defined in automation system
- [x] E16. Clean build

### Phase F: Referrals & Admissions
**Goal**: Fill beds faster — empty beds are lost money

- [x] F1. **Shareable intake link** — public form (no login required)
  - Operator gets a unique URL: `recoveryos.app/apply/[org-slug]`
  - Applicant fills out: name, phone, email, referral source, substance history (optional), desired move-in
  - Submission creates a lead in the pipeline + triggers New Applicant Alert
- [x] F2. **Referral source tracking** — on every lead, track where they came from
  - Treatment centers, courts, self, family, online, other
  - Reports: "Sunrise Treatment has sent 12 referrals this year (8 admitted)"
- [x] F3. **Referral source management** — add/edit referral sources with contact info
  - Name, type, contact person, phone, email, address
  - Track: referrals sent, admitted, conversion rate
- [x] F4. **Auto-thank referral source** — when lead converts to resident, auto-send thank you to referral source
- [x] F5. **Waitlist auto-notification** — when bed opens, auto-notify top waitlist person
  - "A bed is available at [House Name]. Would you like to schedule an intake?"
- [x] F6. **Admissions pipeline polish** — simplify stages: New → Screening → Approved → Moved In
- [x] F7. Clean build

### Phase G: DocuSign Integration
**Goal**: Professional documents, signed digitally

- [x] G1. Wire DocuSign API (existing client code in `src/lib/docusign.ts`)
- [x] G2. **Operator document upload** — upload PDF, name it, choose category
- [x] G3. **Create signing envelope** — select document(s) + resident → send for signature
- [x] G4. **Template library** — pre-built templates:
  - House Rules Agreement
  - Move-In Agreement
  - Financial Responsibility Agreement
  - Emergency Contact Form
  - Consent to Drug Testing
- [x] G5. **Embedded signing** — resident signs within the app (DocuSign embedded view)
- [x] G6. **Completion webhook** — signed doc auto-downloaded, stored in S3, linked to resident profile
- [x] G7. **Document status tracking** — pending, sent, viewed, signed, voided
- [x] G8. Clean build

### Phase G2: Web App Perfection (NEW — inserted before mobile)
**Goal**: Every flow works end-to-end with real data. No dead buttons. No fake numbers. Test with real Stripe/Plaid/DocuSign.

**Lead → Resident (one-click conversion):**
- [ ] G2-1. **One-click lead conversion** — "Approve" button on lead does EVERYTHING:
  - Assigns bed (owner picks house/bed in modal)
  - Creates resident record from lead data
  - Generates first month's invoice
  - Sends DocuSign envelope (house rules + financial agreement)
  - Sends welcome message with app invite link
  - Moves lead to "Moved In" stage
- [ ] G2-2. **Resident self-signup** — invite link flow:
  - System sends SMS/email with signup link
  - Resident creates Clerk account
  - Auto-linked to their resident profile (scopeType=resident, scopeId=residentId)
  - Sees resident experience on login

**Dashboard as command center:**
- [ ] G2-3. **Record Payment inline modal** — opens from dashboard, not page navigation
- [ ] G2-4. **Add Resident inline modal** — quick-add from dashboard
- [ ] G2-5. **Outstanding balance drill-down** — tap outstanding amount → see who owes what → tap resident → record payment
- [ ] G2-6. **Action items that DO things** — each action item has an inline action button, not just a link
- [ ] G2-7. **Remove all hardcoded/mock data** — every number comes from real queries
- [ ] G2-8. **Empty state that guides** — new org sees "Add your first house" → "Add your first resident" → "Create first invoice" progression

**Expense tracking (multi-card, per-house):**
- [ ] G2-9. **Plaid Link end-to-end** — operator connects bank account, sees transactions
- [ ] G2-10. **Card-to-house mapping** — each linked account/card can be assigned to a house (or "all houses")
  - One card per house (e.g., Home Depot card → Hope House)
  - Multiple cards per house (e.g., owner personal card + house card → both map to Hope House)
  - Unassigned cards → transactions need manual house assignment
- [ ] G2-11. **Auto-categorization** — transactions auto-categorized (Maintenance, Supplies, Utilities, Food, etc.)
- [ ] G2-12. **P&L per house** — Revenue (rent collected) - Expenses (categorized) = Profit, per house, per month
- [ ] G2-13. **Manual expense entry** — for cash purchases, receipts, etc.

**Stripe payments end-to-end:**
- [ ] G2-14. **Resident "Pay Now" flow** — resident taps Pay → Stripe Checkout → card/Apple Pay/Google Pay → webhook → payment recorded → ledger updated → dashboard updated
- [ ] G2-15. **Stripe Connect onboarding** — operator connects Stripe account (for receiving payouts)
- [ ] G2-16. **Fee configuration tested** — absorb fees vs pass to resident, verify math

**DocuSign end-to-end:**
- [ ] G2-17. **Send envelope from template** — owner picks template + resident → DocuSign sends
- [ ] G2-18. **Embedded signing** — resident signs in-app (iframe)
- [ ] G2-19. **Webhook completion** — signed doc saved, status updated, linked to resident profile

**Automation crons (make them actually work):**
- [ ] G2-20. **Chore auto-rotation cron** — weekly rotation, residents notified
- [ ] G2-21. **Random drug test selection cron** — picks residents per settings, notifies owner
- [ ] G2-22. **Empty bed alert** — when bed vacated, calculate lost revenue, notify waitlist
- [ ] G2-23. **Auto-invoice generation** — monthly invoice cron tested with real data
- [ ] G2-24. **Weekly P&L digest** — automated report to owner

**Integration testing:**
- [ ] G2-25. **Full operator flow** — signup → setup org → add house → add resident → collect rent → track expenses → view P&L
- [ ] G2-26. **Full applicant→resident flow** — public form → lead → approve → documents → bed → paying resident
- [ ] G2-27. **Full resident flow** — login → pay rent → view chores → message manager → sign document
- [ ] G2-28. Clean build + all crons tested

### Phase H: React Native Mobile App
**Goal**: One native app, operator runs entire business from phone, residents pay and communicate

**Setup:**
- [ ] H1. Initialize Expo project in `/mobile` directory
- [ ] H2. Configure shared TypeScript types between web and mobile
- [ ] H3. Set up tRPC client for React Native (same API, different transport)
- [ ] H4. Implement Clerk authentication for React Native
- [ ] H5. Set up push notifications (Expo Notifications + Firebase Cloud Messaging)

**Operator experience (daily driver screens):**
- [ ] H6. **Home/Dashboard** — money, beds, action items (same data as web dashboard, native design)
  - Glanceable cards, pull-to-refresh, haptic feedback on actions
- [ ] H7. **Houses** — swipeable house cards with per-house stats, tap for detail
- [ ] H8. **Residents** — searchable list, tap for profile, quick actions (record payment, send message)
- [ ] H9. **Payments** — who owes what, record payment (one-tap), send reminder
- [ ] H10. **Expenses** — recent expenses, add expense, receipt photo (camera), P&L summary
- [ ] H11. **Messages** — chat threads, house groups, send message, push notifications
- [ ] H12. **Notifications** — all alerts in one feed (new applicant, late payment, curfew violation, etc.)
- [ ] H13. **Quick actions** — floating action button: Record Payment, Log Expense, Add Resident

**Resident experience:**
- [ ] H14. **Home** — balance due, next chore, upcoming meetings, pay button
- [ ] H15. **Pay Rent** — one tap to pay (Stripe / Apple Pay / Google Pay), payment history
- [ ] H16. **Schedule** — chores, meetings, curfew times
- [ ] H17. **Messages** — chat with house manager, house announcements
- [ ] H18. **Documents** — pending signatures, signed docs
- [ ] H19. **Profile** — personal info, emergency contacts

**App Store:**
- [ ] H20. App icons, splash screen, app store screenshots
- [ ] H21. iOS build + TestFlight submission
- [ ] H22. Android build + Google Play internal testing
- [ ] H23. App Store listing copy + screenshots

### Phase I: Messaging Polish
**Goal**: Built-in chat that feels like iMessage, not enterprise software

- [ ] I1. Redesign chat UI — message bubbles, timestamps, read indicators
- [ ] I2. House group chats — auto-created when house is created, all house residents + manager
- [ ] I3. Push notifications for new messages (wired to mobile app)
- [ ] I4. Unread message badges on nav (web + mobile)
- [ ] I5. Announcements — operator posts, all residents see, read tracking
- [ ] I6. "Broadcast to all houses" — one announcement to all residents across all houses
- [ ] I7. Photo sharing in messages (mobile: camera, gallery)
- [ ] I8. Clean build

### Phase J: Final Polish & Ship Prep
**Goal**: Everything works, everything is tested, ready to ship

- [ ] J1. End-to-end testing — full operator flow: setup → add house → add resident → collect rent → track expenses → view P&L
- [ ] J2. End-to-end testing — full resident flow: login → pay rent → view chores → message manager → sign document
- [ ] J3. Performance audit — all pages load < 2s, API p95 < 500ms
- [ ] J4. Mobile app testing — both iOS and Android, operator + resident flows
- [ ] J5. Push notification testing — all notification types fire correctly
- [ ] J6. n8n automation testing — all workflows fire on schedule, correct data
- [ ] J7. Stripe payment testing — real test payments, webhooks, fee handling
- [ ] J8. DocuSign testing — real test signatures, webhook completion
- [ ] J9. Plaid testing — sandbox → development transactions sync correctly
- [ ] J10. Fix all bugs found during testing
- [ ] J11. App Store submission (iOS + Android)
- [ ] J12. Landing page / marketing site
- [ ] J13. Ship

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│            React Native (Expo)               │
│   Operator App  ←──role──→  Resident App     │
│   (daily driver)            (pay, chores,    │
│                              messages)        │
└──────────────────┬──────────────────────────┘
                   │ tRPC over HTTPS
┌──────────────────┴──────────────────────────┐
│            Next.js Web App                    │
│   CRM (desktop)  ←──role──→  Settings/Admin  │
│   (deep work,                (setup, config, │
│    reports, bulk)             compliance)     │
└──────────────────┬──────────────────────────┘
                   │ tRPC
┌──────────────────┴──────────────────────────┐
│              Backend (tRPC Routers)           │
│  34 existing + expense + plaid + automation   │
└───┬──────────┬──────────┬──────────┬────────┘
    │          │          │          │
  Neon DB    Stripe    Plaid     DocuSign
  (Postgres)  (pay)    (expenses) (e-sign)
    │
    └── n8n (automations, cron jobs, webhooks)
```

---

## Session-by-Session Execution Plan

| Session | Phase | What Gets Done | Checkboxes |
|---------|-------|---------------|------------|
| 1 | A + B1-B4 | Simplify UI, move compliance, rebuild dashboard | A1-A7, B1-B7 |
| 2 | C | Expense tracking backend + Plaid + frontend | C1-C15 |
| 3 | D | Payment flow — Stripe, external recording, reminders | D1-D11 |
| 4 | E (infra) | n8n setup, API auth, webhook endpoints, automations page | E1-E5 |
| 5 | E (workflows) | Build all 10 n8n workflows | E6-E16 |
| 6 | F + G | Referral tracking + DocuSign integration | F1-F7, G1-G8 |
| 7 | H (setup + operator) | Expo init, auth, operator screens | H1-H13 |
| 8 | H (resident + stores) | Resident screens, app store prep | H14-H23 |
| 9 | I | Messaging polish | I1-I8 |
| 10 | J | Final testing, bug fixes, ship | J1-J13 |

**Total: ~10 sessions to ship.**

---

## What We Keep vs What Changes

**KEEP (already built, still valuable):**
- Property → House → Room → Bed hierarchy
- Resident management + profiles
- Invoice + payment + ledger system (enhance, don't rebuild)
- All house operations (chores, curfew, passes, drug tests, meetings, incidents, maintenance)
- Messaging infrastructure (enhance UI)
- Admissions pipeline (simplify + add referral tracking)
- Reporting router (add P&L queries)
- Auth (Clerk) + DB (Neon) + design system (Obsidian)
- All 34 tRPC routers (add 3 new: expense, plaid, automation)

**CHANGE:**
- Dashboard → money-first command center
- Compliance → moved to settings, jargon stripped
- Setup flow → 10-minute onboarding (3 screens)
- Payments → add Stripe Checkout + Apple Pay + better external recording
- Sidebar → already simplified (8 items), minor label updates
- Role language → simplified to 5 roles in UI

**ADD (new):**
- Expense tracking + Plaid integration
- n8n automation layer (11 pre-built workflows)
- React Native mobile app (Expo)
- DocuSign real integration
- Shareable public intake form
- Referral source tracking
- Push notifications

---

## Payment Fee Strategy

- **Default**: Record external payments (Cash App, Venmo, cash) — **zero fees**
- **Optional**: Stripe in-app payment
  - ACH: 0.8%, capped at $5 (recommended — only $5 on $700 rent)
  - Card: 2.9% + $0.30
  - Apple Pay / Google Pay: same as card rates
  - Operator chooses: absorb fee OR pass as "convenience fee"
- **The value isn't processing payments — it's TRACKING + REMINDERS**

---

## The No-Brainer Test

| Operator's Pain | What RecoveryOS Does | Time Saved |
|----------------|---------------------|-----------|
| Checking Cash App + spreadsheet for who paid | Dashboard: outstanding balance by resident, one screen | 30 min/week → 10 sec |
| Chasing late rent payments | Auto-reminders send themselves, escalate automatically | 2 hrs/week → 0 |
| Buying stuff, losing receipts, no idea if profitable | Link card → expenses auto-track → P&L per house | 3 hrs/month → 0 |
| Managing chore rotations manually | Auto-rotation weekly, residents notified | 1 hr/week → 0 |
| Coordinating drug tests | Random selection, manager notified, results logged | 30 min/week → 2 min |
| Filling empty beds | Shareable intake link, waitlist auto-notifies, referral tracking | Hours → minutes |
| Paper house rules, lost forms | DocuSign, everything digital and stored | Hours → minutes |
| Texting residents individually | In-app messaging, house group chats, announcements | Fragmented → unified |
| "Am I making money?" | Open app → see profit per house | Unknown → instant |
