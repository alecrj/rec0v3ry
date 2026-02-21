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

- [ ] A1. Move compliance pages into `/settings/compliance/` (audit-log, break-glass, consents, disclosures, compliance dashboard)
- [ ] A2. Update sidebar — remove compliance section, ensure Settings contains compliance links
- [ ] A3. Strip compliance jargon from all daily-use pages (no "42 CFR", "Part 2", "PHI", "redisclosure")
- [ ] A4. Simplify role labels in UI: Owner, Manager, Staff, Resident, Family (not "Org Admin", "House Monitor", etc.)
- [ ] A5. Rebuild setup flow — 3 screens max:
  - Screen 1: "Name your organization" + "Your name"
  - Screen 2: "Add your first house" — name, address, bed count, rent amount
  - Screen 3: "Add your first resident" — name, phone, email, move-in date, bed
  - Auto-creates: org, property, house, rooms, beds, rate, resident, bed assignment
- [ ] A6. Remove onboarding checklist from dashboard (replaced by new setup flow)
- [ ] A7. Clean build (`tsc --noEmit` + `next build`)

### Phase B: Dashboard Rebuild
**Goal**: Operator opens app → knows exactly how their business is doing in 5 seconds

- [ ] B1. **Money row** — Revenue MTD | Collected MTD | Outstanding | Profit MTD (once expenses exist)
  - All numbers in large mono font, green/red indicators
  - Outstanding amount is a tappable link → shows who owes what
- [ ] B2. **Beds row** — X/Y Beds Filled (occupancy %) | Empty Beds = $X,XXX/mo lost revenue
  - Lost revenue calculated from: empty beds x house rate
  - Tappable → goes to bed grid
- [ ] B3. **Action items** (sorted by money impact):
  - "3 residents are late on rent — $2,100 outstanding" → tap to see list, tap to send reminder
  - "2 beds empty for 10+ days — $3,000 lost" → tap to see waitlist
  - "5 maintenance requests pending" → tap to see list
  - "New applicant: James R." → tap to review
  - "3 chores incomplete today" → tap to see list
- [ ] B4. **Quick actions bar** — Record Payment, Log Expense, Add Resident, Send Announcement
- [ ] B5. **House cards** — If operator has multiple houses, show swipeable cards per house with mini-stats (beds, revenue, outstanding)
- [ ] B6. Wire all dashboard data to real tRPC queries (reporting router + new queries as needed)
- [ ] B7. Clean build

### Phase C: Expense Tracking
**Goal**: "I finally know if I'm making money" — real P&L per house

**Backend:**
- [ ] C1. Design and create DB tables: `expenses`, `expense_categories`, `plaid_items`, `plaid_transactions`
- [ ] C2. Build `expense` tRPC router:
  - `create` — manual expense entry (amount, categoryId, houseId, date, description, receiptUrl?)
  - `list` — filterable by house, category, date range
  - `update` — edit expense
  - `delete` — remove expense
  - `getCategories` — list expense categories
  - `getPandL` — revenue vs expenses for date range, per house/property/org
  - `getMonthlySummary` — monthly breakdown for trends
- [ ] C3. Seed default expense categories: Rent/Mortgage, Utilities, Repairs/Maintenance, Supplies, Food, Insurance, Payroll/Staff, Marketing, Legal/Professional, Other

**Plaid Integration:**
- [ ] C4. Set up Plaid API credentials (sandbox → development → production)
- [ ] C5. Build Plaid Link component — "Connect your bank or card"
- [ ] C6. Build `plaid` tRPC router:
  - `createLinkToken` — initiate Plaid Link
  - `exchangeToken` — exchange public token for access token
  - `getConnections` — list connected accounts
  - `removeConnection` — disconnect an account
  - `syncTransactions` — pull new transactions from Plaid
- [ ] C7. Auto-categorization engine — merchant name → category mapping (simple rules table)
- [ ] C8. Transaction assignment — operator reviews Plaid transactions, assigns to house + confirms category

**Frontend:**
- [ ] C9. Expense list page — filterable table, "Add Expense" button, category badges
- [ ] C10. Manual expense form — amount, category dropdown, house dropdown, date, description
- [ ] C11. P&L page — per-house profit/loss, monthly trend chart, category breakdown
  - Big number at top: "House A: +$4,200 profit this month"
  - Revenue bar vs Expense bar visualization
  - Category breakdown: "Utilities: $340 | Repairs: $520 | Supplies: $180"
- [ ] C12. Plaid connection page (in Settings) — connect/disconnect accounts, view synced transactions
- [ ] C13. Transaction review page — unassigned Plaid transactions, assign house + confirm category
- [ ] C14. P&L number on dashboard (wire to Phase B profit display)
- [ ] C15. Clean build

### Phase D: Payment Flow
**Goal**: Get paid easier, track everything in one place

**In-app payments:**
- [ ] D1. Stripe Checkout integration — resident taps "Pay" → Stripe hosted page → card or ACH
- [ ] D2. Stripe webhook handler — payment success → auto-create payment record + ledger entries
- [ ] D3. Fee configuration — operator chooses: absorb fees / pass convenience fee to resident
- [ ] D4. Apple Pay + Google Pay support through Stripe Checkout

**External payment recording:**
- [ ] D5. Enhanced "Record Payment" flow — one screen:
  - Select resident (searchable dropdown)
  - Amount (pre-filled from outstanding balance)
  - Method: Cash App | Venmo | Zelle | Cash | Check | Money Order | Other
  - Optional reference number
  - Date (defaults to today)
  - One tap: done
- [ ] D6. Record payment accessible from: dashboard quick action, resident profile, billing page, invoice detail

**Reminders & automation:**
- [ ] D7. Payment reminder settings — operator configures: X days before due, day of, X days after
- [ ] D8. Reminder delivery — in-app notification to resident (with payment link if Stripe enabled)
- [ ] D9. Late fee configuration — flat amount or percentage, grace period days
- [ ] D10. Late fee auto-application — runs daily, applies fee, creates invoice line item
- [ ] D11. Clean build

### Phase E: n8n Automations
**Goal**: The house runs itself — operator just approves things

**Infrastructure:**
- [ ] E1. Set up n8n instance (Docker or n8n Cloud)
- [ ] E2. Create API key authentication system for n8n → RecoveryOS
- [ ] E3. Build webhook endpoints for event triggers (payment.created, bed.vacated, lead.created, etc.)
- [ ] E4. Build `automation` tRPC router:
  - `list` — all available automations with on/off status
  - `toggle` — enable/disable an automation
  - `getLog` — recent automation runs with status
  - `getSettings` — per-automation settings (e.g., reminder schedule, digest time)
  - `updateSettings` — update automation settings

**Automations page:**
- [ ] E5. `/settings/automations` page — clean list of automations, each with:
  - Name + description
  - On/off toggle
  - "Last run: 2 hours ago" status
  - Settings button (for configurable ones like reminder schedule)
  - No workflow builder, no complexity — just toggles

**Pre-built n8n workflows:**
- [ ] E6. **Daily Digest** — Cron 7am → calls reporting API → sends push + email to operator
  - "Good morning. 47/52 beds filled. $4,200 collected yesterday. $8,100 outstanding. 2 new applicants."
- [ ] E7. **Rent Reminders** — Cron daily → checks invoice due dates → sends reminders per schedule
  - 3 days before: "Your rent of $700 is due on the 1st"
  - Day of: "Rent is due today — tap to pay"
  - 1 day late: "Your rent was due yesterday"
  - 7 days late: "You are 7 days past due. Please pay $700 to avoid late fees."
- [ ] E8. **Payment Received** — Webhook → sends receipt to resident + updates operator dashboard
- [ ] E9. **Empty Bed Alert** — Webhook on bed vacated → calculates lost revenue → notifies operator
  - "Bed 3A is now empty. That's $1,500/month in lost revenue. You have 3 people on the waitlist."
- [ ] E10. **Late Payment Escalation** — Cron daily → applies late fees → sends escalating messages
- [ ] E11. **Random Drug Test Selection** — Cron per schedule → selects residents → notifies manager
- [ ] E12. **Chore Auto-Rotation** — Cron weekly → rotates assignments → notifies residents
- [ ] E13. **Meeting Compliance Check** — Cron weekly → checks requirements → alerts manager
  - "3 residents are behind on required meetings this week"
- [ ] E14. **Weekly P&L Report** — Cron Monday 8am → generates per-house P&L → sends to operator
- [ ] E15. **New Applicant Alert** — Webhook on lead.created → pushes to operator immediately
- [ ] E16. Clean build + test all automations end-to-end

### Phase F: Referrals & Admissions
**Goal**: Fill beds faster — empty beds are lost money

- [ ] F1. **Shareable intake link** — public form (no login required)
  - Operator gets a unique URL: `recoveryos.app/apply/[org-slug]`
  - Applicant fills out: name, phone, email, referral source, substance history (optional), desired move-in
  - Submission creates a lead in the pipeline + triggers New Applicant Alert
- [ ] F2. **Referral source tracking** — on every lead, track where they came from
  - Treatment centers, courts, self, family, online, other
  - Reports: "Sunrise Treatment has sent 12 referrals this year (8 admitted)"
- [ ] F3. **Referral source management** — add/edit referral sources with contact info
  - Name, type, contact person, phone, email, address
  - Track: referrals sent, admitted, conversion rate
- [ ] F4. **Auto-thank referral source** — when lead converts to resident, auto-send thank you to referral source
- [ ] F5. **Waitlist auto-notification** — when bed opens, auto-notify top waitlist person
  - "A bed is available at [House Name]. Would you like to schedule an intake?"
- [ ] F6. **Admissions pipeline polish** — simplify stages: New → Screening → Approved → Moved In
- [ ] F7. Clean build

### Phase G: DocuSign Integration
**Goal**: Professional documents, signed digitally

- [ ] G1. Wire DocuSign API (existing client code in `src/lib/docusign.ts`)
- [ ] G2. **Operator document upload** — upload PDF, name it, choose category
- [ ] G3. **Create signing envelope** — select document(s) + resident → send for signature
- [ ] G4. **Template library** — pre-built templates:
  - House Rules Agreement
  - Move-In Agreement
  - Financial Responsibility Agreement
  - Emergency Contact Form
  - Consent to Drug Testing
- [ ] G5. **Embedded signing** — resident signs within the app (DocuSign embedded view)
- [ ] G6. **Completion webhook** — signed doc auto-downloaded, stored in S3, linked to resident profile
- [ ] G7. **Document status tracking** — pending, sent, viewed, signed, voided
- [ ] G8. Clean build

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
