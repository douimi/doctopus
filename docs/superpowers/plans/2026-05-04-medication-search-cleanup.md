# Medication search cleanup + PPV display — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Doctor's prescription medication search returns the real Moroccan AMMPS registry locally; each search-result row shows the unit price in MAD, right-aligned. Production deploy runbook documents the sync as a launch-day step.

**Architecture:** One operational fix (run `pnpm sync:ammps` to populate the existing `medications` table) and one tightly-scoped UI change (add `ppv` to `MedicationSearchHit`, render it in the existing prescription search dropdown). New helper `formatMad` lives in a new client-safe file `lib/medications/format.ts` because `lib/medications/queries.ts` declares `import 'server-only'` and cannot be imported from the client component.

**Tech Stack:** Next.js 16, drizzle-orm, vitest (unit), playwright (e2e), pnpm. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-05-04-medication-search-and-price-cleanup-design.md](../specs/2026-05-04-medication-search-and-price-cleanup-design.md) (commit `febdcd9`).

---

## Spec deviation note

The spec said the formatter should be "co-located so client + server agree" and showed it inside `lib/medications/queries.ts`. That file declares `import 'server-only'` at the top, which **blocks** import from the client component `search-input.tsx`. To preserve the spec's intent (single canonical formatter, shared by all callers), `formatMad` lives in a **new** sibling file `lib/medications/format.ts` — no server-only directive, importable from server, client, and tests. The behavior, signature, and acceptance criteria remain exactly as written in the spec.

---

## File map

**Created**
- `lib/medications/format.ts` — `formatMad(ppv: string | null): string`
- `tests/unit/medications/format-mad.test.ts` — unit tests for the helper

**Modified**
- `lib/medications/queries.ts` — extend `MedicationSearchHit` with `ppv`; add `m.ppv` to the SQL `SELECT` and result mapping
- `app/(authenticated)/consultations/[id]/prescription/search-input.tsx` — render the price right-aligned in each dropdown row
- `docs/runbooks/deploy-1a.md` — append "Medication registry seed" section

**Untouched**
- `db/schema/medications.ts`, `db/schema/prescriptions.ts` — no schema change
- `app/(authenticated)/consultations/[id]/prescription/{editor.tsx,actions.ts}` — line-item rendering and server action contract unchanged
- `app/api/prescriptions/[id]/pdf/*` — PDF unchanged
- `tests/fixtures/medications.ts`, `tests/e2e/prescriptions.spec.ts` — e2e test seeds inline meds without `ppv`; they will render `"—"` in the new price slot, the existing assertion `getByRole('button', { name: /Doliprane-E2E/ })` still matches because the accessible name still contains the label
- `scripts/sync-ammps.ts`, `scripts/import-medications.ts` — already correct

---

## Task 1 — Populate the local medications table (operational, no commit)

**Files:** none (operational only).

**Why first:** the rest of the work (UI showing PPV) is hard to smoke-test against the empty fixtures-only table. A populated table makes manual verification meaningful, and confirms the `pg_trgm` extension and the existing query both still work end-to-end before we touch any code.

- [ ] **Step 1: Verify `pg_trgm` is installed**

Run:
```bash
pnpm exec supabase status
```
Then connect to the local DB shell (or use `db:studio`) and run:
```sql
SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';
```
Expected: one row returned (`pg_trgm`). Migration `supabase/migrations/20260503000000_pg_trgm_medications.sql` should have created it on `pnpm db:migrate` / `supabase db reset`. If missing, run `pnpm supabase:reset` and re-verify.

- [ ] **Step 2: Run the AMMPS sync**

Run:
```bash
pnpm sync:ammps
```
Expected: ≈5 minutes of throttled output (one log line per page, ~197 pages); ends with a summary count. The script bypasses TLS chain validation for AMMPS's incomplete cert (`scripts/sync-ammps.ts:16`) — that's expected and script-local.

If the host is unreachable from your machine, fall back to:
```bash
pnpm import:medications <path-to-xlsx>
```
against an offline AMMPS export. Both paths populate the same table via the same upsert key.

- [ ] **Step 3: Verify row count**

```sql
SELECT COUNT(*) FROM medications;
```
Expected: a number in the **2 000–4 000** range (per `docs/research/ammps-integration.md`). If the count is < 1 000, the sync truncated early — re-run.

```sql
SELECT * FROM medication_imports ORDER BY imported_at DESC LIMIT 1;
```
Expected: one fresh row reflecting the run.

- [ ] **Step 4: Spot-check the data**

```sql
SELECT nom_commercial, dosage, forme, laboratoire, ppv
FROM medications
WHERE nom_commercial ILIKE '%doli%'
ORDER BY nom_commercial
LIMIT 20;
```
Expected: ≥10 real Doliprane variants with at least some `ppv` populated and at least some `null` (mix is realistic).

- [ ] **Step 5: Manual app smoke**

Run `pnpm dev`, sign in as a doctor, open any consultation in progress, type `doli` in the prescription search box. Expected: the dropdown shows ≥10 real Doliprane rows from the registry. **Note:** at this point the dropdown still does not show prices — that's Task 4. We only confirmed the data is reachable.

- [ ] **Step 6: No commit**

This task touched no files. Nothing to commit.

---

## Task 2 — Add `formatMad` helper with TDD unit tests

**Files:**
- Create: `lib/medications/format.ts`
- Test: `tests/unit/medications/format-mad.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/medications/format-mad.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatMad } from '@/lib/medications/format';

describe('formatMad', () => {
  it('returns "—" for null', () => {
    expect(formatMad(null)).toBe('—');
  });

  it('returns "—" for an unparseable string', () => {
    expect(formatMad('not-a-number')).toBe('—');
  });

  it('returns "—" for an empty string', () => {
    expect(formatMad('')).toBe('—');
  });

  it('formats a simple decimal as fr-FR with two decimals and " MAD" suffix', () => {
    const expected = `${new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(12.5)} MAD`;
    expect(formatMad('12.5')).toBe(expected);
  });

  it('formats thousands using fr-FR separators (Intl-stable across Node versions)', () => {
    const expected = `${new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(1234.5)} MAD`;
    expect(formatMad('1234.5')).toBe(expected);
  });

  it('rounds to two decimals (half-to-even per Intl default)', () => {
    const expected = `${new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(8.205)} MAD`;
    expect(formatMad('8.205')).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
pnpm test tests/unit/medications/format-mad.test.ts
```
Expected: FAIL with a module-not-found error (`Cannot find module '@/lib/medications/format'`).

- [ ] **Step 3: Implement the helper**

Create `lib/medications/format.ts`:

```ts
export function formatMad(ppv: string | null): string {
  if (ppv == null) return '—';
  const n = Number(ppv);
  if (!Number.isFinite(n)) return '—';
  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)} MAD`;
}
```

Note: this file deliberately does **not** declare `import 'server-only'` — it must be importable from the client component in Task 4.

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
pnpm test tests/unit/medications/format-mad.test.ts
```
Expected: PASS — 6 tests pass.

- [ ] **Step 5: Run the full unit suite to confirm nothing else broke**

Run:
```bash
pnpm test
```
Expected: all unit + RLS tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/medications/format.ts tests/unit/medications/format-mad.test.ts
git commit -m "feat(medications): formatMad helper for PPV display

Returns 'X,YZ MAD' (fr-FR locale) for valid numeric strings, '—' for null
or unparseable input. Lives in a client-safe file (no 'server-only')
so the prescription search-input can import it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — Extend `MedicationSearchHit` with `ppv` and select it from SQL

**Files:**
- Modify: `lib/medications/queries.ts`

- [ ] **Step 1: Read the current file to confirm exact lines**

Run:
```bash
cat lib/medications/queries.ts
```
Expected: 47 lines as captured in the spec — type definition lines 5–12, query lines 14–42.

- [ ] **Step 2: Extend the type and the SQL**

Replace lines 5–42 of `lib/medications/queries.ts` with:

```ts
export type MedicationSearchHit = {
  id: string;
  nomCommercial: string;
  dci: string;
  dosage: string | null;
  forme: string | null;
  laboratoire: string | null;
  ppv: string | null;
};

export async function searchMedications(query: string): Promise<MedicationSearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const db = dbAdmin();
  const pattern = `%${trimmed.replace(/[\\%_]/g, (m) => '\\' + m)}%`;
  const rows = await db.execute<{
    id: string;
    nom_commercial: string;
    dci: string;
    dosage: string | null;
    forme: string | null;
    laboratoire: string | null;
    ppv: string | null;
  }>(sql`
    SELECT id, nom_commercial, dci, dosage, forme, laboratoire, ppv
    FROM medications
    WHERE is_active = true
      AND (nom_commercial ILIKE ${pattern} OR dci ILIKE ${pattern})
    ORDER BY similarity(nom_commercial, ${trimmed}) DESC, nom_commercial ASC
    LIMIT 20
  `);
  return rows.map((r) => ({
    id: r.id,
    nomCommercial: r.nom_commercial,
    dci: r.dci,
    dosage: r.dosage,
    forme: r.forme,
    laboratoire: r.laboratoire,
    ppv: r.ppv,
  }));
}
```

The `formatMedicationLabel` function below this block stays unchanged.

- [ ] **Step 3: Type-check**

Run:
```bash
pnpm exec tsc --noEmit
```
Expected: clean exit, zero type errors. (If errors appear in `editor.tsx` or `search-input.tsx` because they spread or destructure `MedicationSearchHit` strictly, fix at the call sites — but a quick read of `editor.tsx:25-27` and `search-input.tsx` shows neither does, so this should pass cleanly.)

- [ ] **Step 4: Run unit + RLS tests**

Run:
```bash
pnpm test
```
Expected: all pass. No test currently asserts on `MedicationSearchHit` shape.

- [ ] **Step 5: Manual smoke against populated DB**

Run `pnpm dev`, type `doli` in the prescription search box, open the network panel for the React Server Action call. Expected: the response payload now includes `ppv` (string or null) on each hit. The UI itself still doesn't render it — that's Task 4.

- [ ] **Step 6: Commit**

```bash
git add lib/medications/queries.ts
git commit -m "feat(medications): include ppv in MedicationSearchHit

The medications table already has a ppv column populated by the AMMPS sync.
Surface it through the search query so the prescription dropdown can render
unit prices. No schema change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — Render price right-aligned in the prescription search dropdown

**Files:**
- Modify: `app/(authenticated)/consultations/[id]/prescription/search-input.tsx`

- [ ] **Step 1: Read the current file**

Run:
```bash
cat "app/(authenticated)/consultations/[id]/prescription/search-input.tsx"
```
Expected: the 69-line file shown in the spec, with the dropdown rendered as a `<ul>` of `<li><button>…</button></li>`.

- [ ] **Step 2: Edit the file**

Replace the entire contents of `app/(authenticated)/consultations/[id]/prescription/search-input.tsx` with:

```tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { searchMedicationsAction } from './actions';
import { formatMad } from '@/lib/medications/format';
import type { MedicationSearchHit } from '@/lib/medications/queries';

export function MedicationSearchInput({
  onPick,
  disabled,
}: {
  onPick: (hit: MedicationSearchHit) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<MedicationSearchHit[]>([]);
  const [, start] = useTransition();

  useEffect(() => {
    if (query.trim().length < 2) {
      const id = setTimeout(() => setHits([]), 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => {
      start(async () => {
        const results = await searchMedicationsAction(query);
        setHits(results);
      });
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <div className="space-y-1">
      <Input
        placeholder="Rechercher un médicament (nom commercial ou DCI)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
      />
      {hits.length > 0 ? (
        <ul className="border rounded-md max-h-64 overflow-auto text-sm">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="w-full text-left px-2 py-1 hover:bg-muted flex items-baseline gap-3"
                onClick={() => {
                  onPick(h);
                  setQuery('');
                  setHits([]);
                }}
              >
                <span className="flex-1 min-w-0 truncate">
                  <span className="font-medium">{h.nomCommercial}</span>
                  {h.dosage ? ` ${h.dosage}` : ''}
                  {h.forme ? ` · ${h.forme}` : ''}
                  <span className="text-muted-foreground"> — {h.dci}</span>
                  {h.laboratoire ? (
                    <span className="text-xs text-muted-foreground"> ({h.laboratoire})</span>
                  ) : null}
                </span>
                <span className="shrink-0 pl-3 text-right tabular-nums text-muted-foreground">
                  {formatMad(h.ppv)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
```

Key changes from the previous version:
- New import: `formatMad`.
- `<button>` is now `flex items-baseline gap-3` so the label and price sit side-by-side on a single baseline.
- The label content is wrapped in a `<span class="flex-1 min-w-0 truncate">` so long labels truncate without pushing the price out.
- The price is a sibling `<span class="shrink-0 pl-3 text-right tabular-nums text-muted-foreground">{formatMad(h.ppv)}</span>`.
- No change to `onClick`, `setQuery`, `setHits`, debouncing, or the data flow.

- [ ] **Step 3: Type-check**

Run:
```bash
pnpm exec tsc --noEmit
```
Expected: clean exit.

- [ ] **Step 4: Manual smoke**

Run `pnpm dev`, sign in as a doctor, open a consultation, type `doli` in the prescription search box. Expected:

- Each row shows the price right-aligned in `"X,YZ MAD"` format (e.g., `"12,50 MAD"`).
- Rows whose `ppv` is null show `"—"` in the price slot.
- Long labels truncate with ellipsis; the price column stays visible.
- Picking a row still works exactly as before (label is added, search clears).

- [ ] **Step 5: Run e2e tests**

Run:
```bash
pnpm test:e2e tests/e2e/prescriptions.spec.ts
```
Expected: PASS. The existing test seeds `Doliprane-E2E` without a `ppv`, so the dropdown shows `"—"` in the price slot — but the test asserts on `getByRole('button', { name: /Doliprane-E2E/ })`, and the button's accessible name still contains that string, so the locator still matches.

If e2e fails because the playwright config requires special setup, run only the relevant test or skip e2e and note for the executor that e2e validation should happen at PR time. The unit test in Task 2 plus the manual smoke in Step 4 are sufficient for this commit.

- [ ] **Step 6: Commit**

```bash
git add "app/(authenticated)/consultations/[id]/prescription/search-input.tsx"
git commit -m "feat(prescriptions): show PPV in medication search dropdown

Each row now displays the unit price right-aligned (fr-FR formatted, two
decimals, ' MAD' suffix). Null ppv renders as '—'. Layout uses flex with
truncation on the label so long names don't push the price out.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — Append "Medication registry seed" section to the deploy runbook

**Files:**
- Modify: `docs/runbooks/deploy-1a.md`

- [ ] **Step 1: Append the new section to `docs/runbooks/deploy-1a.md`**

Insert the block below verbatim into `docs/runbooks/deploy-1a.md`, **between the existing `## 5. Smoke test` section and the existing `## Restore from backup (Supabase free tier)` section**. The block uses standard triple-backtick fences — they render literally because this plan wraps it in tildes:

~~~markdown
## 6. Medication registry seed (one-time, post-deploy)

The `medications` table ships empty. Run the AMMPS sync against the production DB once after the first deploy:

```bash
# From a machine with prod DB credentials in .env.production:
NODE_ENV=production pnpm sync:ammps
```

The script scrapes `https://ammps.sante.gov.ma/basesdedonnes/listes-medicaments` (~197 pages, ≈5 minutes total at the 100 ms throttle) and upserts ~2 000–4 000 medications. Idempotent — safe to re-run.

Re-run roughly monthly to pick up new registrations / withdrawals. Until cron-automation lands, this is manual.

**Fallback** if AMMPS is unreachable: `pnpm import:medications <path-to-xlsx>` against an offline registry export.

Verify after running:

```sql
SELECT COUNT(*) FROM medications;             -- expected: 2000–4000
SELECT * FROM medication_imports ORDER BY imported_at DESC LIMIT 1;
```
~~~

- [ ] **Step 2: Verify the file renders cleanly**

Open `docs/runbooks/deploy-1a.md` in a markdown previewer (or just `cat` it) — confirm no broken fences, the new section heading is `## 6. Medication registry seed (one-time, post-deploy)`, and the inner code blocks display.

- [ ] **Step 3: Commit**

```bash
git add docs/runbooks/deploy-1a.md
git commit -m "docs(runbook): post-deploy AMMPS medication sync step

Document the one-time pnpm sync:ammps run that populates the medications
table after the first production deploy, plus the offline xlsx fallback.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Final verification

- [ ] **Step 1: Full test sweep**

```bash
pnpm test
pnpm test:e2e tests/e2e/prescriptions.spec.ts
pnpm exec tsc --noEmit
```
Expected: all green.

- [ ] **Step 2: Combined acceptance check** (against spec section "Acceptance criteria — combined")

| # | Criterion | How verified |
|---|---|---|
| 1 | Local search for `"doli"` returns ≥10 real registry rows | Task 1 step 4 + Task 4 step 4 |
| 2 | Each row shows price in `"X,YZ MAD"` format (or `"—"`) right-aligned | Task 4 step 4 manual smoke |
| 3 | Existing prescription flows unchanged | Task 4 step 5 e2e test |
| 4 | `tests/e2e/prescriptions.spec.ts` and `tests/unit/medications/format-mad.test.ts` pass | Final step 1 |
| 5 | `docs/runbooks/deploy-1a.md` includes the AMMPS sync step | Task 5 step 2 |
| 6 | No new migration, no schema change, no new dependency | Visible in `git diff main...HEAD` — only the five files in the file map |

- [ ] **Step 3: Confirm git log matches**

Run:
```bash
git log --oneline main..HEAD
```
Expected: four commits in this order:

```
feat(medications): formatMad helper for PPV display
feat(medications): include ppv in MedicationSearchHit
feat(prescriptions): show PPV in medication search dropdown
docs(runbook): post-deploy AMMPS medication sync step
```

(Task 1 produces no commit — operational only.)
