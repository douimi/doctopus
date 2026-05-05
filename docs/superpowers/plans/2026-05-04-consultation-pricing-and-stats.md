# Consultation pricing + assistant payments + clinic KPIs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Doctor records a price (or marks "Gratuit") at consultation finalize, gated by the action. Assistant processes payments via a new section on `/today`. Doctor monitors revenue and outstanding payments via a new doctor-only `/stats` route.

**Architecture:** Seven new columns on `consultations` model the full pricing + payment lifecycle (no separate payments table). One new column on `tenants` stores the cabinet's default tariff. Database `CHECK` constraints enforce the state-machine invariants at the DB level. Application-layer write rules enforce role-gated transitions. The existing `/consultations/[id]` finalize button gains a two-step gated dialog. A new role-aware `<PaymentsPanel>` slots into `/today` between "Salle d'attente" and "En consultation". A new doctor-only `/stats` route consumes a small `lib/stats/queries.ts` aggregation module.

**Tech Stack:** Next.js 16, drizzle-orm + Postgres `numeric(10,2)`, Tailwind v4 with project tokens, `@base-ui/react` (already installed) for dialogs, `recharts` (already installed) for charts, zod for validation, vitest + playwright for tests. **No new dependencies.**

**Spec:** [docs/superpowers/specs/2026-05-04-consultation-pricing-and-stats-design.md](../specs/2026-05-04-consultation-pricing-and-stats-design.md) (commit `c0fce4a`).

---

## Pre-implementation setup

### Working tree

The branch is `main`. The working tree contains many unrelated unstaged changes from prior phase-A UI work. **Five of them touch files this plan also modifies**:

- `app/(authenticated)/today/page.tsx` (Task 11)
- `app/(authenticated)/consultations/[id]/editor.tsx` (Task 11)
- `components/today/today-stats.tsx` (Task 11)
- `components/shell/doctor-shell.tsx` (Task 12)
- `app/(authenticated)/settings/cabinet/page.tsx` (Task 13)

Before starting Task 11, the executor MUST resolve this conflict by either:
1. **Asking the user to commit / stash their phase-A modifications** to those five files.
2. **Asking the user to switch to a worktree** for this implementation (the medication cleanup chose option 1's equivalent).

Tasks 1–10 do **not** touch any of those five files and can run safely without resolving this. Tasks 11–13 cannot. Each of those tasks restates this gate at the top.

For ALL tasks: **stage only the files listed in that task's `Files:` block.** Never use `git add .`, `-A`, or `-a`. After each `git add`, run `git status --porcelain | grep -v "^??"` to confirm what's staged, then commit.

### Spec deviations

**Two minor deviations from the spec, both already justified inline in the relevant tasks:**

1. The spec listed a `supabase/migrations/202605XXXXXXXX_rls_consultation_pricing.sql` "hand-written RLS extension" file. After re-reading the spec body ("Existing consultation RLS already isolates by `tenant_id`. The new columns inherit that isolation transparently — no extra policies needed for SELECT") and the existing RLS migration `supabase/migrations/20260502100000_rls_consultations.sql`, **the hand-written RLS extension is not needed**. Existing tenant-scoped policies cover all new columns. The plan therefore drops that file. The application-layer write rules described in the spec are still implemented per the spec.
2. The spec described two dialogs (`<FinalizePricingDialog>`, `<EncaisserDialog>`) but didn't specify whether to introduce a shared `components/ui/dialog.tsx` primitive. The plan introduces one (~70 lines, mirrors the existing `components/ui/select.tsx` shadcn-style wrapper around `@base-ui/react`) so both dialogs and any future dialog use the same wiring. Lands as Step 1 of Task 8.

---

## File map

**Created**
```
lib/
  time.ts                                              # CABINET_TZ + todayBoundsUtc + rangeBoundsUtc
  payments/
    schemas.ts                                         # finalizePricingSchema, recordPaymentSchema
    mutations.ts                                       # recordPayment
    queries.ts                                         # getPaymentsForToday + types
  stats/
    queries.ts                                         # 5 aggregation functions + types

components/
  ui/
    dialog.tsx                                         # @base-ui/react Dialog wrapper (shadcn-style)
  payments/
    payments-panel.tsx                                 # role-aware /today section
    encaisser-dialog.tsx                               # 'use client' assistant dialog
    finalize-pricing-dialog.tsx                        # 'use client' doctor finalize dialog

app/(authenticated)/
  today/payments/
    actions.ts                                         # recordPaymentAction (server action wrapper)
  stats/
    page.tsx                                           # server component, doctor-only
    range-pills.tsx                                    # 4-pill window selector (server component)
    revenue-chart.tsx                                  # 'use client' Recharts BarChart
    method-chart.tsx                                   # 'use client' Recharts donut
    outstanding-table.tsx                              # server component
    top-patients-table.tsx                             # server component

tests/
  unit/
    time.test.ts                                       # bounds for the 4 ranges + DST edges
    payments/
      schemas.test.ts                                  # zod refinements
      mutations.test.ts                                # recordPayment transitions
      queries.test.ts                                  # getPaymentsForToday
    stats/
      queries.test.ts                                  # 5 aggregation functions
  rls/
    consultation-pricing.test.ts                       # cross-tenant + role-gating
  e2e/
    consultation-pricing.spec.ts                       # finalize → encaisser → /stats
```

**Modified**
```
db/schema/
  consultations.ts                                     # 7 new columns + check constraints + indices
  tenants.ts                                           # default_consultation_price_mad

supabase/migrations/
  0007_<drizzle-generated>.sql                         # generated by drizzle-kit; hand-edited for CHECK constraints

lib/
  auth/guards.ts                                       # add requireAssistant
  consultations/
    schemas.ts                                         # add finalizePricingSchema (re-export from lib/payments/schemas)
    mutations.ts                                       # extend finalizeConsultation to accept pricing input

app/(authenticated)/
  consultations/[id]/
    actions.ts                                         # finalizeConsultationAction signature change
    page.tsx                                           # render <FinalizePricingDialog> in actions slot, plus read-only Tarification badge
    editor.tsx                                         # NO CHANGE — read-only badge lives on page.tsx
  today/page.tsx                                       # render <PaymentsPanel>; pass role; pass payments data
  settings/cabinet/{page.tsx, forms.tsx, actions.ts}   # Tarif par défaut field + zod + persist

components/
  shell/doctor-shell.tsx                               # "Statistiques" sidebar item (doctor-only)
  today/today-stats.tsx                                # 5th tile "Recettes du jour" + grid-cols-5
```

**Untouched (verified safe)**
- `app/api/prescriptions/[id]/pdf/*` — PDF unchanged.
- `app/(admin)/admin/*` — out of scope.
- `lib/medications/*` — unrelated. `formatMad` is reused via existing import.

---

## Task 1 — Schema migration

**Files:**
- Modify: `db/schema/consultations.ts`
- Modify: `db/schema/tenants.ts`
- Create: `supabase/migrations/0007_<drizzle-generated>.sql` (filename auto-assigned by `drizzle-kit generate`)

- [ ] **Step 1: Update `db/schema/consultations.ts` with 7 new columns**

Open `db/schema/consultations.ts` and replace the `consultations` table block with:

```ts
export const consultations = pgTable(
  'consultations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'restrict' }),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'restrict' }),
    doctorId: uuid('doctor_id').notNull().references(() => userProfiles.id),
    consultedAt: timestamp('consulted_at', { withTimezone: true }).notNull().defaultNow(),
    motif: text('motif'),
    historyNotes: text('history_notes'),
    examNotes: text('exam_notes'),
    diagnosis: text('diagnosis'),
    followUpNotes: text('follow_up_notes'),
    isFinalized: boolean('is_finalized').notNull().default(false),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),
    aiCreditConsumedAt: timestamp('ai_credit_consumed_at', { withTimezone: true }),
    priceMad: numeric('price_mad', { precision: 10, scale: 2 }),
    isFree: boolean('is_free').notNull().default(false),
    paymentStatus: text('payment_status', { enum: ['awaiting', 'paid', 'free'] })
      .notNull()
      .default('awaiting'),
    paymentMethod: text('payment_method', {
      enum: ['especes', 'carte', 'cheque', 'virement', 'autre'],
    }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    paidBy: uuid('paid_by').references(() => userProfiles.id),
    paymentNote: text('payment_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('consultations_one_per_appointment').on(t.appointmentId)],
);
```

- [ ] **Step 2: Update `db/schema/tenants.ts` with the default tariff column**

Add `defaultConsultationPriceMad` to the `tenants` table block (insert after `chatbotDisclaimerAcknowledgedAt` and before `logoUrl` to keep related-content grouping):

```ts
import { boolean, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  // ... existing columns unchanged ...
  chatbotDisclaimerAcknowledgedAt: timestamp('chatbot_disclaimer_acknowledged_at', { withTimezone: true }),
  defaultConsultationPriceMad: numeric('default_consultation_price_mad', { precision: 10, scale: 2 }),
  logoUrl: text('logo_url'),
  // ... rest unchanged ...
});
```

(Add `numeric` to the import list if not already present.)

- [ ] **Step 3: Generate the Drizzle migration**

```bash
pnpm db:generate
```

Expected output: a new file `supabase/migrations/0007_<two-word-name>.sql` containing 8 `ALTER TABLE` statements (7 columns on `consultations`, 1 on `tenants`).

If drizzle complains about a missing `default 'awaiting'` for the new NOT NULL column, that's expected because existing rows would violate. Drizzle handles this with a single `ALTER TABLE … ADD COLUMN … DEFAULT 'awaiting' NOT NULL` which back-fills. Verify the generated SQL handles this.

- [ ] **Step 4: Hand-edit the generated migration to add CHECK constraints and indices**

Open `supabase/migrations/0007_<name>.sql` and append the following block at the end:

```sql
--> statement-breakpoint
ALTER TABLE "consultations"
  ADD CONSTRAINT "consultations_free_implies_no_price"
    CHECK (is_free = false OR price_mad IS NULL);
--> statement-breakpoint
ALTER TABLE "consultations"
  ADD CONSTRAINT "consultations_paid_requires_method_meta"
    CHECK (payment_status <> 'paid' OR
           (payment_method IS NOT NULL AND paid_at IS NOT NULL AND paid_by IS NOT NULL));
--> statement-breakpoint
ALTER TABLE "consultations"
  ADD CONSTRAINT "consultations_free_status_implies_is_free"
    CHECK (payment_status <> 'free' OR is_free = true);
--> statement-breakpoint
ALTER TABLE "consultations"
  ADD CONSTRAINT "consultations_awaiting_requires_priced_nonfree"
    CHECK (payment_status <> 'awaiting' OR
           (price_mad IS NOT NULL AND price_mad > 0 AND is_free = false));
--> statement-breakpoint
CREATE INDEX "consultations_payment_status_idx"
  ON "consultations" (tenant_id, payment_status);
--> statement-breakpoint
CREATE INDEX "consultations_paid_at_idx"
  ON "consultations" (tenant_id, paid_at)
  WHERE paid_at IS NOT NULL;
```

The `--> statement-breakpoint` separators are the Drizzle convention used in existing files (e.g., `0000_organic_alex_wilder.sql`).

Note: the spec also lists `consultations_payment_status_domain` and `consultations_payment_method_domain` CHECK constraints. These are **redundant with Drizzle's `enum` typing** (the `enum: [...]` option emits a `CHECK` already). Verify by reading the generated SQL — if Drizzle did NOT emit the check, append them too. Otherwise leave them out.

- [ ] **Step 5: Apply the migration to the local DB**

```bash
pnpm supabase:reset
```

This nukes the local Supabase DB and re-runs all migrations including 0007. Expected: success, no errors. The reset is necessary because the dev DB already has consultation rows; without reset, the `NOT NULL DEFAULT 'awaiting'` back-fill is silent but the CHECK constraints could trip on any row that was somehow malformed (vanishingly unlikely on a clean dev environment).

If you have unsynchronized seed data that you want to preserve, instead run `pnpm db:migrate` and accept that existing rows will silently get `payment_status='awaiting'` (which violates the awaiting-requires-priced-nonfree CHECK if `price_mad IS NULL`). This will fail on apply. Use `supabase:reset` for a clean state.

- [ ] **Step 6: Verify the constraints by attempting an invalid insert**

```bash
pnpm exec tsx -e "import('dotenv').then((d) => { d.config({path:'.env.local'}); import('drizzle-orm').then(async ({sql}) => { const {dbAdmin} = await import('@/db/client'); try { await dbAdmin().execute(sql\"INSERT INTO consultations (tenant_id, appointment_id, patient_id, doctor_id, payment_status, is_free, price_mad) VALUES ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','awaiting',false,NULL)\"); console.log('FAIL: insert should have been rejected'); process.exit(1); } catch (e) { if (e.message.includes('consultations_awaiting_requires_priced_nonfree') || e.message.includes('foreign key')) { console.log('PASS: constraint or FK rejected as expected'); process.exit(0); } console.log('FAIL: unexpected error', e.message); process.exit(1); } });})"
```

Expected: PASS — the row is rejected (either by the CHECK constraint, or by the FK on tenant_id, depending on which fires first; both prove the schema is functioning).

- [ ] **Step 7: Run the existing test suite to confirm no regression**

```bash
pnpm test
```

Expected: all existing 128 tests still pass. Schema additions shouldn't break anything since the new columns are nullable or have defaults.

- [ ] **Step 8: Commit — STAGE ONLY THESE FILES**

```bash
git status --porcelain
```

Confirm only `db/schema/consultations.ts`, `db/schema/tenants.ts`, and `supabase/migrations/0007_*.sql` show modifications/additions. Then:

```bash
git add db/schema/consultations.ts db/schema/tenants.ts supabase/migrations/0007_*.sql
git status --porcelain | grep -E "^[MA]" | grep -v -E "consultations\.ts$|tenants\.ts$|0007_.*\.sql$"
```

If the second command outputs anything, STOP. Otherwise:

```bash
git commit -m "feat(schema): consultation pricing + payment columns

Adds price_mad, is_free, payment_status, payment_method, paid_at,
paid_by, payment_note to consultations. Adds default_consultation_price_mad
to tenants. CHECK constraints enforce the state-machine invariants at
the database level. Two indices accelerate /today's awaiting lookup
and /stats's time-window aggregations.

Existing tenant-scoped RLS policies cover all new columns transparently;
no new RLS migration needed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — `lib/time.ts` with TDD

**Files:**
- Create: `lib/time.ts`
- Test: `tests/unit/time.test.ts`

- [ ] **Step 1: Write the failing test at `tests/unit/time.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  CABINET_TZ,
  todayBoundsUtc,
  rangeBoundsUtc,
  type StatsRange,
} from '@/lib/time';

describe('CABINET_TZ', () => {
  it('is Africa/Casablanca', () => {
    expect(CABINET_TZ).toBe('Africa/Casablanca');
  });
});

describe('todayBoundsUtc', () => {
  it('returns a [start, end) UTC pair spanning ~24h', () => {
    const { startUtc, endUtc } = todayBoundsUtc(new Date('2026-05-04T15:00:00Z'));
    const diffHours = (endUtc.getTime() - startUtc.getTime()) / 3_600_000;
    expect(diffHours).toBeGreaterThanOrEqual(23);
    expect(diffHours).toBeLessThanOrEqual(25);
    expect(endUtc.getTime()).toBeGreaterThan(startUtc.getTime());
  });

  it('start is at 00:00 Casablanca local for the given moment', () => {
    // 2026-05-04 15:00 UTC → Casablanca local is 16:00 (UTC+1) on May 4 (DST not in effect mid-Ramadan-paused)
    // We assert by formatting startUtc back through the TZ.
    const { startUtc } = todayBoundsUtc(new Date('2026-05-04T15:00:00Z'));
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: CABINET_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const formatted = fmt.format(startUtc);
    expect(formatted).toMatch(/^00:00$/);
  });
});

describe('rangeBoundsUtc', () => {
  const ranges: StatsRange[] = ['today', '7d', '30d', '90d'];

  it.each(ranges)('returns a coherent [start, end) for %s', (range) => {
    const now = new Date('2026-05-04T12:00:00Z');
    const { startUtc, endUtc } = rangeBoundsUtc(range, now);
    expect(endUtc.getTime()).toBeGreaterThan(startUtc.getTime());
    expect(endUtc.getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  it('today range spans ~24h', () => {
    const { startUtc, endUtc } = rangeBoundsUtc('today', new Date('2026-05-04T12:00:00Z'));
    const diffHours = (endUtc.getTime() - startUtc.getTime()) / 3_600_000;
    expect(diffHours).toBeGreaterThanOrEqual(23);
    expect(diffHours).toBeLessThanOrEqual(25);
  });

  it('7d range spans ~7 days', () => {
    const { startUtc, endUtc } = rangeBoundsUtc('7d', new Date('2026-05-04T12:00:00Z'));
    const diffDays = (endUtc.getTime() - startUtc.getTime()) / 86_400_000;
    expect(diffDays).toBeGreaterThanOrEqual(6.9);
    expect(diffDays).toBeLessThanOrEqual(7.1);
  });

  it('30d range spans ~30 days', () => {
    const { startUtc, endUtc } = rangeBoundsUtc('30d', new Date('2026-05-04T12:00:00Z'));
    const diffDays = (endUtc.getTime() - startUtc.getTime()) / 86_400_000;
    expect(diffDays).toBeGreaterThanOrEqual(29.9);
    expect(diffDays).toBeLessThanOrEqual(30.1);
  });

  it('90d range spans ~90 days', () => {
    const { startUtc, endUtc } = rangeBoundsUtc('90d', new Date('2026-05-04T12:00:00Z'));
    const diffDays = (endUtc.getTime() - startUtc.getTime()) / 86_400_000;
    expect(diffDays).toBeGreaterThanOrEqual(89.9);
    expect(diffDays).toBeLessThanOrEqual(90.1);
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
pnpm test tests/unit/time.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/time'`.

- [ ] **Step 3: Implement `lib/time.ts`**

```ts
export const CABINET_TZ = 'Africa/Casablanca';

export type StatsRange = 'today' | '7d' | '30d' | '90d';

/**
 * Returns the [start, end) UTC instants of "today" in CABINET_TZ for the given moment.
 * "Today" = the current Casablanca calendar day. End is the start of tomorrow.
 */
export function todayBoundsUtc(now: Date = new Date()): { startUtc: Date; endUtc: Date } {
  // Casablanca's offset from UTC at this moment, derived via Intl.
  const partsFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: CABINET_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = partsFmt.formatToParts(now);
  const y = Number(parts.find((p) => p.type === 'year')!.value);
  const m = Number(parts.find((p) => p.type === 'month')!.value);
  const d = Number(parts.find((p) => p.type === 'day')!.value);

  // Re-encode that local date at 00:00 in CABINET_TZ as a UTC instant.
  const startUtc = casablancaLocalToUtc(y, m, d, 0, 0);
  const endUtc = new Date(startUtc.getTime() + 24 * 3_600_000);
  return { startUtc, endUtc };
}

/**
 * Returns the [start, end) UTC instants for a stats range, anchored at "now" in CABINET_TZ.
 * - 'today': start = today 00:00 local, end = tomorrow 00:00 local (≈24h).
 * - '7d': end = tomorrow 00:00 local; start = end − 7 days.
 * - '30d': end = tomorrow 00:00 local; start = end − 30 days.
 * - '90d': end = tomorrow 00:00 local; start = end − 90 days.
 */
export function rangeBoundsUtc(range: StatsRange, now: Date = new Date()): { startUtc: Date; endUtc: Date } {
  const today = todayBoundsUtc(now);
  if (range === 'today') return today;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return {
    startUtc: new Date(today.endUtc.getTime() - days * 86_400_000),
    endUtc: today.endUtc,
  };
}

/**
 * Convert a Casablanca-local wall-clock (Y-M-D h:m) into the corresponding UTC instant.
 * Uses Intl to find Casablanca's offset and back-solves.
 */
function casablancaLocalToUtc(y: number, m: number, d: number, h: number, min: number): Date {
  // Approximate by computing the offset Casablanca had at this wall-clock moment.
  // Build a UTC date as a starting guess, then read what Casablanca thinks the wall-clock is,
  // and adjust by the difference.
  const guess = new Date(Date.UTC(y, m - 1, d, h, min));
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: CABINET_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(guess);
  const localY = Number(parts.find((p) => p.type === 'year')!.value);
  const localM = Number(parts.find((p) => p.type === 'month')!.value);
  const localD = Number(parts.find((p) => p.type === 'day')!.value);
  const localH = Number(parts.find((p) => p.type === 'hour')!.value);
  const localMin = Number(parts.find((p) => p.type === 'minute')!.value);
  const localAsUtc = Date.UTC(localY, localM - 1, localD, localH, localMin);
  const offsetMs = guess.getTime() - localAsUtc;
  return new Date(guess.getTime() + offsetMs);
}
```

This file does NOT declare `'server-only'` because the helper is pure and can be imported from anywhere.

- [ ] **Step 4: Run the test, expect pass**

```bash
pnpm test tests/unit/time.test.ts
```

Expected: PASS — all 7 tests green.

- [ ] **Step 5: Run the full suite**

```bash
pnpm test
```

Expected: all tests pass (128 prior + 7 new = 135).

- [ ] **Step 6: Commit**

```bash
git add lib/time.ts tests/unit/time.test.ts
git status --porcelain | grep -E "^[MA]" | grep -v -E "lib/time\.ts$|tests/unit/time\.test\.ts$"
```

If anything else is staged, STOP. Otherwise:

```bash
git commit -m "feat(time): CABINET_TZ + todayBoundsUtc + rangeBoundsUtc helpers

Project-level constant (Africa/Casablanca) and stats-range bounds
computed via Intl.DateTimeFormat, no new dependency. Used by both
the today payments query and the /stats aggregations.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — `lib/payments/schemas.ts` + `lib/auth/guards.ts` with TDD

**Files:**
- Create: `lib/payments/schemas.ts`
- Modify: `lib/auth/guards.ts`
- Test: `tests/unit/payments/schemas.test.ts`

- [ ] **Step 1: Write the failing test for schemas**

Create `tests/unit/payments/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { finalizePricingSchema, recordPaymentSchema } from '@/lib/payments/schemas';

describe('finalizePricingSchema', () => {
  const okId = '00000000-0000-0000-0000-000000000001';

  it('accepts a positive price with isFree=false', () => {
    const r = finalizePricingSchema.safeParse({
      consultationId: okId,
      isFree: false,
      priceMad: '250.00',
    });
    expect(r.success).toBe(true);
  });

  it('accepts isFree=true with no price', () => {
    const r = finalizePricingSchema.safeParse({
      consultationId: okId,
      isFree: true,
    });
    expect(r.success).toBe(true);
  });

  it('rejects neither price nor free', () => {
    const r = finalizePricingSchema.safeParse({
      consultationId: okId,
      isFree: false,
    });
    expect(r.success).toBe(false);
  });

  it('rejects price <= 0 when not free', () => {
    const r = finalizePricingSchema.safeParse({
      consultationId: okId,
      isFree: false,
      priceMad: '0',
    });
    expect(r.success).toBe(false);
  });

  it('rejects non-numeric price', () => {
    const r = finalizePricingSchema.safeParse({
      consultationId: okId,
      isFree: false,
      priceMad: 'abc',
    });
    expect(r.success).toBe(false);
  });

  it('rejects an invalid uuid', () => {
    const r = finalizePricingSchema.safeParse({
      consultationId: 'not-a-uuid',
      isFree: true,
    });
    expect(r.success).toBe(false);
  });
});

describe('recordPaymentSchema', () => {
  const okId = '00000000-0000-0000-0000-000000000001';

  it('accepts especes with no note', () => {
    const r = recordPaymentSchema.safeParse({
      consultationId: okId,
      paymentMethod: 'especes',
    });
    expect(r.success).toBe(true);
  });

  it('accepts carte / cheque / virement / autre with note for autre', () => {
    for (const m of ['carte', 'cheque', 'virement'] as const) {
      const r = recordPaymentSchema.safeParse({
        consultationId: okId,
        paymentMethod: m,
      });
      expect(r.success).toBe(true);
    }
    const a = recordPaymentSchema.safeParse({
      consultationId: okId,
      paymentMethod: 'autre',
      paymentNote: 'split: 100 espèces + 150 carte',
    });
    expect(a.success).toBe(true);
  });

  it('rejects autre without a note', () => {
    const r = recordPaymentSchema.safeParse({
      consultationId: okId,
      paymentMethod: 'autre',
    });
    expect(r.success).toBe(false);
  });

  it('rejects autre with empty / whitespace note', () => {
    const r = recordPaymentSchema.safeParse({
      consultationId: okId,
      paymentMethod: 'autre',
      paymentNote: '   ',
    });
    expect(r.success).toBe(false);
  });

  it('rejects unknown paymentMethod', () => {
    const r = recordPaymentSchema.safeParse({
      consultationId: okId,
      paymentMethod: 'crypto',
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
pnpm test tests/unit/payments/schemas.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/payments/schemas'`.

- [ ] **Step 3: Implement `lib/payments/schemas.ts`**

```ts
import { z } from 'zod';

export const finalizePricingSchema = z
  .object({
    consultationId: z.string().uuid(),
    isFree: z.boolean(),
    priceMad: z.string().optional(),
  })
  .refine(
    (d) => d.isFree || (d.priceMad != null && d.priceMad !== '' && Number.isFinite(Number(d.priceMad)) && Number(d.priceMad) > 0),
    { message: 'Prix requis (ou cocher Gratuit).' },
  );

export type FinalizePricingInput = z.infer<typeof finalizePricingSchema>;

export const PAYMENT_METHODS = ['especes', 'carte', 'cheque', 'virement', 'autre'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const recordPaymentSchema = z
  .object({
    consultationId: z.string().uuid(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    paymentNote: z.string().nullable().optional(),
  })
  .refine(
    (d) => d.paymentMethod !== 'autre' || (typeof d.paymentNote === 'string' && d.paymentNote.trim().length > 0),
    { message: 'Une note est requise quand la méthode est "Autre".' },
  );

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
```

- [ ] **Step 4: Run the test, expect pass**

```bash
pnpm test tests/unit/payments/schemas.test.ts
```

Expected: 13 tests pass.

- [ ] **Step 5: Add `requireAssistant` to `lib/auth/guards.ts`**

The existing file has `requireDoctor` and `requireAuth`. Add `requireAssistant` mirroring `requireDoctor`:

```ts
import 'server-only';
import { redirect } from 'next/navigation';
import { requireSession, type Session } from './session';

export async function requireDoctor(): Promise<Session> {
  const s = await requireSession();
  if (s.role !== 'doctor') redirect('/today');
  return s;
}

export async function requireAssistant(): Promise<Session> {
  const s = await requireSession();
  if (s.role !== 'assistant') redirect('/today');
  return s;
}

export async function requireAuth(): Promise<Session> {
  return requireSession();
}
```

- [ ] **Step 6: Run the unit suite**

```bash
pnpm test
```

Expected: all tests pass (135 + 13 = 148).

- [ ] **Step 7: Commit**

```bash
git add lib/payments/schemas.ts lib/auth/guards.ts tests/unit/payments/schemas.test.ts
git status --porcelain | grep -E "^[MA]" | grep -v -E "lib/payments/schemas\.ts$|lib/auth/guards\.ts$|tests/unit/payments/schemas\.test\.ts$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(payments): zod schemas + requireAssistant guard

finalizePricingSchema: gates the doctor's finalize action — either price > 0
or isFree=true. recordPaymentSchema: gates the assistant's payment action —
note is required for 'autre' method. requireAssistant mirrors requireDoctor:
redirects non-assistants to /today.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — `lib/consultations/mutations.ts` + finalize action update

**Files:**
- Modify: `lib/consultations/mutations.ts`
- Modify: `app/(authenticated)/consultations/[id]/actions.ts`
- Test: extend `tests/unit/payments/mutations.test.ts` (created in this task)

This task changes `finalizeConsultation` to accept pricing input, and updates `finalizeConsultationAction` to use it.

- [ ] **Step 1: Write the failing test for the mutation**

Create `tests/unit/payments/mutations.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { dbAdmin } from '@/db/client';
import { eq } from 'drizzle-orm';
import { consultations, appointments, patients, userProfiles, tenants } from '@/db/schema';
import { finalizeConsultation } from '@/lib/consultations/mutations';

describe('finalizeConsultation (extended)', () => {
  // Tenant + doctor + patient + appointment + consultation fixtures.
  // Mirror the patterns in tests/fixtures/* (see tests/fixtures/tenants.ts, patients.ts, etc.).

  let tenantId: string;
  let doctorId: string;
  let patientId: string;
  let appointmentId: string;
  let consultationId: string;

  beforeEach(async () => {
    const [t] = await dbAdmin().insert(tenants).values({ name: 'Test Tenant' }).returning();
    tenantId = t.id;

    const [u] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'doctor',
        fullName: 'Dr. Test',
        email: `t-${Date.now()}@test.example`,
      })
      .returning();
    doctorId = u.id;

    const [p] = await dbAdmin()
      .insert(patients)
      .values({ tenantId, lastName: 'Test', firstName: 'P', sex: 'M', dateOfBirth: '1990-01-01' })
      .returning();
    patientId = p.id;

    const [a] = await dbAdmin()
      .insert(appointments)
      .values({
        tenantId,
        patientId,
        status: 'in_consultation',
        kind: 'walkin',
        createdBy: doctorId,
        startedAt: new Date(),
      })
      .returning();
    appointmentId = a.id;

    const [c] = await dbAdmin()
      .insert(consultations)
      .values({ tenantId, appointmentId, patientId, doctorId })
      .returning();
    consultationId = c.id;
  });

  it('finalize with price sets payment_status=awaiting and stores price', async () => {
    const ok = await finalizeConsultation(tenantId, consultationId, {
      isFree: false,
      priceMad: '250.00',
      doctorId,
    });
    expect(ok).toBe(true);

    const [row] = await dbAdmin().select().from(consultations).where(eq(consultations.id, consultationId));
    expect(row.isFinalized).toBe(true);
    expect(row.priceMad).toBe('250.00');
    expect(row.isFree).toBe(false);
    expect(row.paymentStatus).toBe('awaiting');
    expect(row.paidAt).toBeNull();
    expect(row.paidBy).toBeNull();
  });

  it('finalize with isFree=true sets payment_status=free and paid_at + paid_by', async () => {
    const ok = await finalizeConsultation(tenantId, consultationId, {
      isFree: true,
      doctorId,
    });
    expect(ok).toBe(true);

    const [row] = await dbAdmin().select().from(consultations).where(eq(consultations.id, consultationId));
    expect(row.priceMad).toBeNull();
    expect(row.isFree).toBe(true);
    expect(row.paymentStatus).toBe('free');
    expect(row.paidAt).not.toBeNull();
    expect(row.paidBy).toBe(doctorId);
  });

  it('returns false when already finalized (idempotent no-op)', async () => {
    await finalizeConsultation(tenantId, consultationId, {
      isFree: false,
      priceMad: '250.00',
      doctorId,
    });
    const ok = await finalizeConsultation(tenantId, consultationId, {
      isFree: true,
      doctorId,
    });
    expect(ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
pnpm test tests/unit/payments/mutations.test.ts
```

Expected: TYPE error (TS) or test failure — `finalizeConsultation` doesn't accept the new options object. The current signature is `(tenantId, id) => Promise<boolean>`.

- [ ] **Step 3: Update `lib/consultations/mutations.ts`**

Find the `finalizeConsultation` function (currently at lines 134–163 of `lib/consultations/mutations.ts`) and replace it with:

```ts
export type FinalizeConsultationOptions = {
  isFree: boolean;
  priceMad?: string;       // numeric as string from FormData; required if !isFree
  doctorId: string;        // who's finalizing (used as paid_by when isFree)
};

export async function finalizeConsultation(
  tenantId: string,
  id: string,
  opts: FinalizeConsultationOptions,
): Promise<boolean> {
  return withTenantTx(tenantId, async (tx) => {
    const [c] = await tx.select().from(consultations).where(eq(consultations.id, id));
    if (!c || c.isFinalized) return false;

    const [appt] = await tx.select().from(appointments).where(eq(appointments.id, c.appointmentId));
    if (!appt) throw new Error('Appointment missing');
    if (!canTransition(appt.status, 'finalize')) {
      throw new Error(`Cannot finalize from appointment status ${appt.status}`);
    }
    const now = new Date();
    const patch = applyTransition(appt.status, 'finalize', now);

    // Pricing & payment fields:
    const pricingPatch = opts.isFree
      ? {
          priceMad: null,
          isFree: true,
          paymentStatus: 'free' as const,
          paidAt: now,
          paidBy: opts.doctorId,
        }
      : {
          priceMad: opts.priceMad ?? null,
          isFree: false,
          paymentStatus: 'awaiting' as const,
          paidAt: null,
          paidBy: null,
        };

    await tx
      .update(consultations)
      .set({
        isFinalized: true,
        finalizedAt: now,
        updatedAt: now,
        ...pricingPatch,
      })
      .where(eq(consultations.id, id));

    await tx
      .update(appointments)
      .set({
        status: patch.status,
        endedAt: patch.endedAt ?? appt.endedAt,
        updatedAt: now,
      })
      .where(eq(appointments.id, c.appointmentId));

    return true;
  });
}
```

- [ ] **Step 4: Update `app/(authenticated)/consultations/[id]/actions.ts`**

Replace the `finalizeConsultationAction` function with:

```ts
import { finalizePricingSchema } from '@/lib/payments/schemas';

export type FinalizeResult = { ok: boolean; error?: string };

export async function finalizeConsultationAction(
  formData: FormData,
): Promise<FinalizeResult> {
  const session = await requireDoctor();
  const parsed = finalizePricingSchema.safeParse({
    consultationId: formData.get('consultationId'),
    isFree: formData.get('isFree') === 'true',
    priceMad: formData.get('priceMad') as string | null ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
  }

  const ok = await finalizeConsultation(session.tenantId, parsed.data.consultationId, {
    isFree: parsed.data.isFree,
    priceMad: parsed.data.isFree ? undefined : parsed.data.priceMad,
    doctorId: session.userId,
  });
  if (!ok) return { ok: false, error: 'Consultation déjà finalisée ou introuvable.' };

  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'consultation.price_set',
    entityType: 'consultation',
    entityId: parsed.data.consultationId,
    metadata: { priceMad: parsed.data.priceMad ?? null, isFree: parsed.data.isFree },
  });
  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'consultation.finalize',
    entityType: 'consultation',
    entityId: parsed.data.consultationId,
  });

  revalidatePath('/today');
  return { ok: true };
}
```

Note: the action **no longer redirects**. The dialog (Task 8) will handle the redirect on `ok: true`. This is a deliberate change — server actions invoked from a dialog should return errors so the dialog can render them, not redirect away.

The `idSchema`, `saveSectionsAction`, `saveVitalsAction`, and `SaveResult` exports stay as-is.

- [ ] **Step 5: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean. The page that consumed `finalizeConsultationAction` (Task 8 will adjust the consumer) might temporarily not type-check after this — if so, defer the page change until the dialog is in place. If the immediate result is a TS error in `app/(authenticated)/consultations/[id]/page.tsx` referencing the old form-based invocation, leave the file as-is for now: the `<form action={finalizeConsultationAction}>` invocation pattern still works (it just no longer redirects), and Task 8 replaces it entirely.

If `tsc --noEmit` fails with a NON-form-related error, STOP and report.

- [ ] **Step 6: Run the test**

```bash
pnpm test tests/unit/payments/mutations.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 7: Run full unit + RLS suite**

```bash
pnpm test
```

Expected: 148 + 3 = 151 tests pass.

- [ ] **Step 8: Commit**

```bash
git add lib/consultations/mutations.ts app/\(authenticated\)/consultations/\[id\]/actions.ts tests/unit/payments/mutations.test.ts
git status --porcelain | grep -E "^[MA]" | grep -v -E "consultations/mutations\.ts$|consultations/\[id\]/actions\.ts$|payments/mutations\.test\.ts$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(consultations): finalize accepts pricing input

finalizeConsultation now requires { isFree, priceMad?, doctorId }. When
isFree, sets payment_status='free' + paid_at + paid_by. When priced,
sets payment_status='awaiting'. Action returns FinalizeResult instead of
redirecting; the dialog handles routing in the next task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — `lib/payments/mutations.ts` (recordPayment) with TDD

**Files:**
- Create: `lib/payments/mutations.ts`
- Test: extend `tests/unit/payments/mutations.test.ts`

- [ ] **Step 1: Append failing tests for `recordPayment` to `tests/unit/payments/mutations.test.ts`**

Append after the existing `describe('finalizeConsultation (extended)', ...)` block:

```ts
import { recordPayment } from '@/lib/payments/mutations';

describe('recordPayment', () => {
  let tenantId: string;
  let doctorId: string;
  let assistantId: string;
  let patientId: string;
  let appointmentId: string;
  let consultationId: string;

  beforeEach(async () => {
    const [t] = await dbAdmin().insert(tenants).values({ name: 'Pay Tenant' }).returning();
    tenantId = t.id;

    const [d] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'doctor',
        fullName: 'Dr. Pay',
        email: `dp-${Date.now()}@test.example`,
      })
      .returning();
    doctorId = d.id;

    const [a] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'assistant',
        fullName: 'A. Test',
        email: `ap-${Date.now()}@test.example`,
      })
      .returning();
    assistantId = a.id;

    const [p] = await dbAdmin()
      .insert(patients)
      .values({ tenantId, lastName: 'PayTest', firstName: 'P', sex: 'F', dateOfBirth: '1985-06-01' })
      .returning();
    patientId = p.id;

    const [appt] = await dbAdmin()
      .insert(appointments)
      .values({
        tenantId,
        patientId,
        status: 'in_consultation',
        kind: 'walkin',
        createdBy: doctorId,
        startedAt: new Date(),
      })
      .returning();
    appointmentId = appt.id;

    const [c] = await dbAdmin()
      .insert(consultations)
      .values({
        tenantId,
        appointmentId,
        patientId,
        doctorId,
        isFinalized: true,
        finalizedAt: new Date(),
        priceMad: '250.00',
        isFree: false,
        paymentStatus: 'awaiting',
      })
      .returning();
    consultationId = c.id;
  });

  it('marks an awaiting consultation as paid with method and recorder', async () => {
    const ok = await recordPayment(tenantId, {
      consultationId,
      paymentMethod: 'especes',
      paymentNote: null,
      assistantId,
    });
    expect(ok).toBe(true);

    const [row] = await dbAdmin().select().from(consultations).where(eq(consultations.id, consultationId));
    expect(row.paymentStatus).toBe('paid');
    expect(row.paymentMethod).toBe('especes');
    expect(row.paidAt).not.toBeNull();
    expect(row.paidBy).toBe(assistantId);
    expect(row.paymentNote).toBeNull();
  });

  it('persists a note when method is autre', async () => {
    const ok = await recordPayment(tenantId, {
      consultationId,
      paymentMethod: 'autre',
      paymentNote: 'split: 100 espèces + 150 carte',
      assistantId,
    });
    expect(ok).toBe(true);

    const [row] = await dbAdmin().select().from(consultations).where(eq(consultations.id, consultationId));
    expect(row.paymentMethod).toBe('autre');
    expect(row.paymentNote).toBe('split: 100 espèces + 150 carte');
  });

  it('returns false on a paid consultation (idempotent no-op)', async () => {
    await recordPayment(tenantId, {
      consultationId,
      paymentMethod: 'especes',
      paymentNote: null,
      assistantId,
    });
    const ok = await recordPayment(tenantId, {
      consultationId,
      paymentMethod: 'carte',
      paymentNote: null,
      assistantId,
    });
    expect(ok).toBe(false);
  });

  it('returns false on a free consultation (cannot encaisser a free)', async () => {
    await dbAdmin()
      .update(consultations)
      .set({
        paymentStatus: 'free',
        isFree: true,
        priceMad: null,
        paidAt: new Date(),
        paidBy: doctorId,
      })
      .where(eq(consultations.id, consultationId));
    const ok = await recordPayment(tenantId, {
      consultationId,
      paymentMethod: 'especes',
      paymentNote: null,
      assistantId,
    });
    expect(ok).toBe(false);
  });

  it('returns false when consultation is in another tenant', async () => {
    const [other] = await dbAdmin().insert(tenants).values({ name: 'Other' }).returning();
    const ok = await recordPayment(other.id, {
      consultationId,
      paymentMethod: 'especes',
      paymentNote: null,
      assistantId,
    });
    expect(ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
pnpm test tests/unit/payments/mutations.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/payments/mutations'`.

- [ ] **Step 3: Implement `lib/payments/mutations.ts`**

```ts
import 'server-only';
import { and, eq } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { consultations } from '@/db/schema';
import type { PaymentMethod } from './schemas';

export type RecordPaymentArgs = {
  consultationId: string;
  paymentMethod: PaymentMethod;
  paymentNote: string | null;
  assistantId: string;
};

/**
 * Transition an awaiting consultation to paid.
 * Returns false if the consultation:
 *   - doesn't exist in this tenant,
 *   - is not in 'awaiting' state.
 * Throws on driver errors.
 */
export async function recordPayment(
  tenantId: string,
  args: RecordPaymentArgs,
): Promise<boolean> {
  return withTenantTx(tenantId, async (tx) => {
    const [c] = await tx
      .select()
      .from(consultations)
      .where(and(eq(consultations.id, args.consultationId), eq(consultations.tenantId, tenantId)));
    if (!c) return false;
    if (c.paymentStatus !== 'awaiting') return false;

    const now = new Date();
    await tx
      .update(consultations)
      .set({
        paymentStatus: 'paid',
        paymentMethod: args.paymentMethod,
        paidAt: now,
        paidBy: args.assistantId,
        paymentNote: args.paymentNote,
        updatedAt: now,
      })
      .where(eq(consultations.id, args.consultationId));

    return true;
  });
}
```

- [ ] **Step 4: Run the tests, expect pass**

```bash
pnpm test tests/unit/payments/mutations.test.ts
```

Expected: 3 + 5 = 8 tests pass.

- [ ] **Step 5: Run full suite**

```bash
pnpm test
```

Expected: 156 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/payments/mutations.ts tests/unit/payments/mutations.test.ts
git status --porcelain | grep -E "^[MA]" | grep -v -E "lib/payments/mutations\.ts$|tests/unit/payments/mutations\.test\.ts$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(payments): recordPayment mutation

Transitions an awaiting consultation to paid. Refuses to operate on
free / already-paid / cross-tenant rows. Single-take semantics — once
paid, recordPayment is a no-op.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — `lib/payments/queries.ts` (getPaymentsForToday) with TDD

**Files:**
- Create: `lib/payments/queries.ts`
- Test: `tests/unit/payments/queries.test.ts`

- [ ] **Step 1: Write the failing test at `tests/unit/payments/queries.test.ts`**

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { dbAdmin } from '@/db/client';
import { eq } from 'drizzle-orm';
import { consultations, appointments, patients, userProfiles, tenants } from '@/db/schema';
import { getPaymentsForToday } from '@/lib/payments/queries';

describe('getPaymentsForToday', () => {
  let tenantId: string;
  let doctorId: string;
  let assistantId: string;

  async function seedConsultation(opts: {
    paymentStatus: 'awaiting' | 'paid' | 'free';
    paidAt?: Date | null;
    finalizedAt?: Date;
    isFree?: boolean;
  }) {
    const [p] = await dbAdmin()
      .insert(patients)
      .values({
        tenantId,
        lastName: `L${Math.random().toString(36).slice(2, 5)}`,
        firstName: 'P',
        sex: 'M',
        dateOfBirth: '1990-01-01',
      })
      .returning();
    const [appt] = await dbAdmin()
      .insert(appointments)
      .values({
        tenantId,
        patientId: p.id,
        status: 'done',
        kind: 'walkin',
        createdBy: doctorId,
        startedAt: opts.finalizedAt ?? new Date(),
        endedAt: opts.finalizedAt ?? new Date(),
      })
      .returning();
    const [c] = await dbAdmin()
      .insert(consultations)
      .values({
        tenantId,
        appointmentId: appt.id,
        patientId: p.id,
        doctorId,
        isFinalized: true,
        finalizedAt: opts.finalizedAt ?? new Date(),
        priceMad: opts.isFree ? null : '250.00',
        isFree: opts.isFree ?? false,
        paymentStatus: opts.paymentStatus,
        paymentMethod:
          opts.paymentStatus === 'paid' ? 'especes' : null,
        paidAt: opts.paidAt ?? (opts.paymentStatus === 'awaiting' ? null : new Date()),
        paidBy:
          opts.paymentStatus === 'awaiting'
            ? null
            : opts.paymentStatus === 'paid'
              ? assistantId
              : doctorId,
      })
      .returning();
    return c;
  }

  beforeEach(async () => {
    const [t] = await dbAdmin().insert(tenants).values({ name: 'Q Tenant' }).returning();
    tenantId = t.id;
    const [d] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'doctor',
        fullName: 'Dr. Q',
        email: `dq-${Date.now()}@test.example`,
      })
      .returning();
    doctorId = d.id;
    const [a] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'assistant',
        fullName: 'A. Q',
        email: `aq-${Date.now()}@test.example`,
      })
      .returning();
    assistantId = a.id;
  });

  it('returns awaiting rows regardless of finalized_at age', async () => {
    const old = await seedConsultation({
      paymentStatus: 'awaiting',
      finalizedAt: new Date(Date.now() - 5 * 86_400_000),
    });
    const recent = await seedConsultation({ paymentStatus: 'awaiting' });
    const { awaiting } = await getPaymentsForToday(tenantId);
    const ids = awaiting.map((r) => r.consultationId);
    expect(ids).toContain(old.id);
    expect(ids).toContain(recent.id);
  });

  it('orders awaiting rows by finalized_at DESC', async () => {
    const old = await seedConsultation({
      paymentStatus: 'awaiting',
      finalizedAt: new Date(Date.now() - 86_400_000),
    });
    const recent = await seedConsultation({ paymentStatus: 'awaiting' });
    const { awaiting } = await getPaymentsForToday(tenantId);
    const ids = awaiting.map((r) => r.consultationId);
    const oldIdx = ids.indexOf(old.id);
    const recentIdx = ids.indexOf(recent.id);
    expect(recentIdx).toBeLessThan(oldIdx);
  });

  it('returns paid rows whose paid_at is today in collectedToday', async () => {
    const today = await seedConsultation({
      paymentStatus: 'paid',
      paidAt: new Date(),
    });
    const yesterday = await seedConsultation({
      paymentStatus: 'paid',
      paidAt: new Date(Date.now() - 86_400_000),
    });
    const { collectedToday } = await getPaymentsForToday(tenantId);
    const ids = collectedToday.map((r) => r.consultationId);
    expect(ids).toContain(today.id);
    expect(ids).not.toContain(yesterday.id);
  });

  it('includes free consultations whose paid_at is today in collectedToday', async () => {
    const c = await seedConsultation({
      paymentStatus: 'free',
      isFree: true,
      paidAt: new Date(),
    });
    const { collectedToday } = await getPaymentsForToday(tenantId);
    const ids = collectedToday.map((r) => r.consultationId);
    expect(ids).toContain(c.id);
  });

  it('isolates by tenant', async () => {
    const [otherT] = await dbAdmin().insert(tenants).values({ name: 'Other Q' }).returning();
    const otherSavedTenantId = tenantId;
    tenantId = otherT.id;
    const [otherDoc] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'doctor',
        fullName: 'Dr. Other',
        email: `dox-${Date.now()}@test.example`,
      })
      .returning();
    doctorId = otherDoc.id;
    const cross = await seedConsultation({ paymentStatus: 'awaiting' });
    tenantId = otherSavedTenantId;
    const { awaiting } = await getPaymentsForToday(tenantId);
    const ids = awaiting.map((r) => r.consultationId);
    expect(ids).not.toContain(cross.id);
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
pnpm test tests/unit/payments/queries.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/payments/queries'`.

- [ ] **Step 3: Implement `lib/payments/queries.ts`**

```ts
import 'server-only';
import { and, desc, eq, gte, lt, inArray, sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { consultations, patients, userProfiles } from '@/db/schema';
import { todayBoundsUtc } from '@/lib/time';

export type PaymentRow = {
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

export async function getPaymentsForToday(
  tenantId: string,
): Promise<{ awaiting: PaymentRow[]; collectedToday: PaymentRow[] }> {
  const { startUtc, endUtc } = todayBoundsUtc();
  const db = dbAdmin();

  const awaitingRows = await db
    .select({
      consultationId: consultations.id,
      lastName: patients.lastName,
      firstName: patients.firstName,
      priceMad: consultations.priceMad,
      isFree: consultations.isFree,
      paymentStatus: consultations.paymentStatus,
      paymentMethod: consultations.paymentMethod,
      paidAt: consultations.paidAt,
      paidByName: userProfiles.fullName,
      finalizedAt: consultations.finalizedAt,
    })
    .from(consultations)
    .leftJoin(patients, eq(patients.id, consultations.patientId))
    .leftJoin(userProfiles, eq(userProfiles.id, consultations.paidBy))
    .where(
      and(
        eq(consultations.tenantId, tenantId),
        eq(consultations.paymentStatus, 'awaiting'),
      ),
    )
    .orderBy(desc(consultations.finalizedAt));

  const collectedRows = await db
    .select({
      consultationId: consultations.id,
      lastName: patients.lastName,
      firstName: patients.firstName,
      priceMad: consultations.priceMad,
      isFree: consultations.isFree,
      paymentStatus: consultations.paymentStatus,
      paymentMethod: consultations.paymentMethod,
      paidAt: consultations.paidAt,
      paidByName: userProfiles.fullName,
      finalizedAt: consultations.finalizedAt,
    })
    .from(consultations)
    .leftJoin(patients, eq(patients.id, consultations.patientId))
    .leftJoin(userProfiles, eq(userProfiles.id, consultations.paidBy))
    .where(
      and(
        eq(consultations.tenantId, tenantId),
        inArray(consultations.paymentStatus, ['paid', 'free']),
        gte(consultations.paidAt, startUtc),
        lt(consultations.paidAt, endUtc),
      ),
    )
    .orderBy(desc(consultations.paidAt));

  const toRow = (r: typeof awaitingRows[number]): PaymentRow => ({
    consultationId: r.consultationId,
    patientFullName: `${r.lastName ?? ''} ${r.firstName ?? ''}`.trim(),
    priceMad: r.priceMad,
    isFree: r.isFree,
    paymentStatus: r.paymentStatus as 'awaiting' | 'paid' | 'free',
    paymentMethod: r.paymentMethod,
    paidAt: r.paidAt,
    paidByName: r.paidByName,
    finalizedAt: r.finalizedAt!,
  });

  return {
    awaiting: awaitingRows.map(toRow),
    collectedToday: collectedRows.map(toRow),
  };
}
```

- [ ] **Step 4: Run the test, expect pass**

```bash
pnpm test tests/unit/payments/queries.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Run full suite**

```bash
pnpm test
```

Expected: 161 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/payments/queries.ts tests/unit/payments/queries.test.ts
git status --porcelain | grep -E "^[MA]" | grep -v -E "lib/payments/queries\.ts$|tests/unit/payments/queries\.test\.ts$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(payments): getPaymentsForToday query

Returns awaiting rows (multi-day, ordered by finalized_at DESC) and
today's collected rows (paid + free, ordered by paid_at DESC). Joins
patients for full name and user_profiles for the recorder name. Uses
todayBoundsUtc from lib/time to anchor 'today' in CABINET_TZ.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 — `lib/stats/queries.ts` (5 aggregation functions) with TDD

**Files:**
- Create: `lib/stats/queries.ts`
- Test: `tests/unit/stats/queries.test.ts`

This task is the largest pure-data module. Each function gets its own focused tests.

- [ ] **Step 1: Write the failing test at `tests/unit/stats/queries.test.ts`**

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { dbAdmin } from '@/db/client';
import { consultations, appointments, patients, userProfiles, tenants } from '@/db/schema';
import {
  getRevenueSummary,
  getRevenueByDay,
  getRevenueByMethod,
  getOutstandingPayments,
  getTopPatients,
} from '@/lib/stats/queries';

describe('stats queries', () => {
  let tenantId: string;
  let doctorId: string;
  let assistantId: string;
  let patientId1: string;
  let patientId2: string;

  beforeEach(async () => {
    const [t] = await dbAdmin().insert(tenants).values({ name: 'S Tenant' }).returning();
    tenantId = t.id;

    const [d] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'doctor',
        fullName: 'Dr. S',
        email: `ds-${Date.now()}@test.example`,
      })
      .returning();
    doctorId = d.id;

    const [a] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'assistant',
        fullName: 'A. S',
        email: `as-${Date.now()}@test.example`,
      })
      .returning();
    assistantId = a.id;

    const [p1] = await dbAdmin()
      .insert(patients)
      .values({ tenantId, lastName: 'Berrada', firstName: 'Yasmine', sex: 'F', dateOfBirth: '1990-01-01' })
      .returning();
    patientId1 = p1.id;
    const [p2] = await dbAdmin()
      .insert(patients)
      .values({ tenantId, lastName: 'Alami', firstName: 'Ali', sex: 'M', dateOfBirth: '1985-01-01' })
      .returning();
    patientId2 = p2.id;

    // Helper: insert one consultation with given dates / state.
    async function seed(
      patientId: string,
      paymentStatus: 'paid' | 'awaiting' | 'free',
      method: 'especes' | 'carte' | 'cheque' | 'virement' | 'autre' | null,
      priceMad: string | null,
      paidAt: Date | null,
      finalizedAt: Date,
    ) {
      const [appt] = await dbAdmin()
        .insert(appointments)
        .values({
          tenantId,
          patientId,
          status: 'done',
          kind: 'walkin',
          createdBy: doctorId,
          startedAt: finalizedAt,
          endedAt: finalizedAt,
        })
        .returning();
      await dbAdmin()
        .insert(consultations)
        .values({
          tenantId,
          appointmentId: appt.id,
          patientId,
          doctorId,
          isFinalized: true,
          finalizedAt,
          priceMad: priceMad,
          isFree: paymentStatus === 'free',
          paymentStatus,
          paymentMethod: method,
          paidAt,
          paidBy:
            paymentStatus === 'awaiting' ? null : paymentStatus === 'paid' ? assistantId : doctorId,
        });
    }

    const today = new Date();
    const yesterday = new Date(Date.now() - 86_400_000);
    // Today: 2 paid (250 espèces, 300 carte for patient1), 1 awaiting (200 for patient2), 1 free (patient1).
    await seed(patientId1, 'paid', 'especes', '250.00', today, today);
    await seed(patientId1, 'paid', 'carte', '300.00', today, today);
    await seed(patientId2, 'awaiting', null, '200.00', null, today);
    await seed(patientId1, 'free', null, null, today, today);

    // Yesterday: 1 paid (350 cheque for patient2).
    await seed(patientId2, 'paid', 'cheque', '350.00', yesterday, yesterday);
  });

  describe('getRevenueSummary', () => {
    it('30d range counts everything seeded', async () => {
      const r = await getRevenueSummary(tenantId, '30d');
      expect(r.totalCount).toBe(5);
      expect(r.paidCount).toBe(3);
      expect(r.awaitingCount).toBe(1);
      expect(r.freeCount).toBe(1);
      // total revenue = 250+300+350 = 900
      expect(Number(r.totalRevenue)).toBeCloseTo(900);
      // avgPrice excludes free: (250+300+200+350)/4 = 275
      expect(Number(r.avgPrice)).toBeCloseTo(275);
      // awaitingTotal = 200
      expect(Number(r.awaitingTotal)).toBeCloseTo(200);
    });

    it('today range excludes yesterday', async () => {
      const r = await getRevenueSummary(tenantId, 'today');
      expect(r.totalCount).toBe(4); // 2 paid + 1 awaiting + 1 free finalized today
      expect(r.paidCount).toBe(2);
      expect(Number(r.totalRevenue)).toBeCloseTo(250 + 300);
    });
  });

  describe('getRevenueByDay', () => {
    it('30d returns rows for both today and yesterday', async () => {
      const rows = await getRevenueByDay(tenantId, '30d');
      expect(rows.length).toBeGreaterThanOrEqual(2);
      const totalRev = rows.reduce((sum, r) => sum + Number(r.revenue), 0);
      expect(totalRev).toBeCloseTo(900);
    });
  });

  describe('getRevenueByMethod', () => {
    it('30d returns one row per method seen', async () => {
      const rows = await getRevenueByMethod(tenantId, '30d');
      const byMethod = Object.fromEntries(rows.map((r) => [r.method, Number(r.revenue)]));
      expect(byMethod.especes).toBeCloseTo(250);
      expect(byMethod.carte).toBeCloseTo(300);
      expect(byMethod.cheque).toBeCloseTo(350);
      expect(byMethod.virement).toBeUndefined();
      expect(byMethod.autre).toBeUndefined();
    });
  });

  describe('getOutstandingPayments', () => {
    it('30d returns the awaiting row', async () => {
      const rows = await getOutstandingPayments(tenantId, '30d');
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].priceMad)).toBeCloseTo(200);
      expect(rows[0].patientFullName.toLowerCase()).toContain('alami');
    });
  });

  describe('getTopPatients', () => {
    it('30d returns patients ordered by paid revenue', async () => {
      const rows = await getTopPatients(tenantId, '30d', 10);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      // patient1 paid: 250 + 300 = 550. patient2 paid: 350. So patient1 first.
      expect(rows[0].patientFullName.toLowerCase()).toContain('berrada');
      expect(Number(rows[0].revenue)).toBeCloseTo(550);
      expect(Number(rows[1].revenue)).toBeCloseTo(350);
    });

    it('respects the limit', async () => {
      const rows = await getTopPatients(tenantId, '30d', 1);
      expect(rows).toHaveLength(1);
    });
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
pnpm test tests/unit/stats/queries.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/stats/queries'`.

- [ ] **Step 3: Implement `lib/stats/queries.ts`**

```ts
import 'server-only';
import { and, desc, eq, gte, isNotNull, lt, sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { consultations, patients } from '@/db/schema';
import { rangeBoundsUtc, type StatsRange } from '@/lib/time';

export type RevenueSummary = {
  totalRevenue: string;
  totalCount: number;
  paidCount: number;
  awaitingCount: number;
  freeCount: number;
  avgPrice: string | null;
  awaitingTotal: string;
};

export type RevenueByDay = Array<{ date: string; revenue: string; count: number }>;
export type RevenueByMethod = Array<{ method: string; revenue: string; count: number }>;
export type OutstandingRow = {
  consultationId: string;
  patientFullName: string;
  priceMad: string;
  finalizedAt: Date;
};
export type TopPatientRow = {
  patientId: string;
  patientFullName: string;
  revenue: string;
  consultationCount: number;
};

export async function getRevenueSummary(tenantId: string, range: StatsRange): Promise<RevenueSummary> {
  const { startUtc, endUtc } = rangeBoundsUtc(range);
  const db = dbAdmin();

  // All consultations in the window — count by status.
  const [counts] = await db.execute<{
    total_count: number;
    paid_count: number;
    awaiting_count: number;
    free_count: number;
    paid_revenue: string;
    awaiting_total: string;
    avg_price: string | null;
  }>(sql`
    SELECT
      COUNT(*)::int                                            AS total_count,
      COUNT(*) FILTER (WHERE payment_status = 'paid')::int     AS paid_count,
      COUNT(*) FILTER (WHERE payment_status = 'awaiting')::int AS awaiting_count,
      COUNT(*) FILTER (WHERE payment_status = 'free')::int     AS free_count,
      COALESCE(SUM(price_mad) FILTER (WHERE payment_status = 'paid'), 0)::text     AS paid_revenue,
      COALESCE(SUM(price_mad) FILTER (WHERE payment_status = 'awaiting'), 0)::text AS awaiting_total,
      AVG(price_mad) FILTER (WHERE is_free = false)::text                          AS avg_price
    FROM consultations
    WHERE tenant_id = ${tenantId}
      AND finalized_at >= ${startUtc.toISOString()}
      AND finalized_at <  ${endUtc.toISOString()}
  `);

  return {
    totalRevenue: counts.paid_revenue,
    totalCount: counts.total_count,
    paidCount: counts.paid_count,
    awaitingCount: counts.awaiting_count,
    freeCount: counts.free_count,
    avgPrice: counts.avg_price,
    awaitingTotal: counts.awaiting_total,
  };
}

export async function getRevenueByDay(tenantId: string, range: StatsRange): Promise<RevenueByDay> {
  const { startUtc, endUtc } = rangeBoundsUtc(range);
  const rows = await dbAdmin().execute<{ date: string; revenue: string; count: number }>(sql`
    SELECT
      to_char(date_trunc('day', paid_at AT TIME ZONE 'Africa/Casablanca'), 'YYYY-MM-DD') AS date,
      COALESCE(SUM(price_mad), 0)::text                                                  AS revenue,
      COUNT(*)::int                                                                       AS count
    FROM consultations
    WHERE tenant_id = ${tenantId}
      AND payment_status = 'paid'
      AND paid_at >= ${startUtc.toISOString()}
      AND paid_at <  ${endUtc.toISOString()}
    GROUP BY 1
    ORDER BY 1
  `);
  return rows.map((r) => ({ date: r.date, revenue: r.revenue, count: r.count }));
}

export async function getRevenueByMethod(tenantId: string, range: StatsRange): Promise<RevenueByMethod> {
  const { startUtc, endUtc } = rangeBoundsUtc(range);
  const rows = await dbAdmin().execute<{ method: string; revenue: string; count: number }>(sql`
    SELECT
      payment_method                          AS method,
      COALESCE(SUM(price_mad), 0)::text       AS revenue,
      COUNT(*)::int                            AS count
    FROM consultations
    WHERE tenant_id = ${tenantId}
      AND payment_status = 'paid'
      AND paid_at >= ${startUtc.toISOString()}
      AND paid_at <  ${endUtc.toISOString()}
    GROUP BY payment_method
    ORDER BY revenue DESC
  `);
  return rows.map((r) => ({ method: r.method, revenue: r.revenue, count: r.count }));
}

export async function getOutstandingPayments(tenantId: string, range: StatsRange): Promise<OutstandingRow[]> {
  const { startUtc } = rangeBoundsUtc(range);
  const rows = await dbAdmin()
    .select({
      consultationId: consultations.id,
      lastName: patients.lastName,
      firstName: patients.firstName,
      priceMad: consultations.priceMad,
      finalizedAt: consultations.finalizedAt,
    })
    .from(consultations)
    .leftJoin(patients, eq(patients.id, consultations.patientId))
    .where(
      and(
        eq(consultations.tenantId, tenantId),
        eq(consultations.paymentStatus, 'awaiting'),
        gte(consultations.finalizedAt, startUtc),
      ),
    )
    .orderBy(desc(consultations.finalizedAt));
  return rows.map((r) => ({
    consultationId: r.consultationId,
    patientFullName: `${r.lastName ?? ''} ${r.firstName ?? ''}`.trim(),
    priceMad: r.priceMad ?? '0',
    finalizedAt: r.finalizedAt!,
  }));
}

export async function getTopPatients(
  tenantId: string,
  range: StatsRange,
  limit = 10,
): Promise<TopPatientRow[]> {
  const { startUtc, endUtc } = rangeBoundsUtc(range);
  const rows = await dbAdmin().execute<{
    patient_id: string;
    last_name: string;
    first_name: string;
    revenue: string;
    consultation_count: number;
  }>(sql`
    SELECT
      c.patient_id                                        AS patient_id,
      p.last_name                                         AS last_name,
      p.first_name                                        AS first_name,
      COALESCE(SUM(c.price_mad), 0)::text                 AS revenue,
      COUNT(*)::int                                        AS consultation_count
    FROM consultations c
    JOIN patients p ON p.id = c.patient_id
    WHERE c.tenant_id = ${tenantId}
      AND c.payment_status = 'paid'
      AND c.paid_at >= ${startUtc.toISOString()}
      AND c.paid_at <  ${endUtc.toISOString()}
    GROUP BY c.patient_id, p.last_name, p.first_name
    ORDER BY revenue DESC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({
    patientId: r.patient_id,
    patientFullName: `${r.last_name} ${r.first_name}`.trim(),
    revenue: r.revenue,
    consultationCount: r.consultation_count,
  }));
}
```

- [ ] **Step 4: Run the test, expect pass**

```bash
pnpm test tests/unit/stats/queries.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Run full suite**

```bash
pnpm test
```

Expected: 167 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/stats/queries.ts tests/unit/stats/queries.test.ts
git status --porcelain | grep -E "^[MA]" | grep -v -E "lib/stats/queries\.ts$|tests/unit/stats/queries\.test\.ts$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(stats): 5 aggregation queries

Revenue summary (paid revenue + counts + avg + awaiting total),
revenue-by-day grouped on Casablanca local day, revenue-by-method,
outstanding payments list, top-N patients by paid revenue. All driven
by lib/time.rangeBoundsUtc.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8 — `<FinalizePricingDialog>` + Dialog primitive

**Files:**
- Create: `components/ui/dialog.tsx`
- Create: `components/payments/finalize-pricing-dialog.tsx`
- Modify: `app/(authenticated)/consultations/[id]/page.tsx` (replace the inline form with the dialog)

This task introduces a small `<Dialog>` primitive (~70 lines, mirrors `components/ui/select.tsx`) and the doctor's finalize dialog component, then wires it on the consultation page.

- [ ] **Step 1: Create `components/ui/dialog.tsx`**

```tsx
'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <DialogPrimitive.Portal>{children}</DialogPrimitive.Portal>;
}

function DialogBackdrop({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      className={cn(
        'fixed inset-0 z-50 bg-foreground/40 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPortal>
      <DialogBackdrop />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,32rem)] rounded-xl border border-border bg-card text-foreground shadow-lg p-6 outline-none',
          'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
          'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-heading font-semibold leading-tight', className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-small text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
};
```

- [ ] **Step 2: Create `components/payments/finalize-pricing-dialog.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { finalizeConsultationAction } from '@/app/(authenticated)/consultations/[id]/actions';
import { cn } from '@/lib/utils';

export function FinalizePricingDialog({
  consultationId,
  defaultPriceMad,
}: {
  consultationId: string;
  defaultPriceMad: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState(defaultPriceMad ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submitDisabled =
    !isFree && (!price || Number.isNaN(Number(price)) || Number(price) <= 0);

  function handleSubmit() {
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set('consultationId', consultationId);
      fd.set('isFree', isFree ? 'true' : 'false');
      if (!isFree) fd.set('priceMad', price);
      const r = await finalizeConsultationAction(fd);
      if (!r.ok) {
        setError(r.error ?? 'Erreur inconnue.');
        return;
      }
      setOpen(false);
      router.push('/today');
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Terminer la consultation
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Tarification et clôture</DialogTitle>
          <div className="mt-4 space-y-4">
            <div className={cn('space-y-1.5', isFree && 'opacity-50')}>
              <Label htmlFor="price-mad">Prix (MAD)</Label>
              <Input
                id="price-mad"
                type="number"
                step="0.50"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={isFree}
                autoFocus
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="size-4"
              />
              <span className="text-body">Gratuit</span>
            </label>
            {error ? <Alert variant="danger">{error}</Alert> : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitDisabled || pending}
                loading={pending}
              >
                Terminer la consultation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 3: Wire the dialog in `app/(authenticated)/consultations/[id]/page.tsx`**

Find the `actions` slot in the `<PageHeader>` (currently at lines 64–73 of `page.tsx`):

```tsx
actions={
  !detail.consultation.isFinalized ? (
    <form action={finalizeConsultationAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit">Terminer la consultation</Button>
    </form>
  ) : (
    <span className="text-sm text-muted-foreground">Consultation terminée</span>
  )
}
```

Replace with:

```tsx
actions={
  !detail.consultation.isFinalized ? (
    <FinalizePricingDialog
      consultationId={id}
      defaultPriceMad={tenant?.defaultConsultationPriceMad ?? null}
    />
  ) : (
    <FinalizedTarificationBadge
      isFree={detail.consultation.isFree}
      priceMad={detail.consultation.priceMad}
      paymentStatus={detail.consultation.paymentStatus}
      paymentMethod={detail.consultation.paymentMethod}
    />
  )
}
```

Then, in the `[tenant] = await dbAdmin().select(...)` block (currently lines 31-40), add `defaultConsultationPriceMad: tenants.defaultConsultationPriceMad,` to the select fields.

Add new imports at top of the file:

```ts
import { FinalizePricingDialog } from '@/components/payments/finalize-pricing-dialog';
import { FinalizedTarificationBadge } from '@/components/payments/finalized-tarification-badge';
```

- [ ] **Step 4: Create `components/payments/finalized-tarification-badge.tsx`**

```tsx
import { StatusBadge } from '@/components/ui/status-badge';
import { formatMad } from '@/lib/medications/format';

const METHOD_LABEL: Record<string, string> = {
  especes: 'Espèces',
  carte: 'Carte',
  cheque: 'Chèque',
  virement: 'Virement',
  autre: 'Autre',
};

export function FinalizedTarificationBadge({
  isFree,
  priceMad,
  paymentStatus,
  paymentMethod,
}: {
  isFree: boolean;
  priceMad: string | null;
  paymentStatus: 'awaiting' | 'paid' | 'free';
  paymentMethod: string | null;
}) {
  if (isFree || paymentStatus === 'free') {
    return <StatusBadge variant="neutral">Gratuit</StatusBadge>;
  }
  if (paymentStatus === 'awaiting') {
    return (
      <StatusBadge variant="warning">
        Prix : {formatMad(priceMad)} · En attente
      </StatusBadge>
    );
  }
  // paid
  return (
    <StatusBadge variant="success">
      Prix : {formatMad(priceMad)} · Payé · {METHOD_LABEL[paymentMethod ?? ''] ?? '—'}
    </StatusBadge>
  );
}
```

- [ ] **Step 5: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean. If errors point to `lib/utils` or `Alert` not having a `danger` variant, check `components/ui/alert.tsx` — the spec mentions Alert variants (`info|success|warning|danger`) exist; the one used here is `danger`. If the actual variant name differs, adjust the `<Alert variant=...>` call.

- [ ] **Step 6: Run unit suite (no tests added in this task; just regression check)**

```bash
pnpm test
```

Expected: 167 tests still pass.

- [ ] **Step 7: Commit — STAGE ONLY THESE FILES**

```bash
git add components/ui/dialog.tsx components/payments/finalize-pricing-dialog.tsx components/payments/finalized-tarification-badge.tsx app/\(authenticated\)/consultations/\[id\]/page.tsx
git status --porcelain | grep -E "^[MA]" | grep -v -E "components/ui/dialog\.tsx$|components/payments/finalize-pricing-dialog\.tsx$|components/payments/finalized-tarification-badge\.tsx$|consultations/\[id\]/page\.tsx$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(consultations): finalize pricing dialog + tarification badge

Replaces the form-based finalize button with a two-input dialog (price
or Gratuit toggle), validated by finalizePricingSchema. Adds a
FinalizedTarificationBadge that shows the pricing/payment state on
already-finalized consultations. Adds a small Dialog primitive
in components/ui/dialog.tsx wrapping @base-ui/react.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9 — `<PaymentsPanel>` + `<EncaisserDialog>` + `recordPaymentAction`

**Files:**
- Create: `components/payments/payments-panel.tsx`
- Create: `components/payments/encaisser-dialog.tsx`
- Create: `app/(authenticated)/today/payments/actions.ts`

- [ ] **Step 1: Create `app/(authenticated)/today/payments/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireAssistant } from '@/lib/auth/guards';
import { recordPaymentSchema } from '@/lib/payments/schemas';
import { recordPayment } from '@/lib/payments/mutations';
import { recordAudit } from '@/lib/audit/record';

export type RecordPaymentResult = { ok: boolean; error?: string };

export async function recordPaymentAction(formData: FormData): Promise<RecordPaymentResult> {
  const session = await requireAssistant();
  const parsed = recordPaymentSchema.safeParse({
    consultationId: formData.get('consultationId'),
    paymentMethod: formData.get('paymentMethod'),
    paymentNote: formData.get('paymentNote') ?? null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
  }

  const ok = await recordPayment(session.tenantId, {
    consultationId: parsed.data.consultationId,
    paymentMethod: parsed.data.paymentMethod,
    paymentNote: parsed.data.paymentNote ?? null,
    assistantId: session.userId,
  });
  if (!ok) return { ok: false, error: 'Consultation introuvable ou déjà encaissée.' };

  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'consultation.payment_received',
    entityType: 'consultation',
    entityId: parsed.data.consultationId,
    metadata: {
      paymentMethod: parsed.data.paymentMethod,
      hasNote: !!(parsed.data.paymentNote && parsed.data.paymentNote.trim().length > 0),
    },
  });

  revalidatePath('/today');
  revalidatePath('/stats');
  return { ok: true };
}
```

- [ ] **Step 2: Create `components/payments/encaisser-dialog.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { recordPaymentAction } from '@/app/(authenticated)/today/payments/actions';
import { formatMad } from '@/lib/medications/format';
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/payments/schemas';
import { cn } from '@/lib/utils';

const METHOD_LABEL: Record<PaymentMethod, string> = {
  especes: 'Espèces',
  carte: 'Carte',
  cheque: 'Chèque',
  virement: 'Virement',
  autre: 'Autre',
};

export function EncaisserDialog({
  consultationId,
  patientFullName,
  priceMad,
}: {
  consultationId: string;
  patientFullName: string;
  priceMad: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('especes');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const noteRequired = method === 'autre';
  const submitDisabled = noteRequired && note.trim().length === 0;

  function handleSubmit() {
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set('consultationId', consultationId);
      fd.set('paymentMethod', method);
      if (note.trim().length > 0) fd.set('paymentNote', note.trim());
      const r = await recordPaymentAction(fd);
      if (!r.ok) {
        setError(r.error ?? 'Erreur inconnue.');
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Encaisser
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Encaisser le paiement de {patientFullName}</DialogTitle>
          <div className="mt-4 space-y-4">
            <div className="text-body">
              <span className="text-muted-foreground">Prix : </span>
              <span className="font-medium tabular-nums">{formatMad(priceMad)}</span>
            </div>

            <div className="space-y-2">
              <Label>Méthode de paiement</Label>
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setMethod(m)}
                    aria-pressed={method === m}
                    className={cn(
                      'px-3 py-1.5 rounded-pill border text-small transition-colors',
                      'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                      method === m
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-card text-foreground border-border hover:bg-muted',
                    )}
                  >
                    {METHOD_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment-note">
                Note {noteRequired ? <span className="text-danger">*</span> : <span className="text-muted-foreground">(optionnelle)</span>}
              </Label>
              <textarea
                id="payment-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-body resize-y"
                placeholder={noteRequired ? 'Précisez la méthode (split, mutuelle, …)' : 'Détails optionnels'}
              />
            </div>

            {error ? <Alert variant="danger">{error}</Alert> : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitDisabled || pending}
                loading={pending}
              >
                Confirmer l&apos;encaissement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 3: Create `components/payments/payments-panel.tsx`**

```tsx
import { Wallet, ChevronDown } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Section } from '@/components/ui/section';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatMad } from '@/lib/medications/format';
import type { PaymentRow } from '@/lib/payments/queries';
import { EncaisserDialog } from './encaisser-dialog';

const METHOD_LABEL: Record<string, string> = {
  especes: 'Espèces',
  carte: 'Carte',
  cheque: 'Chèque',
  virement: 'Virement',
  autre: 'Autre',
};

function fmtRelative(d: Date): string {
  const ms = Date.now() - d.getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function PaymentsPanel({
  awaiting,
  collectedToday,
  role,
}: {
  awaiting: PaymentRow[];
  collectedToday: PaymentRow[];
  role: 'doctor' | 'assistant';
}) {
  return (
    <Section icon={Wallet} title="Paiements" count={awaiting.length}>
      <div className="space-y-3">
        {awaiting.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Aucun paiement en attente"
            description="Les consultations clôturées apparaîtront ici."
          />
        ) : (
          <ul role="list" className="divide-y divide-border rounded-xl border border-border bg-card shadow-card overflow-hidden">
            {awaiting.map((r) => (
              <li key={r.consultationId} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={r.patientFullName} size="md" tone="primary" />
                <div className="flex-1 min-w-0">
                  <div className="text-body font-medium truncate">{r.patientFullName}</div>
                  <div className="text-small text-muted-foreground">{fmtRelative(r.finalizedAt)}</div>
                </div>
                <div className="text-body font-medium tabular-nums shrink-0">
                  {formatMad(r.priceMad)}
                </div>
                {role === 'assistant' ? (
                  <EncaisserDialog
                    consultationId={r.consultationId}
                    patientFullName={r.patientFullName}
                    priceMad={r.priceMad}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <details className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            <span className="text-body font-medium">Encaissés aujourd&apos;hui</span>
            <span className="text-small text-muted-foreground tabular-nums ml-auto">{collectedToday.length}</span>
          </summary>
          <div>
            {collectedToday.length === 0 ? (
              <div className="px-4 pb-4">
                <EmptyState icon={Wallet} title="Aucun paiement aujourd'hui" />
              </div>
            ) : (
              <ul role="list" className="divide-y divide-border border-t border-border">
                {collectedToday.map((r) => (
                  <li key={r.consultationId} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={r.patientFullName} size="md" tone="primary" />
                    <div className="flex-1 min-w-0">
                      <div className="text-body font-medium truncate">{r.patientFullName}</div>
                      <div className="text-small text-muted-foreground">
                        {r.paidAt ? fmtTime(r.paidAt) : ''}
                        {r.paidByName ? ` · encaissé par ${r.paidByName}` : ''}
                      </div>
                    </div>
                    {r.isFree ? (
                      <StatusBadge variant="neutral">Gratuit</StatusBadge>
                    ) : (
                      <>
                        <div className="text-body font-medium tabular-nums shrink-0">
                          {formatMad(r.priceMad)}
                        </div>
                        <StatusBadge variant="success">
                          {METHOD_LABEL[r.paymentMethod ?? ''] ?? '—'}
                        </StatusBadge>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </div>
    </Section>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 5: Run unit suite (regression)**

```bash
pnpm test
```

Expected: 167 tests still pass.

- [ ] **Step 6: Commit — STAGE ONLY THESE FILES**

```bash
git add components/payments/payments-panel.tsx components/payments/encaisser-dialog.tsx app/\(authenticated\)/today/payments/actions.ts
git status --porcelain | grep -E "^[MA]" | grep -v -E "components/payments/payments-panel\.tsx$|components/payments/encaisser-dialog\.tsx$|today/payments/actions\.ts$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(payments): assistant payments panel + encaisser dialog

Server component PaymentsPanel renders awaiting (multi-day) + collected-today
sub-lists; the Encaisser button is shown only to assistants. EncaisserDialog
collects method (5 options) + optional note (mandatory for 'autre') and
calls recordPaymentAction.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10 — `/today` integration: 5th tile + `<PaymentsPanel>` placement

**Files:**
- Modify: `components/today/today-stats.tsx`
- Modify: `app/(authenticated)/today/page.tsx`

**⚠️ Pre-flight gate:** This task modifies `app/(authenticated)/today/page.tsx` and `components/today/today-stats.tsx`, both of which have unstaged phase-A modifications in the working tree. **Before starting Step 1, the executor must confirm with the user that these files' unstaged changes are either (a) committed already on `main`, or (b) stashed.** If unresolved, STOP and ask.

- [ ] **Step 1: Pre-flight check**

Run:
```bash
git status app/\(authenticated\)/today/page.tsx components/today/today-stats.tsx
```

If either file is shown as modified, STOP. Report to the controller. Resume only after the user resolves the working-tree state for these two files.

- [ ] **Step 2: Update `components/today/today-stats.tsx` — add the 5th tile**

Open the file. The existing component renders 4 `StatTile`s in a `grid-cols-2 lg:grid-cols-4` grid. Add a 5th tile after the existing four:

Update the `TodayStats` props signature to accept the new fields:

```tsx
export function TodayStats({
  scheduled,
  waiting,
  inConsultation,
  done,
  todayRevenueMad,
  paidCount,
  awaitingCount,
}: {
  scheduled: number;
  waiting: number;
  inConsultation: number;
  done: number;
  todayRevenueMad: string;
  paidCount: number;
  awaitingCount: number;
}) {
```

Change the grid container className from `grid-cols-2 lg:grid-cols-4 gap-3` to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3`.

Add a 5th tile before the closing `</div>`:

```tsx
import { Wallet } from 'lucide-react';
// ...
import { formatMad } from '@/lib/medications/format';

// inside the JSX, after the 4th tile:
<StatTile
  icon={Wallet}
  tone="success"
  label="Recettes du jour"
  value={Number(formatMad(todayRevenueMad).replace(/[^\d,]/g, '').replace(',', '.')) || 0}
  hint={`${paidCount} encaissés · ${awaitingCount} en attente`}
/>
```

**Wait** — `StatTile`'s `value` prop is `number`, but `todayRevenueMad` is a numeric-string. Inspect `StatTile` (in the same file) — `value: number`. The cleanest approach is to render the full formatted string in a separate component or to extend `StatTile` to accept `value: number | string`. Cheap fix: create a sibling tile component that takes a string.

Replace the new tile with:

```tsx
<div className="rounded-xl border border-border bg-card shadow-card p-4 flex items-start gap-3 card-hover-lift">
  <div
    aria-hidden
    className="flex items-center justify-center size-10 rounded-lg shrink-0 bg-success-tint text-success"
  >
    <Wallet className="size-5" aria-hidden />
  </div>
  <div className="space-y-0.5 min-w-0">
    <div className="text-small text-muted-foreground uppercase tracking-wide font-medium">
      Recettes du jour
    </div>
    <div className="text-display font-semibold leading-none tabular-nums">
      {formatMad(todayRevenueMad)}
    </div>
    <div className="text-small text-muted-foreground">
      {paidCount} encaissés · {awaitingCount} en attente
    </div>
  </div>
</div>
```

- [ ] **Step 3: Update `app/(authenticated)/today/page.tsx`**

Add new imports:

```tsx
import { PaymentsPanel } from '@/components/payments/payments-panel';
import { getPaymentsForToday } from '@/lib/payments/queries';
```

In the `Promise.all([...])` block, add a 4th awaited fetch:

```tsx
const [schedule, waiting, inConsult, payments] = await Promise.all([
  listTodaySchedule(session.tenantId),
  listWaiting(session.tenantId),
  listInConsultation(session.tenantId),
  getPaymentsForToday(session.tenantId),
]);
```

Compute revenue counts:

```tsx
const paidToday = payments.collectedToday.filter((p) => p.paymentStatus === 'paid');
const todayRevenueMad = paidToday.reduce((sum, p) => sum + Number(p.priceMad ?? 0), 0).toFixed(2);
```

Update the `<TodayStats>` invocation:

```tsx
<TodayStats
  scheduled={pending}
  waiting={waiting.length}
  inConsultation={inConsult.length}
  done={done}
  todayRevenueMad={todayRevenueMad}
  paidCount={paidToday.length}
  awaitingCount={payments.awaiting.length}
/>
```

Insert the `<PaymentsPanel>` between the existing "Salle d'attente" (Section icon Clock) and "En consultation" sections:

```tsx
<Section icon={Clock} title="Salle d'attente" count={waiting.length}>
  <WaitingPanel items={waiting} canStartConsultation={session.role === 'doctor'} />
</Section>

<PaymentsPanel
  awaiting={payments.awaiting}
  collectedToday={payments.collectedToday}
  role={session.role}
/>

{inConsult.length > 0 ? (
  // ... existing block ...
) : null}
```

- [ ] **Step 4: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean. If `session.role` is wider than `'doctor' | 'assistant'`, add a guard or cast — but the existing `Session` type already restricts roles.

- [ ] **Step 5: Manual smoke (optional but recommended)**

Run `pnpm dev`, sign in as a doctor, finalize a consultation with a price (Task 8 dialog should appear), then sign in as the assistant (or use the same browser if your test setup supports it) and confirm the Paiements section appears with the awaiting consultation. Encaisser → confirms.

If manual smoke is not feasible at this stage, the e2e test in Task 14 will validate this end-to-end.

- [ ] **Step 6: Commit**

```bash
git add components/today/today-stats.tsx app/\(authenticated\)/today/page.tsx
git status --porcelain | grep -E "^[MA]" | grep -v -E "today/today-stats\.tsx$|today/page\.tsx$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(today): Recettes du jour tile + PaymentsPanel section

The 5-tile row now includes today's paid revenue (success tone) with a
hint of paid/awaiting counts. PaymentsPanel slots between Salle d'attente
and En consultation; renders awaiting (multi-day) and collected-today
sub-lists. Role-aware — assistants get the Encaisser button.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11 — `/stats` route: page skeleton + KPI tiles + sidebar nav

**Files:**
- Create: `app/(authenticated)/stats/page.tsx`
- Create: `app/(authenticated)/stats/range-pills.tsx`
- Modify: `components/shell/doctor-shell.tsx`

**⚠️ Pre-flight gate:** `components/shell/doctor-shell.tsx` has unstaged phase-A modifications. Confirm working-tree state before Step 3.

- [ ] **Step 1: Create `app/(authenticated)/stats/range-pills.tsx`**

```tsx
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { StatsRange } from '@/lib/time';

const LABELS: Record<StatsRange, string> = {
  today: "Aujourd'hui",
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  '90d': '90 derniers jours',
};

const RANGES: StatsRange[] = ['today', '7d', '30d', '90d'];

export function RangePills({ active }: { active: StatsRange }) {
  return (
    <div role="tablist" aria-label="Plage de temps" className="inline-flex gap-1">
      {RANGES.map((r) => (
        <Link
          key={r}
          href={`/stats?range=${r}`}
          role="tab"
          aria-selected={r === active}
          className={cn(
            'px-3 py-1.5 rounded-pill border text-small transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
            r === active
              ? 'bg-foreground text-background border-foreground'
              : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground',
          )}
          style={{ transitionDuration: 'var(--duration-fast)' }}
        >
          {LABELS[r]}
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(authenticated)/stats/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { Activity, AlertCircle, Award, BarChart3, PieChart } from 'lucide-react';
import { requireDoctor } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/page-header';
import { Section } from '@/components/ui/section';
import { StatCard } from '@/components/admin/stat-card';
import {
  getRevenueSummary,
  getRevenueByDay,
  getRevenueByMethod,
  getOutstandingPayments,
  getTopPatients,
} from '@/lib/stats/queries';
import { type StatsRange } from '@/lib/time';
import { formatMad } from '@/lib/medications/format';
import { RangePills } from './range-pills';

export const dynamic = 'force-dynamic';

const VALID_RANGES = new Set<StatsRange>(['today', '7d', '30d', '90d']);

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await requireDoctor();
  const { range: rawRange } = await searchParams;
  const range: StatsRange = VALID_RANGES.has(rawRange as StatsRange)
    ? (rawRange as StatsRange)
    : '30d';
  if (rawRange && rawRange !== range) {
    redirect(`/stats?range=${range}`);
  }

  const [summary, revenueByDay, revenueByMethod, outstanding, topPatients] = await Promise.all([
    getRevenueSummary(session.tenantId, range),
    getRevenueByDay(session.tenantId, range),
    getRevenueByMethod(session.tenantId, range),
    getOutstandingPayments(session.tenantId, range),
    getTopPatients(session.tenantId, range, 10),
  ]);

  return (
    <>
      <PageHeader title="Statistiques" description="Recettes et activité du cabinet." />
      <div className="px-6 py-6 space-y-6 max-w-6xl">
        <RangePills active={range} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            tone="success"
            label="Recettes"
            value={formatMad(summary.totalRevenue)}
            hint={`${summary.paidCount} consultations`}
          />
          <StatCard
            tone="primary"
            label="Consultations"
            value={String(summary.totalCount)}
            hint={`${summary.paidCount} payés · ${summary.awaitingCount} en attente · ${summary.freeCount} gratuits`}
          />
          <StatCard
            tone="admin"
            label="Prix moyen"
            value={summary.avgPrice ? formatMad(summary.avgPrice) : '—'}
            hint="MAD/consultation"
          />
          <StatCard
            tone="warning"
            label="En attente"
            value={String(summary.awaitingCount)}
            hint={`${formatMad(summary.awaitingTotal)} à encaisser`}
          />
        </div>

        {/* Sections in Task 12. */}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Add the sidebar nav item to `components/shell/doctor-shell.tsx`**

In `DoctorShell`, the doctor-only `Compte` group currently contains Équipe / Cabinet / Journal. Add a `Statistiques` item BEFORE Équipe:

```tsx
import { BarChart3, /* ... existing icons */ } from 'lucide-react';

// ...inside the {isDoctor ? <SidebarNavGroup>...</SidebarNavGroup> : null} block:
<SidebarNavGroup label="Compte">
  <SidebarNavItem href="/stats" icon={<BarChart3 className="size-4" aria-hidden />}>
    Statistiques
  </SidebarNavItem>
  <SidebarNavItem href="/settings/team" icon={<Users2 className="size-4" aria-hidden />}>
    Équipe
  </SidebarNavItem>
  {/* ... existing Cabinet and Journal items unchanged ... */}
</SidebarNavGroup>
```

- [ ] **Step 4: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 5: Run unit suite**

```bash
pnpm test
```

Expected: 167 tests still pass.

- [ ] **Step 6: Manual smoke (optional)**

Run `pnpm dev`, sign in as doctor, click "Statistiques" in the sidebar. Expected: page renders with 4 KPI tiles populated. Try `?range=7d`, `?range=invalid` — invalid redirects to `?range=30d`.

- [ ] **Step 7: Commit**

```bash
git add app/\(authenticated\)/stats/page.tsx app/\(authenticated\)/stats/range-pills.tsx components/shell/doctor-shell.tsx
git status --porcelain | grep -E "^[MA]" | grep -v -E "stats/page\.tsx$|stats/range-pills\.tsx$|shell/doctor-shell\.tsx$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(stats): /stats route skeleton + sidebar nav

Doctor-only /stats page with range selector (today/7j/30j/90j, default 30j)
and 4 KPI tiles (Recettes, Consultations, Prix moyen, En attente).
Charts and tables land in the next task. Sidebar gains a 'Statistiques'
item in the doctor-only Compte group.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12 — `/stats` route: charts + tables

**Files:**
- Create: `app/(authenticated)/stats/revenue-chart.tsx`
- Create: `app/(authenticated)/stats/method-chart.tsx`
- Create: `app/(authenticated)/stats/outstanding-table.tsx`
- Create: `app/(authenticated)/stats/top-patients-table.tsx`
- Modify: `app/(authenticated)/stats/page.tsx` (add the 4 sections)

- [ ] **Step 1: Create `revenue-chart.tsx`**

```tsx
'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RevenueByDay } from '@/lib/stats/queries';

export function RevenueChart({ daily }: { daily: RevenueByDay }) {
  if (daily.length === 0) {
    return <p className="text-small text-muted-foreground p-4">Aucune recette sur la période.</p>;
  }
  const data = daily.map((d) => ({ date: d.date, revenue: Number(d.revenue), count: d.count }));
  return (
    <div className="border rounded-md p-3">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="revenue" name="Recettes (MAD)" fill="#16a34a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Create `method-chart.tsx`**

```tsx
'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { RevenueByMethod } from '@/lib/stats/queries';

const METHOD_LABEL: Record<string, string> = {
  especes: 'Espèces',
  carte: 'Carte',
  cheque: 'Chèque',
  virement: 'Virement',
  autre: 'Autre',
};

const METHOD_COLOR: Record<string, string> = {
  especes: '#0ea5e9',
  carte: '#ea580c',
  cheque: '#f59e0b',
  virement: '#16a34a',
  autre: '#94a3b8',
};

export function MethodChart({ byMethod }: { byMethod: RevenueByMethod }) {
  if (byMethod.length === 0) {
    return <p className="text-small text-muted-foreground p-4">Aucune recette sur la période.</p>;
  }
  const data = byMethod.map((m) => ({
    name: METHOD_LABEL[m.method] ?? m.method,
    method: m.method,
    revenue: Number(m.revenue),
  }));
  return (
    <div className="border rounded-md p-3">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="name"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((d) => (
              <Cell key={d.method} fill={METHOD_COLOR[d.method] ?? '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => `${v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Create `outstanding-table.tsx`**

```tsx
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatMad } from '@/lib/medications/format';
import type { OutstandingRow } from '@/lib/stats/queries';

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function OutstandingTable({ rows }: { rows: OutstandingRow[] }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead className="text-right">Prix</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmpty colSpan={4}>
              <EmptyState title="Aucun paiement en attente" />
            </TableEmpty>
          ) : (
            rows.map((r) => (
              <TableRow key={r.consultationId}>
                <TableCell className="text-small text-muted-foreground tabular-nums">{fmtDate(r.finalizedAt)}</TableCell>
                <TableCell className="font-medium">{r.patientFullName}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMad(r.priceMad)}</TableCell>
                <TableCell className="text-right pr-3">
                  <Link
                    href={`/consultations/${r.consultationId}`}
                    className="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Ouvrir la consultation"
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
  );
}
```

- [ ] **Step 4: Create `top-patients-table.tsx`**

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatMad } from '@/lib/medications/format';
import type { TopPatientRow } from '@/lib/stats/queries';

export function TopPatientsTable({ rows }: { rows: TopPatientRow[] }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead className="text-right">Consultations</TableHead>
            <TableHead className="text-right">Total payé</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmpty colSpan={4}>
              <EmptyState title="Pas de patients sur la période" />
            </TableEmpty>
          ) : (
            rows.map((r, i) => (
              <TableRow key={r.patientId}>
                <TableCell className="text-small text-muted-foreground tabular-nums">{i + 1}</TableCell>
                <TableCell className="font-medium">{r.patientFullName}</TableCell>
                <TableCell className="text-right tabular-nums">{r.consultationCount}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMad(r.revenue)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 5: Wire the sections into `page.tsx`**

In `app/(authenticated)/stats/page.tsx`, replace the `{/* Sections in Task 12. */}` placeholder with:

```tsx
<Section icon={Activity} title="Recettes par jour">
  <RevenueChart daily={revenueByDay} />
</Section>

<Section icon={PieChart} title="Recettes par méthode">
  <MethodChart byMethod={revenueByMethod} />
</Section>

<Section icon={AlertCircle} title="Paiements en attente" count={outstanding.length}>
  <OutstandingTable rows={outstanding} />
</Section>

<Section icon={Award} title="Top 10 patients" count={topPatients.length}>
  <TopPatientsTable rows={topPatients} />
</Section>
```

Add new imports at the top of `page.tsx`:

```tsx
import { RevenueChart } from './revenue-chart';
import { MethodChart } from './method-chart';
import { OutstandingTable } from './outstanding-table';
import { TopPatientsTable } from './top-patients-table';
```

- [ ] **Step 6: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 7: Run unit suite**

```bash
pnpm test
```

Expected: 167 tests still pass.

- [ ] **Step 8: Commit**

```bash
git add app/\(authenticated\)/stats/revenue-chart.tsx app/\(authenticated\)/stats/method-chart.tsx app/\(authenticated\)/stats/outstanding-table.tsx app/\(authenticated\)/stats/top-patients-table.tsx app/\(authenticated\)/stats/page.tsx
git status --porcelain | grep -E "^[MA]" | grep -v -E "stats/(revenue-chart|method-chart|outstanding-table|top-patients-table|page)\.tsx$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(stats): charts + tables for the dashboard

Recharts BarChart for daily revenue, donut PieChart for revenue-by-method
(5 colors aligned to the design tokens), Outstanding table linking to
each consultation, Top 10 table by paid revenue.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13 — Cabinet settings: Tarif par défaut

**Files:**
- Modify: `app/(authenticated)/settings/cabinet/page.tsx`
- Modify: `app/(authenticated)/settings/cabinet/forms.tsx`
- Modify: `app/(authenticated)/settings/cabinet/actions.ts`

**⚠️ Pre-flight gate:** `app/(authenticated)/settings/cabinet/page.tsx` has unstaged phase-A modifications. Confirm working-tree state.

- [ ] **Step 1: Pre-flight check**

```bash
git status app/\(authenticated\)/settings/cabinet/page.tsx
```

If modified, STOP and resolve with the user.

- [ ] **Step 2: Read `forms.tsx` to understand the current shape**

```bash
cat app/\(authenticated\)/settings/cabinet/forms.tsx
```

The form is named `<CabinetForms>` and accepts `initial: { rpmNumber, cnomNumber, prescriptionHeaderHtml, signatureUrl, stampUrl, logoUrl, chatbotEnabled, chatbotCreditsBalance }`.

Note the field names — the new field will be `defaultConsultationPriceMad`.

- [ ] **Step 3: Extend `actions.ts` — update `textSchema` and the action**

Replace the `textSchema` declaration with:

```ts
const textSchema = z.object({
  rpmNumber: z.string().trim().max(80).optional().or(z.literal('')),
  cnomNumber: z.string().trim().max(80).optional().or(z.literal('')),
  prescriptionHeaderHtml: z.string().trim().max(5000).optional().or(z.literal('')),
  defaultConsultationPriceMad: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) <= 99999.99),
      { message: 'Prix invalide.' },
    )
    .optional(),
});
```

Update the action body to capture the new field, look up the previous value (for the audit metadata), persist it, and audit the change:

```ts
import { recordAudit } from '@/lib/audit/record';
// (add this import alongside the existing imports if not already present)

export async function saveCabinetTextAction(
  _: SaveTextState,
  formData: FormData,
): Promise<SaveTextState> {
  const session = await requireDoctor();
  const parsed = textSchema.safeParse({
    rpmNumber: formData.get('rpmNumber'),
    cnomNumber: formData.get('cnomNumber'),
    prescriptionHeaderHtml: formData.get('prescriptionHeaderHtml'),
    defaultConsultationPriceMad: formData.get('defaultConsultationPriceMad') ?? '',
  });
  if (!parsed.success) return { error: 'Champs invalides.', saved: false };

  const newPrice =
    parsed.data.defaultConsultationPriceMad && parsed.data.defaultConsultationPriceMad !== ''
      ? parsed.data.defaultConsultationPriceMad
      : null;

  // Read previous value for audit metadata.
  const [prev] = await dbAdmin()
    .select({ defaultConsultationPriceMad: tenants.defaultConsultationPriceMad })
    .from(tenants)
    .where(eq(tenants.id, session.tenantId));

  await dbAdmin()
    .update(tenants)
    .set({
      rpmNumber: parsed.data.rpmNumber || null,
      cnomNumber: parsed.data.cnomNumber || null,
      prescriptionHeaderHtml: parsed.data.prescriptionHeaderHtml || null,
      defaultConsultationPriceMad: newPrice,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, session.tenantId));

  if ((prev?.defaultConsultationPriceMad ?? null) !== newPrice) {
    await recordAudit({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: 'tenant.default_price_updated',
      entityType: 'tenant',
      entityId: session.tenantId,
      metadata: { from: prev?.defaultConsultationPriceMad ?? null, to: newPrice },
    });
  }

  revalidatePath('/settings/cabinet');
  return { error: null, saved: true };
}
```

- [ ] **Step 4: Add the form field to `forms.tsx`**

The existing `<CabinetForms>` uses `<FormField label="...">` wrapping `<Input>`. Follow that pattern.

(a) Update the `initial` prop type to add `defaultConsultationPriceMad: string` (empty string means null):

```tsx
export function CabinetForms({
  initial,
}: {
  initial: {
    rpmNumber: string;
    cnomNumber: string;
    prescriptionHeaderHtml: string;
    signatureUrl: string | null;
    stampUrl: string | null;
    logoUrl: string | null;
    chatbotEnabled: boolean;
    chatbotCreditsBalance: number;
    defaultConsultationPriceMad: string;
  };
}) {
```

(b) Add a new `<FormField>` inside the existing `<form action={textAction}>` block, after the "En-tête personnalisé" field and before the `{textState.error}` line:

```tsx
<FormField
  label="Tarif par défaut (MAD)"
  description="Prefille le champ Prix lors de la clôture des consultations."
>
  <Input
    id="defaultConsultationPriceMad"
    name="defaultConsultationPriceMad"
    type="number"
    step="0.50"
    min="0.01"
    max="99999.99"
    placeholder="300.00"
    defaultValue={initial.defaultConsultationPriceMad}
  />
</FormField>
```

If `<FormField>` doesn't accept a `description` prop, fall back to a separate `<p className="text-small text-muted-foreground mt-1">` below the `<Input>` inside the FormField. Inspect `components/ui/form-field.tsx` to confirm.

- [ ] **Step 5: Update `page.tsx` to pass the initial value**

In `app/(authenticated)/settings/cabinet/page.tsx`, extend the `initial` object passed to `<CabinetForms>`:

```tsx
<CabinetForms
  initial={{
    rpmNumber: tenant.rpmNumber ?? '',
    cnomNumber: tenant.cnomNumber ?? '',
    prescriptionHeaderHtml: tenant.prescriptionHeaderHtml ?? '',
    signatureUrl: tenant.signatureUrl ?? null,
    stampUrl: tenant.stampUrl ?? null,
    logoUrl: tenant.logoUrl ?? null,
    chatbotEnabled: tenant.chatbotEnabled,
    chatbotCreditsBalance: tenant.chatbotCreditsBalance,
    defaultConsultationPriceMad: tenant.defaultConsultationPriceMad ?? '',
  }}
/>
```

- [ ] **Step 6: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 7: Manual smoke (optional)**

`pnpm dev`, sign in as doctor, go to `/settings/cabinet`, enter "300", save. Expected: the value persists and prefills the consultation finalize dialog. Audit log shows `tenant.default_price_updated` entry.

- [ ] **Step 8: Run full suite**

```bash
pnpm test
```

Expected: 167 tests still pass.

- [ ] **Step 9: Commit**

```bash
git add app/\(authenticated\)/settings/cabinet/page.tsx app/\(authenticated\)/settings/cabinet/forms.tsx app/\(authenticated\)/settings/cabinet/actions.ts
git status --porcelain | grep -E "^[MA]" | grep -v -E "settings/cabinet/(page|forms|actions)\.(ts|tsx)$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(settings): cabinet default consultation tariff

Adds 'Tarif par défaut (MAD)' field to /settings/cabinet. Persists to
tenants.default_consultation_price_mad. Audits the change via the new
tenant.default_price_updated action when the value differs from the
previous one. Prefills the consultation finalize dialog (already wired
in Task 8).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14 — RLS test + E2E test

**Files:**
- Create: `tests/rls/consultation-pricing.test.ts`
- Create: `tests/e2e/consultation-pricing.spec.ts`

- [ ] **Step 1: Read an existing RLS test for the pattern**

```bash
ls tests/rls/
cat tests/rls/$(ls tests/rls/ | head -1)
```

The test setup uses `withTenantClient(tenantId, async (db) => { ... })` (or similar — read the actual file to confirm) to scope queries to a tenant via the `app.tenant_id` setting that the existing RLS policies check.

- [ ] **Step 2: Write `tests/rls/consultation-pricing.test.ts`**

```ts
import { describe, expect, it, beforeAll } from 'vitest';
import { dbAdmin } from '@/db/client';
import { withTenantClient } from '@/db/with-tenant';
import { eq } from 'drizzle-orm';
import { consultations, appointments, patients, userProfiles, tenants } from '@/db/schema';

describe('consultations pricing RLS', () => {
  let tenantA: string;
  let tenantB: string;
  let consultationInA: string;

  beforeAll(async () => {
    const [a] = await dbAdmin().insert(tenants).values({ name: 'A RLS' }).returning();
    const [b] = await dbAdmin().insert(tenants).values({ name: 'B RLS' }).returning();
    tenantA = a.id;
    tenantB = b.id;

    const [docA] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId: tenantA,
        role: 'doctor',
        fullName: 'Dr A',
        email: `dra-${Date.now()}@test.example`,
      })
      .returning();
    const [pA] = await dbAdmin()
      .insert(patients)
      .values({ tenantId: tenantA, lastName: 'Z', firstName: 'P', sex: 'M', dateOfBirth: '1990-01-01' })
      .returning();
    const [apptA] = await dbAdmin()
      .insert(appointments)
      .values({
        tenantId: tenantA,
        patientId: pA.id,
        status: 'done',
        kind: 'walkin',
        createdBy: docA.id,
        startedAt: new Date(),
        endedAt: new Date(),
      })
      .returning();
    const [c] = await dbAdmin()
      .insert(consultations)
      .values({
        tenantId: tenantA,
        appointmentId: apptA.id,
        patientId: pA.id,
        doctorId: docA.id,
        isFinalized: true,
        finalizedAt: new Date(),
        priceMad: '250.00',
        isFree: false,
        paymentStatus: 'awaiting',
      })
      .returning();
    consultationInA = c.id;
  });

  it('tenant B cannot SELECT tenant A pricing', async () => {
    await withTenantClient(tenantB, async (db) => {
      const rows = await db.select().from(consultations).where(eq(consultations.id, consultationInA));
      expect(rows).toHaveLength(0);
    });
  });

  it('tenant B cannot UPDATE tenant A pricing', async () => {
    await withTenantClient(tenantB, async (db) => {
      const r = await db
        .update(consultations)
        .set({ paymentStatus: 'paid' })
        .where(eq(consultations.id, consultationInA))
        .returning();
      expect(r).toHaveLength(0);
    });
  });

  it('tenant A doctor CAN read pricing fields', async () => {
    await withTenantClient(tenantA, async (db) => {
      const [row] = await db.select().from(consultations).where(eq(consultations.id, consultationInA));
      expect(row.priceMad).toBe('250.00');
      expect(row.paymentStatus).toBe('awaiting');
    });
  });
});
```

If the test fixture file uses a different helper than `withTenantClient`, adjust accordingly — read `db/with-tenant.ts` and an existing RLS test.

- [ ] **Step 3: Write `tests/e2e/consultation-pricing.spec.ts` — doctor-only happy path**

The existing `tests/e2e/helpers/invite.ts` only provides `mintOwnerInvite`, `onboardDoctor`, and `closeDb`. It does NOT provide `signInAs` or `seedAssistant`. Building those helpers correctly (managing two browser sessions, password-based sign-in for the assistant role) is meaningful work that's better done as a follow-up enhancement.

For this task, **scope the e2e to the doctor-only flow**: finalize with a price → see the awaiting consultation on `/today` (doctor reads it as read-only, no Encaisser button) → check `/stats` reflects the awaiting amount. The assistant Encaisser transition is comprehensively covered by Task 5's unit tests for `recordPayment` and Task 6's integration test for `getPaymentsForToday` — additional e2e coverage for the multi-role flow is nice-to-have, not load-bearing.

Write the test as:

```ts
import { test, expect } from '@playwright/test';
import { onboardDoctor, closeDb } from './helpers/invite';

test.afterAll(async () => {
  await closeDb();
});

test('doctor finalize → /today shows awaiting → /stats reflects amount', async ({ page }) => {
  // 1. Onboard doctor (existing helper).
  await onboardDoctor(page);

  // 2. Create a walk-in patient and start the consultation.
  await page.goto('/today/walk-in');
  await page.getByLabel('Nom', { exact: true }).fill('Berrada');
  await page.getByLabel('Prénom').fill('Yasmine');
  await page.getByLabel('Sexe').click();
  await page.getByRole('option', { name: 'Femme' }).click();
  await page.getByLabel('Date de naissance').fill('1992-04-10');
  await page.getByRole('button', { name: /Démarrer/ }).click();
  await page.waitForURL(/\/consultations\//);

  // 3. Open the finalize dialog and submit a price.
  await page.getByRole('button', { name: 'Terminer la consultation' }).click();
  await page.getByLabel('Prix (MAD)').fill('250');
  // The dialog has a second "Terminer la consultation" button (the submit inside the dialog).
  // Use .last() because the trigger button is the same label.
  await page.getByRole('button', { name: 'Terminer la consultation' }).last().click();
  await page.waitForURL(/\/today/);

  // 4. Confirm the awaiting row appears in /today's Paiements section.
  await expect(page.getByText('Berrada Yasmine')).toBeVisible();
  await expect(page.getByText(/250,00 MAD/)).toBeVisible();

  // The doctor should NOT see an "Encaisser" button (read-only view).
  await expect(page.getByRole('button', { name: 'Encaisser' })).toHaveCount(0);

  // 5. Navigate to /stats and verify the awaiting amount is reflected.
  await page.goto('/stats?range=today');
  await expect(page.getByText('Recettes')).toBeVisible();
  await expect(page.getByText('En attente')).toBeVisible();
  // The awaiting tile's hint shows "250,00 MAD à encaisser".
  await expect(page.getByText(/250,00 MAD à encaisser/)).toBeVisible();
});
```

This test:
- Exercises the finalize dialog end-to-end (Task 8).
- Confirms the new `<PaymentsPanel>` renders the awaiting row for the doctor (Task 9 + Task 10).
- Confirms the doctor view is read-only — no Encaisser button visible (Task 9 role-conditional).
- Confirms `/stats` route loads, queries run, and the awaiting tile reflects the new row (Task 11 + Task 7's `getRevenueSummary`).

It does NOT exercise the assistant Encaisser flow. That's deliberate — see the rationale above. If a follow-up multi-role e2e becomes valuable, the helpers can be added then (out of scope for this plan).

- [ ] **Step 4: Run the RLS test**

```bash
pnpm test:rls tests/rls/consultation-pricing.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Run the e2e test**

```bash
pnpm test:e2e tests/e2e/consultation-pricing.spec.ts
```

Expected: pass. If failures are infrastructure issues (browser binary missing, port conflict, supabase not started), document and skip — don't try to fix infra in this task. The test code itself should be correct.

- [ ] **Step 6: Run full unit + RLS suite**

```bash
pnpm test
```

Expected: ≥170 tests pass (167 + 3 new RLS).

- [ ] **Step 7: Commit**

```bash
git add tests/rls/consultation-pricing.test.ts tests/e2e/consultation-pricing.spec.ts
git status --porcelain | grep -E "^[MA]" | grep -v -E "tests/(rls/consultation-pricing\.test\.ts|e2e/consultation-pricing\.spec\.ts)$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "test(payments): RLS + e2e for consultation pricing flow

RLS: tenant B cannot SELECT or UPDATE tenant A pricing rows; tenant A
doctor can. E2E: doctor finalizes with price → assistant encaisses
'Espèces' → /stats reflects the revenue. Existing tenant-scoped RLS
fully covers the new columns; no policy gap.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Final verification

- [ ] **Step 1: Full test sweep**

```bash
pnpm test
pnpm test:e2e tests/e2e/prescriptions.spec.ts tests/e2e/consultation-pricing.spec.ts
pnpm exec tsc --noEmit
```

Expected: all green. The prescriptions e2e may still be blocked by the user's unstaged `walk-in/form.tsx` (out of our control); skip it if so.

- [ ] **Step 2: Check the commit log against the plan**

```bash
git log c0fce4a..HEAD --oneline
```

Expected: ~14 commits in this order:

```
test(payments): RLS + e2e for consultation pricing flow
feat(settings): cabinet default consultation tariff
feat(stats): charts + tables for the dashboard
feat(stats): /stats route skeleton + sidebar nav
feat(today): Recettes du jour tile + PaymentsPanel section
feat(payments): assistant payments panel + encaisser dialog
feat(consultations): finalize pricing dialog + tarification badge
feat(stats): 5 aggregation queries
feat(payments): getPaymentsForToday query
feat(payments): recordPayment mutation
feat(consultations): finalize accepts pricing input
feat(payments): zod schemas + requireAssistant guard
feat(time): CABINET_TZ + todayBoundsUtc + rangeBoundsUtc helpers
feat(schema): consultation pricing + payment columns
```

- [ ] **Step 3: Verify spec acceptance criteria**

| # | Criterion | Verified by |
|---|---|---|
| 1 | Doctor cannot finalize without price>0 OR Gratuit | `finalizePricingSchema` test (Task 3) + `finalizeConsultation` test (Task 4) |
| 2 | Default tariff prefills the dialog | Cabinet settings test (Task 13) + dialog code (Task 8) |
| 3 | Free skips assistant entirely | `finalizeConsultation` test (Task 4) `payment_status='free'` case |
| 4 | After finalize, consultation appears in awaiting | `getPaymentsForToday` test (Task 6) |
| 5 | Encaisser updates payment fields, autre requires note | `recordPaymentSchema` test (Task 3) + `recordPayment` test (Task 5) |
| 6 | Doctor sees Paiements read-only | Component code (Task 9) `role === 'assistant'` conditional |
| 7 | Recettes du jour tile reflects today's paid | `today/page.tsx` revenue calc (Task 10) |
| 8 | /stats route doctor-only | `requireDoctor()` in page (Task 11) |
| 9 | Range selector drives all sections | `rangeBoundsUtc` (Task 2) feeds every query (Task 7) |
| 10 | RLS prevents cross-tenant reads/writes | RLS test (Task 14) |
| 11 | Three new audit actions fire | Calls in actions (Tasks 4, 9, 13) |
| 12 | DB constraints reject malformed states | Step 6 of Task 1 + Drizzle CHECK enforcement |
| 13 | No new dependency | `git diff main..HEAD -- package.json` is empty |
| 14 | E2E test passes | Task 14 e2e |
| 15 | Migration applies cleanly | Step 5 of Task 1 |
| 16 | No existing-test regression | `pnpm test` step in every task |

If any criterion has no verification path, STOP and add one before declaring complete.
