# RecoveryOS UI Overhaul Plan

> **Goal**: Transform RecoveryOS into a clean, modern, professional SaaS dashboard
> **Inspiration**: Linear, Notion, Vercel, modern enterprise dashboards
> **Created**: 2026-02-18

---

## Design Philosophy

### Guiding Principles

1. **Linear-style Minimalism**: Clean, sequential layouts with one clear direction for eyes to scan
2. **Functional Clarity**: Every element serves a purpose—no decoration for decoration's sake
3. **Professional Polish**: Enterprise-grade feel appropriate for healthcare/compliance software
4. **Reduced Cognitive Load**: White space, grouping, and hierarchy guide users effortlessly
5. **Seamless UX**: Smooth transitions, consistent patterns, instant feedback

### What We're Fixing

| Current Problem | Solution |
|-----------------|----------|
| Elements don't "fit" together | Consistent spacing system (4/8/12/16/24px) |
| Flat, generic appearance | Subtle depth with shadows, gradients, micro-animations |
| Basic components | Polished states (hover, focus, active, disabled, loading) |
| Inconsistent typography | Clear hierarchy with Inter weights and sizes |
| Dense, overwhelming layouts | Strategic white space and card grouping |
| No visual feedback | Skeleton loaders, transitions, hover states |

---

## 1. Color System

### Primary Palette

```css
/* Core Brand */
--primary-50:  #eff6ff;   /* Light backgrounds */
--primary-100: #dbeafe;   /* Subtle highlights */
--primary-500: #3b82f6;   /* Primary buttons, links */
--primary-600: #2563eb;   /* Primary hover */
--primary-700: #1d4ed8;   /* Primary pressed */

/* Neutral Scale (Slate - more refined than gray) */
--slate-50:  #f8fafc;     /* Page backgrounds */
--slate-100: #f1f5f9;     /* Card backgrounds, table headers */
--slate-200: #e2e8f0;     /* Borders, dividers */
--slate-300: #cbd5e1;     /* Disabled states */
--slate-400: #94a3b8;     /* Placeholder text */
--slate-500: #64748b;     /* Secondary text */
--slate-600: #475569;     /* Body text */
--slate-700: #334155;     /* Headings */
--slate-800: #1e293b;     /* Sidebar background */
--slate-900: #0f172a;     /* Primary text */

/* Semantic Colors */
--success-50:  #f0fdf4;   --success-500: #22c55e;  --success-700: #15803d;
--warning-50:  #fffbeb;   --warning-500: #f59e0b;  --warning-700: #b45309;
--error-50:    #fef2f2;   --error-500:   #ef4444;  --error-700:   #b91c1c;
--info-50:     #eff6ff;   --info-500:    #3b82f6;  --info-700:    #1d4ed8;
```

### Accent Gradients (For KPI Cards, Buttons)

```css
/* Subtle gradient for primary buttons */
--gradient-primary: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);

/* Light gradient for card backgrounds on hover */
--gradient-card-hover: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);

/* Success accent for positive metrics */
--gradient-success: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
```

---

## 2. Typography System

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
```

### Type Scale

| Name | Size | Weight | Line Height | Use Case |
|------|------|--------|-------------|----------|
| Display | 36px | 700 | 1.1 | Page titles (Dashboard) |
| Heading 1 | 24px | 600 | 1.2 | Section headers |
| Heading 2 | 20px | 600 | 1.3 | Card titles |
| Heading 3 | 16px | 600 | 1.4 | Subsections |
| Body | 14px | 400 | 1.5 | Main content |
| Body Small | 13px | 400 | 1.5 | Secondary info |
| Caption | 12px | 500 | 1.4 | Labels, metadata |
| Mono | 13px | 500 | 1.4 | IDs, codes, numbers |

### Weight Usage
- **400 Regular**: Body text, descriptions
- **500 Medium**: Labels, captions, table headers
- **600 Semibold**: Headings, card titles, emphasis
- **700 Bold**: Page titles, KPI values

---

## 3. Spacing System

### Base Unit: 4px

| Token | Value | Use Case |
|-------|-------|----------|
| xs | 4px | Icon padding, tight gaps |
| sm | 8px | Button padding, list items |
| md | 12px | Input padding, card gaps |
| lg | 16px | Section spacing |
| xl | 24px | Card padding, major gaps |
| 2xl | 32px | Page margins |
| 3xl | 48px | Section separators |

### Layout Grid
- **Sidebar**: 256px expanded, 64px collapsed
- **Main Content**: 16px padding (mobile), 24px (tablet), 32px (desktop)
- **Card Grid**: 24px gap between cards
- **Max Content Width**: 1440px (centered on wide screens)

---

## 4. Component Design System

### 4.1 Cards

**Default Card**
```
- Background: white
- Border: 1px solid slate-200
- Border radius: 12px (lg)
- Shadow: 0 1px 3px rgba(0,0,0,0.05)
- Padding: 24px
- Hover: shadow-md, subtle border color change
```

**Elevated Card (for CTAs, important actions)**
```
- Shadow: 0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)
- Hover: translateY(-2px), shadow-lg
```

**KPI Stat Card**
```
┌──────────────────────────────────────┐
│  [Icon]              ↑ 12.5% ───────│─ Trend badge (top right)
│                                      │
│  Revenue This Month                  │─ Label (caption, slate-500)
│  $42,850                             │─ Value (display, slate-900)
│  ▁▂▃▅▆▇█▆▅▄▃▂▁  ──────────────────│─ Sparkline (optional)
│                                      │
│  vs $38,420 last month              │─ Comparison (small, slate-400)
└──────────────────────────────────────┘
```

### 4.2 Buttons

**Primary**
```css
background: linear-gradient(135deg, #3b82f6, #2563eb);
color: white;
padding: 10px 16px;
border-radius: 8px;
font-weight: 500;
box-shadow: 0 1px 2px rgba(0,0,0,0.05);
transition: all 150ms ease;

&:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 4px 6px rgba(37,99,235,0.25);
  transform: translateY(-1px);
}

&:active {
  transform: translateY(0);
}
```

**Secondary**
```css
background: white;
border: 1px solid slate-300;
color: slate-700;

&:hover {
  background: slate-50;
  border-color: slate-400;
}
```

**Ghost**
```css
background: transparent;
color: slate-600;

&:hover {
  background: slate-100;
}
```

**Destructive**
```css
background: linear-gradient(135deg, #ef4444, #dc2626);
color: white;
```

### 4.3 Inputs

**Text Input**
```
┌─────────────────────────────────────┐
│ Email address                       │─ Floating label (caption, primary-600)
│ john@example.com                    │─ Value (body, slate-900)
└─────────────────────────────────────┘

- Border: 1px solid slate-300
- Border radius: 8px
- Padding: 12px 14px
- Focus: border-primary-500, ring-2 ring-primary-100
- Error: border-error-500, ring-2 ring-error-100
```

**Select / Dropdown**
```
- Same styling as text input
- Chevron icon on right
- Smooth dropdown animation (150ms)
- Active item: bg-primary-50
```

### 4.4 Tables

**Modern Table Design**
```
┌────────────────────────────────────────────────────────────┐
│ [Checkbox] Name          Status        Amount    Actions   │─ Header (sticky, bg-slate-50)
├────────────────────────────────────────────────────────────┤
│ [  ]       John Doe      ● Active      $1,200    ⋮        │─ Row (hover: bg-slate-50)
│ [  ]       Jane Smith    ○ Pending     $850      ⋮        │
│ [✓]        Bob Wilson    ● Active      $1,500    ⋮        │─ Selected row (bg-primary-50)
└────────────────────────────────────────────────────────────┘
         ← Prev   Page 1 of 10   Next →                       ─ Pagination
```

- **Headers**: bg-slate-50, font-medium, text-slate-700
- **Rows**: 52px height, border-b border-slate-100
- **Hover**: bg-slate-50 with smooth transition
- **Selected**: bg-primary-50 with checkbox
- **Actions**: Overflow menu (⋮) reveals on hover

### 4.5 Badges & Status

**Status Badge**
```
● Active    → bg-success-50, text-success-700, dot: success-500
○ Pending   → bg-warning-50, text-warning-700, dot: warning-500
○ Inactive  → bg-slate-100, text-slate-600
● Error     → bg-error-50, text-error-700, dot: error-500
```

**Count Badge**
```
Inbox [3]   → bg-primary-500, text-white, min-width: 20px, rounded-full
```

**Priority Badge**
```
HIGH   → bg-error-100, text-error-700, border border-error-200
MEDIUM → bg-warning-100, text-warning-700, border border-warning-200
LOW    → bg-slate-100, text-slate-600, border border-slate-200
```

### 4.6 Navigation (Sidebar)

**Redesigned Sidebar**
```
┌────────────────────────────┐
│  ◉ RecoveryOS              │─ Logo + name (collapsible)
│  Operator CRM              │
├────────────────────────────┤
│  🔍 Search... ⌘K           │─ Command palette trigger
├────────────────────────────┤
│  ◉ Dashboard               │─ Active: bg-slate-700, left accent bar
│  ⌂ Occupancy          ›    │─ Expandable section
│  ⟐ Admissions              │
│  ☷ Residents               │
│  $ Billing             ›   │
│  ⚙ Operations          ›   │
│  📄 Documents          ›   │
│  💬 Messages           ›   │
│  📊 Reports            ›   │
│  🛡 Compliance         ›   │
│  ⚙ Admin               ›   │
├────────────────────────────┤
│  🔒 HIPAA Compliant        │─ Footer badge
│  v1.0.0                    │
└────────────────────────────┘
```

**Key Changes:**
- Width: 256px (expanded) → 64px (collapsed with icons only)
- Active state: Subtle left border accent (2px primary-500)
- Section headers: All caps, caption size, slate-400
- Smooth collapse animation (200ms)
- Tooltips on collapsed icons

---

## 5. Page-by-Page Redesign

### 5.1 Dashboard

**Current Issues:**
- Stats cards are plain white boxes
- No visual hierarchy for action items
- Activity feed is basic text
- No data visualization

**Redesigned Layout:**
```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  Dashboard                                           [Feb 18, 2026]│
│  Good morning, Alex. Here's your overview.                         │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐│
│  │ Occupancy    │ │ Revenue MTD  │ │ Outstanding  │ │ Consents   ││
│  │   87%        │ │  $42,850     │ │  $12,400     │ │    5       ││
│  │ ▁▂▃▅▆▇█▆▅   │ │ ▁▂▃▄▅▆▇█    │ │  ↓ 8%       │ │ expiring   ││
│  │ 52/60 beds   │ │ ↑ 12% vs LM  │ │ 8 invoices   │ │ in 30 days ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘│
│                                                                    │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐  │
│  │ Action Items                │ │ Recent Activity             │  │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━ │ │ ━━━━━━━━━━━━━━━━━━━━━━━━━ │  │
│  │ HIGH  2 incidents need...  │ │ ● John D. checked in        │  │
│  │ HIGH  5 consents expiring  │ │ ● Payment received $1,200   │  │
│  │ MED   3 passes pending     │ │ ● New lead: Jane S.         │  │
│  │ MED   8 invoices overdue   │ │ ● Drug test scheduled       │  │
│  └─────────────────────────────┘ └─────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Expiring Consents (30 Days)                    [View All →] │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │ Name          Type              Expires       Days    Action│  │
│  │ John Doe      Part 2 Consent    Feb 25        7       Renew │  │
│  │ Jane Smith    Treatment         Mar 01        11      Renew │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Quick Links                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │🛏 Beds   │ │$ Finance │ │⚙ Ops    │ │🛡 Comply │             │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
└────────────────────────────────────────────────────────────────────┘
```

### 5.2 Bed Grid (Occupancy)

**Visual Bed Grid Design:**
```
┌──────────────────────────────────────────────────────────────┐
│ Bed Grid                                    [Filter ▾] [+ Add]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Sunrise House                                    12/15 beds │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │
│  │ 101 │ │ 102 │ │ 103 │ │ 104 │ │ 105 │  ...              │
│  │ J.D │ │     │ │ B.W │ │ S.M │ │ --- │                   │
│  │ ●   │ │ ○   │ │ ●   │ │ ◐   │ │ ✕   │                   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                   │
│                                                              │
│  Legend: ● Occupied  ○ Available  ◐ Reserved  ✕ Maintenance │
│                                                              │
│  Recovery Ranch                                    8/10 beds │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │
│  │ A-1 │ │ A-2 │ │ A-3 │ │ B-1 │ │ B-2 │  ...              │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                   │
└──────────────────────────────────────────────────────────────┘
```

**Bed Card States:**
- Occupied: bg-success-50, border-success-200, initials + dot
- Available: bg-white, border-slate-200, dashed border
- Reserved: bg-warning-50, border-warning-200
- Maintenance: bg-slate-100, border-slate-300, striped pattern

### 5.3 Residents List

**Modern List View:**
```
┌──────────────────────────────────────────────────────────────────┐
│ Residents                                                        │
│ Manage all current and past residents                            │
│                                                                  │
│ 🔍 Search residents...              [Status ▾] [House ▾] [+ Add] │
├──────────────────────────────────────────────────────────────────┤
│ ┌────┬─────────────────────┬──────────┬──────────┬─────────────┐│
│ │    │ Resident            │ Status   │ House    │ Move-in     ││
│ ├────┼─────────────────────┼──────────┼──────────┼─────────────┤│
│ │ ○  │ 👤 John Doe         │ ● Active │ Sunrise  │ Jan 15, 2026││
│ │    │    john@email.com   │          │ Room 101 │             ││
│ ├────┼─────────────────────┼──────────┼──────────┼─────────────┤│
│ │ ○  │ 👤 Jane Smith       │ ● Active │ Ranch    │ Feb 01, 2026││
│ │    │    jane@email.com   │          │ Room A-2 │             ││
│ └────┴─────────────────────┴──────────┴──────────┴─────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

**Features:**
- Avatar/initials for each resident
- Inline email (subtle, slate-500)
- Status dot with label
- Click row to view detail
- Checkbox for bulk actions

### 5.4 Billing Overview

**Revenue Dashboard:**
```
┌────────────────────────────────────────────────────────────────┐
│ Billing Overview                                               │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │            Revenue Trend (Last 6 Months)               │   │
│  │   $50k ┤                                    ██         │   │
│  │   $40k ┤                         ██  ██  ██  ██        │   │
│  │   $30k ┤              ██  ██  ██                       │   │
│  │   $20k ┤   ██  ██  ██                                  │   │
│  │        └─────────────────────────────────────────────  │   │
│  │         Sep  Oct  Nov  Dec  Jan  Feb                   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │ Collected    │ │ Outstanding  │ │ Overdue      │          │
│  │ $38,420      │ │ $12,400      │ │ $4,200       │          │
│  │ ↑ 15%        │ │ 14 invoices  │ │ 5 invoices   │          │
│  └──────────────┘ └──────────────┘ └──────────────┘          │
│                                                                │
│  Aging Buckets                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Current    ████████████████████████████████  $8,200    │   │
│  │ 1-30 days  ██████████████████  $3,100                  │   │
│  │ 31-60 days ████████  $1,800                            │   │
│  │ 60+ days   ████  $1,300                                │   │
│  └────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## 6. Loading & Empty States

### Skeleton Loaders

```
┌──────────────────────────────────────┐
│  ████████████          ░░░░░░░░░░░░ │  ← Shimmer animation
│                                      │
│  ██████████████████████████         │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░        │
│  ████████████                        │
└──────────────────────────────────────┘
```

- Pulse animation: opacity 0.5 → 1.0 → 0.5
- Match exact layout of loaded content
- Light gray (slate-200) base color

### Empty States

```
┌──────────────────────────────────────┐
│                                      │
│           📭                         │
│                                      │
│     No invoices yet                  │
│                                      │
│  Create your first invoice to       │
│  start tracking payments.            │
│                                      │
│      [Create Invoice]                │
│                                      │
└──────────────────────────────────────┘
```

---

## 7. Animations & Transitions

### Timing Functions
```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);  /* Snappy exit */
--ease-in-out: cubic-bezier(0.45, 0, 0.55, 1);  /* Smooth */
```

### Duration Scale
```css
--duration-fast: 100ms;    /* Hover states */
--duration-normal: 150ms;  /* Button clicks, toggles */
--duration-slow: 200ms;    /* Sidebar collapse, modals */
--duration-slower: 300ms;  /* Page transitions */
```

### Key Animations

**Button Hover**: translateY(-1px), enhanced shadow
**Card Hover**: translateY(-2px), shadow-lg
**Sidebar Toggle**: width + opacity + transform
**Modal Entry**: fade + scale from 0.95
**Toast Entry**: slide from right + fade

---

## 8. Implementation Plan

### Phase 5B.1: Foundation (Day 1)
1. Update `globals.css` with new CSS variables
2. Create `design-tokens.ts` for TypeScript access
3. Update Tailwind config with custom colors/spacing
4. Create base component variants (Button, Card, Badge, Input)

### Phase 5B.2: Layout (Day 2)
1. Redesign sidebar component
2. Implement collapsible state with animations
3. Add command palette trigger (⌘K)
4. Update header with better breadcrumbs
5. Add global search styling

### Phase 5B.3: Components (Days 3-4)
1. StatCard with sparklines (using Recharts/lightweight lib)
2. DataTable with sticky headers, row actions
3. Badge/Status components
4. Form inputs with floating labels
5. Loading skeletons
6. Empty states

### Phase 5B.4: Pages (Days 5-6)
1. Dashboard redesign
2. Bed Grid visual overhaul
3. Residents list polish
4. Billing overview with charts
5. Apply patterns to remaining pages

### Phase 5B.5: Polish (Day 7)
1. Transitions and animations
2. Responsive adjustments
3. Accessibility audit (focus states, contrast)
4. Cross-browser testing

---

## 9. Technical Considerations

### Dependencies to Add
```json
{
  "recharts": "^2.12.0",     // Sparklines, charts
  "@radix-ui/react-*": "*",  // Accessible primitives (already likely have)
  "class-variance-authority": "^0.7.0",  // Component variants
  "clsx": "^2.1.0"           // Conditional classes (likely have)
}
```

### File Structure
```
src/
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   ├── skeleton.tsx
│   │   └── stat-card.tsx
│   └── layouts/
│       ├── crm-sidebar.tsx  (redesigned)
│       ├── crm-header.tsx   (enhanced)
│       └── crm-layout.tsx
├── lib/
│   ├── design-tokens.ts
│   └── utils.ts (cn helper)
└── styles/
    └── globals.css (tokens)
```

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Lighthouse Performance | > 90 |
| First Contentful Paint | < 1.5s |
| Cumulative Layout Shift | < 0.1 |
| Contrast Ratio | WCAG AA (4.5:1) |
| Visual Consistency | 100% token usage |
| User Feedback | "Clean", "Professional", "Modern" |

---

## References

- [Linear Design Trend](https://blog.logrocket.com/ux-design/linear-design/) - Core principles
- [Muzli Dashboard Inspiration](https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/) - Visual patterns
- [Sidebar Best Practices](https://uiuxdesigntrends.com/best-ux-practices-for-sidebar-menu-in-2025/) - Navigation patterns
- [Data Table UX](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables) - Table design
- [KPI Card Anatomy](https://nastengraph.substack.com/p/anatomy-of-the-kpi-card) - Stat card design
- [shadcn/ui Dashboard](https://ui.shadcn.com/examples/dashboard) - Component reference
- [SaaSFrame Examples](https://www.saasframe.io/categories/dashboard) - 163 SaaS dashboard examples
