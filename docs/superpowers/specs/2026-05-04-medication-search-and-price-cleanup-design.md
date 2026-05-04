# Pre-launch cleanup — medication search + PPV display

> **Why now**: the user is preparing the first production deploy. While testing locally they observed the prescription medication search returning a tiny set of seemingly hardcoded names (Doliprane / Paracétamol). Diagnosis: the local `medications` table contains only the test fixtures from `tests/fixtures/medications.ts` — production-grade data was never imported. While we're touching the search, we also surface each medication's `ppv` (Prix Public de Vente, MAD) in the dropdown so the doctor sees the price while choosing.

**Goal**: Doctor's prescription medication search returns the real Moroccan AMMPS registry locally; each search-result row shows the unit price in MAD, right-aligned. The production deploy runbook documents the sync as a launch-day step.

**Architecture**: One operational fix (run an existing import script) and one tightly-scoped UI change (extend `MedicationSearchHit` with `ppv`, render it in the existing dropdown). No schema migration, no PDF change, no new feature surfaces.

**Tech stack**: No new dependencies. Uses the existing `scripts/sync-ammps.ts` script and the `pg_trgm`-backed query in `lib/medications/queries.ts`.

---

## What this cleanup does NOT do

- **No cron / scheduled automation** of the AMMPS sync. It's a manual `pnpm tsx scripts/sync-ammps.ts` run, documented in the runbook. Cron is a later concern.
- **No price snapshot on the prescription line item.** PPV is for the doctor's awareness while choosing; once the line is added to a prescription, it stays as today (label snapshot only). No new column on `prescription_items`.
- **No price on the printed prescription PDF.** The current PDF stays unchanged. In Morocco, doctors traditionally don't print PPV on the ordonnance; pharmacists do. Putting it there is a deliberate UX choice for a future feature, not pre-launch cleanup.
- **No prescription total / sum.** Single-line display only.
- **No admin UI to trigger the sync.** Script-only.
- **No change to consultation pricing** (the consultation-fee + assistant-payment + clinic-KPI feature is a separate, larger spec coming after this).
- **No fallback search behavior** (e.g., partial matches when the table is empty). The fix is to populate the table; defensive search behavior is unnecessary once it's seeded.
- **No audit of other "hardcoded" values** elsewhere in the app. The user confirmed admin-page values are fine as-is.

---

## File structure

**Files modified**

```
lib/medications/
  queries.ts                                # extend MedicationSearchHit with ppv; add formatMad helper

app/(authenticated)/consultations/[id]/prescription/
  search-input.tsx                          # render price in dropdown rows

docs/runbooks/
  deploy-1a.md                              # add launch-day AMMPS sync step

tests/
  unit/medications/format-mad.test.ts       # NEW — null + decimal + thousands cases
```

**Files NOT modified**

- `db/schema/medications.ts` — `ppv` column already exists.
- `db/schema/prescriptions.ts` — no snapshot column added.
- `app/(authenticated)/consultations/[id]/prescription/editor.tsx` — line-item rendering unchanged.
- `app/(authenticated)/consultations/[id]/prescription/actions.ts` — server action shape unchanged (returns the extended `MedicationSearchHit`, no protocol change).
- `app/api/prescriptions/[id]/pdf/*` — PDF rendering unchanged.
- `tests/fixtures/medications.ts` — fixtures stay as-is; tests that don't care about price keep working because `ppv` is nullable in the fixture insert.
- `scripts/sync-ammps.ts`, `scripts/import-medications.ts` — already correct, no edit.

---

## Part 1 — Populate the medications table (operational)

### Root cause

The local dev DB has only the few rows produced by `tests/fixtures/medications.ts` (`Doliprane-{random}` with DCI = Paracétamol). The user, seeing those repetitive results, assumed they were hardcoded in code. They are not — the search query in `lib/medications/queries.ts:14` is real (`pg_trgm` similarity + `ILIKE`). The data is just missing.

### Fix

Run the existing AMMPS sync script once locally:

```bash
pnpm tsx scripts/sync-ammps.ts
```

The script (`scripts/sync-ammps.ts`):
- Scrapes `https://ammps.sante.gov.ma/basesdedonnes/listes-medicaments` (~197 pages, ~10–20 rows/page, ≈2 000–4 000 medications).
- Throttles 100 ms between page fetches; full run ≈5 minutes.
- Upserts on the natural key `(lower(nom_commercial), lower(dosage), lower(forme), lower(laboratoire))` — idempotent, safe to re-run.
- Records a row in `medication_imports` for traceability.

### Acceptance

- After running locally, searching `"doli"` in the prescription editor returns ≥10 real Doliprane variants (different dosages / forms / labs).
- The `medications` row count is in the 2 000–4 000 range.
- A new row exists in `medication_imports` with the script's source identifier.

### Production launch — runbook entry

Append to `docs/runbooks/deploy-1a.md` under a new section:

> ### Medication registry seed (one-time, post-deploy)
>
> The `medications` table ships empty. Run the AMMPS sync against the production DB once after the first deploy:
>
> ```bash
> # From a machine with prod DB credentials in .env.production:
> NODE_ENV=production pnpm tsx scripts/sync-ammps.ts
> ```
>
> Re-run roughly monthly to pick up new registrations / withdrawals. Until cron-automation lands, this is manual.
>
> Fallback if AMMPS is unreachable: `pnpm tsx scripts/import-medications.ts <path-to-xlsx>` against an offline registry export.

### Risk

- **AMMPS site reachable.** The script bypasses TLS chain validation (`rejectUnauthorized: false`) for AMMPS's incomplete cert chain. If the host is unreachable from the user's machine, fall back to `import-medications.ts` with an XLSX export. Both populate the same table via the same upsert key.
- **`pg_trgm` extension installed.** Migration `supabase/migrations/20260503000000_pg_trgm_medications.sql` already creates it. The local DB inherits this on `pnpm db:migrate`. If somehow missing, the search query's `similarity()` call fails — but the `ILIKE` clause still returns matches. Verification step: `SELECT extname FROM pg_extension WHERE extname='pg_trgm'` returns one row.

---

## Part 2 — Display PPV in the search dropdown (code)

### Behavior

When the doctor types in the medication search box on the prescription editor, each result row in the dropdown shows the unit price right-aligned. Format: `"12,50 MAD"` (fr-FR locale, two decimals, plain space between number and unit). Null `ppv` renders as `"—"`.

Visual sketch of one dropdown row:

```
Doliprane 1000mg · comprimé — Paracétamol  (Sanofi)        12,50 MAD
Doliprane 500mg · comprimé — Paracétamol   (Sanofi)         8,20 MAD
Doliprane Codéine 500mg · comprimé — Paracétamol/Codéine   18,40 MAD
Préparation magistrale (sans tarif)                              —
```

The price column does not affect ranking, ordering, or filtering — purely display.

### Code changes

**`lib/medications/queries.ts`**

- Extend the `MedicationSearchHit` type:

  ```ts
  export type MedicationSearchHit = {
    id: string;
    nomCommercial: string;
    dci: string;
    dosage: string | null;
    forme: string | null;
    laboratoire: string | null;
    ppv: string | null;            // NEW — drizzle returns numeric as string
  };
  ```

- Add `m.ppv` to the SQL select; map `r.ppv` in the result mapping.

- Add a formatter co-located so client + server agree:

  ```ts
  export function formatMad(ppv: string | null): string {
    if (ppv == null) return '—';
    const n = Number(ppv);
    if (!Number.isFinite(n)) return '—';
    return `${new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)} MAD`;
  }
  ```

**`app/(authenticated)/consultations/[id]/prescription/search-input.tsx`**

- Import `formatMad`.
- In the dropdown `<li>`, restructure the existing `<button>` content into a flex row: existing label content on the left (truncated if needed), price on the right with `text-right tabular-nums text-muted-foreground shrink-0 pl-3`. Use the existing token-driven typography classes — no new colors, no new spacing tokens.
- No change to `onPick`, `onChange`, search debouncing, or any of the data flow.

**No change required to `app/(authenticated)/consultations/[id]/prescription/actions.ts`** — `searchMedicationsAction` returns whatever `searchMedications` returns; the new field flows through automatically.

### Acceptance

- Each dropdown row shows the price in `"X,YZ MAD"` format with two decimals, right-aligned, tabular-nums, muted color.
- Rows with `ppv = null` show `"—"` in the price slot (not blank, not hidden).
- Layout doesn't break when the label is long: label truncates, price stays visible.
- The existing prescription add / edit / remove / reorder flows are unchanged (manual smoke test, plus existing e2e tests in `tests/e2e/prescriptions.spec.ts` still pass).
- New unit test `tests/unit/medications/format-mad.test.ts` covers: null → "—", `"12.5"` → `"12,50 MAD"`, `"1234.5"` → `"1 234,50 MAD"` (or fr-FR equivalent — assert via the same `Intl.NumberFormat` call to be locale-stable), invalid string → "—".

### Risk

- **`Intl.NumberFormat('fr-FR')` thousands separator differs across Node versions** (narrow no-break space ` ` vs regular space). The unit test asserts using the same `Intl` call rather than a hardcoded string, so it stays stable.
- **`numeric` from drizzle is a string**, not a number. The formatter handles `Number(ppv)` and rejects `NaN`. No runtime exception possible.
- **Search ranking unchanged.** Adding `ppv` to the select does not affect the `ORDER BY similarity(...)` clause.

---

## Out of scope (deliberately) — restated

- AMMPS sync automation (cron / queue).
- Price snapshot on prescription items.
- Price on the printed PDF.
- Prescription total.
- Admin UI for triggering the sync.
- Consultation pricing / payments / clinic KPIs (separate spec).

---

## Acceptance criteria — combined

After both parts land:

1. Local search for `"doli"` returns ≥10 real registry rows from the populated table.
2. Each result row in the dropdown shows the price in `"X,YZ MAD"` format (or `"—"` for null), right-aligned, tabular-nums.
3. The existing prescription editor flows (add, edit, remove, reorder, PDF) all behave identically to before.
4. `tests/e2e/prescriptions.spec.ts` and the new `tests/unit/medications/format-mad.test.ts` both pass.
5. `docs/runbooks/deploy-1a.md` includes the AMMPS sync step under "Medication registry seed".
6. No new database migration. No schema change. No new dependency in `package.json`.
