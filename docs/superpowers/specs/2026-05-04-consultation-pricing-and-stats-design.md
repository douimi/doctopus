# Consultation pricing + assistant payments + clinic KPI dashboard

> **Why now**: pre-launch, the user wants the doctor to record a price (or "Gratuit") for every consultation, the assistant to process payments, and a financial KPI dashboard for the clinic. This is the first substantive post-cleanup feature; it precedes the open-ended super-app roadmap brainstorm.

**Goal**: Every finalized consultation carries a price (or is marked free). The cabinet's assistant processes payments from a unified `/today` section. The doctor monitors revenue and outstanding payments from a new `/stats` route.

**Architecture**: Seven new columns on the existing `consultations` table model the full pricing + payment lifecycle (no separate payments table). One new column on `tenants` stores the cabinet's default tariff. The doctor's existing finalize action becomes a two-step gated dialog. A new role-aware `<PaymentsPanel>` component replaces no existing surface — it slots between "Salle d'attente" and "En consultation" on `/today`. A new doctor-only `/stats` route consumes a small `lib/stats/queries.ts` module that aggregates the new columns.

**Tech stack**: Next.js 16, drizzle-orm with Postgres `numeric`, Tailwind v4 with existing tokens, `@base-ui/react` for the dialogs (already installed), `recharts` for the dashboard charts (already installed). No new dependency. New columns require one Drizzle migration plus a hand-written RLS extension.

**Prerequisites**: medication search cleanup (commits `ae822c7..c8bbd51` on `main`).

---

## What this feature does NOT do

- **Partial / split payments.** One method per payment. Patient pays full or stays awaiting.
- **Refunds, voids, or price edits after finalize.** No reverse transitions. Manual DB fix if a mistake is recorded.
- **Receipts / invoice PDFs.** Future feature.
- **Consultation-type presets** (Simple / Suivi / Urgence with different default prices). Phase 2 — would introduce a "type" dimension that ripples through schema, stats grouping, and reporting.
- **Year-over-year comparisons, CSV / PDF export, forecasting, trend lines.** Future.
- **Per-day-of-week heatmaps, time-of-day analysis.** Future.
- **Patient lifetime value, retention metrics, RFM analysis.** Future.
- **Payment gateway integration** (Stripe / CMI / etc.). All recording is manual; no online payments.
- **Tax / VAT / TVA calculations.** Doctor handles externally.
- **Tip / discount fields on payment.** Use the optional note for now.
- **Multi-currency.** MAD only.
- **Reminders / SMS for outstanding payments.** Future.
- **Stats access for the assistant.** `/stats` is doctor-only. The assistant sees only `/today` (which is sufficient for their job).
- **"Top patients" leakage to assistant.** The Top 10 table lives on `/stats` only; assistant cannot reach it.

---

## File structure

**New files**

```
app/
  (authenticated)/
    stats/
      page.tsx                                 # server component, doctor-only
      range-pills.tsx                          # 4-pill window selector
      revenue-chart.tsx                        # 'use client' Recharts BarChart
      method-chart.tsx                         # 'use client' Recharts donut
      outstanding-table.tsx                    # server component
      top-patients-table.tsx                   # server component

components/
  payments/
    payments-panel.tsx                         # role-aware section for /today
    encaisser-dialog.tsx                       # 'use client' assistant action dialog
    finalize-pricing-dialog.tsx                # 'use client' doctor finalize dialog

lib/
  time.ts                                      # CABINET_TZ = 'Africa/Casablanca' + helpers (todayStartUtc, etc.)
  stats/
    queries.ts                                 # 'server-only' aggregation queries
  payments/
    queries.ts                                 # 'server-only' getPaymentsForToday
    mutations.ts                               # 'server-only' recordPayment + transitions
    schemas.ts                                 # zod schemas for finalize-pricing + record-payment

supabase/migrations/
  XXXX_consultation_pricing.sql                # Drizzle-generated columns + check constraints
  202605XXXXXXXX_rls_consultation_pricing.sql  # hand-written RLS extension

tests/
  unit/
    payments/
      mutations.test.ts                        # transitions, schemas, gates
      queries.test.ts                          # getPaymentsForToday
    stats/
      queries.test.ts                          # stats aggregations
  rls/
    consultation-pricing.test.ts               # cross-tenant + role-gating
  e2e/
    consultation-pricing.spec.ts               # finalize → encaisser → /stats
```

**Files modified**

```
db/schema/
  consultations.ts                             # 7 new columns + check constraints
  tenants.ts                                   # default_consultation_price_mad

app/(authenticated)/
  consultations/[id]/
    actions.ts                                 # finalizeConsultationAction signature change
    editor.tsx                                 # add Tarification badge in read-only mode
  today/
    page.tsx                                   # render PaymentsPanel between waiting/in-consult; pass role
  settings/cabinet/
    page.tsx                                   # add "Tarif par défaut" input
    actions.ts                                 # new updateDefaultPriceAction (or extend existing)

components/
  shell/
    doctor-shell.tsx                           # add "Statistiques" sidebar nav item (doctor-only)
  today/
    today-stats.tsx                            # 5th tile: "Recettes du jour"

lib/
  auth/
    guards.ts                                  # add requireAssistant (mirrors requireDoctor: redirects non-assistants to /today)
  consultations/
    mutations.ts                               # finalizeConsultation accepts pricing input
    schemas.ts                                 # finalizePricingSchema
```

**Files NOT modified**

- `app/api/prescriptions/[id]/pdf/*` — PDF unchanged. Pricing isn't on the prescription.
- `app/(admin)/admin/*` — super-admin views. Not in scope here; could add per-tenant revenue summary in a future spec.
- `lib/medications/*` — unrelated.

---

## Data model

### `consultations` — 7 new columns

```sql
ALTER TABLE consultations
  ADD COLUMN price_mad     numeric(10,2),
  ADD COLUMN is_free       boolean      NOT NULL DEFAULT false,
  ADD COLUMN payment_status text        NOT NULL DEFAULT 'awaiting',
  ADD COLUMN payment_method text,
  ADD COLUMN paid_at        timestamptz,
  ADD COLUMN paid_by        uuid REFERENCES user_profiles(id),
  ADD COLUMN payment_note   text;
```

- `price_mad numeric(10,2)` — null when `is_free = true`. Drizzle returns this as `string | null`.
- `is_free boolean` — true when "Gratuit" was checked at finalize.
- `payment_status text` — domain `'awaiting' | 'paid' | 'free'`. Three values, not two: `'free'` is distinct from `'paid'` so stats can split courtesy work from real revenue.
- `payment_method text` — domain `'especes' | 'carte' | 'cheque' | 'virement' | 'autre'`. Nullable; set when status moves to `'paid'`.
- `paid_at timestamptz` — when the row reached its terminal state.
- `paid_by uuid` — who recorded it. For `'paid'`, the assistant. For `'free'`, the doctor at finalize.
- `payment_note text` — free-form, optional, mandatory in UI when `payment_method = 'autre'`.

**Check constraints (database-enforced; not just UI):**

```sql
ALTER TABLE consultations
  ADD CONSTRAINT consultations_free_implies_no_price
    CHECK (is_free = false OR price_mad IS NULL),
  ADD CONSTRAINT consultations_paid_requires_method_meta
    CHECK (payment_status <> 'paid' OR
           (payment_method IS NOT NULL AND paid_at IS NOT NULL AND paid_by IS NOT NULL)),
  ADD CONSTRAINT consultations_free_status_implies_is_free
    CHECK (payment_status <> 'free' OR is_free = true),
  ADD CONSTRAINT consultations_awaiting_requires_priced_nonfree
    CHECK (payment_status <> 'awaiting' OR
           (price_mad IS NOT NULL AND price_mad > 0 AND is_free = false)),
  ADD CONSTRAINT consultations_payment_status_domain
    CHECK (payment_status IN ('awaiting','paid','free')),
  ADD CONSTRAINT consultations_payment_method_domain
    CHECK (payment_method IS NULL OR
           payment_method IN ('especes','carte','cheque','virement','autre'));
```

**Indices:**

```sql
CREATE INDEX consultations_payment_status_idx
  ON consultations (tenant_id, payment_status);
CREATE INDEX consultations_paid_at_idx
  ON consultations (tenant_id, paid_at)
  WHERE paid_at IS NOT NULL;
```

The first speeds up the `/today` "Paiements en attente" lookup. The second speeds up the `/stats` time-window aggregations.

### `tenants` — 1 new column

```sql
ALTER TABLE tenants
  ADD COLUMN default_consultation_price_mad numeric(10,2);
```

Nullable. When set, prefills the doctor's finalize dialog. When null, the field is empty.

### State machine

```
                       ┌─ is_free = true   ──→ payment_status = 'free'  (terminal)
                       │   sets paid_at = now(), paid_by = doctor.id
finalize (gated) ──────┤
                       │
                       └─ price_mad > 0    ──→ payment_status = 'awaiting'
                                                    │
                                                    │ assistant encaisse
                                                    ▼
                                              payment_status = 'paid'  (terminal)
                                              sets payment_method, paid_at, paid_by, payment_note
```

**Gate at finalize (server-enforced):** the action rejects unless either (`price_mad > 0` AND `is_free = false`) OR (`is_free = true` AND `price_mad IS NULL`).

**Awaiting → paid (server-enforced):** the action rejects unless `payment_method` is one of the five allowed values, and (when method is `'autre'`) `payment_note` is non-empty.

**No backward transitions.** No "void", no "refund", no edit-after-paid. This is the rigorous version of "out of scope for v1."

### RLS

Existing consultation RLS already isolates by `tenant_id`. The new columns inherit that isolation transparently — no extra policies needed for SELECT.

**Application-layer write rules** (enforced in `lib/consultations/mutations.ts` + `lib/payments/mutations.ts`, not in RLS — Postgres RLS doesn't compose cleanly with column-level UPDATE permissions at our maturity. RLS still protects tenant isolation.):

- **Doctor at finalize** writes `price_mad`, `is_free`, `payment_status`, `paid_at`, `paid_by` — in one transaction. The values are determined by the dialog choice:
  - If `is_free = true`: `price_mad = null`, `payment_status = 'free'`, `paid_at = now()`, `paid_by = doctor.id`.
  - If `is_free = false`: `price_mad = parsedPrice`, `payment_status = 'awaiting'`, `paid_at = null`, `paid_by = null`.
- **Doctor at any other time:** cannot mutate any pricing/payment fields. There is no "edit price after finalize" path.
- **Assistant via `recordPaymentAction`:** can write `payment_status`, `payment_method`, `paid_at`, `paid_by`, `payment_note`, and only when transitioning a consultation in this tenant from `payment_status = 'awaiting'` to `'paid'`. Cannot mutate `price_mad` or `is_free`.
- Both roles **read** all fields. Only doctor reaches `/stats` (route-level guard, not RLS).

### Audit

Three new audit actions (existing `recordAudit` pattern):
- `consultation.price_set` — recorded by `finalizeConsultationAction` when persisting price+is_free. Metadata: `{ priceMad, isFree }`.
- `consultation.payment_received` — recorded by `recordPaymentAction`. Metadata: `{ paymentMethod, hasNote }`.
- `tenant.default_price_updated` — recorded when doctor changes `default_consultation_price_mad`. Metadata: `{ from, to }`.

---

## Doctor's finalize UX

### Dialog flow

The "Terminer la consultation" button on `/consultations/[id]/page.tsx` no longer submits directly. It opens an inline dialog (`@base-ui/react` `<Dialog>`):

- **Title**: `"Tarification et clôture"`.
- **Body**: a single visual block, two states:
  - **Default state**: numeric input `Prix (MAD)`, prefilled with `tenant.default_consultation_price_mad` (or empty). Step `0.50`, min `0.01`. Auto-focus when dialog opens.
  - **"Gratuit" toggle**: when checked, the price input becomes disabled and visually muted (`opacity-50 cursor-not-allowed`). The dialog body height stays stable so the layout doesn't jump.
- **Submit**: button labeled `"Terminer la consultation"`. Disabled until either price > 0 OR the Gratuit checkbox is checked.
- **Cancel**: button labeled `"Annuler"`. Closes the dialog. No DB change. Editor remains unfinalized.

### Server action change

`finalizeConsultationAction(formData)` becomes:

```ts
const finalizePricingSchema = z.object({
  consultationId: z.string().uuid(),
  isFree: z.boolean(),
  priceMad: z.string().optional(),  // numeric as string from FormData
}).refine(
  (d) => d.isFree || (d.priceMad != null && Number(d.priceMad) > 0),
  { message: 'Prix requis (ou cocher Gratuit).' },
);
```

On success:
- Update `consultations`:
  - If `isFree`: `price_mad = null`, `is_free = true`, `payment_status = 'free'`, `paid_at = now()`, `paid_by = doctor.id`.
  - Else: `price_mad = parsedPrice`, `is_free = false`, `payment_status = 'awaiting'`, others stay null.
  - Plus the existing `isFinalized = true`, `finalizedAt = now()`.
- Transition appointment to `done` (existing logic via `applyTransition`).
- `recordAudit({ action: 'consultation.price_set', ... })`.
- Existing `recordAudit({ action: 'consultation.finalize', ... })`.
- `revalidatePath('/today')`.
- `redirect('/today')`.

On validation failure: return `{ ok: false, error }` and the dialog displays the error inline (does not redirect).

### Read-only mode (already-finalized consultation)

When the doctor reopens a finalized consultation, the editor's `PageHeader.actions` slot replaces the "Terminer" form with a small `StatusBadge` row showing the pricing state:

- `is_free = true`: pill `"Gratuit"` (variant `neutral`).
- `payment_status = 'awaiting'`: pill `"Prix : 250,00 MAD · En attente"` (variant `warning`).
- `payment_status = 'paid'`: pill `"Prix : 250,00 MAD · Payé · Espèces"` (variant `success`).

Uses the existing `StatusBadge` primitive and `formatMad` helper from `lib/medications/format.ts` (yes — same helper, MAD is MAD; no need for a separate one).

---

## Assistant's `/today` section — `<PaymentsPanel>`

### Component

`components/payments/payments-panel.tsx` is a server component that takes the role and renders accordingly:

```tsx
export function PaymentsPanel({
  awaiting,
  collectedToday,
  role,
}: {
  awaiting: PaymentRow[];
  collectedToday: PaymentRow[];
  role: 'doctor' | 'assistant';
});
```

Where `PaymentRow` is:

```ts
type PaymentRow = {
  consultationId: string;
  patientFullName: string;
  priceMad: string | null;
  isFree: boolean;
  paymentStatus: 'awaiting' | 'paid' | 'free';
  paymentMethod: string | null;
  paidAt: Date | null;
  paidByName: string | null;
  finalizedAt: Date;
};
```

### Layout

- **`Section` heading**: `"Paiements"` with the `Wallet` icon (lucide-react), count badge = `awaiting.length`.
- **Sub-section "En attente"** (always rendered, in section body):
  - List of awaiting rows, ordered by `finalizedAt DESC`. Multi-day; no date filter.
  - Each row: `Avatar` (patient initials, tone `primary`) + patient full name + `formatMad(priceMad)` + relative finalized-at ("il y a 2h", "hier 18:30").
  - When `role === 'assistant'`: a `Button` "Encaisser" on the right opens the `<EncaisserDialog>`.
  - When `role === 'doctor'`: no button. Row is read-only.
  - Empty state: `EmptyState` primitive — `Wallet` icon + "Aucun paiement en attente" + "Les consultations clôturées apparaîtront ici."
- **Sub-section "Encaissés aujourd'hui"** (collapsible, collapsed by default):
  - Trigger row: chevron + `"Encaissés aujourd'hui"` + count.
  - When expanded: list of paid+free rows whose `paid_at` is today, ordered `paid_at DESC`. Each row: avatar + patient name + amount (or "Gratuit" pill if `is_free`) + method chip + `paid_at` time + recorder name.
  - Same `EmptyState` pattern for "Aucun paiement aujourd'hui".

### `<EncaisserDialog>`

Client component (`'use client'`). Triggered from the assistant's "Encaisser" button.

- **Title**: `"Encaisser le paiement de [Patient]"`.
- **Read-only line**: `"Prix : 250,00 MAD"`.
- **Méthode de paiement**: a chip-group radio (`@base-ui/react` `<RadioGroup>` + custom styling using existing tokens) — Espèces · Carte · Chèque · Virement · Autre. Default: Espèces.
- **Note** (textarea, optional). Becomes mandatory in UI when "Autre" is selected (form-level zod refine).
- **Submit**: `"Confirmer l'encaissement"`. **Cancel**: `"Annuler"`.

Submits to `recordPaymentAction(consultationId, method, note)`.

### Server action

`recordPaymentAction` (in `lib/payments/mutations.ts` invoked by `app/(authenticated)/today/payments/actions.ts` or co-located action file under `today/`):

```ts
const recordPaymentSchema = z.object({
  consultationId: z.string().uuid(),
  paymentMethod: z.enum(['especes','carte','cheque','virement','autre']),
  paymentNote: z.string().nullable().optional(),
}).refine(
  (d) => d.paymentMethod !== 'autre' || (d.paymentNote && d.paymentNote.trim().length > 0),
  { message: 'Une note est requise quand la méthode est "Autre".' },
);
```

Validates:
- Session role is `'assistant'` (uses new `requireAssistant` guard in `lib/auth/guards.ts`).
- Consultation exists in this tenant, `payment_status === 'awaiting'`.

On success:
- Update consultation: `payment_status = 'paid'`, `payment_method = parsed.method`, `paid_at = now()`, `paid_by = session.userId`, `payment_note = parsed.note ?? null`.
- `recordAudit({ action: 'consultation.payment_received', ... })`.
- `revalidatePath('/today')`.
- `revalidatePath('/stats')`.

On failure: return error; dialog shows it inline.

---

## `/today` integration

`app/(authenticated)/today/page.tsx` already fetches today's appointments. Two additions:

1. **`<TodayStats>`** gets a 5th tile, `"Recettes du jour"` — sum of `price_mad` for consultations with `payment_status = 'paid'` AND `paid_at` is today. Hint line: `"X encaissés · Y en attente"`. Tone: `success`. Visible to both roles. The tile grid becomes `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`.

2. **`<PaymentsPanel>`** is rendered between the existing "Salle d'attente" and "En consultation" sections. Data comes from a new `getPaymentsForToday(tenantId)` in **`lib/payments/queries.ts`** (kept separate from `lib/appointments/queries.ts` to avoid overloading the appointments module):

```ts
export async function getPaymentsForToday(tenantId: string): Promise<{
  awaiting: PaymentRow[];
  collectedToday: PaymentRow[];
}>;
```

Returns all `awaiting` rows (multi-day) and `paid/free` rows whose `paid_at` is today. Joins to `patients` for the name and to `user_profiles` (alias `paid_by_user`) for the recorder name.

---

## `/stats` route

### Access

`app/(authenticated)/stats/page.tsx` — server component. Calls `requireDoctor()` (existing guard). Assistant attempting to navigate is redirected to `/today`.

### Sidebar

`components/shell/doctor-shell.tsx` already has an `isDoctor` flag. Add a new sidebar item to the existing `Cabinet` group — wait, no, "Cabinet" group is shared with assistant. Add it to the doctor-only `Compte` group:

```tsx
<SidebarNavItem href="/stats" icon={<BarChart3 className="size-4" aria-hidden />}>
  Statistiques
</SidebarNavItem>
```

Placed first in the Compte group (before Équipe / Cabinet / Journal) since it's the most-used.

### URL state

`?range=today|7d|30d|90d`. Default `30d` if absent. Validate via zod, redirect to default on invalid input.

### Page composition

```
<PageHeader title="Statistiques" description="Recettes et activité du cabinet." />
<RangePills active={range} />

<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
  <StatCard tone="success" label="Recettes" value={fmtMAD(summary.totalRevenue)} hint={`${summary.paidCount} consultations`} />
  <StatCard tone="primary" label="Consultations" value={summary.totalCount} hint={`${summary.paidCount} payés · ${summary.awaitingCount} en attente · ${summary.freeCount} gratuits`} />
  <StatCard tone="admin"   label="Prix moyen" value={fmtMAD(summary.avgPrice)} hint="MAD/consultation" />
  <StatCard tone="warning" label="En attente" value={summary.awaitingCount} hint={`${fmtMAD(summary.awaitingTotal)} à encaisser`} />
</div>

<Section icon={Activity}    title="Recettes par jour">    <RevenueChart   daily={revenueByDay} /> </Section>
<Section icon={PieChart}    title="Recettes par méthode"> <MethodChart    byMethod={revenueByMethod} /> </Section>
<Section icon={AlertCircle} title="Paiements en attente"> <OutstandingTable rows={outstanding} /> </Section>
<Section icon={Award}       title="Top 10 patients">      <TopPatientsTable rows={topPatients} /> </Section>
```

`fmtMAD` is `formatMad` from `lib/medications/format.ts` (the `numeric` helper from the cleanup).

### Queries

`lib/stats/queries.ts` (`'server-only'`):

```ts
export type StatsRange = 'today' | '7d' | '30d' | '90d';

export type RevenueSummary = {
  totalRevenue: string;       // numeric → string
  totalCount: number;
  paidCount: number;
  awaitingCount: number;
  freeCount: number;
  avgPrice: string | null;    // null if no priced consultations
  awaitingTotal: string;      // sum of price_mad of awaiting rows
};

export type RevenueByDay = Array<{ date: string; revenue: string; count: number }>;
export type RevenueByMethod = Array<{ method: string; revenue: string; count: number }>;
export type OutstandingRow = { consultationId: string; patientFullName: string; priceMad: string; finalizedAt: Date };
export type TopPatientRow = { patientId: string; patientFullName: string; revenue: string; consultationCount: number };

export async function getRevenueSummary(tenantId: string, range: StatsRange): Promise<RevenueSummary>;
export async function getRevenueByDay(tenantId: string, range: StatsRange): Promise<RevenueByDay>;
export async function getRevenueByMethod(tenantId: string, range: StatsRange): Promise<RevenueByMethod>;
export async function getOutstandingPayments(tenantId: string, range: StatsRange): Promise<OutstandingRow[]>;
export async function getTopPatients(tenantId: string, range: StatsRange, limit?: number): Promise<TopPatientRow[]>;
```

Each function uses the `paid_at` index for window filtering. The "outstanding" function filters by `payment_status = 'awaiting'` AND `finalized_at >= window_start` (since outstanding rows have no `paid_at` yet).

### Charts

- `revenue-chart.tsx`: `'use client'`. Recharts `<BarChart>` with one bar per day. Days with zero revenue render as zero-height (X-axis tick still present). Reuses the same axis tokens / colors as the admin `UsageChart` (which uses Recharts already).
- `method-chart.tsx`: `'use client'`. Recharts `<PieChart>` (donut variant, `innerRadius=60`, `outerRadius=90`). Each slice colored from a 5-color palette (espèces=primary, carte=admin, chèque=warning, virement=success, autre=muted). Legend rendered as a small table beside the donut on `lg:` viewports, below on mobile.

### Patient name display

Top 10 / Outstanding tables show **full names** (e.g., `"Berrada Yasmine"`). Doctor-only access already restricts the audience.

---

## Cabinet settings — default tariff

`app/(authenticated)/settings/cabinet/page.tsx` (currently has unstaged phase-A modifications — additive change only, won't conflict with the form rework):

- Add a `FormField` "Tarif par défaut (MAD)" below the existing fields.
- Numeric input, optional, step `0.50`, min `0.01`, max `99999.99`.
- Helper text: "Prefille le champ Prix lors de la clôture des consultations."
- On submit, the existing settings form action persists `default_consultation_price_mad`. New zod field added to the existing schema.
- Audit: `tenant.default_price_updated` with `{ from, to }` metadata.

---

## Testing

- **Unit (`tests/unit/payments/mutations.test.ts`)**: validate the zod schemas (price required when not free, note required when method=autre), state transitions (awaiting → paid valid; paid → awaiting invalid; finalize without price/free invalid).
- **Unit (`tests/unit/stats/queries.test.ts`)**: a small fixture (~10 consultations across two days, mix of paid/awaiting/free, mix of methods) tests each `lib/stats/queries.ts` function returns the expected aggregates.
- **RLS (`tests/rls/consultation-pricing.test.ts`)**: tenant-A doctor cannot read tenant-B pricing; tenant-A assistant cannot record payment on tenant-B consultation; tenant-A doctor cannot bypass guard to record payment as if they were assistant.
- **E2E (`tests/e2e/consultation-pricing.spec.ts`)**: doctor finalizes with price 250 MAD → assistant logs in → "Encaisser" → method "Espèces" → confirm → consultation appears in "Encaissés aujourd'hui" with method chip "Espèces" → doctor logs in → `/stats` shows 250 MAD in "Recettes" tile.

---

## Acceptance criteria — combined

1. Doctor cannot finalize a consultation without entering a price > 0 OR checking "Gratuit". Server action rejects.
2. Default tariff (when set on the tenant) prefills the finalize dialog.
3. Free consultations skip the assistant entirely — `payment_status='free'`, `paid_at=now()`, `paid_by=doctor.id` set at finalize.
4. After finalize with a price, consultation appears in `/today`'s "Paiements en attente" sub-list — with multi-day visibility (older awaiting rows still shown).
5. Assistant `Encaisser` dialog: choose method + optional note → updates `payment_status='paid'`, `payment_method`, `paid_at`, `paid_by`, `payment_note`. `'autre'` requires a note.
6. Doctor sees "Paiements" section read-only on `/today`. No "Encaisser" button.
7. "Recettes du jour" tile reflects today's `paid` revenue, updates after each Encaisser.
8. `/stats` route is doctor-only. Assistant navigating there is redirected to `/today`.
9. Range selector (today/7j/30j/90j) drives all 4 KPI tiles + 4 sections of `/stats`. Default range: 30j.
10. RLS prevents cross-tenant reads/writes of pricing & payment fields. Verified by `tests/rls/consultation-pricing.test.ts`.
11. All three new audit actions fire correctly (`consultation.price_set`, `consultation.payment_received`, `tenant.default_price_updated`).
12. Database constraints reject malformed states (paid without method, awaiting with is_free=true, etc.) — verified via direct SQL fixture in `mutations.test.ts`.
13. No new dependency in `package.json`. Recharts already present; no payment gateway lib added.
14. New e2e test `tests/e2e/consultation-pricing.spec.ts` passes end-to-end.
15. Migration applies cleanly to a fresh DB (`pnpm supabase:reset` followed by `pnpm db:migrate` works without errors).
16. Existing tests continue to pass — `tests/e2e/prescriptions.spec.ts`, all `tests/unit/`, all `tests/rls/`. No regression in pre-existing flows.

---

## Risks and assumptions

- **Tenant has only one assistant or zero assistants.** The schema allows multiple, but the UX treats "the assistant" as singular ("encaissé par F. Bennani"). If a cabinet has two assistants, both can encaisser; the recorder is whichever one acted. No conflict possible — `payment_status='awaiting'` is a single-take field.
- **Walk-in consultations finalized after closing time.** Multi-day awaiting handles this. No assumption that "awaiting → paid" happens same-day.
- **Doctor changes the default tariff mid-day.** The change applies to consultations finalized after the change. Already-finalized consultations are not re-priced (and shouldn't be — they have their own snapshot).
- **Patient deletion.** Outside this spec's scope — patients aren't deleted today. Stats queries assume `patient_id` resolves; if a patient were ever deleted, top-10 would skip rows with null joins.
- **Time zones.** Doctopus is Morocco-only at this stage; there is no `timezone` column on `tenants`. "Today" is defined as the current `Africa/Casablanca` calendar day, computed via a single project-level constant in a new `lib/time.ts` module (`export const CABINET_TZ = 'Africa/Casablanca'`). All "today" boundaries in payments queries and stats queries use this constant. When the product expands beyond Morocco, this becomes a per-tenant setting — flagged for that future spec, not done here.
- **Soft-delete or deactivation.** Out of scope. Once `paid`, always `paid`.
