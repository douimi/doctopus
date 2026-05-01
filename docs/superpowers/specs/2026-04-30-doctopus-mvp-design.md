# Doctopus — Phase 1 MVP design

**Date:** 2026-04-30
**Status:** Approved (brainstorming complete; ready for implementation planning)
**Scope:** Phase 1 only. Phases 2 and 3 are referenced but not specified here.

---

## 1. Goal & scope

Give a Moroccan generalist doctor and their assistant(s) a single web app to run the daily cabinet workflow end-to-end: front-desk reception, day calendar, patient records, structured consultations, and printable prescriptions backed by the official Moroccan medication database.

### Phase 1 (MVP) — in scope

- Tenant onboarding via invite link (one cabinet = one doctor + N assistants).
- Authentication and role-based access (doctor, assistant).
- Patient records (demographics, allergies, chronic conditions).
- Day calendar with walk-in queue.
- Sectioned consultation editor.
- Prescriptions with typeahead over the Moroccan medication database, A4 PDF output.
- One-time + on-demand import of the DMP medication list.
- Audit log.

### Out of scope for MVP (deferred but designed-around)

- **Phase 2:** LLM consultation chatbot, billing/invoicing (CNSS/CNOPS/AMO), 2FA, patient SMS, online self-booking, hard-delete / right-of-erasure flows.
- **Phase 3:** Platform-admin UI (super-admin dashboard, subscription billing, analytics), multi-doctor cabinets, multi-language UI, multi-region deployment.

The data model and architecture are designed so that adding Phase 2/3 features does not require schema rewrites or core refactors.

---

## 2. Tenant model and roles

### Tenant model

- One **cabinet** = one **tenant**.
- Each tenant has exactly one user with `role='doctor'` (the owner) and 0..N users with `role='assistant'`. Enforced by a DB constraint.
- All patient/appointment/consultation/prescription data is scoped to a single tenant.

### Roles and permissions (MVP)

| Capability | Doctor | Assistant |
|---|---|---|
| View / edit patient demographics | ✓ | ✓ |
| View consultation notes & diagnosis | ✓ | ✗ |
| Create / edit consultation notes & diagnosis | ✓ | ✗ |
| Create / edit prescriptions | ✓ | ✗ |
| Print / re-print prescription PDF | ✓ | ✗ |
| Manage day calendar, walk-in queue | ✓ | ✓ |
| Invite / remove assistants | ✓ | ✗ |
| Edit cabinet settings (header, signature, stamp) | ✓ | ✗ |
| View audit log for the tenant | ✓ | ✗ |

### Platform admin (the operator selling the product)

Not a role inside any tenant. In MVP, the platform admin operates via:

- A CLI script to generate tenant-owner invite links.
- A CLI script to import / refresh the DMP medication database.
- Direct DB access via Supabase service role for support cases.

A proper platform-admin UI is Phase 3.

---

## 3. Architecture

```
[Browser]
   │  HTTPS, Next.js client
   ▼
[Vercel: Next.js 15 App Router]
   ├── Server Components (read paths)
   ├── Server Actions (write paths)
   └── Route Handlers (PDF generation, cron)
   │
   ▼
[Supabase project — EU region]
   ├── Postgres (data) — Drizzle ORM
   ├── Auth (email + password) — @supabase/ssr
   ├── Storage (cabinet logo, doctor signature, doctor stamp)
   └── Row-Level Security on every tenant-scoped table
```

### Multi-tenant isolation — defense in depth

Every tenant-scoped table has a `tenant_id uuid NOT NULL` column (FK to `tenants.id`). Tenant isolation is enforced in **two independent layers**:

1. **Application layer (primary).** Every Drizzle query in a request handler runs through a `withTenantTx(req, fn)` helper that:
   - Opens a transaction on the `db_user` (RLS-enforced) connection.
   - Runs `SET LOCAL app.tenant_id = '<uuid>'` using the `tenant_id` resolved server-side from the user's session.
   - Executes the caller's queries.
   - Commits or rolls back.
   - The current `tenant_id` is **never** accepted from the client; it is read from the session via `user_profiles`.

2. **Database layer (safety net).** Every tenant-scoped table has an RLS policy `USING (tenant_id = current_setting('app.tenant_id')::uuid)`. If application code forgets a `WHERE`, RLS still blocks the read/write.

A separate **`db_admin`** connection (Supabase service role) bypasses RLS and is used **only** by the import script, the invite-creation script, and cron-protected Route Handlers. Never used inside per-request code paths.

A lint rule enforces that direct `db.select(...)` outside `withTenantTx` is forbidden in `app/(authenticated)/**`.

### Auth & sessions

- Supabase Auth (email + password). Min length 12, leaked-password check enabled.
- `@supabase/ssr` for cookie-based auth in App Router.
- `middleware.ts` loads `user_profiles` on every authenticated request and rejects requests where `user_profiles.is_active = false` or `tenants.status = 'suspended'`.

### Shared (non-tenant) data

Two tables are global, not tenant-scoped:

- `medications` — read-only for doctors, written only by the import script.
- `tenant_invites` — readable/writable only by the service role.

Their RLS policies allow `SELECT` for any authenticated user (`medications`) and deny everything for the user role (`tenant_invites`).

### Background jobs

- **Vercel Cron** for periodic tasks (e.g., expire stale `tenant_invites`).
- Each cron route handler is protected by a `CRON_SECRET` header check. No separate worker process in MVP.

---

## 4. Data model

All ids are `uuid`. Every tenant-scoped table has `tenant_id uuid NOT NULL`, `created_at timestamptz`, `updated_at timestamptz` (omitted below for brevity).

### Tenancy & users

- **`tenants`** — `id`, `name`, `address`, `phone`, `prescription_header_html`, `signature_url`, `stamp_url`, `rpm_number`, `cnom_number`, `status` (`active` / `suspended`).
- **`user_profiles`** — `id` (= Supabase auth uid), `tenant_id`, `role` (`doctor` / `assistant`), `full_name`, `email`, `phone`, `is_active`. DB constraint: at most one row with `role='doctor'` per `tenant_id`.
- **`tenant_invites`** — *global*. `id`, `token_hash`, `kind` (`tenant_owner` / `assistant`), `tenant_id` (null for owner invites), `email_hint`, `expires_at`, `consumed_at`, `created_by` (nullable; null for platform admin via service role).

### Patients

- **`patients`** — `id`, `tenant_id`, `first_name`, `last_name`, `gender` (`m` / `f`), `date_of_birth`, `phone`, `cin` (nullable), `coverage_type` (`cnss` / `cnops` / `amo` / `ramed` / `mutuelle` / `none` / `other`, nullable), `coverage_id` (nullable), `address` (nullable), `notes` (nullable), `is_archived`.
- **`patient_allergies`** — `id`, `tenant_id`, `patient_id`, `label`.
- **`patient_chronic_conditions`** — `id`, `tenant_id`, `patient_id`, `label`.

### Appointments & queue

- **`appointments`** — `id`, `tenant_id`, `patient_id`, `scheduled_at` (nullable for walk-ins), `arrived_at` (nullable), `started_at` (nullable), `ended_at` (nullable), `status` (`scheduled` / `waiting` / `in_consultation` / `done` / `cancelled` / `no_show`), `kind` (`scheduled` / `walkin`), `reason` (short text, nullable), `created_by`.

Status transitions drive the day view:

```
scheduled ──(arrive)──▶ waiting ──(open consultation)──▶ in_consultation ──(finalize)──▶ done
walkin    ──┘
scheduled ──(cancel)──▶ cancelled
scheduled ──(end of day, not arrived)──▶ no_show
```

### Consultations

- **`consultations`** — `id`, `tenant_id`, `appointment_id`, `patient_id`, `doctor_id`, `consulted_at`, `motif`, `history_notes`, `exam_notes`, `diagnosis`, `follow_up_notes`, `is_finalized`.
- **`consultation_vitals`** — `id`, `consultation_id`, `tenant_id`, `weight_kg`, `height_cm`, `temperature_c`, `bp_systolic`, `bp_diastolic`, `heart_rate`, `notes`. (1:1 with consultation; separate table for clean nulls.)

### Prescriptions

- **`prescriptions`** — `id`, `tenant_id`, `consultation_id`, `patient_id`, `doctor_id`, `issued_at`, `pdf_storage_path` (nullable), `notes` (free text below items, nullable).
- **`prescription_items`** — `id`, `tenant_id`, `prescription_id`, `position` (int, ordering), `medication_id` (nullable for free-text items), `medication_label_snapshot` (denormalized at write time), `posologie`, `duration`, `quantity` (nullable), `instructions` (nullable).

### Moroccan medication database (global, read-only for doctors)

- **`medications`** — `id`, `dmp_code` (nullable), `nom_commercial`, `dci`, `dosage`, `forme`, `presentation`, `classe_therapeutique`, `laboratoire`, `ppv` (numeric), `is_active`, `imported_at`, `import_batch_id`, `metadata jsonb` (for ATC code, `remboursable` flag, etc., usable later without schema change).
- **`medication_imports`** — `id`, `imported_at`, `imported_by`, `source_file_name`, `row_count_inserted`, `row_count_updated`, `row_count_deactivated`, `row_count_skipped`, `notes`.

Search infrastructure on `medications`:

- Generated `tsvector` column `search_vector` covering `nom_commercial || ' ' || dci`, French config.
- GIN index on `search_vector`.
- `pg_trgm` index on `nom_commercial` (handles typos / accent variants).

### Audit log

- **`audit_log`** — `id`, `tenant_id`, `actor_user_id`, `action` (e.g., `consultation.create`, `prescription.print`, `auth.sign_in_failed`), `entity_type`, `entity_id`, `at`, `metadata jsonb`. Append-only (no UPDATE/DELETE policy at DB level except by service role).

---

## 5. Key user flows

### A. Tenant onboarding (invite link)

1. Platform admin runs `pnpm tsx scripts/invite-doctor.ts --email dr@example.ma`. The script (using the service role) inserts a `tenant_invites` row with `kind='tenant_owner'` and prints a URL `https://app.doctopus.ma/invite/<token>`.
2. Doctor opens the link → `/invite/[token]` validates the token (not expired, not consumed).
3. Doctor fills the onboarding form: `nom`, `prénom`, `nom du cabinet`, `adresse`, `téléphone`, `mot de passe`.
4. Server Action: create Supabase auth user → create `tenants` row → create `user_profiles` (role=`doctor`) → mark invite consumed → sign in.
5. Redirect to `/onboarding/cabinet` for optional logo / signature / stamp upload.
6. Doctor invites assistants from `/settings/team`. Same flow on the assistant side, but no cabinet creation step.

### B. Daily front-desk (assistant view)

Home screen for the assistant is `/today`, with three panels:

- **Schedule** — appointments for today in time order, status chips.
- **Waiting room** — patients with status `waiting`, ordered by `arrived_at`.
- **Walk-in button** — opens patient search ("nom / prénom / téléphone / CIN"); choose existing patient or create new; adds to Waiting Room.

Assistant actions: book appointment, mark patient arrived, edit patient demographics, cancel/reschedule. Assistant **cannot** open the consultation editor.

### C. Consultation (doctor view)

Doctor's home is also `/today`. Each waiting patient has a **"Commencer la consultation"** button. Clicking it:

1. Creates a `consultations` row, sets the appointment status to `in_consultation`, sets `started_at`.
2. Opens `/consultations/[id]` — sectioned editor: **Motif → Antécédents/historique → Examen clinique → Constantes → Diagnostic → Traitement → Suite/follow-up**. Each section is collapsible; doctor skips irrelevant ones.
3. Auto-saves every 2s as draft (`is_finalized=false`).
4. Patient header always visible: name, age, allergy chips (red badge), chronic-conditions chips, link to past consultations.
5. **"Terminer la consultation"** → sets `is_finalized=true`, `ended_at`, appointment status to `done`. Redirects to `/today`.

### D. Prescription

Inside the consultation, the **Traitement** section has a prescription editor:

1. **"Ajouter un médicament"** opens a typeahead over `medications` (matches `nom_commercial` OR `dci`, fuzzy, debounced Server Action). Result rows show: nom commercial, dosage, forme, DCI, laboratoire.
2. Selecting a result inserts a `prescription_items` row with `medication_label_snapshot` populated. Doctor fills `posologie` (e.g., "1 cp matin et soir"), `duration` (e.g., "7 jours"), optional `quantity` and `instructions`.
3. **"Médicament libre"** for magistral preparations or items not in the DB — `medication_id` stays null, doctor types the label.
4. Drag to reorder items (updates `position`).
5. **"Imprimer l'ordonnance"** → `GET /api/prescriptions/[id]/pdf` (Node runtime) renders an A4 PDF via `@react-pdf/renderer` with cabinet header, patient block, dated lines, signature/stamp images, `rpm_number` / `cnom_number`. The PDF is streamed to the browser; storage path is also written to `prescriptions.pdf_storage_path`. Doctor prints, signs, hands to patient.

### E. Past consultations

From the patient page, the doctor sees a chronological list of finalized consultations and prescriptions. Each entry is clickable for a read-only detail view. Old prescriptions render via their `medication_label_snapshot`, so subsequent edits to `medications` don't change historical PDFs.

---

## 6. Moroccan medication DB import

### Source

The DMP (Direction du Médicament et de la Pharmacie) publishes "Base de données des médicaments commercialisés au Maroc" as Excel. Columns commonly present: nom de spécialité (commercial), DCI, dosage, forme, présentation, classe thérapeutique, laboratoire, PPV, code ATC, statut, date d'AMM. Layout drifts between releases.

### Import script (`scripts/import-medications.ts`)

Run by the platform admin with the Supabase service role.

1. Takes a path to an `.xlsx` file as input.
2. Inserts a `medication_imports` row first; everything imported is tagged with that `import_batch_id`.
3. Streams the sheet via `xlsx`, normalizes column headers using a maintained column-mapping config (handles accents/typos).
4. Per row: trim, normalize casing, parse PPV as numeric, drop rows where `nom_commercial` or `dci` is empty (counted into `row_count_skipped`).
5. **Upsert** keyed on `(nom_commercial, dosage, forme, laboratoire)` — the DMP doesn't provide a stable id, so this composite key is the best available. `dmp_code` stored when present, never relied on as a key.
6. Rows present in DB but absent from this batch and last seen >90 days ago are flagged `is_active=false` (soft delete — historical prescriptions still resolve).
7. Prints a summary and writes the same summary to `medication_imports.notes`.

### Refresh cadence

Manual, on demand, by the platform admin. We do **not** automate the download; the DMP source page changes layout periodically and silent breakage is worse than a manual refresh.

### Search ranking

`SELECT … FROM medications WHERE search_vector @@ plainto_tsquery('french', $1) OR nom_commercial % $1 ORDER BY ts_rank(search_vector, plainto_tsquery('french', $1)) + similarity(nom_commercial, $1) DESC LIMIT 20`. Adjustable in code; we expect to iterate.

### Snapshotting

When a `prescription_items` row is created, `medication_label_snapshot` is populated with `nom_commercial + ' ' + dosage + ' ' + forme`. PDFs and historical views always use the snapshot.

### Explicit MVP simplifications (deferred to Phase 2)

- No drug-interaction checks.
- No posologie suggestions.
- No `remboursable` flag surfacing in the UI (column may exist in `metadata` but isn't used).

---

## 7. Tech stack

### Runtime & framework

- **Next.js 15** (App Router, RSC, Server Actions), TypeScript strict mode, Node 20.
- **Vercel** for hosting. DB-touching routes use Node runtime (Edge runtime not used in MVP).

### Data layer

- **Supabase Postgres**, EU region (`eu-west-3` Paris or equivalent). Free tier for MVP.
- **Drizzle ORM** + `drizzle-kit` for migrations checked into git. Schema in `db/schema/*.ts` is the source of truth.
- **`@supabase/ssr`** for cookie-based auth.

### Frontend

- **Tailwind CSS v4** + **shadcn/ui** components.
- **TanStack Query** only where the UX requires client-side data (typeahead, optimistic appointment updates). Most reads are RSC.
- **react-hook-form** + **zod**. The same zod schemas validate Server Action inputs server-side.

### PDFs

- **`@react-pdf/renderer`** in a Node-runtime Route Handler.
- Doctor's signature/stamp pulled from Supabase Storage at render time via short-lived signed URLs.

### File storage

- **Supabase Storage** for cabinet logo, doctor signature, doctor stamp. Optionally archived prescription PDFs.

### Email

- **Resend** free tier (3 000 emails/month) for invite emails. One transactional template per invite kind.

### Background jobs

- **Vercel Cron** for `expire-invites` (daily). Route handler protected by a `CRON_SECRET` header.

### Observability

- **Sentry** (free dev tier) for errors, with a `beforeSend` filter that scrubs known sensitive fields and drops payloads matching CIN/phone patterns.
- Application logs via Vercel logs in MVP. Structured logger optional.

### Project layout

```
app/
  (public)/
    invite/[token]/
    sign-in/
  (authenticated)/
    today/
    patients/
    patients/[id]/
    consultations/[id]/
    settings/team/
    settings/cabinet/
    settings/audit/
  api/
    prescriptions/[id]/pdf/route.ts
    cron/expire-invites/route.ts
  middleware.ts
db/
  schema/
  migrations/
  client.ts                # db_user + db_admin factories
  with-tenant.ts           # withTenantTx helper
lib/
  auth/
  medications/
scripts/
  invite-doctor.ts
  import-medications.ts
docs/
  superpowers/specs/
  runbooks/
    restore.md
```

### Local dev

- Supabase CLI (`supabase start`) for offline Postgres + Auth + Storage.
- `.env.local`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`, `DATABASE_URL` (pooler), `DATABASE_URL_DIRECT` (migrations).

### Testing

- **Vitest** for unit tests (zod schemas, ranking function, helpers).
- **Playwright** for E2E covering the four MVP user flows.
- **RLS isolation tests** (non-negotiable): seed two tenants, then assert `db_user` connection scoped to tenant A cannot see tenant B's rows under any query — direct selects, joins, manipulated `tenant_id` in inserts, etc.

---

## 8. Security & compliance

### In MVP

- **Loi 09-08 (Moroccan personal data protection).** Patient health data is sensitive category. We:
  - Keep all data in an EU region close to Morocco.
  - Use no third-party scripts on authenticated pages — no analytics, no chat widgets, no marketing tags.
  - Surface a privacy notice on doctor-onboarding mentioning that the **doctor is data controller**, the platform is processor, and the **CNDP declaration is the doctor's responsibility**.
- **Encryption.** Postgres at rest (Supabase default), HTTPS in transit, signed/short-lived URLs for private Storage objects. No app-side field-level encryption in MVP.
- **Tenant isolation.** Application-layer `withTenantTx` + Postgres RLS, plus the RLS isolation test suite. Treated as P0.
- **Auth.** Email + password, min length 12, leaked-password check enabled. Supabase + Vercel default rate limiting.
- **Audit log.** Append-only `audit_log` for: consultation create/finalize, prescription create/print, patient create/edit, role/invite changes, sign-in success/failure. Doctor can view at `/settings/audit`.
- **Backups.** Supabase free-tier daily backups, 7-day retention. Restore procedure documented in `docs/runbooks/restore.md` and tested once before launch.
- **Secrets.** `SUPABASE_SERVICE_ROLE` is server-only; lint rule bans references outside `db/client.ts` and `scripts/**`.
- **Input validation.** All Server Action inputs validated with zod. Drizzle parameterizes; raw `sql\`\`` templates are reviewed.

### Consciously deferred

| Item | Reason for deferral | Phase |
|---|---|---|
| 2FA for doctor accounts | Tenants small (1 doctor + few assistants), invite-only — acceptable risk for MVP | 2 |
| Field-level access control beyond doctor/assistant split | Role split already excludes consultation/prescription writes from assistants | 2+ |
| Hard-delete & right-of-erasure flows | Soft-delete (`is_archived`) covers MVP need; manual purge via runbook for now | 2 |
| Penetration test | Out of scope for the build itself; recommended before second tenant | — |
| CNDP declaration tooling | Doctor's responsibility; we only document this | — |

### Things we will not do, ever

- No telemetry on patient data. Sentry breadcrumbs and logs must never include patient names, CIN, phone, diagnoses, or prescription contents.
- No third-party scripts on authenticated pages.

### Risks accepted in MVP

- Single-region deployment (Supabase EU). If the region has an outage, the app is down.
- Free-tier limits (Supabase pauses after 7 days of inactivity). We move to Supabase Pro before the second paying tenant.

---

## 9. Phase plan summary

| Phase | Theme | Notable items |
|---|---|---|
| **1 (this spec)** | Daily-practice MVP | Tenancy, patients, calendar+walk-ins, sectioned consultations, prescriptions with DMP DB, audit log |
| 2 | Differentiation & monetization-readiness | LLM consultation chatbot, billing/invoicing, 2FA, hard-delete flows, patient SMS, drug interactions |
| 3 | Platform | Super-admin UI, subscription billing for tenants, multi-doctor cabinets, multi-language UI, multi-region |

The Phase 1 data model accommodates Phase 2 additions without schema rewrites:

- LLM chatbot consumes structured `consultations` + `prescription_items` directly.
- Billing adds a `billing_documents` table referencing existing rows.
- Multi-doctor cabinets relax the "one doctor per tenant" constraint; `consultations.doctor_id` already exists.

---

## 10. Open items for the implementation plan to resolve

- Exact column-mapping config for the DMP Excel — depends on the actual file we receive. The script is built to be config-driven from day one.
- Choice of Supabase region — `eu-west-3` (Paris) is the working assumption; confirm at provisioning time.
- Visual design system — shadcn defaults are the starting point; brand polish is post-MVP.
- French micro-copy ownership — the doctor will likely catch awkward phrasings; we should expect copy iteration during early use.
