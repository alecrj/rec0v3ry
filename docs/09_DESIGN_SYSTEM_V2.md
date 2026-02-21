# RecoveryOS Design System v2 — "Warm Mercury"

> Gusto's warmth + Mercury's data density. Professional enough to run a business, warm enough to feel like it's about people.

## Design Principles

1. **Content over chrome** — Remove unnecessary borders, cards, and decoration. Let the data breathe.
2. **Full words always** — Never truncate text. If it doesn't fit, redesign the layout, don't clip the words.
3. **Warm neutrals** — Replace cold blue-grays (slate) with warm grays. The operator sees this 8 hours a day.
4. **Color means something** — Only use color for status (green=good, amber=attention, red=urgent). Everything else is neutral.
5. **One click away** — Every screen should make the #1 action obvious. Big buttons, clear CTAs.
6. **People, not data** — Show resident names, not IDs. Show "3 residents need attention" not "3 pending items."

## Color Palette

### Warm Neutrals (replaces slate-*)
```css
--gray-50:  #FAFAF9;   /* page background */
--gray-100: #F5F5F4;   /* card hover, subtle bg */
--gray-200: #E7E5E4;   /* borders (use sparingly) */
--gray-300: #D6D3D1;   /* disabled states */
--gray-400: #A8A29E;   /* placeholder text */
--gray-500: #78716C;   /* secondary text */
--gray-600: #57534E;   /* body text */
--gray-700: #44403C;   /* strong text */
--gray-800: #292524;   /* headings */
--gray-900: #1C1917;   /* primary text, sidebar bg */
```

### Primary — Teal (warm, trustworthy, healthcare-adjacent)
```css
--primary-50:  #F0FDFA;
--primary-100: #CCFBF1;
--primary-200: #99F6E4;
--primary-300: #5EEAD4;
--primary-400: #2DD4BF;
--primary-500: #14B8A6;  /* main brand */
--primary-600: #0D9488;  /* buttons, links */
--primary-700: #0F766E;  /* button hover */
--primary-800: #115E59;
--primary-900: #134E4A;
```

### Status Colors (same across app)
```css
--success: #16A34A;     /* green — paid, active, verified, healthy */
--warning: #D97706;     /* amber — needs attention, pending, expiring */
--error:   #DC2626;     /* red — overdue, failed, critical, urgent */
--info:    #0EA5E9;     /* sky blue — informational, neutral status */
```

### Sidebar
```css
--sidebar-bg:    #1C1917;  /* warm black, not cold navy */
--sidebar-text:  #A8A29E;  /* gray-400 */
--sidebar-active: #14B8A6; /* primary-500 */
--sidebar-hover: #292524;  /* gray-800 */
```

## Typography

- **Font**: Inter (already loaded) — clean, readable, modern
- **Headings**: font-semibold (not bold), gray-900, tracking-tight
- **Body**: font-normal, gray-600
- **Small/labels**: font-medium, gray-500, text-xs uppercase tracking-wide
- **Numbers/stats**: font-bold, gray-900, tabular-nums for alignment

### Scale
```
Page title:    text-xl  font-semibold  gray-900
Section title: text-base font-semibold gray-900
Card title:    text-sm  font-semibold  gray-800
Body:          text-sm  font-normal    gray-600
Label:         text-xs  font-medium    gray-500 uppercase tracking-wider
Stat value:    text-2xl font-bold      gray-900
Stat label:    text-xs  font-medium    gray-500
```

## Component Redesign Spec

### PageContainer
- Background: `gray-50` (warm off-white)
- Padding: `px-8 py-6`
- Max width: `1400px` centered
- No change to spacing between sections

### PageHeader
- Title: `text-xl font-semibold` (smaller than current `text-2xl font-bold`)
- Description: remove or make very subtle (`text-sm text-gray-400`)
- Actions: right-aligned, `flex-wrap` enabled
- **No card wrapper** — just content on the page background

### StatCard → StatRow (rethink)
- **Remove individual card borders entirely**
- Stats display as a single row of numbers on a clean white surface
- Each stat: big number + label below, no icon boxes
- Optional: thin left border with status color for emphasis
- Layout: `grid-cols-4` with dividers (thin `border-r gray-200`) between stats, NOT separate cards

### Card
- **Default: no border, subtle shadow** (`shadow-sm` only, no `border`)
- Hover: `shadow-md` (for clickable cards)
- Background: white
- Border-radius: `rounded-lg` (not `rounded-xl` — less bubbly)
- Padding: content-appropriate, not one-size-fits-all
- **Remove `variant` prop complexity** — one card style, clean

### Badge
- Keep current approach but soften colors
- Use pills: `rounded-full px-2.5 py-0.5`
- Muted backgrounds: `bg-success-50 text-success-700` (not saturated)
- Dot indicator stays (good pattern)

### Button
- Primary: `bg-primary-600 text-white hover:bg-primary-700`
- Secondary: `bg-white border border-gray-200 text-gray-700 hover:bg-gray-50`
- Ghost: `text-gray-600 hover:bg-gray-100`
- Border-radius: `rounded-lg`
- All buttons: `font-medium text-sm`

### DataTable
- **No outer card border** — table sits directly on the page
- Header row: `bg-gray-50 text-xs font-medium text-gray-500 uppercase`
- Rows: `hover:bg-gray-50` transition
- Row dividers: `border-b border-gray-100` (very subtle)
- Remove zebra striping

### EmptyState
- Warmer, more human messaging
- Show the action the user should take, not just "nothing here"
- Subtle illustration or icon (not a giant green checkmark)
- Example: "No residents yet. Add your first resident to start managing your house." with a clear CTA button

### Modal/Dialog
- Backdrop: `bg-black/40 backdrop-blur-sm`
- Modal: `rounded-xl shadow-2xl border-0` (no border, shadow does the work)
- Header: simple title, close button
- Consistent padding throughout

### Sidebar
- Background: warm dark (`gray-900: #1C1917`)
- Active item: teal left border + teal text (not full background highlight)
- Section labels: `text-[10px] font-semibold uppercase tracking-widest text-gray-500`
- Icons: `18px`, `text-gray-400`, active = `text-primary-400`
- Collapse behavior: unchanged

### Toast
- Clean white with left color bar (no full-color background)
- `shadow-lg` + `rounded-lg`
- Auto-dismiss 4s (unchanged)

## Dashboard Redesign (Proof of Concept Page)

### Layout
```
[PageHeader: "Dashboard" — no description, just title + greeting]

[Stats Row — single white card, 4 stats separated by thin dividers]
  Occupancy Rate    Revenue MTD    Outstanding    Expiring Consents
  87%               $12,400        $3,200         2
  14 of 16 beds     month to date  5 invoices     within 30 days

[Two columns]
  [Left: "Needs Attention" — action items, not a card titled "Action Items"]
    - 2 incidents need review → link
    - 3 invoices overdue ($1,200) → link
    - 1 consent expiring in 5 days → link
    OR
    "All clear for today." (no giant icon, just text)

  [Right: "Recent Activity" — clean timeline]
    John M. checked in at 9:30 PM · 2h ago
    Sarah K. payment of $450 received · 5h ago
    New resident David R. admitted · yesterday

[Consents table — only if there are expiring ones, otherwise don't show]

[Quick links — REMOVED. Navigation lives in sidebar.]
```

### What Gets Removed from Dashboard
- Quick Access cards (redundant with sidebar)
- Giant green checkmark empty states
- "Generate Report" button (that goes in Reports)
- Stat card icon boxes (unnecessary visual noise)

## File Changes Required

### Design Tokens (1 file)
- `src/app/globals.css` — Replace slate-* with warm gray palette, update primary from blue to teal

### Component Library (10 files)
All in `src/components/ui/`:
1. `stat-card.tsx` — Redesign as stat row, remove card borders
2. `card.tsx` — Remove default border, shadow-only, `rounded-lg`
3. `badge.tsx` — Soften colors, keep pills
4. `button.tsx` — Update to teal primary, rounded-lg
5. `page-header.tsx` — Simpler, smaller title
6. `empty-state.tsx` — Warmer messaging, better layout
7. `data-table.tsx` — Remove card wrapper, cleaner headers
8. `skeleton.tsx` — Match new styles
9. `toast.tsx` — White with color bar
10. `input.tsx` — Match warm gray palette

### Layout Files (2 files)
- `src/components/layouts/crm-sidebar.tsx` — Warm dark, teal accents
- `src/components/layouts/crm-header.tsx` — Minimal, warm

### Dashboard (1 file, proof of concept)
- `src/app/(crm)/dashboard/page.tsx` — Full redesign as described above

### Other Pages (0 files initially)
Because all pages import from `@/components/ui`, updating the component library automatically updates every page. The dashboard gets a custom layout redesign, but all other pages just pick up the new component styles.

**Total: 14 files to touch.** That's it.

## Execution Order (One Session)

1. `globals.css` — Swap color tokens (5 min)
2. `card.tsx` — Shadow-only, no border (5 min)
3. `stat-card.tsx` — Stat row redesign (15 min)
4. `page-header.tsx` — Simpler (5 min)
5. `badge.tsx` — Soften (5 min)
6. `button.tsx` — Teal primary (5 min)
7. `empty-state.tsx` — Warmer (10 min)
8. `data-table.tsx` — Cleaner (10 min)
9. `input.tsx` + `toast.tsx` + `skeleton.tsx` — Quick palette updates (10 min)
10. `crm-sidebar.tsx` — Warm dark + teal (10 min)
11. `crm-header.tsx` — Match (5 min)
12. `dashboard/page.tsx` — Full redesign (20 min)
13. `tsc --noEmit` + visual check
14. Screenshot comparison

## How This Gets Us to Launch

The component library is the foundation. Every one of the 40+ pages imports from `@/components/ui`. By redesigning 10 component files + 2 layout files + 1 page, we transform the entire app's appearance in one session.

After this design pass:
- All pages automatically look modern (new card/badge/button/table styles)
- Dashboard is the showcase page for the operator
- The app feels warm and professional, not cold and generic
- No text truncation anywhere — layouts accommodate full words
- Ready for the client demo
