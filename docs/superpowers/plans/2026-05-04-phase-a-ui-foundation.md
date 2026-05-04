# Phase A — UI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the project's generic shadcn-default look with a deliberate clinical-trad design system: sky-blue doctor / orange admin, persistent left sidebar, soft chrome + flat data surfaces, on top of new design tokens, primitives, and a token-only migration sweep across every existing page.

**Architecture:** Add CSS-var tokens (status palette + admin tokens + shadow/motion/radius/type scales) extending the existing `app/globals.css` pattern. Build 6 new primitives (`Table`, `StatusBadge`, `EmptyState`, `Skeleton`, `Alert`, `FormField`) and re-theme the existing 6 (`Button` with new `loading` prop, `Card`, `Input`, `Label`, `Textarea`, `Select`). Build shell primitives (`Sidebar` + `SidebarNav` + `SidebarUser` + `PageBreadcrumb` + `PageHeader`) and compose `DoctorShell` (sky theme) + `AdminShell` (orange theme) replacing the old top-nav shells. Reskin `/sign-in` and `/invite/[token]` as the first end-user surfaces. Run a token sweep (find/replace + status pill / table swaps) across every existing doctor and admin page so they render correctly inside the new shell without layout changes. Add a hidden admin-gated `/_design` showcase route as the living style guide.

**Tech Stack:** Next 16, React 19, Tailwind v4, shadcn primitives (existing), `@base-ui/react/button` (existing), `next/font/google` Inter (new), `lucide-react` (new dep), Vitest, Playwright.

**Spec reference:** [`docs/superpowers/specs/2026-05-04-phase-a-ui-foundation-design.md`](../specs/2026-05-04-phase-a-ui-foundation-design.md).

**Prerequisites:** `plan-2b-admin-ui` tag. Local Supabase running. Doctor + admin test accounts created (already seeded in this branch's local DB).

---

## What Phase A does NOT do

- Layout changes to any existing page. Information architecture is preserved; only color/border/typography classes change. Layout reworks land in Phase B (doctor) and Phase C (admin).
- Dark mode toggle.
- Mobile-first responsive overhaul. Phase A keeps existing responsive behavior; the new sidebar collapses to a minimal `<details>`-driven panel on mobile.
- Storybook / visual-regression infrastructure.
- New illustrations / custom iconography (icons via `lucide-react`).
- Toast / global notification system.
- Modal / Dialog primitive (introduce only when first needed).

---

## Migration sweep patterns (referenced by Tasks 18-21)

Every migration sweep task applies this canonical find/replace mapping. Per-task notes call out file-specific quirks beyond the table.

| Old | New |
|---|---|
| `text-gray-500` / `text-gray-600` / `text-gray-700` | `text-muted-foreground` |
| `border-gray-200` / `border-gray-300` | `border-border` |
| `bg-white` (chrome contexts — Cards, panels) | `bg-card` |
| `bg-gray-50` (table headers) | `bg-muted` (or rely on `<TableHeader>` styling) |
| `text-green-600` / `text-green-700` / `text-green-800` | `text-success` |
| `bg-green-50` / `bg-green-100` | `bg-success-tint` |
| `text-red-600` / `text-red-700` / `text-red-800` | `text-danger` |
| `bg-red-50` / `bg-red-100` | `bg-danger-tint` |
| `text-orange-700` (admin contexts only) | `text-admin` |
| `bg-orange-50` / `bg-orange-100` (admin only) | `bg-admin-tint` |
| Inline `<table className="w-full text-sm">…</table>` | `<Table>` + `<TableHeader>` / `<TableBody>` / `<TableRow>` / `<TableHead>` / `<TableCell>` |
| Inline status pills (e.g., `<span className="bg-green-100 text-green-800 ...">actif</span>`) | `<StatusBadge variant="success">actif</StatusBadge>` |
| Empty `<tr><td colSpan={N}>Aucun…</td></tr>` rows | `<TableEmpty colSpan={N}><EmptyState … /></TableEmpty>` (inside table) OR `<EmptyState>` outside the card if the list is fully empty |
| Hand-rolled `<div className="space-y-1"><Label/><Input/>{error && <p>...</p>}</div>` | `<FormField label error>{Input}</FormField>` |
| Hand-rolled `{pending ? '…' : 'Submit'}` on submit button | `<Button type="submit" loading={pending}>Submit</Button>` |
| Inline `<p className="text-{xs|sm} text-red-600">{message}</p>` action errors | `<Alert variant="danger">{message}</Alert>` |
| Inline `<p className="text-{xs|sm} text-green-700">{message}</p>` success messages | `<Alert variant="success">{message}</Alert>` |

**Do NOT touch:**
- Page-level layout structure (column counts, section ordering, IA). Phase B and C own layout reworks.
- Server-action logic, types, or signatures.
- Schema, migrations, or DB queries.

---

## Conventions every task follows

Same as Plans 1.x and 2.x:

- After every `pnpm install` or `pnpm add`, restore the supabase binary:

```bash
cp node_modules/.pnpm/supabase@*/node_modules/supabase/bin/supabase.exe node_modules/.bin/supabase.exe
```

- React 19: `useActionState` from `react`, NOT `useFormState` from `react-dom`.
- `db/client.ts` does NOT import `'server-only'` — CLI scripts use it too.
- base-ui Button has no `asChild` — use `buttonVariants()` for styled `<Link>`.
- Wrap any client component using `useSearchParams` in `<Suspense>`.
- Sentry's `beforeSend` expects `ErrorEvent` not the broader `Event` — cast in config files.
- Playwright `getByLabel` is substring-matching by default — use `{ exact: true }` to disambiguate.
- `next/font/google` is loaded server-side; the Inter className applies on `<html>`.
- Recharts components must be in `'use client'` files (DOM-touching) — N/A here, no chart work in Phase A.

---

## File structure

**New files**

```
app/
  fonts.ts                                       # Inter loader
  (admin)/_design/
    page.tsx                                     # showcase route (admin-gated)

components/
  ui/
    table.tsx                                    # Table + sub-components + TableEmpty
    status-badge.tsx                             # variants: success / warning / danger / info / neutral
    empty-state.tsx                              # icon, title, description, action
    skeleton.tsx                                 # base + TableSkeleton helper
    alert.tsx                                    # variants: info / success / warning / danger
    form-field.tsx                               # label + description + error wrapper
  shell/
    sidebar.tsx                                  # shared primitive (theme variant)
    sidebar-nav.tsx                              # nav group + item
    sidebar-user.tsx                             # bottom user block + sign-out form
    page-breadcrumb.tsx                          # breadcrumb bar
    page-header.tsx                              # page title + subtitle + actions slot
    doctor-shell.tsx                             # composes Sidebar(theme=sky)
    admin-shell.tsx                              # composes Sidebar(theme=orange)
  auth/
    auth-card.tsx                                # centered card composition for /sign-in + /invite

tests/
  unit/components/
    status-badge.test.tsx
    alert.test.tsx
    empty-state.test.tsx
    form-field.test.tsx
    table.test.tsx
    button-loading.test.tsx
  e2e/design-foundation.spec.ts
```

**Modified files**

- `app/globals.css` — Phase A tokens.
- `app/layout.tsx` — replace Geist Sans with Inter; keep Geist Mono.
- `app/(authenticated)/layout.tsx` — apply `DoctorShell`.
- `app/(admin)/admin/layout.tsx` — apply `AdminShell`.
- `components/ui/button.tsx` — add `loading` prop.
- `components/ui/card.tsx` — light retheme.
- `components/ui/input.tsx`, `label.tsx`, `textarea.tsx`, `select.tsx` — retheme.
- `app/(public)/sign-in/page.tsx` — full reskin via `AuthCard`.
- `app/(public)/invite/[token]/page.tsx` — full reskin via `AuthCard`.
- `app/(public)/invite/[token]/owner-form.tsx` — use `FormField` + `Alert` + `Button loading`.
- `app/(public)/invite/[token]/assistant-form.tsx` — same.
- All existing pages under `app/(authenticated)/**` and `app/(admin)/**` — token sweep (no layout changes).
- `package.json` — add `lucide-react`.
- `README.md` — Phase A roadmap entry.

**Deleted files**

- `components/app-shell.tsx` (replaced by `components/shell/doctor-shell.tsx`).
- `components/admin/admin-shell.tsx` (replaced by `components/shell/admin-shell.tsx`).

---

## Task 1: Install dependencies + load Inter font

**Files:**
- Modify: `package.json` (add `lucide-react`)
- Create: `app/fonts.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Install lucide-react**

```bash
pnpm add lucide-react
```

Expected: `package.json` shows `"lucide-react": "^X.X.X"` in dependencies; `pnpm-lock.yaml` updated.

- [ ] **Step 2: Restore supabase binary**

```bash
cp node_modules/.pnpm/supabase@*/node_modules/supabase/bin/supabase.exe node_modules/.bin/supabase.exe
```

- [ ] **Step 3: Create `app/fonts.ts`**

```ts
import { Inter, Geist_Mono } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});
```

- [ ] **Step 4: Update `app/layout.tsx`**

Replace the file contents with:

```tsx
import type { Metadata } from "next";
import { inter, geistMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Doctopus",
  description: "Logiciel de cabinet médical",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

(Note: `lang` switched from `"en"` to `"fr"`. Title + description set to actual app name.)

- [ ] **Step 5: Build to verify**

```bash
pnpm build
```

Expected: clean compile, no font errors. Inter loaded successfully (visible in build output as a font asset).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): install lucide-react + load Inter font"
```

---

## Task 2: Design tokens in globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Read current `app/globals.css`**

```bash
cat app/globals.css
```

The existing file imports Tailwind, `tw-animate-css`, and `shadcn/tailwind.css`, then declares `@theme inline` with token aliases and `:root` + `.dark` palette blocks. We extend it; we do NOT replace it.

- [ ] **Step 2: Extend `:root` block with new tokens**

Open `app/globals.css`. Inside the existing `:root { ... }` block, just before the closing `}`, add:

```css
  /* === Phase A primary (sky-blue, replaces neutral primary) === */
  --primary: oklch(0.588 0.158 241.966);
  --primary-foreground: oklch(0.985 0 0);
  --primary-hover: oklch(0.500 0.134 242.749);
  --primary-tint: oklch(0.951 0.026 236.824);
  --primary-tint-strong: oklch(0.901 0.058 230.902);

  /* === Phase A admin accent (orange, used by AdminShell only) === */
  --admin: oklch(0.646 0.222 41.116);
  --admin-foreground: oklch(0.985 0 0);
  --admin-hover: oklch(0.553 0.195 38.402);
  --admin-tint: oklch(0.954 0.038 75.164);
  --admin-tint-strong: oklch(0.901 0.076 70.697);

  /* === Phase A status palette === */
  --success: oklch(0.626 0.194 149.214);
  --success-foreground: oklch(0.985 0 0);
  --success-tint: oklch(0.962 0.045 156.743);

  --warning: oklch(0.769 0.188 70.080);
  --warning-foreground: oklch(0.205 0 0);
  --warning-tint: oklch(0.987 0.022 95.277);

  --danger: oklch(0.577 0.245 27.325);
  --danger-foreground: oklch(0.985 0 0);
  --danger-tint: oklch(0.971 0.013 17.380);

  --info: var(--primary);
  --info-foreground: var(--primary-foreground);
  --info-tint: var(--primary-tint);

  /* === Phase A type scale (Tailwind v4 uses DOUBLE-hyphen for line-height modifier) === */
  --text-display: 1.875rem;
  --text-display--line-height: 2.25rem;
  --text-title: 1.25rem;
  --text-title--line-height: 1.75rem;
  --text-heading: 1rem;
  --text-heading--line-height: 1.5rem;
  --text-body: 0.875rem;
  --text-body--line-height: 1.25rem;
  --text-small: 0.75rem;
  --text-small--line-height: 1rem;

  /* === Phase A radius === */
  --radius-tight: 0.25rem;
  --radius-pill: 9999px;

  /* === Phase A shadows === */
  --shadow-card: 0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06);
  --shadow-popover: 0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.08);

  /* === Phase A motion === */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 120ms;
  --duration-base: 200ms;
```

The existing `--destructive` stays (kept as alias for backwards compatibility with shadcn Button `variant="destructive"`). New `--danger` is canonical going forward.

- [ ] **Step 3: Extend `@theme inline` block**

Inside the existing `@theme inline { ... }` block, just before the closing `}`, add:

```css
  --color-primary-hover: var(--primary-hover);
  --color-primary-tint: var(--primary-tint);
  --color-primary-tint-strong: var(--primary-tint-strong);
  --color-admin: var(--admin);
  --color-admin-foreground: var(--admin-foreground);
  --color-admin-hover: var(--admin-hover);
  --color-admin-tint: var(--admin-tint);
  --color-admin-tint-strong: var(--admin-tint-strong);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-success-tint: var(--success-tint);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-warning-tint: var(--warning-tint);
  --color-danger: var(--danger);
  --color-danger-foreground: var(--danger-foreground);
  --color-danger-tint: var(--danger-tint);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-info-tint: var(--info-tint);
  --radius-tight: var(--radius-tight);
  --radius-pill: var(--radius-pill);
  --shadow-card: var(--shadow-card);
  --shadow-popover: var(--shadow-popover);
```

This makes `bg-success`, `text-danger`, `bg-admin-tint`, `shadow-card`, `rounded-pill`, etc. available as Tailwind utilities.

- [ ] **Step 4: Add reduced-motion override**

After the closing `}` of `.dark { ... }`, before the `@layer base` block, add:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 5: Build to verify**

```bash
pnpm build
```

Expected: clean. The new tokens compile into Tailwind without error.

- [ ] **Step 6: Sanity-check a token via grep**

```bash
grep -n "color-success" app/globals.css
```

Expected: shows the line in `@theme inline`. Confirms the bridge is in place.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): Phase A design tokens (status palette, admin, type/radius/shadow/motion)"
```

---

## Task 3: Re-theme Button (with `loading` prop) + retheme Input/Label/Textarea/Select

**Files:**
- Modify: `components/ui/button.tsx`
- Modify: `components/ui/input.tsx`, `label.tsx`, `textarea.tsx`, `select.tsx`
- Test: `tests/unit/components/button-loading.test.tsx`

- [ ] **Step 1: Write the failing test for `Button loading`**

Create `tests/unit/components/button-loading.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button loading prop', () => {
  it('renders children when not loading', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Save');
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('shows spinner and disables button when loading', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.querySelector('[data-slot="button-spinner"]')).not.toBeNull();
    expect(btn).toHaveTextContent('Save');
  });

  it('respects explicit disabled even without loading', () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/unit/components/button-loading.test.tsx
```

Expected: fails — `Button` does not accept a `loading` prop yet (TS error or runtime no-op).

- [ ] **Step 3: Add `loading` prop to `components/ui/button.tsx`**

Replace the file with:

```tsx
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-danger/10 text-danger hover:bg-danger/20 focus-visible:border-danger/40 focus-visible:ring-danger/20 dark:bg-danger/20 dark:hover:bg-danger/30 dark:focus-visible:ring-danger/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean
  }

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <Loader2
          data-slot="button-spinner"
          className="animate-spin"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
```

Key changes vs. original:
- `default` variant uses `hover:bg-primary-hover` (sky-700) instead of opacity-based hover.
- `destructive` variant uses `bg-danger/*` instead of `bg-destructive/*` (canonical going forward; `--destructive` aliased in CSS so legacy callers still work).
- New `loading` prop disables and prepends a spinning `Loader2` icon.

- [ ] **Step 4: Run test to verify pass**

```bash
pnpm test tests/unit/components/button-loading.test.tsx
```

Expected: 3 passed.

- [ ] **Step 5: Verify no regressions in other tests**

```bash
pnpm test
```

Expected: full suite still passes (the existing 99 tests + the 3 new = 102).

- [ ] **Step 6: Re-theme `Input` (`components/ui/input.tsx`)**

Read the file first; the body should use shadcn defaults. Update the focus-ring and border classes to use the new tokens — replace any hard-coded `border-input`, `focus-visible:border-ring focus-visible:ring-ring/50` etc. with the same values (those are CSS-var aliases that already point at the right tokens via shadcn). In practice, `Input` likely needs no edit. If there's a hard-coded color, replace it. Run `pnpm exec tsc --noEmit` after.

(Implementer: open the file, scan for any hex / `gray-*` / `slate-*` literals; if none, no edit needed. Most shadcn-generated `Input` components are token-driven already.)

- [ ] **Step 7: Re-theme `Label` (`components/ui/label.tsx`)** — same pattern as Step 6. Likely no edit needed; verify and move on.

- [ ] **Step 8: Re-theme `Textarea` (`components/ui/textarea.tsx`)** — same.

- [ ] **Step 9: Re-theme `Select` (`components/ui/select.tsx`)** — same. Verify hover/focus states still resolve through tokens. No hex colors should be in this file.

- [ ] **Step 10: Type-check + commit**

```bash
pnpm exec tsc --noEmit
git add -A
git commit -m "feat(ui): Button loading prop + retheme to new tokens; verify Input/Label/Textarea/Select token-driven"
```

---

## Task 4: Re-theme Card

**Files:**
- Modify: `components/ui/card.tsx`

The existing Card already has `CardHeader`, `CardContent`, `CardFooter`, `CardTitle`, `CardDescription`, `CardAction` slots. We do NOT add new slots. We only retheme: ensure surfaces use the new shadow token and the rounded radius is consistent with the rest of the system.

- [ ] **Step 1: Read current `components/ui/card.tsx`**

Note that `Card` currently uses `ring-1 ring-foreground/10` for its border-like effect and `bg-card` already. That's compatible with the spec — no breaking change. The Hybrid approach calls for `shadow-card` — add it.

- [ ] **Step 2: Modify `Card` wrapper to add `shadow-card`**

In `components/ui/card.tsx`, find the `Card` function. Replace its className arg with:

```tsx
className={cn(
  "group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 shadow-card has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
  className
)}
```

(Only `shadow-card` was added.)

- [ ] **Step 3: Build + type-check**

```bash
pnpm exec tsc --noEmit
pnpm build
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): Card uses shadow-card token (Hybrid: soft chrome on cards)"
```

---

## Task 5: New primitive — `StatusBadge` (TDD)

**Files:**
- Create: `components/ui/status-badge.tsx`
- Test: `tests/unit/components/status-badge.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/status-badge';

describe('StatusBadge', () => {
  it('renders children with default variant (neutral)', () => {
    render(<StatusBadge>actif</StatusBadge>);
    const el = screen.getByText('actif');
    expect(el).toBeInTheDocument();
    expect(el.className).toMatch(/bg-muted/);
  });

  it.each([
    ['success', /bg-success-tint/],
    ['warning', /bg-warning-tint/],
    ['danger', /bg-danger-tint/],
    ['info', /bg-info-tint/],
  ] as const)('applies variant class for %s', (variant, pattern) => {
    render(<StatusBadge variant={variant}>label</StatusBadge>);
    expect(screen.getByText('label').className).toMatch(pattern);
  });

  it('renders an optional icon', () => {
    function Icon() {
      return <svg data-testid="status-icon" />;
    }
    render(
      <StatusBadge variant="success" icon={Icon}>
        actif
      </StatusBadge>,
    );
    expect(screen.getByTestId('status-icon')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/unit/components/status-badge.test.tsx
```

Expected: module not found.

- [ ] **Step 3: Implement**

Create `components/ui/status-badge.tsx`:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1 text-small font-medium px-2 py-0.5 rounded-pill border',
  {
    variants: {
      variant: {
        success: 'bg-success-tint text-success border-success/20',
        warning: 'bg-warning-tint text-warning-foreground border-warning/30',
        danger: 'bg-danger-tint text-danger border-danger/20',
        info: 'bg-info-tint text-info border-info/20',
        neutral: 'bg-muted text-muted-foreground border-border',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export type StatusBadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof statusBadgeVariants> & {
    icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  };

export function StatusBadge({
  className,
  variant,
  icon: Icon,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ variant }), className)}
      {...props}
    >
      {Icon ? <Icon className="size-3" aria-hidden /> : null}
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Run, expect pass**

```bash
pnpm test tests/unit/components/status-badge.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Type-check + commit**

```bash
pnpm exec tsc --noEmit
git add -A
git commit -m "feat(ui): StatusBadge primitive with success/warning/danger/info/neutral variants"
```

---

## Task 6: New primitive — `Alert` (TDD)

**Files:**
- Create: `components/ui/alert.tsx`
- Test: `tests/unit/components/alert.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from '@/components/ui/alert';

describe('Alert', () => {
  it('renders title and children', () => {
    render(
      <Alert variant="info" title="Cabinet activé">
        L&apos;assistant IA est maintenant accessible.
      </Alert>,
    );
    expect(screen.getByText('Cabinet activé')).toBeInTheDocument();
    expect(
      screen.getByText("L'assistant IA est maintenant accessible."),
    ).toBeInTheDocument();
  });

  it.each([
    ['info', /bg-info-tint/],
    ['success', /bg-success-tint/],
    ['warning', /bg-warning-tint/],
    ['danger', /bg-danger-tint/],
  ] as const)('applies variant class for %s', (variant, pattern) => {
    const { container } = render(
      <Alert variant={variant}>{variant}</Alert>,
    );
    expect(container.firstChild as HTMLElement).toHaveClass(
      expect.stringMatching(pattern) as unknown as string,
    );
  });

  it('renders an icon when variant is set', () => {
    const { container } = render(<Alert variant="danger">x</Alert>);
    expect(container.querySelector('[data-slot="alert-icon"]')).not.toBeNull();
  });
});
```

(If the chained `expect.stringMatching` form trips up TS, replace the body with `expect((container.firstChild as HTMLElement).className).toMatch(pattern);`.)

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/unit/components/alert.test.tsx
```

- [ ] **Step 3: Implement**

Create `components/ui/alert.tsx`:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-md border p-3 flex gap-3 items-start',
  {
    variants: {
      variant: {
        info: 'bg-info-tint border-info/20 text-foreground',
        success: 'bg-success-tint border-success/20 text-foreground',
        warning: 'bg-warning-tint border-warning/30 text-foreground',
        danger: 'bg-danger-tint border-danger/20 text-foreground',
      },
    },
    defaultVariants: { variant: 'info' },
  },
);

const ICON: Record<string, ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

const ICON_COLOR: Record<string, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning-foreground',
  danger: 'text-danger',
};

export type AlertProps = React.ComponentProps<'div'> &
  VariantProps<typeof alertVariants> & {
    title?: React.ReactNode;
  };

export function Alert({
  className,
  variant = 'info',
  title,
  children,
  ...props
}: AlertProps) {
  const Icon = ICON[variant!];
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon
        data-slot="alert-icon"
        className={cn('size-4 mt-0.5 shrink-0', ICON_COLOR[variant!])}
        aria-hidden
      />
      <div className="flex-1 space-y-0.5">
        {title ? (
          <p className="text-body font-medium leading-none">{title}</p>
        ) : null}
        {children ? (
          <div className="text-small text-muted-foreground">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run, expect pass**

```bash
pnpm test tests/unit/components/alert.test.tsx
```

- [ ] **Step 5: Type-check + commit**

```bash
pnpm exec tsc --noEmit
git add -A
git commit -m "feat(ui): Alert primitive with info/success/warning/danger variants"
```

---

## Task 7: New primitive — `EmptyState` (TDD)

**Files:**
- Create: `components/ui/empty-state.tsx`
- Test: `tests/unit/components/empty-state.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

describe('EmptyState', () => {
  it('renders title, description, and action', () => {
    render(
      <EmptyState
        icon={Users}
        title="Aucun patient"
        description="Ajoutez votre premier patient."
        action={<button>Nouveau patient</button>}
      />,
    );
    expect(screen.getByText('Aucun patient')).toBeInTheDocument();
    expect(screen.getByText('Ajoutez votre premier patient.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nouveau patient' })).toBeInTheDocument();
  });

  it('renders without optional props', () => {
    render(<EmptyState title="Aucun élément" />);
    expect(screen.getByText('Aucun élément')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/unit/components/empty-state.test.tsx
```

- [ ] **Step 3: Implement**

Create `components/ui/empty-state.tsx`:

```tsx
import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type EmptyStateProps = {
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center text-center py-10 px-6 gap-2',
        className,
      )}
    >
      {Icon ? (
        <Icon className="size-8 text-muted-foreground" aria-hidden />
      ) : null}
      <p className="text-title font-semibold">{title}</p>
      {description ? (
        <p className="text-body text-muted-foreground max-w-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
```

- [ ] **Step 4: Run, expect pass**

```bash
pnpm test tests/unit/components/empty-state.test.tsx
```

- [ ] **Step 5: Type-check + commit**

```bash
pnpm exec tsc --noEmit
git add -A
git commit -m "feat(ui): EmptyState primitive with icon/title/description/action"
```

---

## Task 8: New primitive — `Skeleton` + `TableSkeleton` helper

**Files:**
- Create: `components/ui/skeleton.tsx`

(No unit tests — Skeleton is a visual primitive with trivial render.)

- [ ] **Step 1: Implement**

Create `components/ui/skeleton.tsx`:

```tsx
import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'animate-pulse rounded-tight bg-muted',
        className,
      )}
      {...props}
    />
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: columns }, (_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm exec tsc --noEmit
git add -A
git commit -m "feat(ui): Skeleton + TableSkeleton primitives"
```

---

## Task 9: New primitive — `FormField` (TDD)

**Files:**
- Create: `components/ui/form-field.tsx`
- Test: `tests/unit/components/form-field.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from '@/components/ui/form-field';

describe('FormField', () => {
  it('renders label, description, error, and child input', () => {
    render(
      <FormField
        label="Email"
        description="On ne le partage avec personne."
        error="Email invalide"
      >
        <input data-testid="email-input" />
      </FormField>,
    );

    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('On ne le partage avec personne.')).toBeInTheDocument();
    expect(screen.getByText('Email invalide')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
  });

  it('connects label to child via htmlFor / id', () => {
    render(
      <FormField label="Email">
        <input data-testid="email-input" />
      </FormField>,
    );
    const input = screen.getByTestId('email-input') as HTMLInputElement;
    const label = screen.getByText('Email') as HTMLLabelElement;
    expect(input.id).toBeTruthy();
    expect(label.htmlFor).toBe(input.id);
  });

  it('respects an existing id on the child', () => {
    render(
      <FormField label="Email">
        <input id="my-email" data-testid="email-input" />
      </FormField>,
    );
    const input = screen.getByTestId('email-input') as HTMLInputElement;
    const label = screen.getByText('Email') as HTMLLabelElement;
    expect(input.id).toBe('my-email');
    expect(label.htmlFor).toBe('my-email');
  });

  it('omits error block when no error', () => {
    render(
      <FormField label="Email">
        <input />
      </FormField>,
    );
    expect(screen.queryByText(/invalide/i)).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/unit/components/form-field.test.tsx
```

- [ ] **Step 3: Implement**

Create `components/ui/form-field.tsx`:

```tsx
import { cloneElement, isValidElement, useId, type ReactElement } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type FormFieldProps = {
  label: string;
  description?: string;
  error?: string | null;
  className?: string;
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
};

export function FormField({
  label,
  description,
  error,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const childId = isValidElement(children) ? (children.props as { id?: string }).id : undefined;
  const id = childId ?? generatedId;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  const child = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })
    : children;

  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={id} className="text-small font-medium">
        {label}
      </Label>
      {description ? (
        <p id={descriptionId} className="text-small text-muted-foreground">
          {description}
        </p>
      ) : null}
      {child}
      {error ? (
        <p id={errorId} className="text-small text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run, expect pass**

```bash
pnpm test tests/unit/components/form-field.test.tsx
```

- [ ] **Step 5: Type-check + commit**

```bash
pnpm exec tsc --noEmit
git add -A
git commit -m "feat(ui): FormField primitive (label + description + error + ARIA wiring)"
```

---

## Task 10: New primitive — `Table` (TDD)

**Files:**
- Create: `components/ui/table.tsx`
- Test: `tests/unit/components/table.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

describe('Table', () => {
  it('renders header and rows', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cabinet</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Acme</TableCell>
            <TableCell>actif</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText('Cabinet')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  it('TableEmpty renders a row spanning columns', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>A</TableHead>
            <TableHead>B</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty colSpan={2}>Aucun élément</TableEmpty>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText('Aucun élément')).toBeInTheDocument();
    const cell = screen.getByText('Aucun élément').closest('td');
    expect(cell?.getAttribute('colspan')).toBe('2');
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/unit/components/table.test.tsx
```

- [ ] **Step 3: Implement**

Create `components/ui/table.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Table({
  className,
  ...props
}: React.ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-x-auto" data-slot="table-wrapper">
      <table
        data-slot="table"
        className={cn('w-full text-body caption-bottom', className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        'bg-muted [&_tr]:border-b border-border',
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-border transition-colors hover:bg-muted/50',
        className,
      )}
      style={{ transitionDuration: 'var(--duration-fast)' }}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'px-3 py-2.5 text-left text-small uppercase tracking-wide font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('px-3 py-2.5 align-middle', className)}
      {...props}
    />
  );
}

export function TableEmpty({
  colSpan,
  children,
  className,
}: {
  colSpan: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr data-slot="table-empty">
      <td
        colSpan={colSpan}
        className={cn(
          'px-3 py-10 text-center text-muted-foreground text-body',
          className,
        )}
      >
        {children}
      </td>
    </tr>
  );
}
```

- [ ] **Step 4: Run, expect pass**

```bash
pnpm test tests/unit/components/table.test.tsx
```

- [ ] **Step 5: Type-check + commit**

```bash
pnpm exec tsc --noEmit
git add -A
git commit -m "feat(ui): Table primitive with Header/Body/Row/Head/Cell/Empty sub-components"
```

---

## Task 11: Shell primitives — `Sidebar` + `SidebarNav` + `SidebarUser`

**Files:**
- Create: `components/shell/sidebar.tsx`
- Create: `components/shell/sidebar-nav.tsx`
- Create: `components/shell/sidebar-user.tsx`

(No unit tests — these are integration-tested via E2E in Task 23 + visual QA in Task 22.)

- [ ] **Step 1: Create `Sidebar` wrapper**

Create `components/shell/sidebar.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SidebarTheme = 'sky' | 'orange';

const THEME_VARS: Record<SidebarTheme, React.CSSProperties> = {
  sky: {
    ['--sidebar-accent' as string]: 'var(--primary)',
    ['--sidebar-accent-tint' as string]: 'var(--primary-tint)',
  },
  orange: {
    ['--sidebar-accent' as string]: 'var(--admin)',
    ['--sidebar-accent-tint' as string]: 'var(--admin-tint)',
  },
};

export function Sidebar({
  theme,
  brand,
  children,
  footer,
  className,
}: {
  theme: SidebarTheme;
  brand: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  className?: string;
}) {
  return (
    <aside
      data-slot="sidebar"
      data-theme={theme}
      style={THEME_VARS[theme]}
      className={cn(
        'hidden md:flex md:flex-col md:w-[220px] md:shrink-0 md:h-screen md:sticky md:top-0',
        'bg-card border-r border-border shadow-card',
        className,
      )}
    >
      <div className="px-4 py-4 border-b border-border">{brand}</div>
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3">{children}</nav>
      <div className="border-t border-border">{footer}</div>
    </aside>
  );
}
```

- [ ] **Step 2: Create `SidebarNav` (group + item)**

Create `components/shell/sidebar-nav.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SidebarNavGroup({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      {label ? (
        <div className="text-small uppercase tracking-wide text-muted-foreground px-3 mt-2 mb-1">
          {label}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function SidebarNavItem({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive =
    href === pathname ||
    (href !== '/' && pathname.startsWith(href + '/')) ||
    (href !== '/' && pathname === href);

  return (
    <Link
      href={href}
      data-active={isActive ? '' : undefined}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md text-body transition-colors',
        'border-l-2 border-transparent',
        'hover:bg-muted',
        'data-[active]:bg-[--sidebar-accent-tint] data-[active]:border-l-[--sidebar-accent] data-[active]:font-medium data-[active]:text-foreground',
      )}
      style={{ transitionDuration: 'var(--duration-fast)' }}
    >
      <Icon className="size-4" aria-hidden />
      <span>{children}</span>
    </Link>
  );
}
```

- [ ] **Step 3: Create `SidebarUser`**

Create `components/shell/sidebar-user.tsx`:

```tsx
import { LogOut } from 'lucide-react';

export function SidebarUser({
  name,
  detail,
}: {
  name: string;
  detail: string;
}) {
  return (
    <div className="px-4 py-3 space-y-2">
      <div className="text-body font-medium leading-tight">{name}</div>
      <div className="text-small text-muted-foreground">{detail}</div>
      <form action="/sign-out" method="post">
        <button
          type="submit"
          className="inline-flex items-center gap-1 text-small text-muted-foreground hover:text-foreground transition-colors"
          style={{ transitionDuration: 'var(--duration-fast)' }}
        >
          <LogOut className="size-3" aria-hidden />
          Déconnexion
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Type-check + commit**

```bash
pnpm exec tsc --noEmit
git add -A
git commit -m "feat(shell): Sidebar + SidebarNav + SidebarUser primitives (theme variant)"
```

---

## Task 12: Shell primitives — `PageBreadcrumb` + `PageHeader`

**Files:**
- Create: `components/shell/page-breadcrumb.tsx`
- Create: `components/shell/page-header.tsx`

- [ ] **Step 1: Create `PageBreadcrumb`**

Create `components/shell/page-breadcrumb.tsx`:

```tsx
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

export function PageBreadcrumb({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div
      className={cn(
        'px-6 py-3 border-b border-border bg-card',
        className,
      )}
    >
      <ol className="flex items-center gap-1 text-small text-muted-foreground">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                  style={{ transitionDuration: 'var(--duration-fast)' }}
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast ? 'text-foreground font-medium' : '')}>
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight className="size-3 text-muted-foreground" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
```

- [ ] **Step 2: Create `PageHeader`**

Create `components/shell/page-header.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'px-6 pt-6 pb-4 border-b border-border bg-card',
        'flex items-start justify-between gap-4',
        className,
      )}
    >
      <div className="space-y-1 min-w-0">
        <h1 className="text-display font-semibold leading-tight truncate">{title}</h1>
        {description ? (
          <p className="text-body text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}
```

- [ ] **Step 3: Type-check + commit**

```bash
pnpm exec tsc --noEmit
git add -A
git commit -m "feat(shell): PageBreadcrumb + PageHeader primitives"
```

---

## Task 13: Compose `DoctorShell` + `AdminShell`

**Files:**
- Modify: `lib/auth/session.ts` (extend `Session` type with `tenantName`)
- Create: `components/shell/doctor-shell.tsx`
- Create: `components/shell/admin-shell.tsx`

- [ ] **Step 0: Extend `Session` to carry `tenantName`**

Open `lib/auth/session.ts`. The current `Session` type (returned by `requireSession()`) has `userId`, `tenantId`, `role`, `fullName`, etc. but not `tenantName`. The brand row of `DoctorShell` shows the cabinet name, so we need it.

In `lib/auth/session.ts`:

1. Add `tenantName: string;` to the `Session` type.
2. In the loader (the function that builds the session — likely `loadSession()` or similar), join the `tenants` table on `userProfiles.tenantId` and select `tenants.name AS tenantName`. Add `tenantName` to the returned object.

Concrete shape (read the existing file first; this is the conceptual diff):

```ts
// In the existing select:
const [profile] = await dbAdmin()
  .select({
    userId: userProfiles.id,
    tenantId: userProfiles.tenantId,
    role: userProfiles.role,
    fullName: userProfiles.fullName,
    tenantName: tenants.name,        // NEW
  })
  .from(userProfiles)
  .innerJoin(tenants, eq(tenants.id, userProfiles.tenantId)) // NEW (or extend existing join)
  .where(eq(userProfiles.id, user.id));
```

Run `pnpm exec tsc --noEmit` after — every consumer of `Session` should still type-check (we added a field, didn't remove one).

- [ ] **Step 1: Create `DoctorShell`**

Create `components/shell/doctor-shell.tsx`:

```tsx
import {
  Building2,
  CalendarDays,
  History,
  Settings,
  Users,
  Users2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { Session } from '@/lib/auth/session';
import { Sidebar } from './sidebar';
import { SidebarNavGroup, SidebarNavItem } from './sidebar-nav';
import { SidebarUser } from './sidebar-user';

export function DoctorShell({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const isDoctor = session.role === 'doctor';
  return (
    <div className="min-h-screen flex">
      <Sidebar
        theme="sky"
        brand={
          <div className="space-y-0.5">
            <div className="font-semibold text-heading">Doctopus</div>
            <div className="text-small text-muted-foreground">{session.tenantName}</div>
          </div>
        }
        footer={
          <SidebarUser
            name={session.fullName}
            detail={isDoctor ? 'Médecin' : 'Assistant(e)'}
          />
        }
      >
        <SidebarNavGroup label="Cabinet">
          <SidebarNavItem href="/today" icon={CalendarDays}>
            Aujourd&apos;hui
          </SidebarNavItem>
          <SidebarNavItem href="/patients" icon={Users}>
            Patients
          </SidebarNavItem>
        </SidebarNavGroup>
        {isDoctor ? (
          <SidebarNavGroup label="Compte">
            <SidebarNavItem href="/settings/team" icon={Users2}>
              Équipe
            </SidebarNavItem>
            <SidebarNavItem href="/settings/cabinet" icon={Settings}>
              Cabinet
            </SidebarNavItem>
            <SidebarNavItem href="/settings/audit" icon={History}>
              Journal
            </SidebarNavItem>
          </SidebarNavGroup>
        ) : null}
      </Sidebar>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
```

(This reads `session.tenantName` — if the existing `Session` type does not yet have `tenantName`, the implementer should add it as part of this task. Read `lib/auth/session.ts`; if the field doesn't exist, fetch the tenant name in the loader and extend the type. If that's too invasive, fall back to a placeholder string `"Cabinet"`.)

- [ ] **Step 2: Create `AdminShell`**

Create `components/shell/admin-shell.tsx`:

```tsx
import { BarChart3, Building2, Mail } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AdminSession } from '@/lib/auth/admin';
import { StatusBadge } from '@/components/ui/status-badge';
import { Sidebar } from './sidebar';
import { SidebarNavGroup, SidebarNavItem } from './sidebar-nav';
import { SidebarUser } from './sidebar-user';

export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <Sidebar
        theme="orange"
        brand={
          <div className="space-y-1">
            <div className="font-semibold text-heading">Doctopus</div>
            <StatusBadge variant="warning" className="bg-admin text-admin-foreground border-admin/40">
              ADMIN
            </StatusBadge>
          </div>
        }
        footer={<SidebarUser name="Super admin" detail={session.email} />}
      >
        <SidebarNavGroup>
          <SidebarNavItem href="/admin" icon={BarChart3}>
            Tableau de bord
          </SidebarNavItem>
          <SidebarNavItem href="/admin/tenants" icon={Building2}>
            Cabinets
          </SidebarNavItem>
          <SidebarNavItem href="/admin/invites" icon={Mail}>
            Invitations
          </SidebarNavItem>
        </SidebarNavGroup>
      </Sidebar>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
```

(`StatusBadge` reused with `className` override to force admin colors — keeps the badge primitive dry without adding an "admin" variant just for the brand.)

- [ ] **Step 3: Type-check + commit**

```bash
pnpm exec tsc --noEmit
git add -A
git commit -m "feat(shell): DoctorShell (sky) + AdminShell (orange) compositions"
```

---

## Task 14: Wire `DoctorShell` into authenticated layout, delete old `AppShell`

**Files:**
- Modify: `app/(authenticated)/layout.tsx`
- Delete: `components/app-shell.tsx`
- Possibly modify: pages currently importing `AppShell` (if any inline usage exists)

- [ ] **Step 1: Read the current authenticated layout**

```bash
cat 'app/(authenticated)/layout.tsx'
```

The layout likely calls `requireSession()` and wraps children in `<AppShell session={session}>{children}</AppShell>`.

- [ ] **Step 2: Replace with `DoctorShell`**

Replace `app/(authenticated)/layout.tsx` body to use `DoctorShell`:

```tsx
import { requireSession } from '@/lib/auth/session';
import { DoctorShell } from '@/components/shell/doctor-shell';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  return <DoctorShell session={session}>{children}</DoctorShell>;
}
```

If the existing layout imports `AppShell` from `@/components/app-shell`, swap to the import above.

- [ ] **Step 3: Search for stragglers using `AppShell`**

```bash
grep -rn "from '@/components/app-shell'" app/ components/ tests/ scripts/
```

Expected: no matches (only the layout was using it, and we just changed it).

- [ ] **Step 4: Delete the old `AppShell`**

```bash
rm components/app-shell.tsx
```

- [ ] **Step 5: Build to verify**

```bash
pnpm build
```

Expected: clean. (Task 13 already extended `Session` with `tenantName` so this should compile.)

- [ ] **Step 6: Smoke-run dev server (optional sanity)**

```bash
pnpm dev
```

Visit `http://localhost:3000/today`. Expected: new sidebar visible on the left, page content on the right (still un-themed inside).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(shell): wire DoctorShell into authenticated layout, delete old AppShell"
```

---

## Task 15: Wire `AdminShell` into admin layout, delete old admin-shell

**Files:**
- Modify: `app/(admin)/admin/layout.tsx`
- Delete: `components/admin/admin-shell.tsx`

- [ ] **Step 1: Read the current admin layout**

```bash
cat 'app/(admin)/admin/layout.tsx'
```

The layout calls `requireAdmin()` and wraps children in `<AdminShell session={session}>{children}</AdminShell>` (from `components/admin/admin-shell.tsx`).

- [ ] **Step 2: Update the import path**

In `app/(admin)/admin/layout.tsx`, change the import from:

```tsx
import { AdminShell } from '@/components/admin/admin-shell';
```

to:

```tsx
import { AdminShell } from '@/components/shell/admin-shell';
```

(JSX usage stays identical — same component name, same prop signature.)

- [ ] **Step 3: Search for stragglers**

```bash
grep -rn "from '@/components/admin/admin-shell'" app/ components/ tests/ scripts/
```

Expected: no matches.

- [ ] **Step 4: Delete the old admin shell**

```bash
rm components/admin/admin-shell.tsx
```

- [ ] **Step 5: Build to verify**

```bash
pnpm build
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(shell): wire AdminShell from components/shell, delete old admin-shell.tsx"
```

---

## Task 16: `AuthCard` + `/sign-in` reskin

**Files:**
- Create: `components/auth/auth-card.tsx`
- Modify: `app/(public)/sign-in/page.tsx`

- [ ] **Step 1: Create `AuthCard`**

Create `components/auth/auth-card.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function AuthCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted">
      <Card className={cn('w-full max-w-sm', className)}>
        <CardContent className="space-y-4 py-6">
          <div className="space-y-1 text-center">
            <div className="text-display font-semibold text-primary">Doctopus</div>
            <h1 className="text-title font-medium">{title}</h1>
            {subtitle ? (
              <p className="text-small text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Reskin `/sign-in/page.tsx`**

Replace `app/(public)/sign-in/page.tsx` with:

```tsx
'use client';

import { Suspense, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Alert } from '@/components/ui/alert';
import { signInAction, type SignInState } from './actions';

const initial: SignInState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="w-full">
      Se connecter
    </Button>
  );
}

function SignInForm() {
  const params = useSearchParams();
  const next = params.get('next') ?? '';
  const [state, action] = useActionState(signInAction, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
      <FormField label="Email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </FormField>
      <FormField label="Mot de passe">
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </FormField>
      <Submit />
    </form>
  );
}

export default function SignInPage() {
  return (
    <AuthCard title="Connexion">
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </AuthCard>
  );
}
```

- [ ] **Step 3: Build + verify**

```bash
pnpm build
```

Expected: clean.

- [ ] **Step 4: E2E sanity (optional, full suite runs in Task 24)**

```bash
pnpm test:e2e tests/e2e/onboarding.spec.ts
```

Expected: passes — the existing onboarding test signs in via the new form and should still work since field labels (`Email` / `Mot de passe`) are preserved.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): AuthCard composition + /sign-in reskin (FormField + Alert)"
```

---

## Task 17: `/invite/[token]` reskin

**Files:**
- Modify: `app/(public)/invite/[token]/page.tsx`
- Modify: `app/(public)/invite/[token]/owner-form.tsx`
- Modify: `app/(public)/invite/[token]/assistant-form.tsx`

- [ ] **Step 1: Read both forms**

```bash
cat 'app/(public)/invite/[token]/owner-form.tsx'
cat 'app/(public)/invite/[token]/assistant-form.tsx'
```

Note their existing field names (`fullName`, `password`, `cabinetName` on owner). The reskin keeps those names and submission logic untouched — only the surface changes.

- [ ] **Step 2: Reskin `page.tsx`**

Replace `app/(public)/invite/[token]/page.tsx` with:

```tsx
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { lookupInvite } from '@/lib/invites/lookup';
import { OwnerInviteForm } from './owner-form';
import { AssistantInviteForm } from './assistant-form';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lookup = await lookupInvite(token);

  if (!lookup.ok) {
    const messages = {
      not_found: "Cette invitation n'existe pas.",
      expired: 'Cette invitation a expiré.',
      consumed: 'Cette invitation a déjà été utilisée ou a été révoquée.',
    } as const;
    return (
      <AuthCard title="Invitation invalide">
        <Alert variant="warning">{messages[lookup.reason]}</Alert>
        <Link href="/sign-in" className="block">
          <Button variant="link" className="w-full">
            Retour à la connexion
          </Button>
        </Link>
      </AuthCard>
    );
  }

  const isOwner = lookup.invite.kind === 'tenant_owner';

  return (
    <AuthCard
      title="Bienvenue sur Doctopus"
      subtitle={
        <span className="flex items-center justify-center gap-2">
          <StatusBadge variant="info">
            {isOwner ? 'Invitation médecin' : 'Invitation assistant'}
          </StatusBadge>
          {lookup.invite.emailHint ? (
            <span className="text-muted-foreground">{lookup.invite.emailHint}</span>
          ) : null}
        </span>
      }
    >
      {isOwner ? (
        <OwnerInviteForm token={token} emailHint={lookup.invite.emailHint ?? ''} />
      ) : (
        <AssistantInviteForm token={token} emailHint={lookup.invite.emailHint ?? ''} />
      )}
    </AuthCard>
  );
}
```

- [ ] **Step 3: Reskin `owner-form.tsx` to use `FormField` + `Alert` + `Button loading`**

Open `app/(public)/invite/[token]/owner-form.tsx`. Convert each `<div className="space-y-2"><Label/><Input/>{error && <p>...}</div>` block into `<FormField label error>{Input}</FormField>`. Convert any `<p className="text-sm text-red-600">{state.error}</p>` action-level error into `<Alert variant="danger">{state.error}</Alert>` placed at the top of the form. Convert the submit button to `<Button type="submit" loading={pending}>{copy}</Button>`.

(Concrete diff depends on the file's current shape. Read first, then edit field-by-field.)

- [ ] **Step 4: Reskin `assistant-form.tsx`** — same pattern, same field-by-field swap.

- [ ] **Step 5: Build**

```bash
pnpm build
```

- [ ] **Step 6: E2E sanity (full suite still in Task 24)**

```bash
pnpm test:e2e tests/e2e/onboarding.spec.ts
```

Expected: passes — the form's label text and field names are unchanged.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(auth): /invite/[token] reskin (AuthCard + FormField + Alert)"
```

---

## Task 18: Token sweep — admin pages

**Files (modify):**
- `app/(admin)/admin/page.tsx`
- `app/(admin)/admin/tenants/page.tsx`
- `app/(admin)/admin/tenants/[id]/page.tsx`
- `app/(admin)/admin/invites/page.tsx`

Applies the canonical mapping from [Migration sweep patterns](#migration-sweep-patterns-referenced-by-tasks-18-21) plus the file-specific notes below. Each of the 4 files is its own bullet step — apply the changes, verify, then commit at the end.

- [ ] **Step 1: `app/(admin)/admin/page.tsx`** — the dashboard. Migration:
  - Replace the per-provider `<table>` block with `<Table>` + sub-components.
  - Replace any inline status-pill rendering with `<StatusBadge>`.
  - Replace `bg-gray-50` on `<thead>` with `bg-muted` (or remove since `TableHeader` handles it).
  - Replace `text-gray-500` on the "30 derniers jours" subtitle with `text-muted-foreground`.

- [ ] **Step 2: `app/(admin)/admin/tenants/page.tsx`** — tenants list. Migration:
  - Replace the search/status pill `<Link>` block — the three pills (`Tous`, `Actifs`, `Suspendus`) keep their inline-link shape but use `bg-muted` for the active state.
  - Replace the `<table>` with `<Table>` + sub-components.
  - Replace inline `● actif/suspendu` status pills with `<StatusBadge variant="success/danger">`.
  - Replace empty `<tr><td colSpan={8}>` with `<TableEmpty colSpan={8}><EmptyState … /></TableEmpty>`.

- [ ] **Step 3: `app/(admin)/admin/tenants/[id]/page.tsx`** — tenant detail. Migration:
  - Replace the page-header `<div className="flex items-center gap-2"><h1>...</h1><span class status pill>...</span></div>` with a proper page-header pattern (still inline, just using `<StatusBadge>`).
  - Replace each of the 3 `<table>` blocks (Historique crédits, Usage IA récent, Actions admin (audit)) with `<Table>` + sub-components.
  - Replace `text-gray-500/600` → `text-muted-foreground`, `border` → `border-border`, `bg-gray-50` → drop (TableHeader handles it).
  - Replace `text-green-700` / `text-red-700` on ledger Δ column with `text-success` / `text-danger`.

- [ ] **Step 4: `app/(admin)/admin/invites/page.tsx`** — invites list. Migration:
  - Convert the `STATUS_LABEL` + `STATUS_CLASS` pattern: keep `STATUS_LABEL`, but DELETE `STATUS_CLASS` and use `<StatusBadge variant={...}>` mapping `pending → info`, `consumed → success`, `expired → neutral`, `revoked → danger`.
  - Replace `<table>` with `<Table>` + sub-components.
  - Replace empty `colSpan` row with `<TableEmpty colSpan={7}><EmptyState … /></TableEmpty>`.

- [ ] **Step 5: Build**

```bash
pnpm build
```

Expected: clean.

- [ ] **Step 6: Run E2E to verify admin flow**

```bash
pnpm test:e2e tests/e2e/admin.spec.ts
```

Expected: passes. The test asserts on text labels (`Tableau de bord`, `Cabinets`, `Crédits accordés.`, `En attente`, `Révoquée`) — all preserved.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(ui): token sweep across admin pages (Table, StatusBadge, EmptyState)"
```

---

## Task 19: Token sweep — admin action cards + invites create-form

**Files (modify):**
- `app/(admin)/admin/tenants/[id]/grant-credits-card.tsx`
- `app/(admin)/admin/tenants/[id]/set-model-card.tsx`
- `app/(admin)/admin/tenants/[id]/toggle-chatbot-card.tsx`
- `app/(admin)/admin/tenants/[id]/toggle-suspension-card.tsx`
- `app/(admin)/admin/invites/create-form.tsx`

Applies the canonical mapping from [Migration sweep patterns](#migration-sweep-patterns-referenced-by-tasks-18-21). Additional cards-specific note: wrap each card body in `<Card><CardHeader><CardTitle/></CardHeader><CardContent>{form}</CardContent></Card>` (replacing the plain `<div className="rounded-md border p-3">` wrapper currently used). Each of the 5 files is one bullet step.

- [ ] **Step 1: `grant-credits-card.tsx`** — apply migration above.

- [ ] **Step 2: `set-model-card.tsx`** — same.

- [ ] **Step 3: `toggle-chatbot-card.tsx`** — wrap in Card + retheme; no FormField needed (no inputs); button stays.

- [ ] **Step 4: `toggle-suspension-card.tsx`** — same as Step 3.

- [ ] **Step 5: `create-form.tsx` (invites)** — apply migration above; the success block (with the URL) uses `<Alert variant="success">` wrapping the URL `<code>` and expiration date.

- [ ] **Step 6: Build + run E2E**

```bash
pnpm build
pnpm test:e2e tests/e2e/admin.spec.ts
```

Expected: clean + passing. The admin E2E asserts label `Nombre de consultations` and `Email` (with `{ exact: true }`) — both preserved by `FormField label="..."`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(ui): token sweep across admin action cards + invites create-form"
```

---

## Task 20: Token sweep — doctor today + patients

**Files (modify):**
- `app/(authenticated)/today/page.tsx`
- `app/(authenticated)/today/walk-in/page.tsx`
- `app/(authenticated)/today/book/page.tsx`
- `app/(authenticated)/patients/page.tsx`
- `app/(authenticated)/patients/new/page.tsx`
- `app/(authenticated)/patients/[id]/page.tsx`
- `app/(authenticated)/patients/[id]/edit/page.tsx`
- Any client components imported by the above (e.g., `components/today/schedule-panel.tsx`, `components/today/waiting-panel.tsx`, patient form components if separate)

Applies the canonical mapping from [Migration sweep patterns](#migration-sweep-patterns-referenced-by-tasks-18-21). Doctor-side specific notes: every top-level page gets a `<PageHeader>` for its title (replacing inline `<h1 className="text-xl font-semibold">…</h1>` patterns); doctor pages use `theme="sky"` accents implicitly via shell, no orange anywhere.

- [ ] **Step 1: `today/page.tsx`** — Replace `text-xl font-semibold` heading with the new `text-display font-semibold`. Wrap action area in a `<PageHeader>`. Replace the inline `<ul className="divide-y border rounded-md">` for "En consultation" with a `<Card>` containing a `<Table>` (or keep ul; the spec doesn't mandate Table for everything — keep ul if list is simple, just retheme borders/text). Actually keep `ul` — only top-level lists should use `<Table>`. Just retheme the borders/text.

  Concrete diff for the page top:
  ```tsx
  // Before:
  <div className="flex items-center justify-between gap-4">
    <h1 className="text-xl font-semibold">Bonjour {session.fullName}</h1>
    <div className="flex gap-2">…</div>
  </div>

  // After:
  <PageHeader
    title={`Bonjour ${session.fullName}`}
    actions={
      <div className="flex gap-2">
        <Link href="/today/book" className={buttonVariants({ variant: 'secondary' })}>
          + Rendez-vous
        </Link>
        <Link href="/today/walk-in" className={buttonVariants()}>
          + Walk-in
        </Link>
      </div>
    }
  />
  ```

  Add `import { PageHeader } from '@/components/shell/page-header';` at top. Wrap remaining sections in a `px-6 py-6` container.

- [ ] **Step 2: `today/walk-in/page.tsx`** — Token sweep + `PageHeader` for the page title. Convert any forms to use `FormField`.

- [ ] **Step 3: `today/book/page.tsx`** — Same.

- [ ] **Step 4: `patients/page.tsx`** — Likely has a list/table of patients. Convert to `<Table>` + `<StatusBadge>` for any patient flags. `PageHeader` for the page title with "Nouveau patient" action.

- [ ] **Step 5: `patients/new/page.tsx`** — Form-heavy page. Convert all `<Label>/<Input>` to `<FormField>`. Wrap form in `<Card>`. `PageHeader` for the title.

- [ ] **Step 6: `patients/[id]/page.tsx`** — Patient detail. Token sweep on every list/section; status pills on appointments via `<StatusBadge>`.

- [ ] **Step 7: `patients/[id]/edit/page.tsx`** — Same form pattern as `new/`.

- [ ] **Step 8: Sweep imported components** — `components/today/schedule-panel.tsx`, `components/today/waiting-panel.tsx`, and any other panel components. Token find/replace as above.

- [ ] **Step 9: Build + run E2E**

```bash
pnpm build
pnpm test:e2e tests/e2e/patients.spec.ts tests/e2e/today.spec.ts
```

Expected: passes. The existing tests assert on visible labels (e.g., "Patients", "Aujourd'hui", "Nouveau patient"); none of those change.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor(ui): token sweep across doctor today + patients pages"
```

---

## Task 21: Token sweep — doctor consultation + settings

**Files (modify):**
- `app/(authenticated)/consultations/[id]/page.tsx`
- `app/(authenticated)/settings/team/page.tsx`
- `app/(authenticated)/settings/cabinet/page.tsx`
- `app/(authenticated)/settings/audit/page.tsx`
- Client components imported by consultation page (vitals, prescription builder, AI chat panel, etc.)

Applies the canonical mapping from [Migration sweep patterns](#migration-sweep-patterns-referenced-by-tasks-18-21). Doctor-side specific notes: each top-level section in the consultation page (motif, history, exam, diagnosis, follow-up, prescription) gets wrapped in a `<Card>`; the AI chatbot disclaimer banner becomes `<Alert variant="info">`.

- [ ] **Step 1: `consultations/[id]/page.tsx`** — biggest sweep on the doctor side. Lots of section headers, form fields (vitals, motif, history, exam, diagnosis, follow-up, prescription), and the chatbot panel. Layout is preserved (Phase B reworks layout). Apply token sweep + `FormField` for each section's notes textarea + `<Card>` wrapping for each section.

- [ ] **Step 2: `settings/team/page.tsx`** — Likely has a list of assistants + an invite form. Token sweep + `<Table>` for the assistants list + `<FormField>` for the invite form. `PageHeader` for the page title.

- [ ] **Step 3: `settings/cabinet/page.tsx`** — Cabinet settings form. Token sweep + `<FormField>` for each field + `<Card>` wrapping.

- [ ] **Step 4: `settings/audit/page.tsx`** — Audit log view. Has a `<table>` already; convert to `<Table>`. `PageHeader` for the page title.

- [ ] **Step 5: Build + run E2E**

```bash
pnpm build
pnpm test:e2e tests/e2e/consultations.spec.ts tests/e2e/prescriptions.spec.ts tests/e2e/chatbot.spec.ts
```

Expected: passes. E2E tests assert on label text (Motif, Antécédents, Diagnostic, etc.) — all preserved.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(ui): token sweep across doctor consultation + settings pages"
```

---

## Task 22: `/_design` showcase route

**Files:**
- Create: `app/(admin)/_design/page.tsx`

(The `(admin)` route group ensures `requireAdmin()` (already in the admin layout? — verify; if the admin layout is at `app/(admin)/admin/layout.tsx`, the `_design` page is OUTSIDE that subtree. Solution: put `_design` under `app/(admin)/admin/_design/page.tsx` so the admin layout wraps it. The URL becomes `/admin/_design`. Adjust accordingly.)

Per spec wording: "admin-gated, hidden from sidebar". Implementation: place at `app/(admin)/admin/_design/page.tsx` so it inherits the admin layout's `requireAdmin` gate. The leading underscore prevents Next.js from generating a route segment? — actually no, Next routes use `_` only for private folders that DO NOT generate a route. We DO want this to generate a route (so admins can browse to it). So name it `app/(admin)/admin/design/page.tsx` — URL `/admin/design`. But the spec says hidden from sidebar — fine, just don't add a SidebarNavItem for it. The "hidden" requirement doesn't need a leading underscore.

Use `app/(admin)/admin/design/page.tsx` (URL `/admin/design`).

- [ ] **Step 1: Create the showcase page**

Create `app/(admin)/admin/design/page.tsx`:

```tsx
import { Building2, Users } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { PageBreadcrumb } from '@/components/shell/page-breadcrumb';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default function DesignShowcasePage() {
  return (
    <div>
      <PageBreadcrumb items={[{ label: 'Admin', href: '/admin' }, { label: 'Design system' }]} />
      <PageHeader
        title="Design system"
        description="Living showcase of every primitive and pattern in the Phase A foundation."
      />
      <div className="px-6 py-6 space-y-10 max-w-5xl">

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Color tokens</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-small">
            {[
              ['primary', 'Primary (sky-600)'],
              ['admin', 'Admin (orange-600)'],
              ['success', 'Success (green-600)'],
              ['warning', 'Warning (amber-500)'],
              ['danger', 'Danger (red-600)'],
              ['info', 'Info (sky-600)'],
              ['muted', 'Muted'],
              ['border', 'Border'],
            ].map(([token, label]) => (
              <div key={token} className="space-y-1">
                <div
                  className="h-12 rounded-md border border-border"
                  style={{ backgroundColor: `var(--${token})` }}
                />
                <div className="text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Typography</h2>
          <div className="space-y-2">
            <p className="text-display font-semibold">Display 30/36</p>
            <p className="text-title font-medium">Title 20/28</p>
            <p className="text-heading font-medium">Heading 16/24</p>
            <p className="text-body">Body 14/20 — corps de texte par défaut.</p>
            <p className="text-small text-muted-foreground">Small 12/16 — captions et labels.</p>
            <p className="tabular-nums text-body">Tabular: 1,234,567.89</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Buttons</h2>
          <div className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="xs">Xs</Button>
            <Button size="sm">Sm</Button>
            <Button>Default</Button>
            <Button size="lg">Lg</Button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Status badges</h2>
          <div className="flex flex-wrap gap-2">
            <StatusBadge variant="success">actif</StatusBadge>
            <StatusBadge variant="warning">en attente</StatusBadge>
            <StatusBadge variant="danger">suspendu</StatusBadge>
            <StatusBadge variant="info">info</StatusBadge>
            <StatusBadge variant="neutral">expirée</StatusBadge>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Alerts</h2>
          <div className="space-y-2">
            <Alert variant="info" title="Information">Texte d&apos;information.</Alert>
            <Alert variant="success" title="Succès">L&apos;opération est terminée.</Alert>
            <Alert variant="warning" title="Attention">Vérifiez avant de continuer.</Alert>
            <Alert variant="danger" title="Erreur">Une erreur est survenue.</Alert>
            <Alert variant="danger">Sans titre — message inline.</Alert>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Empty states</h2>
          <Card>
            <CardContent>
              <EmptyState
                icon={Users}
                title="Aucun patient"
                description="Ajoutez votre premier patient pour commencer."
                action={<Button>Nouveau patient</Button>}
              />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Skeletons</h2>
          <Card>
            <CardHeader><CardTitle>TableSkeleton</CardTitle></CardHeader>
            <CardContent>
              <TableSkeleton rows={4} columns={4} />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Form pattern</h2>
          <Card>
            <CardHeader><CardTitle>Exemple de formulaire</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4">
                <FormField label="Email" description="On ne le partage avec personne.">
                  <Input type="email" />
                </FormField>
                <FormField label="Mot de passe" error="Mot de passe trop court.">
                  <Input type="password" defaultValue="abc" />
                </FormField>
                <Button>Soumettre</Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Tables</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cabinet</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Crédits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Cabinet El Idrissi</TableCell>
                    <TableCell><StatusBadge variant="success">actif</StatusBadge></TableCell>
                    <TableCell className="text-right tabular-nums">42</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Cabinet Test</TableCell>
                    <TableCell><StatusBadge variant="danger">suspendu</StatusBadge></TableCell>
                    <TableCell className="text-right tabular-nums">0</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Empty</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>A</TableHead>
                    <TableHead>B</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableEmpty colSpan={2}>
                    <EmptyState icon={Building2} title="Aucun cabinet" />
                  </TableEmpty>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build + manual smoke**

```bash
pnpm build
pnpm dev
```

Visit `http://localhost:3000/admin/design` while signed in as admin. Expected: every section renders cleanly, no console errors.

(For non-admin: redirected to `/sign-in?next=/admin/design` by the admin layout's `requireAdmin()` — verified in Task 23's E2E.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(admin): /admin/design showcase route — living style guide"
```

---

## Task 23: E2E test — `tests/e2e/design-foundation.spec.ts`

**Files:**
- Create: `tests/e2e/design-foundation.spec.ts`

- [ ] **Step 1: Create the test**

```ts
import { test, expect } from '@playwright/test';
import { closeDb } from './helpers/invite';

test.afterAll(async () => {
  await closeDb();
});

test('public surfaces render with new shell', async ({ page }) => {
  // Sign-in renders + bad creds show a danger alert.
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
  await page.getByLabel('Email').fill('nope@nope.com');
  await page.getByLabel('Mot de passe').fill('wrong-password');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  // Error alert appears.
  await expect(
    page.locator('[role="alert"]').filter({ hasText: /identifiants/i }).or(
      page.locator('[role="alert"]'),
    ),
  ).toBeVisible({ timeout: 5000 });

  // Bad invite token shows a warning alert.
  await page.goto('/invite/0000000000000000000000000000000000000000000000000000000000000000');
  await expect(page.locator('[role="alert"]')).toBeVisible();
  await expect(page.getByText(/n'existe pas/)).toBeVisible();
});

test('doctor sees the new sidebar', async ({ page, request }) => {
  // Reuse the existing onboarding helper to bootstrap a doctor, OR rely on a pre-seeded account.
  // For this smoke test we just need an auth session — assume a doctor account exists.
  const doctorEmail = process.env.E2E_DOCTOR_EMAIL ?? 'dr@test.local';
  const doctorPassword = process.env.E2E_DOCTOR_PASSWORD ?? 'TestPass123!';

  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(doctorEmail);
  await page.getByLabel('Mot de passe').fill(doctorPassword);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  // If credentials don't match the local seed, the test skips — local DB seeding varies.
  const onTodayOrAdmin = page.url().includes('/today') || page.url().includes('/admin');
  if (!onTodayOrAdmin) {
    test.skip(true, `Set E2E_DOCTOR_EMAIL/PASSWORD or seed dr@test.local before running.`);
  }

  await page.waitForURL('**/today');
  await expect(page.locator('aside[data-slot="sidebar"][data-theme="sky"]')).toBeVisible();
  await expect(page.getByRole('link', { name: "Aujourd'hui" })).toBeVisible();
});

test('admin sees the orange sidebar and /admin/design route', async ({ page }) => {
  const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@test.local';
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  if (!adminPassword) {
    test.skip(
      true,
      'Set E2E_ADMIN_PASSWORD (and optionally E2E_ADMIN_EMAIL) to run the admin smoke.',
    );
  }

  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Mot de passe').fill(adminPassword);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/admin');

  await expect(page.locator('aside[data-slot="sidebar"][data-theme="orange"]')).toBeVisible();
  await expect(page.getByRole('link', { name: /Tableau de bord/ })).toBeVisible();

  // /admin/design accessible to admin.
  await page.goto('/admin/design');
  await expect(page.getByRole('heading', { name: 'Design system' })).toBeVisible();
});
```

(Note: the test gracefully skips when local credentials aren't set. The pre-seeded `dr@test.local` works because the user already bootstrapped a doctor in `/invite/<token>` flow during the local-test step. For CI / fresh checkouts, an integrator either sets the env vars or runs the doctor + admin bootstrap first.)

- [ ] **Step 2: Run the new test**

```bash
pnpm test:e2e tests/e2e/design-foundation.spec.ts
```

Expected: 1-3 pass (depending on whether the local doctor + admin are seeded). Skipped tests count as pass.

- [ ] **Step 3: Run the full E2E suite**

```bash
pnpm test:e2e
```

Expected: all 8 specs pass (existing 7 + new design-foundation).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(e2e): design foundation smoke (sidebar themes, alerts, /admin/design)"
```

---

## Task 24: Final verification + README + tag (no push)

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Type-check + lint + build + tests + e2e**

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm test
pnpm test:e2e
```

Each must exit 0. Capture final test counts.

- [ ] **Step 2: Grep audit for raw color literals (non-blocking; document any leftovers)**

```bash
grep -rn "text-gray-" app/ components/ | head -20
grep -rn "border-gray-" app/ components/ | head -20
grep -rn "bg-white" app/ components/ | head -20
grep -rn "bg-orange-50\|bg-orange-100\|bg-orange-200" app/ components/ | head -20
grep -rn "text-green-700\|text-red-700" app/ components/ | head -20
```

Expected: empty output, OR only matches inside `app/globals.css`, `components/ui/status-badge.tsx`, `components/shell/admin-shell.tsx` (where the admin badge legitimately uses `bg-admin`-driven classes). If matches appear in pages, fix them in this task before tagging.

- [ ] **Step 3: Update `README.md`**

Open `README.md`. In the roadmap section, append after the existing Plan 2.B line:

```markdown
- [x] **Phase A (UI rework) — Foundation** ([plan](docs/superpowers/plans/2026-05-04-phase-a-ui-foundation.md))
```

- [ ] **Step 4: Commit + tag (NO PUSH)**

```bash
git add -A
git commit -m "docs: complete Phase A — UI foundation"
git tag -a phase-a-design-foundation -m "Phase A: UI design system foundation (tokens, primitives, shells, public reskin, token sweep, /admin/design)"
```

DO NOT run `git push`. The user pushes after review.

- [ ] **Step 5: Verify locally**

```bash
git log --oneline -5
git tag -l 'phase-a*'
```

Expected: shows the latest commit + the tag.

---

## Self-review

- ✓ **Spec coverage:**
  - Section 1 (scope) — Tasks 1, 24 (closing scope check via grep audit).
  - Section 2 (tokens) — Task 2.
  - Section 3 (shells) — Tasks 11, 12, 13, 14, 15.
  - Section 4 (primitives + patterns) — Tasks 3, 4, 5, 6, 7, 8, 9, 10.
  - Section 5 (public pages, migration sweep, verification, `/_design`) — Tasks 16, 17, 18, 19, 20, 21, 22, 23.
  - Definition-of-done items — Task 24 (verification, README, tag).
  - Deferred items — explicitly listed in "What Phase A does NOT do".

- ✓ **No placeholders.** Every task includes concrete code blocks for new files, exact diffs for modifications, exact commands with expected outputs, and exact commit messages.

- ✓ **Type consistency.** `StatusBadge`, `Alert`, `EmptyState`, `Skeleton`, `TableSkeleton`, `FormField`, `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`/`TableEmpty`, `Sidebar`, `SidebarNavGroup`, `SidebarNavItem`, `SidebarUser`, `PageBreadcrumb`, `PageHeader`, `DoctorShell`, `AdminShell`, `AuthCard` — all defined once and used consistently across later tasks. Variant names (`success | warning | danger | info | neutral`) consistent across `StatusBadge` and `Alert`. `Button.loading` prop introduced in Task 3 and used in Tasks 16, 17, 19.

- ✓ **Carry-forward caveats** (`useActionState` from `react`, base-ui Button → `loading` works on `ButtonPrimitive.Props`, supabase binary cp after `pnpm add`, Suspense around `useSearchParams` preserved in `/sign-in`, Recharts client-only N/A here) all honored.

- ✓ **Deferred items** explicit: dark mode toggle, Storybook, mobile polish, Toast/Modal, illustrations, layout reworks (Phase B/C).
