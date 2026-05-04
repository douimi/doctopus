# Phase A — UI Foundation Design Spec

> **Part of**: a 3-plan UI/UX rework. Phase A (this spec) ships the design system, shells, and primitives. Phase B redesigns the doctor-app pages. Phase C redesigns the admin-app pages. Each phase gets its own spec + plan + implementation cycle.

**Goal**: Replace the project's generic shadcn-default look with a deliberate clinical-trad design system (sky-blue doctor / orange admin, persistent left sidebar, soft chrome + flat data surfaces) that subsequent phases can build on.

**Architecture**: New design tokens in `app/globals.css` extend the existing CSS-var pattern. New `Sidebar`/`PageHeader`/`PageBreadcrumb` primitives compose into `DoctorShell` and `AdminShell` (both replacing the current top-nav shells). New clinical primitives (`Table`, `StatusBadge`, `EmptyState`, `Skeleton`, `Alert`, `FormField`) sit alongside the re-themed existing shadcn primitives. A token-only migration sweep updates every existing page so it renders correctly inside the new shell without touching layouts. Public pages (`/sign-in`, `/invite/[token]`) get full reskins as the first end-user surfaces of the new system. A hidden admin-gated `/_design` showcase route serves as the living style guide.

**Tech stack**: New deps: `lucide-react` (icons), `next/font/google` Inter loader. Reuses Tailwind v4 / shadcn primitives / Recharts already in the project.

**Prerequisites**: `plan-2b-admin-ui` tag.

---

## What Phase A does NOT do

- Layout changes to any existing page (today, patients list/detail, consultation, settings, admin dashboard, tenants list/detail, invites). Their information architecture is preserved; only color/border/typography classes change. Layout reworks are Phase B and C.
- Dark mode (the existing `.dark` palette in `globals.css` is preserved but no toggle is added).
- Mobile-first responsive overhaul. Phase A keeps existing responsive behavior; the new sidebar collapses to an overlay drawer on mobile but isn't tuned for narrow widths.
- Storybook / visual-regression infrastructure. The `/_design` showcase route is the only visual QA surface.
- New illustrations, custom iconography. Icons come from `lucide-react`.
- Toast / global notification system. Form feedback stays inline (existing pattern is correct).
- Modal / Dialog primitive. Defer until a Phase B/C page actually needs one.

---

## File structure

**New files**

```
app/
  fonts.ts                                       # next/font/google Inter loader
  layout.tsx                                     # apply Inter className on <html>
  (admin)/_design/
    page.tsx                                     # hidden showcase route (admin-gated)

components/
  ui/
    table.tsx                                    # Table + sub-components + TableEmpty
    status-badge.tsx                             # variant: success / warning / danger / info / neutral
    empty-state.tsx                              # icon, title, description, action
    skeleton.tsx                                 # base + TableSkeleton helper
    alert.tsx                                    # variant: info / success / warning / danger
    form-field.tsx                               # label + description + error wrapper
  shell/
    sidebar.tsx                                  # shared primitive (theme variant prop)
    sidebar-nav.tsx                              # nav group + item
    sidebar-user.tsx                             # bottom user block + sign-out form
    page-breadcrumb.tsx                          # breadcrumb bar
    page-header.tsx                              # title + subtitle + actions slot
    doctor-shell.tsx                             # composes Sidebar(theme=sky)
    admin-shell.tsx                              # composes Sidebar(theme=orange)
  auth/
    auth-card.tsx                                # centered card composition for /sign-in + /invite

tests/
  unit/components/                               # primitive render tests
    status-badge.test.tsx
    empty-state.test.tsx
    alert.test.tsx
    form-field.test.tsx
    table.test.tsx
  e2e/design-foundation.spec.ts                  # Playwright smoke test
```

**Modified files**

- `app/globals.css` — add Phase A tokens (status palette, admin tokens, shadow scale, motion scale, type scale, radius variants).
- `app/(authenticated)/layout.tsx` — apply `DoctorShell` (delete the per-page `<AppShell>` wrappers in pages below it).
- `app/(admin)/admin/layout.tsx` — apply `AdminShell`.
- `components/ui/button.tsx` — add `loading` prop + spinner; retheme.
- `components/ui/card.tsx` — add `CardHeader` / `CardBody` / `CardFooter` slots; retheme.
- `components/ui/input.tsx`, `label.tsx`, `textarea.tsx`, `select.tsx` — retheme only.
- `components/app-shell.tsx` — DELETE (replaced by `components/shell/doctor-shell.tsx`).
- `components/admin/admin-shell.tsx` — DELETE (replaced by `components/shell/admin-shell.tsx`).
- `app/(public)/sign-in/page.tsx` — full reskin using `AuthCard` + `FormField` + `Alert`.
- `app/(public)/invite/[token]/page.tsx` — full reskin (both owner + assistant variants).
- `package.json` — add `lucide-react`.
- `README.md` — append Phase A roadmap entry.
- All existing pages under `app/(authenticated)/**` and `app/(admin)/**` — token-sweep find/replace (no layout changes).

---

## Section 1 — Scope & non-goals

(See top of doc; codified in plan tasks.)

---

## Section 2 — Design tokens

All tokens live in `app/globals.css`. Tailwind v4's `@theme inline` block bridges them so components write `bg-primary`, `text-success`, etc.

### Color

**Neutrals (chrome + text)** — preserved as-is from the existing `globals.css` oklch greyscale.

**Primary (doctor + global)** — sky-blue family.

```css
:root {
  --primary:           oklch(0.588 0.158 241.966); /* sky-600 */
  --primary-foreground: oklch(0.985 0 0);          /* near-white */
  --primary-hover:     oklch(0.500 0.134 242.749); /* sky-700 */
  --primary-tint:      oklch(0.951 0.026 236.824); /* sky-50 */
  --primary-tint-strong: oklch(0.901 0.058 230.902); /* sky-100 */
}
```

**Admin accent** — used only by `AdminShell` and admin-mode visuals.

```css
:root {
  --admin:             oklch(0.646 0.222 41.116);  /* orange-600 */
  --admin-foreground:  oklch(0.985 0 0);
  --admin-hover:       oklch(0.553 0.195 38.402);  /* orange-700 */
  --admin-tint:        oklch(0.954 0.038 75.164);  /* orange-50 */
  --admin-tint-strong: oklch(0.901 0.076 70.697);  /* orange-100 */
}
```

**Status palette** — replaces the existing `--destructive` and is used for clinical data + system feedback.

```css
:root {
  --success:             oklch(0.626 0.194 149.214); /* green-600 */
  --success-foreground:  oklch(0.985 0 0);
  --success-tint:        oklch(0.962 0.045 156.743); /* green-50 */

  --warning:             oklch(0.769 0.188 70.080);  /* amber-500 */
  --warning-foreground:  oklch(0.205 0 0);           /* near-black */
  --warning-tint:        oklch(0.987 0.022 95.277);  /* amber-50 */

  --danger:              oklch(0.577 0.245 27.325);  /* red-600 */
  --danger-foreground:   oklch(0.985 0 0);
  --danger-tint:         oklch(0.971 0.013 17.380);  /* red-50 */

  --info:                var(--primary);             /* sky-600, alias */
  --info-foreground:     var(--primary-foreground);
  --info-tint:           var(--primary-tint);
}
```

`--destructive` is kept as an alias for `--danger` to preserve existing shadcn Button `variant="destructive"`.

Charts retain their existing `--chart-1..5` slots.

### Typography (Inter)

Loaded via `next/font/google` in `app/fonts.ts`:

```ts
import { Inter } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});
```

Applied on `<html className={inter.variable}>` in `app/layout.tsx`. The existing `--font-sans` CSS var is repointed to Inter.

Semantic type scale (`@theme` extension):

```css
@theme inline {
  --text-display:  1.875rem;  /* 30px */
  --text-display--line-height: 2.25rem;  /* 36px */
  --text-title:    1.25rem;   /* 20px */
  --text-title--line-height: 1.75rem;    /* 28px */
  --text-heading:  1rem;      /* 16px */
  --text-heading--line-height: 1.5rem;   /* 24px */
  --text-body:     0.875rem;  /* 14px */
  --text-body--line-height: 1.25rem;     /* 20px */
  --text-small:    0.75rem;   /* 12px */
  --text-small--line-height: 1rem;       /* 16px */
}
```

Mapped to Tailwind utilities `text-display`, `text-title`, `text-heading`, `text-body`, `text-small`. Tables and ledgers use `tabular-nums` for column alignment. Mono (`Geist Mono`) is preserved for IDs / tokens.

### Spacing & radius

Spacing — Tailwind defaults (4px base). "Comfortable" canonical paddings:
- Card: `p-4` (16px)
- Card with header/footer: `p-0` on Card, `px-4 py-3` on header/footer, `p-4` on body
- Table cell: `px-3 py-2.5`
- Form gap: `space-y-4`
- Sidebar nav item: `px-3 py-2`
- Page header: `px-6 pt-6 pb-4`
- Page content: `px-6 py-6`

Radius:
```css
:root {
  --radius:        0.625rem;  /* 10px — preserved, default */
  --radius-tight:  0.25rem;   /* 4px  — table cells, inline tags */
  --radius-pill:   9999px;    /* status badges */
}
```

### Shadow (Hybrid rule — soft on chrome, flat on data)

```css
:root {
  --shadow-card:    0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06);
  --shadow-popover: 0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.08);
}
```

Applied to: `Card` (card), `Sidebar` (card), `Popover` (popover), `Modal` if introduced (popover). NOT applied to: `Table`, `TableRow`, `StatusBadge`, `Alert`. Those use 1px borders only (`border border-border`).

### Motion

```css
:root {
  --ease-out:      cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 120ms;
  --duration-base: 200ms;
}
```

Applied via Tailwind utilities `transition-{property}` + `duration-fast` (`var(--duration-fast)`) + `ease-out`. Honors `prefers-reduced-motion: reduce` — disables `transform` / `translate` transitions, keeps opacity fades.

---

## Section 3 — Sidebar shells

Both shells share a `<Sidebar>` primitive that takes a `theme: 'sky' | 'orange'` prop. The prop drives a CSS custom property on the wrapper (`--sidebar-accent`) which the active-state styling reads. No conditional class logic deeper than the wrapper.

### Sidebar anatomy (~220px wide, fixed-left, `min-h-screen`, `bg-card`, `shadow-card`, `border-r border-border`)

```
┌──────────────────────────┐
│  [Logo] Doctopus         │  Brand row — px-4 py-4 border-b border-border
│  Cabinet El Idrissi      │  (doctor) tenant name in text-small text-muted-foreground
│  ┌─ ADMIN ─┐             │  (admin) orange-tinted pill, text-small font-bold
├──────────────────────────┤
│                          │
│  CABINET                 │  Group label — text-small uppercase tracking-wide
│                          │     text-muted-foreground px-3 mt-4 mb-1
│  📅 Aujourd'hui          │  Nav item — px-3 py-2, hover:bg-muted, rounded-md
│  👥 Patients             │     active: bg-[--sidebar-accent-tint]
│                          │             border-l-2 border-[--sidebar-accent]
│  COMPTE                  │             text-foreground font-medium
│  👤 Équipe               │  (doctor only — assistant role hides Compte group)
│  ⚙️  Cabinet             │
│  📜 Journal              │
│                          │
├──────────────────────────┤   (separator only present in admin)
│  📊 Tableau de bord      │   admin variant: 3 nav items, no group labels
│  🏥 Cabinets             │
│  ✉️  Invitations         │
├──────────────────────────┤
│   (flex-1 spacer)        │
│                          │
│  Dr. Karim El Idrissi    │  User block — sticky bottom, border-t,
│  Médecin                 │     px-4 py-3, name body, role text-small muted
│  [Déconnexion ↗]         │     sign-out is a form-action POST to /sign-out,
└──────────────────────────┘     rendered as a ghost-style button
```

### Theme variant

```ts
// components/shell/sidebar.tsx (excerpt)
const themeStyles = {
  sky:    { '--sidebar-accent': 'var(--primary)', '--sidebar-accent-tint': 'var(--primary-tint)' },
  orange: { '--sidebar-accent': 'var(--admin)',   '--sidebar-accent-tint': 'var(--admin-tint)' },
} as const;
```

The active state uses `bg-[--sidebar-accent-tint]` and `border-l-[--sidebar-accent]` so the sidebar itself doesn't know about color names.

### Page header pattern (rendered inside main, after the breadcrumb bar)

```
<PageHeader
  title="Karim Bennani"            // text-display font-semibold
  description="42 ans · Né le ..." // text-body text-muted-foreground
  actions={<Button>Nouvelle consultation</Button>}
/>
```

Renders as a flex row, title+description on the left, actions on the right. Padding: `px-6 pt-6 pb-4`. Divider via `border-b border-border`.

### Breadcrumb pattern

```
<PageBreadcrumb items={[
  { href: '/patients', label: 'Patients' },
  { label: 'Karim Bennani' }, // current page, no href
]} />
```

Renders as a single row above the page header with `›` separators, `text-small text-muted-foreground`. Padding: `px-6 py-3`. Divider via `border-b border-border`.

### Mobile (<768px)

The sidebar is hidden (`md:flex hidden`); a slim top bar appears with a hamburger button that toggles a `<details>`-driven side panel showing the same nav items. No animated drawer, no overlay, no body-scroll lock. This is intentionally minimal — Phase A is not aiming for mobile polish. Phase B will revisit mobile UX as part of doctor-flow redesign and may introduce a proper `Sheet` primitive then. The acceptance bar for Phase A is "shell does not break at 375px width".

### File deletions

- `components/app-shell.tsx` → DELETE (replaced).
- `components/admin/admin-shell.tsx` → DELETE (replaced by `components/shell/admin-shell.tsx`).

---

## Section 4 — Primitives + cross-cutting patterns

### Existing primitives — re-themed against new tokens, no API changes

**`Button`** (`components/ui/button.tsx`)
- Variants: `default` (sky-600 fill), `destructive` (red-600 fill), `secondary` (gray-100 fill), `outline` (border + transparent), `ghost` (no border, hover bg-muted), `link`.
- Sizes: `default`, `sm`, `lg`, `icon`.
- **NEW**: `loading?: boolean` prop — when true: disabled + shows a 12px spinner before children. Replaces the dozen places where forms manually render `{pending ? '…' : 'Submit'}`.

**`Card`** (`components/ui/card.tsx`)
- Retheme: `bg-card`, `shadow-card`, `border border-border`, `rounded-md`.
- **NEW**: `<CardHeader>`, `<CardBody>`, `<CardFooter>` slots so admin action cards (`grant-credits-card.tsx`, `set-model-card.tsx`, etc.) share structure.

**`Input`, `Label`, `Textarea`, `Select`** — retheme only. Focus ring uses `--ring` → primary.

### New primitives

**`Table`** (`components/ui/table.tsx`)

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Cabinet</TableHead>
      <TableHead>Statut</TableHead>
      <TableHead className="text-right">Crédits</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {rows.length === 0 ? (
      <TableEmpty colSpan={3}>
        <EmptyState icon={Building2} title="Aucun cabinet" />
      </TableEmpty>
    ) : (
      rows.map((r) => (
        <TableRow key={r.id}>
          <TableCell className="font-medium">{r.name}</TableCell>
          <TableCell><StatusBadge variant="success">actif</StatusBadge></TableCell>
          <TableCell className="text-right tabular-nums">{r.credits}</TableCell>
        </TableRow>
      ))
    )}
  </TableBody>
</Table>
```

Styles: header row `bg-muted text-small uppercase tracking-wide font-medium`. Body rows `border-b border-border`, `hover:bg-muted/50` transition (`duration-fast`). Cells `px-3 py-2.5`. No box-shadow on the table itself; lives inside a `<Card>` which provides the chrome shadow.

**`StatusBadge`** (`components/ui/status-badge.tsx`)

```tsx
<StatusBadge variant="success">actif</StatusBadge>
<StatusBadge variant="warning">en attente</StatusBadge>
<StatusBadge variant="danger">suspendu</StatusBadge>
<StatusBadge variant="info">N/A</StatusBadge>
<StatusBadge variant="neutral">expirée</StatusBadge>
```

Renders: `inline-flex items-center text-small font-medium px-2 py-0.5 rounded-pill`. Variant maps to `bg-{variant}-tint text-{variant}` (filled, slight rounding). No icon by default; optional `icon` prop accepts a 12px lucide icon.

**`EmptyState`** (`components/ui/empty-state.tsx`)

```tsx
<EmptyState
  icon={Users}
  title="Aucun patient"
  description="Ajoutez votre premier patient pour commencer."
  action={<Button>Nouveau patient</Button>}
/>
```

Renders centered: 32px outline icon (muted), `text-title font-semibold` title, `text-body text-muted-foreground` description, optional CTA. Padding: `py-10 px-6`. Used outside tables (when a list is fully empty) — the table version (`<TableEmpty>`) wraps it.

**`Skeleton`** (`components/ui/skeleton.tsx`)

```tsx
<Skeleton className="h-4 w-32" />          // base
<TableSkeleton rows={5} columns={6} />     // helper for table loading
```

Animated pulse via `animate-pulse` (Tailwind built-in). `bg-muted rounded-tight`.

**`Alert`** (`components/ui/alert.tsx`)

```tsx
<Alert variant="info" title="Cabinet activé">
  L&apos;assistant IA est maintenant accessible aux médecins.
</Alert>

<Alert variant="danger">{state.error}</Alert>
```

Variants `info | success | warning | danger`. Renders: `bg-{variant}-tint border border-{variant}/20 text-foreground rounded-md p-3`. Variant icon (lucide) on the left (16px), title `text-body font-medium`, description `text-small text-muted-foreground` slot for children.

**`FormField`** (`components/ui/form-field.tsx`)

```tsx
<FormField
  label="Nombre de consultations"
  description="Entre 1 et 10000"
  error={state.error}
>
  <Input name="consultations" type="number" min="1" max="10000" required />
</FormField>
```

Renders: stacked `space-y-1`. `<Label>` (text-small font-medium), description (text-small text-muted-foreground, before children), children, error (text-small text-danger, after children) when present. `htmlFor` is auto-generated and forwarded to the child input via `cloneElement`.

### Cross-cutting patterns (codified, enforced by primitives)

**Form pattern**:
1. `<form action={action}>` (server action).
2. Each field wrapped in `<FormField label description error>`.
3. Action-level errors at top via `<Alert variant="danger">`.
4. Submit `<Button type="submit" loading={pending}>` at bottom-right of card or full-width on auth pages. `pending` from `useFormStatus()` (split into a child component when needed).
5. Cards house multi-field forms (`<Card><CardHeader>title</CardHeader><CardBody><form>...</form></CardBody></Card>`). Single-field inline forms (e.g., revoke invite) use no card.

**Table pattern**:
1. `<Card>` wraps `<Table>`. Card has no padding (`p-0`); table fills it.
2. Numeric columns `text-right tabular-nums`.
3. Status columns use `<StatusBadge>`.
4. Per-row actions live in the last column, right-aligned, as `<Button variant="ghost" size="sm">` or inline `<Link>`.
5. Empty rows render `<TableEmpty colSpan={N}><EmptyState /></TableEmpty>`.

**Empty state pattern**: When a top-level list is empty, render `<EmptyState>` directly on the page (not inside a card or table). Includes a CTA when actionable.

**Loading pattern**: Server components do their async work inside `<Suspense>` boundaries. Fallback is a `<Skeleton>` mirroring the final layout (e.g., `<TableSkeleton rows={5} columns={6}>`). `loading.tsx` files use these.

**Error pattern**: Page-level errors caught by `error.tsx` boundaries rendering `<Alert variant="danger">` + retry `<Button>`. Form errors stay inline (FormField + top-of-form Alert). 404s use `not-found.tsx` with `<EmptyState>`.

### Icons

`lucide-react` provides every icon. Default size: 16px. Imported per-component to keep tree-shaking clean. Typical icons used in Phase A:
- Sidebar: `LayoutGrid` (Aujourd'hui), `Users` (Patients), `Users2` (Équipe), `Building2` (Cabinet / Cabinets), `History` (Journal), `BarChart3` (Tableau de bord), `Mail` (Invitations).
- Status: `CheckCircle2`, `AlertTriangle`, `XCircle`, `Info`, `Clock`.
- Actions: `Plus`, `Pencil`, `Trash2`, `LogOut`, `ChevronRight`, `Loader2` (spinner).

---

## Section 5 — Public pages, migration sweep, verification

### Public page reskins

**`AuthCard`** (`components/auth/auth-card.tsx`) — Shared composition for `/sign-in` and `/invite/[token]`. Centered `<Card>` (max-width: 28rem, mx-auto, mt-16 on desktop / mt-8 on mobile) on a `bg-muted` page. Inside: brand logo + heading slot + body slot. No external chrome (no sidebar — these are pre-auth).

**`/sign-in` reskin**:
- Page bg `bg-muted`.
- `<AuthCard>` with heading "Connexion".
- `<form action={signInAction}>` containing two `<FormField>` blocks (Email + Mot de passe), action-level `<Alert variant="danger">` for errors, full-width submit `<Button loading>`.
- No sign-up link (invite-only).

**`/invite/[token]` reskin**:
- Same `<AuthCard>`.
- Header inside the card: invite-kind badge (`<StatusBadge variant="info">Invitation médecin</StatusBadge>` for owner, neutral variant for assistant) + email hint underneath.
- Owner variant: 3 `<FormField>` blocks (cabinet name, your full name, password).
- Assistant variant: 2 `<FormField>` blocks (your full name, password).
- Invalid / expired / consumed token states render `<Alert variant="warning">` with the corresponding French message instead of the form, plus a back-link to `/sign-in` styled as `<Button variant="link">`.

### Migration sweep — token-only find/replace across all existing pages

Layouts unchanged. Only color/border/typography classes change so existing pages render correctly inside the new shell.

| Old class | New class |
|---|---|
| `bg-white` (chrome contexts) | `bg-card` |
| `text-gray-500` / `text-gray-600` / `text-gray-700` | `text-muted-foreground` |
| `border-gray-200` / `border-gray-300` | `border-border` |
| `text-green-600` / `text-green-700` / `text-green-800` | `text-success` |
| `bg-green-50` / `bg-green-100` | `bg-success-tint` |
| `text-red-600` / `text-red-700` / `text-red-800` | `text-danger` |
| `bg-red-50` / `bg-red-100` | `bg-danger-tint` |
| `text-orange-700` (admin contexts) | `text-admin` |
| `bg-orange-50` / `bg-orange-100` (admin) | `bg-admin-tint` |
| Inline `<table className="w-full text-sm">…</table>` | `<Table>` + sub-components |
| Inline status pills (e.g., `<span className="bg-green-100 text-green-800 ...">actif</span>`) | `<StatusBadge variant="success">actif</StatusBadge> ` |
| Empty `<tr><td colSpan={N}>Aucun…</td></tr>` rows | `<TableEmpty colSpan={N}><EmptyState … /></TableEmpty>` |
| Hand-rolled `<div className="space-y-1"><Label/><Input/>{error && <p>…</p>}</div>` | `<FormField label error>{Input}</FormField>` |
| Hand-rolled `{pending ? '…' : 'Submit'}` | `<Button type="submit" loading={pending}>Submit</Button>` |
| `<form action="/sign-out">` in shells | Encapsulated in `<SidebarUser>` (no caller-side change) |

Pages affected: every file under `app/(authenticated)/**/page.tsx`, `app/(admin)/**/page.tsx`, the per-tenant action cards (`grant-credits-card.tsx`, `set-model-card.tsx`, `toggle-chatbot-card.tsx`, `toggle-suspension-card.tsx`), and the invites `create-form.tsx`. The implementation plan enumerates each and groups them into reviewable batches.

### `/_design` showcase route

`app/(admin)/_design/page.tsx` — admin-gated, hidden from sidebar nav, NOT linked from anywhere in the running UI. Renders one long page with:
1. Color tokens swatches (primary, admin, status, neutrals) with hex/oklch labels.
2. Typography scale demos (display, title, heading, body, small + tabular-nums).
3. Buttons — every variant × every size × default/loading/disabled states.
4. Inputs — Input, Textarea, Select, FormField with label/description/error states.
5. Cards — basic, with header/body/footer.
6. Tables — populated, empty, with status badges.
7. StatusBadges — every variant.
8. Alerts — every variant.
9. EmptyStates — with and without CTA.
10. Skeletons — base + TableSkeleton.
11. Form pattern — a working dummy form (no-op action) showing the canonical layout.
12. Page header + breadcrumb pattern at the top.

Useful as a living style guide AND as the visual smoke-test target during implementation.

### Verification

**Unit tests** — `tests/unit/components/*.test.tsx` for the 5 new primitives (`StatusBadge`, `EmptyState`, `Alert`, `FormField`, `Table`). Each tests:
1. Renders with default props.
2. Variant prop yields the expected variant class.
3. (For composite primitives) Slot composition works (e.g., `Table` accepts `TableHeader` + `TableBody` children).

**Playwright smoke** — `tests/e2e/design-foundation.spec.ts`:
1. `/sign-in` renders, form submits with bad creds, error Alert appears.
2. `/invite/<bad-token>` shows `Alert variant="warning"`.
3. Doctor signs in → sidebar visible, "Aujourd'hui" link active, `bg-card` shell shadow visible.
4. Admin signs in → orange-themed sidebar, "Tableau de bord" link active.
5. Admin navigates to `/_design` → 200 OK; doctor navigating to `/_design` → 404.

**Existing test suite** — `pnpm test` (Vitest unit + RLS) and `pnpm test:e2e` (existing 7 specs) must continue passing post-migration. The token sweep is class-only; no behavioral change should break any existing test.

**Manual QA checklist** (in plan):
- [ ] Walk `/_design` route — no obvious broken styles.
- [ ] Sign in as doctor → see sidebar → click each nav item → no console errors.
- [ ] Sign in as admin → see orange sidebar → click each nav item → no console errors.
- [ ] Create an invite via `/admin/invites` → form uses new primitives.
- [ ] Open a tenant detail → all 4 action cards render correctly with new tokens.

---

## Definition of done

- All 7 new primitives shipped (`Table`, `StatusBadge`, `EmptyState`, `Skeleton`, `Alert`, `FormField`, plus `Button` `loading` prop) with unit tests passing.
- Both shells deployed (`DoctorShell`, `AdminShell`); old shells deleted.
- `/sign-in` + `/invite/[token]` reskinned; `AuthCard` shared composition in place.
- Token sweep applied to every existing page; build clean; full Playwright suite (existing 7 + new design-foundation = 8 specs) passes.
- `/_design` route exists, renders cleanly for admins, 404s for doctors.
- All `text-gray-*`, `border-gray-*`, `bg-white`, raw status-color literals replaced (verify with grep audit at the end of the plan).
- README updated with Phase A roadmap entry.
- Tag: `phase-a-design-foundation`.

---

## Deferred / future plans

- **Phase B — Doctor app pages** — today, patients list/detail, walk-in/book, consultation 2-column workspace, settings team/cabinet/audit. Will reuse all primitives + patterns from Phase A.
- **Phase C — Admin app pages** — dashboard layout polish, tenants list/detail, invites, action cards. Will reuse all primitives + patterns from Phase A.
- Dark mode toggle.
- Mobile-first responsive overhaul.
- Storybook + visual-regression infrastructure.
- Toast / global notification system (only if a Phase B/C use case actually demands it).
- Modal / Dialog primitive (only when first needed).
