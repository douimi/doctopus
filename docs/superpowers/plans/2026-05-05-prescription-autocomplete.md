# Prescription form autocomplete (Posologie + Durée) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Posologie and Durée inputs in the prescription editor show a native browser dropdown of suggestions on focus. Suggestions = doctor's most-frequently-used values from `prescription_items` history merged with a static list of common Moroccan-practice values (history first, case-insensitive deduped).

**Architecture:** HTML `<datalist>` does the dropdown. One server function (`getAutocompleteSuggestions`) runs two parallel `GROUP BY` queries against `prescription_items`, merges with static lists, returns `{ posologies, durations }`. The consultation page fetches once on render and passes the result to `<PrescriptionEditor>`, which renders two shared `<datalist>` elements and adds `list=` attributes to the four relevant inputs.

**Tech Stack:** Next.js 16 server components, drizzle-orm, vitest. Native HTML `<datalist>`. **No new dependency. No schema change. No migration.**

**Spec:** [docs/superpowers/specs/2026-05-05-prescription-autocomplete-design.md](../specs/2026-05-05-prescription-autocomplete-design.md) (commit `85769f3`).

---

## File map

**Created**
- `lib/prescriptions/autocomplete.ts` — `STATIC_POSOLOGIES`, `STATIC_DURATIONS`, `mergeUnique`, `getAutocompleteSuggestions`, plus the `AutocompleteSuggestions` type.
- `tests/unit/prescriptions/autocomplete.test.ts` — `mergeUnique` unit cases + `getAutocompleteSuggestions` integration cases (history-first ordering, tenant isolation).

**Modified**
- `app/(authenticated)/consultations/[id]/page.tsx` — add 1 sequential fetch after the `tenant` block; pass `suggestions` prop.
- `app/(authenticated)/consultations/[id]/prescription/editor.tsx` — accept the new `suggestions` prop, render two `<datalist>`s, add `list="..."` to the four target inputs.

**Untouched**
- All schema files, all migrations, `package.json`, the prescription PDF rendering, the line-item state machine, the medication search input, and every other path.

---

## Task 1 — `lib/prescriptions/autocomplete.ts` with TDD

**Files:**
- Create: `lib/prescriptions/autocomplete.ts`
- Test: `tests/unit/prescriptions/autocomplete.test.ts`

This task includes both the helper (pure function, easy to unit-test) AND the DB-touching `getAutocompleteSuggestions` (integration tested against the live local Postgres, same pattern as `tests/unit/payments/queries.test.ts`).

- [ ] **Step 1: Write the failing test at `tests/unit/prescriptions/autocomplete.test.ts`**

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { dbAdmin } from '@/db/client';
import {
  tenants,
  userProfiles,
  patients,
  appointments,
  consultations,
  prescriptions,
  prescriptionItems,
} from '@/db/schema';
import {
  STATIC_POSOLOGIES,
  STATIC_DURATIONS,
  mergeUnique,
  getAutocompleteSuggestions,
} from '@/lib/prescriptions/autocomplete';

describe('mergeUnique', () => {
  it('returns the static list when history is empty', () => {
    const out = mergeUnique([], STATIC_POSOLOGIES);
    expect(out.length).toBe(STATIC_POSOLOGIES.length);
    expect(out[0]).toBe(STATIC_POSOLOGIES[0]);
  });

  it('places history before static, deduping case-insensitively', () => {
    const out = mergeUnique(['x', 'y'], ['Y', 'z']);
    expect(out).toEqual(['x', 'y', 'z']);
  });

  it('preserves the history form on case/space dedup (history wins)', () => {
    const out = mergeUnique(['  1 CP  '], ['1 cp']);
    expect(out.length).toBe(1);
    expect(out[0]).toBe('  1 CP  ');
  });

  it('drops empty / whitespace history entries but keeps the static list', () => {
    const out = mergeUnique(['', '  '], ['a', 'b']);
    expect(out).toEqual(['a', 'b']);
  });
});

describe('getAutocompleteSuggestions', () => {
  let tenantA: string;
  let doctorA: string;
  let otherDoctor: string;
  let patientA: string;
  let appointmentA: string;
  let consultationA: string;

  async function newPrescriptionWithItems(
    tenantId: string,
    consultationId: string,
    patientId: string,
    doctorId: string,
    items: Array<{ posologie: string | null; duration: string | null }>,
  ) {
    const [p] = await dbAdmin()
      .insert(prescriptions)
      .values({ tenantId, consultationId, patientId, doctorId })
      .returning();
    let pos = 0;
    for (const it of items) {
      await dbAdmin().insert(prescriptionItems).values({
        tenantId,
        prescriptionId: p.id,
        position: pos++,
        medicationLabelSnapshot: 'Test Med',
        posologie: it.posologie,
        duration: it.duration,
      });
    }
  }

  beforeEach(async () => {
    const [t] = await dbAdmin().insert(tenants).values({ name: 'AC Tenant' }).returning();
    tenantA = t.id;

    const [d] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId: tenantA,
        role: 'doctor',
        fullName: 'Dr AC',
        email: `dac-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    doctorA = d.id;

    const [d2] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId: tenantA,
        role: 'assistant',
        fullName: 'Other AC',
        email: `oac-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    otherDoctor = d2.id; // assistant; we'll just want to seed a prescription under another user_profile

    const [p] = await dbAdmin()
      .insert(patients)
      .values({ tenantId: tenantA, lastName: 'AC', firstName: 'P', gender: 'm', dateOfBirth: '1990-01-01' })
      .returning();
    patientA = p.id;

    const [a] = await dbAdmin()
      .insert(appointments)
      .values({
        tenantId: tenantA,
        patientId: patientA,
        status: 'done',
        kind: 'walkin',
        createdBy: doctorA,
        startedAt: new Date(),
        endedAt: new Date(),
      })
      .returning();
    appointmentA = a.id;

    const [c] = await dbAdmin()
      .insert(consultations)
      .values({
        tenantId: tenantA,
        appointmentId: appointmentA,
        patientId: patientA,
        doctorId: doctorA,
        isFinalized: true,
        finalizedAt: new Date(),
        priceMad: '250.00',
      })
      .returning();
    consultationA = c.id;
  });

  it('returns the static list for a doctor with no history', async () => {
    const r = await getAutocompleteSuggestions(tenantA, doctorA);
    expect(r.posologies.length).toBe(STATIC_POSOLOGIES.length);
    expect(r.durations.length).toBe(STATIC_DURATIONS.length);
  });

  it('places the doctor most-used posologie first, then the static list', async () => {
    // 3x "1 cp matin et soir", 1x "2 cps par jour"
    await newPrescriptionWithItems(tenantA, consultationA, patientA, doctorA, [
      { posologie: '1 cp matin et soir', duration: '7 jours' },
      { posologie: '1 cp matin et soir', duration: '7 jours' },
      { posologie: '1 cp matin et soir', duration: '7 jours' },
      { posologie: '2 cps par jour', duration: null },
    ]);
    const r = await getAutocompleteSuggestions(tenantA, doctorA);
    // Top of list is the 3x one (most frequent), then the 1x one. Static (which contains
    // both forms case-insensitively) gets deduped behind these.
    expect(r.posologies[0]).toBe('1 cp matin et soir');
    expect(r.posologies[1]).toBe('2 cps par jour');
  });

  it('isolates by doctor (only the queried doctor history surfaces)', async () => {
    await newPrescriptionWithItems(tenantA, consultationA, patientA, otherDoctor, [
      { posologie: 'OTHER DOCTOR ONLY', duration: null },
      { posologie: 'OTHER DOCTOR ONLY', duration: null },
    ]);
    const r = await getAutocompleteSuggestions(tenantA, doctorA);
    expect(r.posologies).not.toContain('OTHER DOCTOR ONLY');
  });

  it('isolates by tenant', async () => {
    // Seed a prescription_item in a different tenant with a unique posologie.
    const [otherT] = await dbAdmin().insert(tenants).values({ name: 'Other AC T' }).returning();
    const [otherDoc] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId: otherT.id,
        role: 'doctor',
        fullName: 'Dr OAC',
        email: `doac-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    const [otherP] = await dbAdmin()
      .insert(patients)
      .values({ tenantId: otherT.id, lastName: 'OAC', firstName: 'P', gender: 'f', dateOfBirth: '1990-01-01' })
      .returning();
    const [otherAppt] = await dbAdmin()
      .insert(appointments)
      .values({
        tenantId: otherT.id,
        patientId: otherP.id,
        status: 'done',
        kind: 'walkin',
        createdBy: otherDoc.id,
        startedAt: new Date(),
        endedAt: new Date(),
      })
      .returning();
    const [otherC] = await dbAdmin()
      .insert(consultations)
      .values({
        tenantId: otherT.id,
        appointmentId: otherAppt.id,
        patientId: otherP.id,
        doctorId: otherDoc.id,
        isFinalized: true,
        finalizedAt: new Date(),
        priceMad: '250.00',
      })
      .returning();
    await newPrescriptionWithItems(otherT.id, otherC.id, otherP.id, otherDoc.id, [
      { posologie: 'CROSS-TENANT POSOLOGIE', duration: 'CROSS-TENANT DURATION' },
    ]);

    const r = await getAutocompleteSuggestions(tenantA, doctorA);
    expect(r.posologies).not.toContain('CROSS-TENANT POSOLOGIE');
    expect(r.durations).not.toContain('CROSS-TENANT DURATION');
  });

  it('returns durations history first', async () => {
    await newPrescriptionWithItems(tenantA, consultationA, patientA, doctorA, [
      { posologie: null, duration: '12 jours' },
      { posologie: null, duration: '12 jours' },
      { posologie: null, duration: '8 jours' },
    ]);
    const r = await getAutocompleteSuggestions(tenantA, doctorA);
    expect(r.durations[0]).toBe('12 jours');
    expect(r.durations[1]).toBe('8 jours');
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
pnpm test tests/unit/prescriptions/autocomplete.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/prescriptions/autocomplete'`.

- [ ] **Step 3: Implement `lib/prescriptions/autocomplete.ts`**

```ts
import 'server-only';
import { and, desc, eq, isNotNull, ne, sql } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { prescriptions, prescriptionItems } from '@/db/schema';

export const STATIC_POSOLOGIES = [
  '1 cp matin et soir',
  '1 cp 3 fois par jour',
  '1 cp par jour le matin',
  '1 cp par jour le soir',
  '2 cps par jour',
  '1 cp toutes les 8 heures',
  '1 cp toutes les 6 heures',
  '1 sachet par jour',
  '1 sachet 3 fois par jour',
  '1 cuillère à café 3 fois par jour',
  '5 ml 3 fois par jour',
  '1 application 2 fois par jour',
  '1 goutte 3 fois par jour',
  '1 inhalation 2 fois par jour',
  'À la demande',
] as const;

export const STATIC_DURATIONS = [
  '3 jours',
  '5 jours',
  '7 jours',
  '10 jours',
  '14 jours',
  '21 jours',
  '1 mois',
  '3 mois',
  '6 mois',
  'À renouveler',
] as const;

export type AutocompleteSuggestions = {
  posologies: string[];
  durations: string[];
};

/**
 * Merge the doctor's history list (most-frequent first) with the static
 * fallback list. Case-insensitive trimmed dedup. History wins ties — when
 * both lists contain the same value (modulo case/whitespace), the history
 * variant is kept.
 *
 * Empty / whitespace-only history entries are dropped (they can never come
 * from the DB query, but we defend against future input drift).
 */
export function mergeUnique(history: readonly string[], staticList: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of [...history, ...staticList]) {
    const key = v.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/**
 * Returns the autocomplete suggestion lists for the doctor's prescription
 * editor. Two parallel GROUP BY queries against prescription_items, joined
 * to prescriptions for doctor_id scope. Tenant isolation via withTenantTx.
 *
 * Each returned list = doctor's top-10 most-used non-empty values, merged
 * with the static fallback list (history first, deduped).
 */
export async function getAutocompleteSuggestions(
  tenantId: string,
  doctorId: string,
): Promise<AutocompleteSuggestions> {
  return withTenantTx(tenantId, async (tx) => {
    const posologyRows = await tx
      .select({
        value: prescriptionItems.posologie,
        n: sql<number>`COUNT(*)::int`,
      })
      .from(prescriptionItems)
      .innerJoin(prescriptions, eq(prescriptions.id, prescriptionItems.prescriptionId))
      .where(
        and(
          eq(prescriptions.doctorId, doctorId),
          isNotNull(prescriptionItems.posologie),
          ne(prescriptionItems.posologie, ''),
        ),
      )
      .groupBy(prescriptionItems.posologie)
      .orderBy(desc(sql`COUNT(*)`), prescriptionItems.posologie)
      .limit(10);

    const durationRows = await tx
      .select({
        value: prescriptionItems.duration,
        n: sql<number>`COUNT(*)::int`,
      })
      .from(prescriptionItems)
      .innerJoin(prescriptions, eq(prescriptions.id, prescriptionItems.prescriptionId))
      .where(
        and(
          eq(prescriptions.doctorId, doctorId),
          isNotNull(prescriptionItems.duration),
          ne(prescriptionItems.duration, ''),
        ),
      )
      .groupBy(prescriptionItems.duration)
      .orderBy(desc(sql`COUNT(*)`), prescriptionItems.duration)
      .limit(10);

    const historyPosologies = posologyRows.map((r) => r.value!).filter((v) => v.trim().length > 0);
    const historyDurations = durationRows.map((r) => r.value!).filter((v) => v.trim().length > 0);

    return {
      posologies: mergeUnique(historyPosologies, STATIC_POSOLOGIES),
      durations: mergeUnique(historyDurations, STATIC_DURATIONS),
    };
  });
}
```

Notes for the implementer:
- `withTenantTx` is the existing helper from `@/db/with-tenant`; it sets the RLS GUC `app.tenant_id` for the transaction.
- The drizzle `sql<number>\`COUNT(*)::int\`` cast keeps drizzle's type inference happy — Postgres `COUNT(*)` returns `bigint` which drizzle would otherwise type as `string`.
- The `orderBy(desc(sql\`COUNT(*)\`), prescriptionItems.posologie)` uses a deterministic secondary key (alphabetical) so tied frequencies always sort the same way — important for test stability.
- The `historyPosologies.map((r) => r.value!)` non-null assertion is safe because the WHERE includes `isNotNull(prescriptionItems.posologie)`. The TS type still says `string | null` because drizzle's inference doesn't propagate the WHERE.

- [ ] **Step 4: Run the test, expect pass**

```bash
pnpm test tests/unit/prescriptions/autocomplete.test.ts
```

Expected: 9 tests pass (4 mergeUnique + 5 getAutocompleteSuggestions).

- [ ] **Step 5: Run the full suite for regressions**

```bash
pnpm test
```

Expected: 181 baseline + 9 new = 190 tests passing.

- [ ] **Step 6: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean exit.

- [ ] **Step 7: Commit — STAGE ONLY THESE TWO FILES**

```bash
git add lib/prescriptions/autocomplete.ts tests/unit/prescriptions/autocomplete.test.ts
git status --porcelain | grep -E "^[MA]" | grep -v -E "lib/prescriptions/autocomplete\.ts$|tests/unit/prescriptions/autocomplete\.test\.ts$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(prescriptions): autocomplete suggestions (history + static)

New module exports STATIC_POSOLOGIES (15) + STATIC_DURATIONS (10) with
common Moroccan-practice values, plus getAutocompleteSuggestions which
runs two parallel GROUP BY queries against prescription_items scoped
to the doctor (via prescriptions.doctor_id) and tenant (via withTenantTx),
top 10 each, then merges with the static list using mergeUnique
(history first, case-insensitive trimmed dedup).

No schema change. Datasource for the prescription editor's <datalist>
suggestions (Task 2).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — Wire suggestions into the consultation page + prescription editor

**Files:**
- Modify: `app/(authenticated)/consultations/[id]/page.tsx`
- Modify: `app/(authenticated)/consultations/[id]/prescription/editor.tsx`

- [ ] **Step 1: Update `app/(authenticated)/consultations/[id]/page.tsx` to fetch suggestions and pass them to the editor**

Read the current top of the file to see the imports and the existing fetch sequence:

```bash
head -50 "app/(authenticated)/consultations/[id]/page.tsx"
```

You'll see (around lines 1-16) imports including:
```tsx
import { getPrescriptionForConsultation } from '@/lib/prescriptions/queries';
```

Add a new import on the next line:

```tsx
import { getAutocompleteSuggestions } from '@/lib/prescriptions/autocomplete';
```

Then locate the existing fetch sequence (sequential awaits, NOT a `Promise.all`):

```tsx
const session = await requireDoctor();
const detail = await getConsultationById(session.tenantId, id);
if (!detail) notFound();
const patientData = await getPatientDetail(session.tenantId, detail.consultation.patientId);
if (!patientData) notFound();
const presc = await getPrescriptionForConsultation(session.tenantId, id);

const [tenant] = await dbAdmin()
  .select({ ... })
  .from(tenants)
  .where(eq(tenants.id, session.tenantId));
```

Append a single line after the `[tenant] = ...` block:

```tsx
const suggestions = await getAutocompleteSuggestions(session.tenantId, session.userId);
```

Then locate the `<PrescriptionEditor>` invocation (around lines 109-114):

```tsx
<PrescriptionEditor
  consultationId={id}
  prescriptionId={presc?.prescription.id ?? null}
  items={presc?.items ?? []}
  readOnly={detail.consultation.isFinalized}
/>
```

Add the `suggestions` prop:

```tsx
<PrescriptionEditor
  consultationId={id}
  prescriptionId={presc?.prescription.id ?? null}
  items={presc?.items ?? []}
  readOnly={detail.consultation.isFinalized}
  suggestions={suggestions}
/>
```

- [ ] **Step 2: Update `app/(authenticated)/consultations/[id]/prescription/editor.tsx` to accept the prop and render the datalists**

Open the file. The component signature is at lines 29-39:

```tsx
export function PrescriptionEditor({
  consultationId,
  prescriptionId,
  items,
  readOnly,
}: {
  consultationId: string;
  prescriptionId: string | null;
  items: PrescriptionItem[];
  readOnly: boolean;
}) {
```

Update the type imports near the top — currently:

```tsx
import type { PrescriptionItem } from '@/db/schema';
import type { MedicationSearchHit } from '@/lib/medications/queries';
```

Add a type-only import:

```tsx
import type { PrescriptionItem } from '@/db/schema';
import type { MedicationSearchHit } from '@/lib/medications/queries';
import type { AutocompleteSuggestions } from '@/lib/prescriptions/autocomplete';
```

Then change the component signature to:

```tsx
export function PrescriptionEditor({
  consultationId,
  prescriptionId,
  items,
  readOnly,
  suggestions,
}: {
  consultationId: string;
  prescriptionId: string | null;
  items: PrescriptionItem[];
  readOnly: boolean;
  suggestions: AutocompleteSuggestions;
}) {
```

Now find the outer return block (line 44):

```tsx
return (
  <div className="space-y-3">
    {items.length === 0 ? (
      ...
```

Insert the two `<datalist>` elements as the FIRST children of `<div className="space-y-3">`, before the items conditional block:

```tsx
return (
  <div className="space-y-3">
    <datalist id="posologie-suggestions">
      {suggestions.posologies.map((s) => (
        <option key={s} value={s} />
      ))}
    </datalist>
    <datalist id="duration-suggestions">
      {suggestions.durations.map((s) => (
        <option key={s} value={s} />
      ))}
    </datalist>
    {items.length === 0 ? (
      ...
```

- [ ] **Step 3: Add `list=` attributes to the four target inputs**

There are FOUR `<Input>` elements that need a `list=` attribute. Two are inside the "edit existing item" form (around lines 147-163), two are inside the "add new item" form (further down).

**Edit existing item form — Posologie input** (around line 147):

```tsx
<Input
  id={`pos-${it.id}`}
  name="posologie"
  defaultValue={it.posologie ?? ''}
  placeholder="ex. 1 cp matin et soir"
/>
```

becomes:

```tsx
<Input
  id={`pos-${it.id}`}
  name="posologie"
  defaultValue={it.posologie ?? ''}
  placeholder="ex. 1 cp matin et soir"
  list="posologie-suggestions"
/>
```

**Edit existing item form — Durée input** (around line 158):

```tsx
<Input
  id={`dur-${it.id}`}
  name="duration"
  defaultValue={it.duration ?? ''}
  placeholder="ex. 7 jours"
/>
```

becomes:

```tsx
<Input
  id={`dur-${it.id}`}
  name="duration"
  defaultValue={it.duration ?? ''}
  placeholder="ex. 7 jours"
  list="duration-suggestions"
/>
```

**Add new item form — Posologie input** (around line 275, inside the `<form action={addItemActionFromForm}>` block):

```tsx
<Input id="new-pos" name="posologie" placeholder="ex. 1 cp matin et soir" />
```

becomes:

```tsx
<Input id="new-pos" name="posologie" placeholder="ex. 1 cp matin et soir" list="posologie-suggestions" />
```

**Add new item form — Durée input** (around line 281):

```tsx
<Input id="new-dur" name="duration" placeholder="ex. 7 jours" />
```

becomes:

```tsx
<Input id="new-dur" name="duration" placeholder="ex. 7 jours" list="duration-suggestions" />
```

(`<Input>` is a shadcn/base-ui wrapper that spreads `...props` onto the underlying `<input>`, so `list=` flows through unchanged.)

- [ ] **Step 4: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 5: Run unit suite (regression check; no new tests added by this task)**

```bash
pnpm test
```

Expected: 190/190 (Task 1's 9 plus the 181 baseline).

- [ ] **Step 6: Manual smoke (optional but quick)**

`pnpm dev` is running. Sign in as a doctor, open any consultation in progress, focus the Posologie input — the browser shows a dropdown with 15 static suggestions. Same for Durée. Type "mat" in Posologie — list filters down. Pick one — input populates.

If the doctor has prescription history, those values appear at the top.

- [ ] **Step 7: Commit — STAGE ONLY THESE TWO FILES**

```bash
git add "app/(authenticated)/consultations/[id]/page.tsx" "app/(authenticated)/consultations/[id]/prescription/editor.tsx"
git status --porcelain | grep -E "^[MA]" | grep -v -E "consultations/\[id\]/page\.tsx$|prescription/editor\.tsx$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(prescriptions): wire autocomplete suggestions into the editor

The consultation page fetches the doctor's autocomplete suggestions
once per render and passes them to PrescriptionEditor. The editor
renders two shared <datalist> elements (one for posologie, one for
duration) and the four target inputs (posologie + duration, in the
edit-existing-item form and the add-new-item form) reference them
via list=. Native browser dropdown handles filtering, keyboard nav,
and accessibility.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — Final verification + push

**Files:** none (verification only).

- [ ] **Step 1: Full test sweep**

```bash
pnpm test
pnpm exec tsc --noEmit
```

Expected: 190/190 tests pass; tsc clean.

- [ ] **Step 2: Verify the commit log**

```bash
git log 85769f3..HEAD --oneline
```

Expected: 2 implementation commits (Task 3 has no commit of its own):

```
feat(prescriptions): wire autocomplete suggestions into the editor
feat(prescriptions): autocomplete suggestions (history + static)
```

If a commit is missing, the corresponding task didn't complete.

- [ ] **Step 3: Spec acceptance check**

| # | Criterion | Verified by |
|---|---|---|
| 1 | Posologie input shows dropdown on focus | Manual smoke (Task 2 step 6) |
| 2 | Durée input shows dropdown on focus | Manual smoke (Task 2 step 6) |
| 3 | New doctor sees 15 + 10 static items | `getAutocompleteSuggestions` test (Task 1) |
| 4 | Doctor history surfaces FIRST, deduped case-insensitively | `getAutocompleteSuggestions` ordering test (Task 1) + `mergeUnique` tests |
| 5 | Selecting a suggestion populates input; submit works | Manual smoke (Task 2 step 6) — datalist is a native input feature |
| 6 | 4 inputs reference shared `<datalist>` elements via `list=` | Task 2 step 3 |
| 7 | Read-only consultations render unchanged | No code path touched in read-only mode (Task 2 only adds prop + datalists, both inert in read-only) |
| 8 | No schema change / migration / new dependency | `git diff main..HEAD -- package.json supabase/migrations db/schema` empty |
| 9 | Unit tests pass; tsc clean | Step 1 of this task |
| 10 | Existing tests still pass | Step 1 of this task (190 includes 181 baseline) |

If any criterion fails, STOP and report.

- [ ] **Step 4: Push to origin**

Per the saved auto-push preference:

```bash
git push origin main
```

Expected: clean fast-forward push, 2 commits delivered.

- [ ] **Step 5: Working tree confirmation**

```bash
git status
```

Expected: `On branch main`, `Your branch is up to date with 'origin/main'`, working tree clean.
