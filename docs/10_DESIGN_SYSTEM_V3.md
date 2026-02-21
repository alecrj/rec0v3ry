# RecoveryOS Design System v3 — "Dark Mode"

> Zinc dark + indigo accent. Flat sidebar. No boxes. Monospace numbers.

## Current State (COMPLETE)

All files converted to dark zinc+indigo palette. Zero light-theme colors remain (`bg-white`, `bg-*-50`, `bg-*-100`, `text-*-700`, `text-*-900`, `text-blue-*`, `text-slate-*`, `text-stone-*`, `bg-emerald-*`). Build passes clean.

**Palette**: Pure zinc darks (not green-tinted). Indigo accent (not emerald).
**Sidebar**: Flat navigation (no nested accordions), Cmd+K search, UserButton in footer.
**Numbers**: `font-mono` on all numeric values (amounts, dates, ages, counts).

## Color Palette — Zinc + Indigo

```css
/* Backgrounds */
--bg-app:       #09090B;   /* zinc-950, sidebar + app bg */
--bg-surface:   zinc-900;  /* inputs, modals, elevated surfaces */
--bg-hover:     zinc-800/40-60;  /* row hover, interactive states */

/* Borders */
--border:       zinc-800;       /* primary borders */
--border-faint: zinc-800/50;    /* row dividers, subtle borders */
--border-focus: zinc-600;       /* focused input borders */

/* Text */
--text-primary:   zinc-100;  /* headings, strong text */
--text-secondary: zinc-300;  /* labels, body text */
--text-muted:     zinc-400;  /* secondary info */
--text-faint:     zinc-500;  /* placeholders, section labels */
--text-disabled:  zinc-600;  /* disabled, timestamps, separators */

/* Accent — Indigo */
--accent:       indigo-500;       /* buttons, logo, active indicators, selected states */
--accent-light: indigo-400;       /* active nav text, links */
--accent-bg:    indigo-500/10;    /* active nav bg, selection bg */
--accent-ring:  indigo-500/30;    /* focus rings */
--accent-border: indigo-500/20;   /* selection borders */

/* Status */
--success: green-400/green-500;
--warning: yellow-400/yellow-500;
--error:   red-400/red-500;
```

## Files Already Restyled (by user)

These files have been manually updated to the dark zinc+indigo palette:

| File | Key Changes |
|------|-------------|
| `crm-sidebar.tsx` | Flat nav (no accordions), `bg-[#09090B]`, indigo active, Cmd+K search, UserButton in footer, `w-[240px]` |
| `crm-header.tsx` | `bg-zinc-900 border-zinc-800`, zinc text colors |
| `dashboard/page.tsx` | Dark zinc palette, `divide-x divide-zinc-800` stat dividers, indigo progress/links |
| `residents/page.tsx` | Dark zinc palette, `font-mono` numbers, indigo selection, `bg-zinc-800` avatars |
| `billing/page.tsx` | Dark zinc palette, indigo chart bars, `font-mono` amounts, removed unused imports |
| `input.tsx` | `bg-zinc-900 border-zinc-800`, above-input labels (not floating), `indigo-500/30` focus ring |
| `toast.tsx` | `bg-zinc-900 border-zinc-800`, green/red/yellow/indigo status colors |
| `skeleton.tsx` | `bg-zinc-800`, `border-zinc-800` dividers |

## All Files Restyled (COMPLETE)

Every file in the codebase has been converted. Zero instances of:
- `bg-white`, `bg-slate-*`, `bg-stone-*`, `bg-gray-*`
- `text-slate-*`, `text-stone-*`, `text-gray-*`
- `bg-blue-*`, `text-blue-*`, `bg-emerald-*`, `text-emerald-*`, `bg-teal-*`
- Light-on-white patterns like `bg-*-50`, `bg-*-100`, `text-*-700`, `text-*-900`

### Additional files converted in sweep:
- `consent-status-badge.tsx` — dark status badges
- `consent-wizard.tsx` — indigo steps, dark inputs, dark info boxes
- `patient-notice.tsx` — indigo buttons/icons, dark notice boxes
- `redisclosure-banner.tsx` — dark amber warning banner
- `resident-nav.tsx` — indigo active state
- `reports/compliance/page.tsx` — dark status cards, indigo links/badges
- `reports/operations/page.tsx` — dark status rows, dark severity cards
- `reports/occupancy/page.tsx` — indigo occupied bar, dark occupancy badges
- `reports/financial/page.tsx` — dark aging buckets, indigo revenue bars, dark badges
- `drug-tests/scheduling/page.tsx` — dark schedule/test type badges
- `admissions/page.tsx` — indigo contacted stage
- `billing/page.tsx` — green-500 current bar (was emerald-500)

## Design Patterns Established

### Sidebar (DONE)
- Flat navigation — all items visible, no accordions/chevrons
- Sections separated by `text-[10px] uppercase tracking-widest text-zinc-600` labels
- Active: `text-indigo-400 bg-indigo-500/10` with `2px left border indigo-400`
- Hover: `text-zinc-200 bg-zinc-800/60`
- Search: inline `Cmd+K` searchable input that filters nav items
- Footer: Notifications button + UserButton + HIPAA badge

### Stats (DONE on dashboard + billing)
- Separated by `divide-x divide-zinc-800` vertical dividers
- No card wrappers, no grid — flex row with dividers
- Values: large, `font-mono` on numbers
- Labels: `text-zinc-500` small text

### Tables (DONE on residents + billing)
- No outer wrapper
- Header: `text-xs uppercase tracking-wider text-zinc-500`, `border-b border-zinc-800`
- Rows: `border-b border-zinc-800/50`, `hover:bg-zinc-800/40`
- Key column (name): `font-medium text-zinc-100`
- Data columns: `text-zinc-400`, numbers in `font-mono`
- Actions: `text-zinc-600 hover:text-zinc-300`

### Inputs (DONE)
- `bg-zinc-900 border-zinc-800 rounded-md`
- Focus: `border-zinc-600 ring-1 ring-indigo-500/30`
- Labels ABOVE input (not floating), `text-zinc-300`
- Placeholder: `text-zinc-600`

### Modals (DONE on residents)
- `bg-zinc-900 border-zinc-800 rounded-lg shadow-2xl`
- Backdrop: `bg-black/60 backdrop-blur-sm`
- Header border: `border-zinc-800`
- `animate-slide-in-up` entrance

### Numbers
- All monetary values, dates, ages, counts use `font-mono`
- Creates a data-dense, terminal-like feel

## Status: COMPLETE

All priorities executed and verified:
- Foundation: globals.css + layout.tsx — DONE
- Components: all 10 UI components — DONE
- Page sweep: all CRM pages, compliance components, report pages — DONE
- Verification: `tsc --noEmit` + `next build` — BOTH PASS CLEAN

## Key Decisions
- **No green-tinted grays** — pure zinc. Cleaner, more neutral.
- **Indigo accent** — distinctive, not confused with success green.
- **Flat sidebar** — no nested navigation. All items visible at once. Faster to scan.
- **font-mono on numbers** — data-dense feel, like a financial terminal.
- **CrmHeader kept** — breadcrumbs useful for navigation context (user kept it).
- **Sidebar has UserButton** — moved from header to sidebar footer.
