# Patient list live-filter + new Consultations list page

> **Why now**: post-launch QoL. The doctor's `/patients` page currently requires submitting a form to filter the list — type-and-Enter friction during real consultation prep. There is also no listing of past consultations: the only entry point to a consultation is the day's schedule on `/today`. This spec adds two small navigation improvements as one cohesive slice.

**Goal**: `/patients` filters live as the doctor types (no submit). A new `/consultations` route lists the cabinet's consultations with the same live-filter UX. A new sidebar entry exposes the new route.

**Architecture**: One small `'use client'` component (`<LiveSearchInput>`) implements debounced URL updates via `router.replace`. It is shared between the patients page and the new consultations page. The consultations page reuses the same server-component pattern as `/patients` (server reads `?q=`, calls a new `listConsultations` query, renders a `Table`).

**Tech stack**: Next.js 16 (Turbopack), drizzle-orm, existing UI primitives (`Table`, `Avatar`, `StatusBadge`, `Input`, `EmptyState`), `lucide-react` icons. **No new dependency.**

**Prerequisites**: consultation pricing feature (commits `af7c919..2933d13` on `main`).

---

## What this spec does NOT do

- **No date-range filter** on `/consultations` (deferred — was option B in brainstorming).
- **No motif / diagnosis full-text search** (deferred — was option C; would require a `pg_trgm` index on motif/diagnosis).
- **No pagination.** Limit=100 hard cap. Pagination lands when an actual cabinet hits the limit.
- **No archived-consultations toggle.** Consultations have no `isArchived` column today; out of scope.
- **No bulk actions, no export.** Per-row link to `/consultations/[id]` is the only interaction.
- **No change to the patient row UX** beyond the search input. Avatars, columns, archived toggle all stay.
- **No change to `/today` or any existing consultation surfaces.** This is purely additive navigation.

---

## File structure

**New files**

```
components/
  ui/
    live-search-input.tsx                            # 'use client' debounced URL-driven search input

app/
  (authenticated)/
    consultations/
      page.tsx                                       # server component, lists consultations

tests/
  unit/
    consultations/
      list-queries.test.ts                           # listConsultations behavior
```

**Files modified**

```
app/(authenticated)/patients/page.tsx                # replace <form action> with <LiveSearchInput>
lib/consultations/queries.ts                         # add listConsultations + ConsultationListRow
components/shell/doctor-shell.tsx                    # add 'Consultations' nav item
```

**Files NOT modified**

- `lib/patients/queries.ts` — already returns all non-archived patients on empty `q`. No change needed.
- `app/(authenticated)/consultations/[id]/*` — the per-consultation page is unchanged.
- Any RLS / migration / schema file.

---

## Part 1 — Live search input primitive

`components/ui/live-search-input.tsx` is a small client component that:
1. Takes a `defaultQuery: string`, a `placeholder: string`, and a `paramName: string` (defaults to `'q'`).
2. Uses local state for the input value (so typing is responsive).
3. On change, debounces ~250 ms and calls `router.replace(`${pathname}?${updatedSearchParams}`, { scroll: false })`. Preserves other query params (e.g., `archived=1` on `/patients`).
4. If the user clears the input, the `paramName` query param is removed (not set to empty string), keeping URLs clean.

**Signature:**

```tsx
export function LiveSearchInput({
  defaultQuery,
  placeholder,
  paramName,
  className,
}: {
  defaultQuery: string;
  placeholder: string;
  paramName?: string;
  className?: string;
}): JSX.Element;
```

**Implementation notes:**
- Imports: `useState`, `useEffect`, `useRef`, `useTransition` from `react`; `useRouter`, `usePathname`, `useSearchParams` from `next/navigation`; `Input` from `@/components/ui/input`; `Search` from `lucide-react`.
- The Search icon renders inside the input via the existing absolute-positioned pattern (see `app/(authenticated)/patients/page.tsx:49-53`).
- Visual: identical to the current patients-page input shape (`pl-8`, `flex-1 min-w-[240px] max-w-md`).
- Debounce: 250 ms, implemented with a `setTimeout` cleared on each keystroke. No external dependency.
- Server-component pages re-render automatically when `router.replace` updates the URL (Next.js App Router behavior).

**Why a shared primitive instead of two ad-hoc inputs**: both `/patients` and `/consultations` will use the exact same debounce + URL-update pattern. A shared `<LiveSearchInput>` is ~50 lines, used in 2 places, and easy to test once.

---

## Part 2 — Patient list page changes

### Current state (recap)

`app/(authenticated)/patients/page.tsx` has a `<form action="/patients">` containing a search `<Input>`, a "Rechercher" submit button, and an "archived toggle" link. Submitting the form (Enter or button click) reloads the page with `?q=foo`. `searchPatients(tenantId, q)` already returns all non-archived patients when `q=''`, so the default page (no search) shows the full list — no DB change needed.

### After this spec

- `<form action="/patients">` is removed.
- The `<Input>` + `<Button>` pair becomes `<LiveSearchInput defaultQuery={q} placeholder="Recherche : nom, prénom, téléphone, CIN" />`.
- The "Voir / Masquer archivés" link stays exactly as today (still a server-side `<Link>`, since the toggle is binary and infrequent).
- The hidden `<input type="hidden" name="archived" value="1" />` form field is no longer needed (form is gone). The `LiveSearchInput` preserves the `archived` query param via `useSearchParams`, so toggling it still works alongside live search.

### Acceptance for Part 2

- `/patients` with no query renders all non-archived patients (≤50, sorted by `createdAt DESC`).
- Typing 'ber' filters to patients whose first/last/phone/CIN contain 'ber' within ~250 ms; no Enter / submit required.
- Clearing the input restores the full list within ~250 ms.
- "Voir archivés" toggle still works in combination with the search input.
- The URL reflects the current search (e.g., `/patients?q=ber&archived=1`), shareable and bookmarkable.
- The page works without JavaScript: with JS off, the `LiveSearchInput` would not debounce, but the input still renders; pressing Enter still submits via native form behavior since the input lives outside a form **— this graceful-degradation story is out of scope; assume JS-on**.

---

## Part 3 — New `/consultations` listing route

### Server query — `listConsultations`

Add to `lib/consultations/queries.ts`:

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

export async function listConsultations(
  tenantId: string,
  query: string,
  opts: { limit?: number } = {},
): Promise<ConsultationListRow[]>;
```

**SQL shape (drizzle query builder):**

```ts
const limit = Math.min(opts.limit ?? 100, 500);
const trimmed = query.trim();
return withTenantTx(tenantId, async (tx) => {
  const where = trimmed
    ? and(
        eq(consultations.tenantId, tenantId), // redundant under withTenantTx RLS but defensive
        or(
          ilike(patients.firstName, `%${escapeIlike(trimmed)}%`),
          ilike(patients.lastName, `%${escapeIlike(trimmed)}%`),
        ),
      )
    : undefined;
  return tx
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
});
```

The `escapeIlike` helper already exists in `lib/patients/queries.ts:17`. Either re-export from there or duplicate the 3 lines (the helper is small enough that duplication is acceptable; choose duplication to keep `lib/patients` and `lib/consultations` independent).

**Result mapping** (after the select) wraps the row into `ConsultationListRow` with `patientFullName: \`${lastName} ${firstName}\`.trim()`.

### Page — `/consultations/page.tsx`

```tsx
type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ConsultationsPage({ searchParams }: Props) {
  const session = await requireSession();
  const { q = '' } = await searchParams;
  const rows = await listConsultations(session.tenantId, q);
  return (
    <>
      <PageHeader title="Consultations" description="Historique des consultations du cabinet." />
      <div className="px-6 py-6 space-y-4">
        <LiveSearchInput
          defaultQuery={q}
          placeholder="Recherche par patient (nom, prénom)"
          className="max-w-md"
        />
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
                      q ? `Aucun résultat pour « ${q} ».` : 'Les consultations apparaîtront ici.'
                    }
                  />
                </TableEmpty>
              ) : (
                rows.map((r) => <ConsultationRow key={r.id} row={r} />)
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
```

**`ConsultationRow`** is an inline server-rendered helper (no separate file unless it grows):

- `<Avatar name={r.patientFullName} size="sm" />` + bolded patient name.
- Date: `r.consultedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })`.
- Motif: truncated `motif ?? '—'`, max ~80 chars (CSS `line-clamp-1` on the cell).
- Statut: a single `<StatusBadge>` with one of:
  - `!isFinalized` → variant=`'neutral'`, label=`En cours`.
  - `paymentStatus='awaiting'` → variant=`'warning'`, label=`En attente · ${formatMad(priceMad)}`.
  - `paymentStatus='paid'` → variant=`'success'`, label=`Payé · ${formatMad(priceMad)}`.
  - `paymentStatus='free'` → variant=`'neutral'`, label=`Gratuit`.
- Trailing arrow link to `/consultations/${r.id}` (same `ArrowRight` chevron as `/patients`).

The whole row is wrapped so clicking anywhere navigates (mirroring `/patients`'s `<Link>` wrapping the avatar + name cell).

### Access

`requireSession()` (not `requireDoctor()`): the consultations list is shared between doctor and assistant. The assistant needs to see consultations to know what's in the queue. RLS limits visibility to the same tenant; existing tenant-scoped policies on `consultations` (migration `20260502100000_rls_consultations.sql`) cover this transparently.

### Acceptance for Part 3

- `/consultations` is reachable for both doctor and assistant.
- Default load shows up to 100 consultations sorted by `consultedAt DESC`.
- Typing in the search input live-filters by patient first/last name within ~250 ms.
- Each row renders the correct status badge for its state (En cours / En attente / Payé / Gratuit).
- Clicking a row navigates to `/consultations/[id]` (existing per-consultation page).
- Empty state shows the right message depending on whether `q` is set.

---

## Part 4 — Sidebar nav entry

In `components/shell/doctor-shell.tsx`, the shared "Cabinet" group currently has:

```tsx
<SidebarNavItem href="/today" icon={<CalendarDays …/>}>Aujourd'hui</SidebarNavItem>
<SidebarNavItem href="/patients" icon={<Users …/>}>Patients</SidebarNavItem>
```

Insert a new item **between** them:

```tsx
<SidebarNavItem href="/today" icon={<CalendarDays …/>}>Aujourd'hui</SidebarNavItem>
<SidebarNavItem href="/consultations" icon={<Stethoscope …/>}>Consultations</SidebarNavItem>
<SidebarNavItem href="/patients" icon={<Users …/>}>Patients</SidebarNavItem>
```

`Stethoscope` is already imported in `app/(authenticated)/today/page.tsx`; add it to `doctor-shell.tsx`'s lucide-react import line.

---

## Testing

- **Unit (`tests/unit/consultations/list-queries.test.ts`)**: seed 3 consultations across 2 patients in a tenant, plus 1 consultation in a separate tenant. Assert:
  - `listConsultations(tenant.id, '')` returns the 3 rows for this tenant only, ordered by `consultedAt DESC`.
  - `listConsultations(tenant.id, '<lastName>')` returns only the matching patient's consultations.
  - `listConsultations(tenant.id, 'NOMATCH')` returns `[]`.
  - The `paymentStatus` field is propagated correctly for all three states (use the existing fixture default + targeted overrides).
- **No e2e additions.** The live-filter behavior is best validated via manual smoke; an e2e for "type → debounce → URL update → re-render" is fragile and not load-bearing.
- **No RLS test.** Existing tenant-scoped consultation RLS already tested by `tests/rls/consultation-pricing.test.ts` and `tests/rls/consultations.test.ts`. The new `listConsultations` query benefits from the same policies transparently; a new RLS test would duplicate.

---

## Risks and assumptions

- **Debounced URL updates and concurrent requests.** Each keystroke after 250 ms triggers a server fetch. Fast typists generate a few in-flight requests; React's transitions and the latest-response-wins behavior of `router.replace` handle this naturally. No throttle is needed.
- **`router.replace` history.** Using `replace` (not `push`) means search-state changes don't pollute the back-stack. Going Back from `/consultations?q=ber` returns to wherever they came from, not through every keystroke.
- **`scroll: false`** on `router.replace` keeps the user's scroll position stable as they type. Necessary because Next.js's default scrolls to the top.
- **Limit = 100.** A real cabinet does ~10–30 consultations/day. 100 covers the last 3–10 days. If a cabinet has a heavier flow and the limit becomes annoying, that's the trigger to add pagination — defer until then.
- **JS-off accessibility.** With JS disabled, the `<LiveSearchInput>` is just an `<input>` outside any `<form>`. Submitting it does nothing. We accept this for v1 — admin/clinical users always have JS.
- **Patient name search only, not motif.** A doctor looking for "the toux patient from last week" will need to scan visually. Acceptable for v1; full-text search is queued.

---

## Acceptance criteria — combined

1. `/patients` shows all non-archived patients on first load (no search required) — already true; verified by manual smoke after the change.
2. Typing in the patients search bar live-filters within ~250 ms; no submit/Enter needed.
3. The "Voir/Masquer archivés" link still works alongside the live search; URL preserves both `q` and `archived`.
4. New "Consultations" sidebar item between "Aujourd'hui" and "Patients", visible to both doctor and assistant.
5. `/consultations` shows the most recent 100 consultations sorted by `consultedAt DESC`.
6. Patient-name search on `/consultations` live-filters as you type.
7. Each row's status badge correctly shows one of: `En cours`, `En attente · X MAD`, `Payé · X MAD`, `Gratuit`.
8. Clicking a row links to `/consultations/[id]` (existing detail page).
9. Tests pass; tsc clean.
10. No new dependency in `package.json`. No new migration. No schema change.
