# Prescription form autocomplete (Posologie + Durée)

> **Why now**: post-launch UX polish. The doctor types Posologie and Durée free-text on every prescription line. Most values are repetitive ("1 cp matin et soir", "7 jours") — typing them every time is friction. A native datalist autocomplete with a static base + the doctor's own history makes prescribing visibly faster within a week of real use.

**Goal**: Posologie and Durée inputs in the prescription editor show a dropdown of suggestions on focus. Suggestions = the doctor's most-frequently-used values (history) merged with a static list of common Moroccan-practice values (floor). Selecting a suggestion populates the input; behavior is otherwise unchanged.

**Architecture**: Native HTML `<datalist>` + `<input list="...">` for the dropdown — zero JavaScript, browser handles filtering, keyboard navigation, and accessibility. One server function aggregates the doctor's top-N posologies and durations from `prescription_items`, merges them with two static lists, and the consultation page passes the result as a prop to the existing `<PrescriptionEditor>`. Two shared `<datalist>` elements are rendered once at the top of the editor; all four input fields reference them by `list=` id.

**Tech stack**: Next.js 16 server components for the page-level fetch, drizzle-orm for the aggregation query, native HTML `<datalist>` (no library). **No new dependency. No schema change. No migration.**

**Prerequisites**: live-filter + consultations list spec (commit `cedf9a8` and downstream).

---

## What this spec does NOT do

- **No per-medication contextual history.** Suggestions are doctor-wide, not filtered by the medication selected. (Was option C in brainstorming; deferred to a future spec — only meaningfully better than B once the doctor has dozens of prescriptions per medication.)
- **No autocomplete on Quantité or Notes.** User explicitly said not critical.
- **No rolling time window** on the history aggregation. All-time history is fine for v1; if doctor patterns drift over years, a `last 6 months` filter can be added without breaking the data flow.
- **No custom-styled dropdown.** Native `<datalist>` styling is browser-default. Browsers render it consistently enough for this use; consistency with the rest of the app's design system is a deliberate non-goal here — typing speed wins over visual polish.
- **No client-side fetch / on-demand refresh.** Suggestions are loaded once per page render with the rest of the consultation data. The doctor doesn't need them to update mid-edit.
- **No deduplication of synonyms.** If the doctor wrote "1 cp matin et soir" once and "1cp matin et soir" (no space) another time, both surface as separate options. Trim+lowercase dedup catches exact matches; spelling/spacing variants are user data and aren't normalized.
- **No editing of the static list at runtime.** It's a code constant. Updating means a code change.

---

## File structure

**New files**

```
lib/prescriptions/
  autocomplete.ts                                 # static lists + getAutocompleteSuggestions + mergeUnique helper

tests/unit/prescriptions/
  autocomplete.test.ts                            # mergeUnique + getAutocompleteSuggestions
```

**Modified files**

```
app/(authenticated)/consultations/[id]/
  page.tsx                                        # add 1 fetch in Promise.all, pass `suggestions` prop to <PrescriptionEditor>

app/(authenticated)/consultations/[id]/prescription/
  editor.tsx                                      # accept `suggestions` prop, render 2 <datalist>s, add list=… attr to 4 inputs
```

**Untouched**

- `db/schema/prescriptions.ts` — `posologie` and `duration` already `text`, no change.
- `lib/prescriptions/{queries,mutations,schemas}.ts` — autocomplete is read-only and orthogonal to the existing flow.
- The prescription's PDF rendering, the line item state machine, the medication search input — all unrelated.

---

## Data model

No schema change. The autocomplete query reads existing `prescription_items.posologie` and `prescription_items.duration` plus joins `prescriptions.doctor_id` for scope. RLS on `prescription_items` (existing migration `supabase/migrations/20260503000100_rls_medications_prescriptions.sql`) covers tenant isolation transparently. The query uses `withTenantTx` to set the RLS context.

### Static lists

Two `as const` arrays in `lib/prescriptions/autocomplete.ts`. Initial values (Moroccan medical practice, French language, common units):

**`STATIC_POSOLOGIES`** (15):
- 1 cp matin et soir
- 1 cp 3 fois par jour
- 1 cp par jour le matin
- 1 cp par jour le soir
- 2 cps par jour
- 1 cp toutes les 8 heures
- 1 cp toutes les 6 heures
- 1 sachet par jour
- 1 sachet 3 fois par jour
- 1 cuillère à café 3 fois par jour
- 5 ml 3 fois par jour
- 1 application 2 fois par jour
- 1 goutte 3 fois par jour
- 1 inhalation 2 fois par jour
- À la demande

**`STATIC_DURATIONS`** (10):
- 3 jours
- 5 jours
- 7 jours
- 10 jours
- 14 jours
- 21 jours
- 1 mois
- 3 mois
- 6 mois
- À renouveler

These are best-effort defaults. Updating them is a 1-line code change.

### Aggregation query

```ts
export async function getAutocompleteSuggestions(
  tenantId: string,
  doctorId: string,
): Promise<{ posologies: string[]; durations: string[] }>;
```

Implementation runs two parallel `SELECT col, COUNT(*) GROUP BY col ORDER BY count DESC LIMIT 10` queries — one for `posologie`, one for `duration`. Both:

- `WHERE pi.tenant_id = $tenantId AND p.doctor_id = $doctorId`
- `AND col IS NOT NULL AND col <> ''`
- Joined to `prescriptions` via `pi.prescription_id` (so we can filter by `doctor_id`).

The function then calls `mergeUnique(history, staticList)` on each pair and returns the merged arrays.

### `mergeUnique` helper

```ts
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
```

History first (most-used surfaces at top of dropdown), static fills the rest. Case-insensitive trimmed dedup so the doctor's "1 cp Matin et soir" doesn't double up with the static "1 cp matin et soir".

---

## Wiring into the editor

### Server-side fetch (consultation page)

`app/(authenticated)/consultations/[id]/page.tsx` currently fetches consultation detail, patient detail, prescription, and tenant **sequentially** (not a `Promise.all`, because `patientData` depends on `detail.consultation.patientId`). Add the autocomplete fetch as one new line. It is independent of the other fetches; placement-wise, append it after the existing `tenant` fetch (just before the JSX return), keeping the order: session → detail → patient → presc → tenant → suggestions.

```ts
const suggestions = await getAutocompleteSuggestions(session.tenantId, session.userId);
```

The fetch is ~10 ms (two indexed GROUP BY queries) and does not block any UI-critical path. If sequencing-cost ever shows up in a profile, it can be hoisted up via a small `Promise.all` for the independent fetches — not pre-emptive.

The suggestions object is passed as a new prop:

```tsx
<PrescriptionEditor
  consultationId={id}
  prescriptionId={presc?.prescription.id ?? null}
  items={presc?.items ?? []}
  readOnly={detail.consultation.isFinalized}
  suggestions={suggestions}
/>
```

### Client component (prescription editor)

`app/(authenticated)/consultations/[id]/prescription/editor.tsx` adds:

1. New prop in the component signature:

```ts
suggestions: { posologies: string[]; durations: string[] };
```

2. Two `<datalist>` elements rendered once near the top of the component's return (placement: just inside the outer `<div className="space-y-3">`, before the items `<ul>`). The datalists are siblings to the items list and the "Ajouter un médicament" form; they can be referenced by `list="posologie-suggestions"` and `list="duration-suggestions"` from anywhere in the same DOM:

```tsx
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
```

3. `list=` attributes on the four inputs:
   - The Posologie input in the **edit existing item** form (currently around `editor.tsx:147-152`) → add `list="posologie-suggestions"`.
   - The Durée input in the same form (around `editor.tsx:158-163`) → add `list="duration-suggestions"`.
   - The Posologie input in the **add new item** form → add `list="posologie-suggestions"`.
   - The Durée input in the same form → add `list="duration-suggestions"`.

`<Input>` accepts arbitrary HTML input props through `...props`, so `list=` flows through unchanged.

4. The placeholder text on these four inputs stays as-is (`ex. 1 cp matin et soir`, `ex. 7 jours`) — useful as a hint when no suggestions are available (e.g., a new doctor with no history before they've selected from the dropdown).

### Read-only mode

In read-only mode (`readOnly={true}`, finalized consultation), the inputs are not rendered — only the `<dl>` summary is. So the autocomplete is naturally inert there. No code change required for read-only.

---

## Behavior

- **First focus**: clicking into Posologie or Durée shows a dropdown of suggestions.
- **Filtered as you type**: typing "mat" filters to suggestions containing "mat" — handled by the browser's native datalist filtering. Match is substring, case-insensitive, browser-controlled.
- **Selection**: clicking or arrow-down + Enter populates the input. The doctor can also type something not in the list and submit normally.
- **Empty state**: a brand-new doctor (zero prescription history) sees only the 15 static posologies + 10 static durations.
- **Existing prescriptions**: open in read-only mode (if finalized) — no autocomplete, render unchanged. If reopened in edit mode (e.g., not yet finalized), the autocomplete works as above.
- **No suggestion**: doctor types a fully custom value, presses Tab — the input keeps the typed value, just like a regular text input.
- **Performance**: ~25 strings per datalist. Browsers handle this trivially. No virtualization, no debounce.

---

## Testing

- **Unit (`tests/unit/prescriptions/autocomplete.test.ts`)**:
  - `mergeUnique([], static)` → returns the static list, length 15 (or 10 for durations).
  - `mergeUnique(['x', 'y'], ['Y', 'z'])` → `['x', 'y', 'z']` (case-insensitive dedup, history first).
  - `mergeUnique(['  1 CP  '], ['1 cp'])` → length 1 (trimmed + lowercased dedup); the first form wins (history before static).
  - `mergeUnique(['', '  '], staticList)` → empty/whitespace history entries dropped, returns the static list unchanged.
  - `getAutocompleteSuggestions(tenantId, doctorId)` integration test: seed 5 prescription_items for one doctor with two distinct posologie values (one used 3x, one used 1x). Assert the 3x value is first in the returned `posologies` array, and the 1x value is second. Static items follow.
  - Tenant isolation: a prescription_item for tenant B with `posologie='only in B'` does not appear when querying tenant A's doctor.
- **No e2e additions.** The datalist is a browser primitive — testing it via Playwright would mean simulating browser dropdown interaction, which is fragile. Manual smoke is sufficient.

---

## Risks and assumptions

- **Datalist styling differs across browsers.** Chrome, Edge, Firefox, Safari each render the dropdown slightly differently (font, background, hover color). Acceptable for this use — the doctor cares about speed, not aesthetic uniformity. If a specific browser's rendering becomes a complaint, we revisit with a custom dropdown spec.
- **Static list quality.** The 15 posologies + 10 durations are best-effort guesses for Moroccan practice. They are trivially editable post-launch (1-line code constant change) without a migration. If the user wants to override the values, that's a follow-up edit, not a blocker.
- **Aggregation cost.** Two queries per consultation page load, each scanning prescription_items filtered by doctor_id. With a typical doctor doing ~20 consultations/day with ~3 items each, after a year that's ~22000 rows. The `tenant_id + doctor_id` indices already on `prescription_items` (verified in the existing schema) cover this; the GROUP BY on `posologie` is a sequential scan but on a small filtered set. Sub-10ms in practice. If it ever shows up in a slow query log, we add an index on `(tenant_id, doctor_id, posologie)` — not pre-emptively (YAGNI).
- **History vs spelling drift.** A doctor who switches between "1 cp matin et soir" and "1 cp matin/soir" sees both surface in the dropdown. That's actually useful — they can pick whichever variant they want this time. No behavior change needed.
- **Privacy / RLS**. The aggregation reads only `prescription_items` + `prescriptions.doctor_id`. RLS already isolates by tenant. The doctor sees their own history (not other doctors in the same tenant) because the WHERE filters by `doctor_id`. No new privacy surface.

---

## Acceptance criteria — combined

1. The Posologie input on the prescription editor shows a dropdown of suggestions on focus.
2. The Durée input shows a dropdown of suggestions on focus.
3. Suggestions for a new doctor (no history) include the 15 static posologies and 10 static durations.
4. Suggestions for an experienced doctor surface their own most-frequently-used values FIRST, then the static list, deduplicated case-insensitively.
5. Selecting a suggestion populates the input. Submitting the row saves correctly (existing flow unchanged).
6. The 4 inputs that need autocomplete (2 in edit form + 2 in add form) all reference the shared `<datalist>` elements via `list=`.
7. Read-only / finalized consultations render unchanged (no autocomplete, no error).
8. No schema change, no migration, no new dependency in `package.json`.
9. Unit tests for `mergeUnique` and `getAutocompleteSuggestions` pass; tsc clean.
10. Existing tests still pass — `tests/e2e/prescriptions.spec.ts`, all `tests/unit/`, all `tests/rls/`.
