# Patient list live-filter + new Consultations list page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/patients` filters live as the doctor types (no submit). A new `/consultations` route lists the cabinet's consultations with the same live-filter UX. A new sidebar entry exposes the new route.

**Architecture:** One small `'use client'` primitive `<LiveSearchInput>` implements the debounced URL-driven search pattern; both `/patients` and `/consultations` consume it. `/consultations` is a server component reading `?q=` and calling a new `listConsultations` query that joins `patients` for the name. Sidebar nav adds one entry between Aujourd'hui and Patients.

**Tech Stack:** Next.js 16 App Router (`router.replace` + `useSearchParams`), drizzle-orm, vitest, existing UI primitives (`Input`, `Avatar`, `StatusBadge`, `Table`, `EmptyState`, `Section`). No new dependency.

**Spec:** [docs/superpowers/specs/2026-05-05-live-filter-and-consultations-list-design.md](../specs/2026-05-05-live-filter-and-consultations-list-design.md) (commit `ded4c19`).

---

## File map

**Created**
- `components/ui/live-search-input.tsx` — debounced URL-driven search input (`'use client'`).
- `app/(authenticated)/consultations/page.tsx` — server component, lists consultations.
- `tests/unit/consultations/list-queries.test.ts` — `listConsultations` behavior.

**Modified**
- `app/(authenticated)/patients/page.tsx` — swap form-submit search for `<LiveSearchInput>`.
- `lib/consultations/queries.ts` — add `listConsultations` + `ConsultationListRow` type.
- `components/shell/doctor-shell.tsx` — add the "Consultations" nav item with `Stethoscope` icon.

**Untouched**
- `lib/patients/queries.ts` — already returns all non-archived patients on empty `q`.
- `app/(authenticated)/consultations/[id]/*` — the per-consultation detail page is unchanged.
- `db/schema/*`, `supabase/migrations/*` — no schema change.
- `package.json` — no new dependency.

---

## Task 1 — `<LiveSearchInput>` client primitive

**Files:**
- Create: `components/ui/live-search-input.tsx`

This is a small (~75 LOC) `'use client'` component. No automated test — UI components in this repo aren't unit-tested at the component level; manual smoke + the consumer pages (Tasks 2 + 4) validate it. The TDD discipline applies to data-layer Tasks 3.

- [ ] **Step 1: Read an existing client search component for pattern reference**

```bash
cat "app/(authenticated)/consultations/[id]/prescription/search-input.tsx"
```

The medication search input in the prescription editor uses a `setTimeout` + `clearTimeout` debounce pattern with `useTransition`. Mirror its structure (250 ms debounce, transition wrapper).

- [ ] **Step 2: Create `components/ui/live-search-input.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 250;

export function LiveSearchInput({
  defaultQuery,
  placeholder,
  paramName = 'q',
  className,
}: {
  defaultQuery: string;
  placeholder: string;
  paramName?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultQuery);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Push debounced URL updates. When the user clears the input, remove the
  // param entirely so URLs stay clean.
  useEffect(() => {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        next.delete(paramName);
      } else {
        next.set(paramName, trimmed);
      }
      const qs = next.toString();
      const url = qs.length > 0 ? `${pathname}?${qs}` : pathname;
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    }, DEBOUNCE_MS);
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn('relative flex-1 min-w-[240px] max-w-md', className)}>
      <Search
        className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
        aria-label={placeholder}
      />
    </div>
  );
}
```

Notes:
- The effect intentionally depends only on `value` — re-running when `searchParams` changes would create a feedback loop (router.replace updates searchParams, which would re-run the effect).
- `router.replace` + `scroll: false` keeps the user's scroll position stable while typing.
- Other query params (e.g. `archived=1` on `/patients`) are preserved via `new URLSearchParams(searchParams.toString())`.
- The Search icon and outer wrapper styling exactly mirror the existing pattern in `app/(authenticated)/patients/page.tsx:49-61` so the visual is identical.

- [ ] **Step 3: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean exit, zero output.

- [ ] **Step 4: Run the existing unit suite (regression check, no new tests added by this task)**

```bash
pnpm test
```

Expected: same 174/174 (or whatever the current baseline is) — no regressions, no new tests added.

- [ ] **Step 5: Commit — STAGE ONLY THIS FILE**

```bash
git add components/ui/live-search-input.tsx
git status --porcelain | grep -E "^[MA]" | grep -v -E "components/ui/live-search-input\.tsx$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(ui): LiveSearchInput debounced URL-driven search primitive

Shared client component that updates ?q= via router.replace after a
250ms debounce. Preserves other query params (e.g. archived=1) via
useSearchParams. Used by /patients (Task 2) and the new /consultations
list (Task 4).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — Swap `/patients` to use `<LiveSearchInput>`

**Files:**
- Modify: `app/(authenticated)/patients/page.tsx`

The page currently has a `<form action="/patients">` containing the search `<Input>` and a "Rechercher" submit button, plus a hidden `archived` field. Replace with `<LiveSearchInput>` that preserves the `archived` param naturally.

- [ ] **Step 1: Read the current page to confirm structure**

```bash
cat "app/(authenticated)/patients/page.tsx"
```

You'll see the form block at roughly lines 45-76 of the file. Imports include `Search`, `Input`, `Button`, etc.

- [ ] **Step 2: Edit `app/(authenticated)/patients/page.tsx`**

Replace the entire `<form>` block (currently around lines 45-76) — the one starting `<form className="flex flex-wrap items-center gap-2" action="/patients">` and ending with the closing `</form>` — with:

```tsx
        <div className="flex flex-wrap items-center gap-2">
          <LiveSearchInput
            defaultQuery={q}
            placeholder="Recherche : nom, prénom, téléphone, CIN"
          />
          <Link
            href={
              includeArchived
                ? `/patients?q=${encodeURIComponent(q)}`
                : `/patients?q=${encodeURIComponent(q)}&archived=1`
            }
            className={buttonVariants({ variant: 'ghost', size: 'default' })}
          >
            {includeArchived ? 'Masquer archivés' : 'Voir archivés'}
          </Link>
        </div>
```

Notes:
- The "Voir/Masquer archivés" `<Link>` keeps its current behavior — it's a server-side toggle, not part of the live-filter.
- The hidden `<input type="hidden" name="archived" value="1" />` is no longer needed (form is gone). The `LiveSearchInput`'s `useSearchParams` preserves `archived` automatically when typing.
- The submit `<Button>` ("Rechercher") and the wrapping `<form>` are deleted entirely.

Then update the imports at the top of the file:

- Remove `Search` from the `lucide-react` import (no longer used directly here — it's now inside `LiveSearchInput`).
- Remove `Input` from the `@/components/ui/input` import.
- Remove `Button` from the `@/components/ui/button` import (still keep `buttonVariants`).
- Add: `import { LiveSearchInput } from '@/components/ui/live-search-input';`

The final lucide import line should read approximately:

```tsx
import { ArrowRight, Plus, Users } from 'lucide-react';
```

(no `Search`).

The button import becomes:

```tsx
import { buttonVariants } from '@/components/ui/button';
```

(no `Button`).

- [ ] **Step 3: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean. If TypeScript reports unused imports, remove them as listed above. If it reports a missing import, double-check the `LiveSearchInput` import path.

- [ ] **Step 4: Manual smoke (optional but recommended)**

`pnpm dev` is already running. Navigate to `http://localhost:3000/patients`, sign in as a doctor, observe:
- Without typing: the full non-archived patient list is shown.
- Typing: the URL updates to `?q=foo` after ~250 ms; the visible list filters accordingly.
- "Voir archivés" → URL becomes `?q=foo&archived=1`; both archived and non-archived patients matching "foo" show.

If manual smoke isn't feasible, defer to Task 5's full-feature verification.

- [ ] **Step 5: Run unit + RLS suite (regression)**

```bash
pnpm test
```

Expected: same baseline — no test added or removed in this task.

- [ ] **Step 6: Commit — STAGE ONLY THIS FILE**

```bash
git add "app/(authenticated)/patients/page.tsx"
git status --porcelain | grep -E "^[MA]" | grep -v -E "patients/page\.tsx$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(patients): live-filter the patient list

Replace the form-submit search with the new LiveSearchInput so the
list filters as the doctor types (no Enter / submit needed). The
'Voir/Masquer archivés' toggle stays as a server-side Link; URL
preserves both q and archived.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — `listConsultations` query with TDD

**Files:**
- Modify: `lib/consultations/queries.ts`
- Create: `tests/unit/consultations/list-queries.test.ts`

- [ ] **Step 1: Write the failing test at `tests/unit/consultations/list-queries.test.ts`**

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { dbAdmin } from '@/db/client';
import { tenants, userProfiles, patients, appointments, consultations } from '@/db/schema';
import { listConsultations } from '@/lib/consultations/queries';

describe('listConsultations', () => {
  let tenantA: string;
  let doctorA: string;
  let patientBerrada: string;
  let patientAlami: string;

  beforeEach(async () => {
    const [t] = await dbAdmin().insert(tenants).values({ name: 'List T' }).returning();
    tenantA = t.id;

    const [d] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId: tenantA,
        role: 'doctor',
        fullName: 'Dr List',
        email: `dl-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    doctorA = d.id;

    const [p1] = await dbAdmin()
      .insert(patients)
      .values({ tenantId: tenantA, lastName: 'Berrada', firstName: 'Yasmine', gender: 'f', dateOfBirth: '1990-01-01' })
      .returning();
    patientBerrada = p1.id;
    const [p2] = await dbAdmin()
      .insert(patients)
      .values({ tenantId: tenantA, lastName: 'Alami', firstName: 'Ali', gender: 'm', dateOfBirth: '1985-01-01' })
      .returning();
    patientAlami = p2.id;

    // Two consultations for Berrada (one paid, one awaiting), one for Alami (free).
    async function seed(patientId: string, consultedAt: Date, opts: Partial<typeof consultations.$inferInsert>) {
      const [appt] = await dbAdmin()
        .insert(appointments)
        .values({
          tenantId: tenantA,
          patientId,
          status: 'done',
          kind: 'walkin',
          createdBy: doctorA,
          startedAt: consultedAt,
          endedAt: consultedAt,
        })
        .returning();
      await dbAdmin()
        .insert(consultations)
        .values({
          tenantId: tenantA,
          appointmentId: appt.id,
          patientId,
          doctorId: doctorA,
          consultedAt,
          ...opts,
        });
    }

    const today = new Date();
    const yesterday = new Date(Date.now() - 86_400_000);
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000);

    await seed(patientBerrada, today, {
      isFinalized: true,
      finalizedAt: today,
      priceMad: '250.00',
      paymentStatus: 'paid',
      paymentMethod: 'especes',
      paidAt: today,
      paidBy: doctorA,
    });
    await seed(patientBerrada, yesterday, {
      isFinalized: true,
      finalizedAt: yesterday,
      priceMad: '300.00',
      paymentStatus: 'awaiting',
      motif: 'Toux persistante',
    });
    await seed(patientAlami, twoDaysAgo, {
      isFinalized: true,
      finalizedAt: twoDaysAgo,
      priceMad: null,
      isFree: true,
      paymentStatus: 'free',
      paidAt: twoDaysAgo,
      paidBy: doctorA,
    });

    // A consultation in a different tenant (must NOT appear).
    const [otherT] = await dbAdmin().insert(tenants).values({ name: 'Other List T' }).returning();
    const [otherDoc] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId: otherT.id,
        role: 'doctor',
        fullName: 'Dr Other',
        email: `dol-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    const [otherP] = await dbAdmin()
      .insert(patients)
      .values({ tenantId: otherT.id, lastName: 'Berrada', firstName: 'Cross-tenant', gender: 'm', dateOfBirth: '1980-01-01' })
      .returning();
    const [otherAppt] = await dbAdmin()
      .insert(appointments)
      .values({
        tenantId: otherT.id,
        patientId: otherP.id,
        status: 'done',
        kind: 'walkin',
        createdBy: otherDoc.id,
        startedAt: today,
        endedAt: today,
      })
      .returning();
    await dbAdmin()
      .insert(consultations)
      .values({
        tenantId: otherT.id,
        appointmentId: otherAppt.id,
        patientId: otherP.id,
        doctorId: otherDoc.id,
        consultedAt: today,
        priceMad: '999.00',
      });
  });

  it('returns all 3 rows for the tenant, ordered by consultedAt DESC', async () => {
    const rows = await listConsultations(tenantA, '');
    expect(rows.length).toBe(3);
    expect(rows[0].patientFullName).toMatch(/Berrada/);
    expect(rows[2].patientFullName).toMatch(/Alami/);
  });

  it('filters by patient last name (case-insensitive)', async () => {
    const rows = await listConsultations(tenantA, 'berrada');
    expect(rows.length).toBe(2);
    rows.forEach((r) => expect(r.patientFullName).toMatch(/Berrada/));
  });

  it('filters by patient first name (case-insensitive)', async () => {
    const rows = await listConsultations(tenantA, 'ali');
    // 'ali' matches 'Alami' (lastName ILIKE %ali%) AND 'Ali' (firstName ILIKE %ali%) — same patient row.
    expect(rows.length).toBe(1);
    expect(rows[0].patientFullName).toMatch(/Alami Ali/);
  });

  it('returns empty array on no match', async () => {
    const rows = await listConsultations(tenantA, 'NOPE');
    expect(rows).toEqual([]);
  });

  it('isolates by tenant', async () => {
    const rows = await listConsultations(tenantA, 'Berrada');
    // The cross-tenant Berrada row must NOT appear.
    expect(rows.length).toBe(2);
    rows.forEach((r) => expect(r.patientFullName).not.toContain('Cross-tenant'));
  });

  it('propagates payment fields correctly', async () => {
    const rows = await listConsultations(tenantA, '');
    const paid = rows.find((r) => r.paymentStatus === 'paid');
    const awaiting = rows.find((r) => r.paymentStatus === 'awaiting');
    const free = rows.find((r) => r.paymentStatus === 'free');
    expect(paid).toBeDefined();
    expect(awaiting).toBeDefined();
    expect(free).toBeDefined();
    expect(paid!.priceMad).toBe('250.00');
    expect(awaiting!.priceMad).toBe('300.00');
    expect(free!.priceMad).toBeNull();
    expect(awaiting!.motif).toBe('Toux persistante');
  });

  it('respects an explicit limit', async () => {
    const rows = await listConsultations(tenantA, '', { limit: 2 });
    expect(rows.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
pnpm test tests/unit/consultations/list-queries.test.ts
```

Expected: FAIL — `listConsultations` is not exported from `@/lib/consultations/queries`.

- [ ] **Step 3: Add `listConsultations` to `lib/consultations/queries.ts`**

Read the current file first:

```bash
cat lib/consultations/queries.ts
```

It currently exports `getConsultationById`, `listConsultationsForPatient`, `getOpenConsultationForAppointment`. Append the new export.

Update the import line at the top (currently `import { desc, eq } from 'drizzle-orm';`) to also include `and`, `ilike`, `or`:

```ts
import { and, desc, eq, ilike, or } from 'drizzle-orm';
```

Add the import for `patients` (currently the file only imports `consultations`/`consultationVitals` from `@/db/schema`):

```ts
import {
  consultations,
  consultationVitals,
  patients,
  type Consultation,
  type ConsultationVitals,
} from '@/db/schema';
```

Append at the end of the file:

```ts
export type ConsultationListRow = {
  id: string;
  patientId: string;
  patientFullName: string;
  consultedAt: Date;
  motif: string | null;
  isFinalized: boolean;
  paymentStatus: 'awaiting' | 'paid' | 'free';
  priceMad: string | null;
};

const ESCAPE_PATTERN = /[\\%_]/g;
function escapeIlike(input: string): string {
  return input.replace(ESCAPE_PATTERN, (m) => '\\' + m);
}

export async function listConsultations(
  tenantId: string,
  query: string,
  opts: { limit?: number } = {},
): Promise<ConsultationListRow[]> {
  const limit = Math.min(opts.limit ?? 100, 500);
  const trimmed = query.trim();
  return withTenantTx(tenantId, async (tx) => {
    const where = trimmed
      ? or(
          ilike(patients.firstName, `%${escapeIlike(trimmed)}%`),
          ilike(patients.lastName, `%${escapeIlike(trimmed)}%`),
        )
      : undefined;
    const rows = await tx
      .select({
        id: consultations.id,
        patientId: consultations.patientId,
        lastName: patients.lastName,
        firstName: patients.firstName,
        consultedAt: consultations.consultedAt,
        motif: consultations.motif,
        isFinalized: consultations.isFinalized,
        paymentStatus: consultations.paymentStatus,
        priceMad: consultations.priceMad,
      })
      .from(consultations)
      .innerJoin(patients, eq(patients.id, consultations.patientId))
      .where(where)
      .orderBy(desc(consultations.consultedAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      patientId: r.patientId,
      patientFullName: `${r.lastName} ${r.firstName}`.trim(),
      consultedAt: r.consultedAt,
      motif: r.motif,
      isFinalized: r.isFinalized,
      paymentStatus: r.paymentStatus as 'awaiting' | 'paid' | 'free',
      priceMad: r.priceMad,
    }));
  });
}
```

Notes:
- The function uses `withTenantTx`, so the tenant filter is enforced by RLS via the GUC. No explicit `eq(consultations.tenantId, tenantId)` is needed in `where` (that would be a redundant predicate since the existing tests for `getPaymentsForToday` already follow the explicit-predicate pattern with `dbAdmin`, but here we're using `withTenantTx` which sets `app.tenant_id` for RLS). Both styles exist in the codebase; use `withTenantTx` here because that's the pattern of the rest of `lib/consultations/queries.ts` (the existing `getConsultationById`, `listConsultationsForPatient`, `getOpenConsultationForAppointment` all use it).
- `escapeIlike` is duplicated from `lib/patients/queries.ts:17` — the helper is 3 lines, duplication is fine to keep modules independent.

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test tests/unit/consultations/list-queries.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Run full unit + RLS suite**

```bash
pnpm test
```

Expected: baseline + 7 new tests pass.

- [ ] **Step 6: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 7: Commit — STAGE ONLY THESE TWO FILES**

```bash
git add lib/consultations/queries.ts tests/unit/consultations/list-queries.test.ts
git status --porcelain | grep -E "^[MA]" | grep -v -E "consultations/queries\.ts$|consultations/list-queries\.test\.ts$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(consultations): listConsultations query for the new /consultations page

Joins patients for the full name, filters by patient first/last name
ILIKE (case-insensitive), orders by consultedAt DESC, default limit
of 100. Returns ConsultationListRow with id, patient name, motif,
isFinalized, paymentStatus, priceMad.

Tenant isolation via withTenantTx (matches the pattern of the other
queries in this module).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — `/consultations` page + sidebar nav

**Files:**
- Create: `app/(authenticated)/consultations/page.tsx`
- Modify: `components/shell/doctor-shell.tsx`

The page is shared with the assistant (no role gating beyond `requireSession`).

- [ ] **Step 1: Create `app/(authenticated)/consultations/page.tsx`**

```tsx
import Link from 'next/link';
import { ArrowRight, Stethoscope } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { listConsultations } from '@/lib/consultations/queries';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { LiveSearchInput } from '@/components/ui/live-search-input';
import { PageHeader } from '@/components/shell/page-header';
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
import { formatMad } from '@/lib/medications/format';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ q?: string }>;
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatusCell({
  isFinalized,
  paymentStatus,
  priceMad,
}: {
  isFinalized: boolean;
  paymentStatus: 'awaiting' | 'paid' | 'free';
  priceMad: string | null;
}) {
  if (!isFinalized) {
    return <StatusBadge variant="neutral">En cours</StatusBadge>;
  }
  if (paymentStatus === 'free') {
    return <StatusBadge variant="neutral">Gratuit</StatusBadge>;
  }
  if (paymentStatus === 'awaiting') {
    return (
      <StatusBadge variant="warning">
        En attente · {formatMad(priceMad)}
      </StatusBadge>
    );
  }
  // paid
  return (
    <StatusBadge variant="success">
      Payé · {formatMad(priceMad)}
    </StatusBadge>
  );
}

export default async function ConsultationsPage({ searchParams }: Props) {
  const session = await requireSession();
  const { q = '' } = await searchParams;
  const rows = await listConsultations(session.tenantId, q);

  return (
    <>
      <PageHeader title="Consultations" description="Historique des consultations du cabinet." />
      <div className="px-6 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <LiveSearchInput
            defaultQuery={q}
            placeholder="Recherche par patient (nom, prénom)"
          />
        </div>

        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5}>
                  <EmptyState
                    icon={Stethoscope}
                    title="Aucune consultation"
                    description={
                      q
                        ? `Aucun résultat pour « ${q} ».`
                        : 'Les consultations apparaîtront ici.'
                    }
                  />
                </TableEmpty>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="py-2">
                      <Link
                        href={`/consultations/${r.id}`}
                        className="flex items-center gap-3 -mx-3 -my-2 px-3 py-2 focus-visible:outline-none focus-visible:bg-muted/60"
                        aria-label={`Ouvrir la consultation de ${r.patientFullName}`}
                      >
                        <Avatar name={r.patientFullName} size="md" />
                        <span className="font-medium text-foreground">
                          {r.patientFullName}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {fmtDate(r.consultedAt)}
                    </TableCell>
                    <TableCell className="text-small text-muted-foreground max-w-md">
                      <span className="line-clamp-1">{r.motif ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      <StatusCell
                        isFinalized={r.isFinalized}
                        paymentStatus={r.paymentStatus}
                        priceMad={r.priceMad}
                      />
                    </TableCell>
                    <TableCell className="text-right pr-3">
                      <Link
                        href={`/consultations/${r.id}`}
                        className="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        style={{ transitionDuration: 'var(--duration-fast)' }}
                        aria-label={`Ouvrir ${r.patientFullName}`}
                      >
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
```

If `StatusBadge` doesn't accept `variant: 'neutral'`, inspect `components/ui/status-badge.tsx` and adjust. The same variants were used in Task 8 of the prior plan (`finalized-tarification-badge.tsx`), so they should all be valid.

- [ ] **Step 2: Add the sidebar nav item**

Open `components/shell/doctor-shell.tsx`. Locate the lucide-react import at the top:

```tsx
import {
  BarChart3,
  CalendarDays,
  History,
  Settings,
  Users,
  Users2,
} from 'lucide-react';
```

Add `Stethoscope`:

```tsx
import {
  BarChart3,
  CalendarDays,
  History,
  Settings,
  Stethoscope,
  Users,
  Users2,
} from 'lucide-react';
```

Then locate the shared "Cabinet" `<SidebarNavGroup>` (currently at roughly lines 42-50 of the file):

```tsx
<SidebarNavGroup label="Cabinet">
  <SidebarNavItem href="/today" icon={<CalendarDays className="size-4" aria-hidden />}>
    Aujourd&apos;hui
  </SidebarNavItem>
  <SidebarNavItem href="/patients" icon={<Users className="size-4" aria-hidden />}>
    Patients
  </SidebarNavItem>
</SidebarNavGroup>
```

Insert the new "Consultations" item between Aujourd'hui and Patients:

```tsx
<SidebarNavGroup label="Cabinet">
  <SidebarNavItem href="/today" icon={<CalendarDays className="size-4" aria-hidden />}>
    Aujourd&apos;hui
  </SidebarNavItem>
  <SidebarNavItem href="/consultations" icon={<Stethoscope className="size-4" aria-hidden />}>
    Consultations
  </SidebarNavItem>
  <SidebarNavItem href="/patients" icon={<Users className="size-4" aria-hidden />}>
    Patients
  </SidebarNavItem>
</SidebarNavGroup>
```

The doctor-only "Compte" group is unchanged.

- [ ] **Step 3: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Run unit + RLS suite (regression)**

```bash
pnpm test
```

Expected: same baseline + the 7 new `listConsultations` tests from Task 3 — total should be **baseline + 7**.

- [ ] **Step 5: Manual smoke (optional)**

Navigate to `http://localhost:3000`, sign in as a doctor or assistant, click "Consultations" in the sidebar. Expected:
- Route loads at `/consultations`.
- Up to 100 most-recent consultations listed, sorted by date DESC.
- Status badge rendered correctly per row (En cours / En attente / Payé / Gratuit).
- Typing in the search bar live-filters by patient name within ~250 ms.
- Clicking a row navigates to `/consultations/[id]`.

- [ ] **Step 6: Commit — STAGE ONLY THESE TWO FILES**

```bash
git add "app/(authenticated)/consultations/page.tsx" components/shell/doctor-shell.tsx
git status --porcelain | grep -E "^[MA]" | grep -v -E "consultations/page\.tsx$|shell/doctor-shell\.tsx$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(consultations): list page + sidebar nav

New /consultations route shows the most-recent 100 consultations of
the cabinet, ordered by consultedAt DESC, with live search by patient
name. Each row shows the appropriate status badge (En cours / En
attente · X MAD / Payé · X MAD / Gratuit) and links to the existing
detail page. Shared with assistant (no role gating beyond requireSession).

Sidebar gains a 'Consultations' item between 'Aujourd''hui' and
'Patients' in the shared Cabinet group, with the Stethoscope icon.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — Final verification + push

**Files:** none (verification + push only).

- [ ] **Step 1: Full test sweep**

```bash
pnpm test
pnpm exec tsc --noEmit
```

Expected: baseline + 7 new tests = total 181 (if baseline was 174). tsc clean.

- [ ] **Step 2: Verify the commit log**

```bash
git log ded4c19..HEAD --oneline
```

Expected: 4 commits in this order (Task 5 has no commit of its own):

```
feat(consultations): list page + sidebar nav
feat(consultations): listConsultations query for the new /consultations page
feat(patients): live-filter the patient list
feat(ui): LiveSearchInput debounced URL-driven search primitive
```

If a commit is missing, the corresponding task wasn't completed.

- [ ] **Step 3: Spec acceptance check (manual)**

Walk through the spec's acceptance criteria (1–10) against the current state. Each must be satisfied:

| # | Criterion | Verified by |
|---|---|---|
| 1 | `/patients` shows all non-archived patients on first load | Manual smoke (Task 2 step 4) |
| 2 | Patients live-filter within ~250 ms | Manual smoke (Task 2 step 4) |
| 3 | "Voir/Masquer archivés" works alongside live search; URL preserves both | LiveSearchInput preserves searchParams (Task 1 step 2) |
| 4 | New "Consultations" sidebar item visible to doctor + assistant | Task 4 step 2 (added to shared group) |
| 5 | `/consultations` shows up to 100 consultations sorted DESC | listConsultations limit 100 + ORDER BY (Task 3) |
| 6 | Patient-name live-filter on `/consultations` | LiveSearchInput + listConsultations ILIKE (Tasks 1, 3, 4) |
| 7 | Each row's status badge correct for its state | StatusCell helper (Task 4 step 1) |
| 8 | Clicking a row navigates to `/consultations/[id]` | `<Link href={`/consultations/${r.id}`}>` (Task 4 step 1) |
| 9 | Tests pass; tsc clean | Step 1 of this task |
| 10 | No new dependency / migration / schema change | `git diff main..HEAD -- package.json supabase/migrations db/schema` empty |

If any criterion fails, STOP and report.

- [ ] **Step 4: Push to origin**

Per the saved auto-push preference, push directly without asking:

```bash
git push origin main
```

Expected: a clean fast-forward push showing the 4 new commits landing on `origin/main`.

- [ ] **Step 5: Working tree confirmation**

```bash
git status
```

Expected: `On branch main`, `Your branch is up to date with 'origin/main'`, working tree clean (no untracked files except the known `1.png`/`DOCTPOUS.png` if they ever reappeared, and they should not have).
