# Phase 2.B (revised) — Platform Admin Web UI Design

**Date:** 2026-05-03
**Status:** Approved (brainstorming complete; ready for implementation planning)
**Scope:** Replace the four admin CLI scripts from Plan 2.A with a web-based admin dashboard. Other Phase 2 sub-plans (2.C 2FA + hard-delete, 2.D drug interactions) are referenced but not specified here. **Patient SMS, billing/CNSS/CNOPS/AMO, and tenant self-signup are explicitly dropped.**

---

## 1. Goal & scope

Give the platform owner (you) a web dashboard at `/admin` to operate Doctopus day-to-day without SSH'ing into the CLI: see all cabinets at a glance, top up credits, switch models, suspend/reactivate tenants, generate doctor invites, and watch revenue vs. cost.

### 1.1 In scope

- **Admin auth**: env-allowlist (`SUPER_ADMIN_EMAILS`) on top of existing Supabase auth. Smart-redirect from `/sign-in`. Admin route guard `requireAdmin()` parallel to `requireDoctor()`.
- **Tenants list** at `/admin/tenants` — sortable/filterable table.
- **Tenant detail** at `/admin/tenants/[id]` — info, credit ledger history, recent usage, action panels (grant credits, set provider/model, enable/disable chatbot, suspend/reactivate).
- **Invite generation** at `/admin/invites` — create tenant-owner invites; list pending/consumed/expired/revoked invites.
- **Global usage report** at `/admin` (default landing) — revenue/cost/margin totals, per-provider breakdown, last-30-days time-series via Recharts.
- **Admin action audit**: every state-changing admin action writes one row to `audit_log` and is visible in the affected doctor's `/settings/audit`.
- **Shared invite helper** so CLI and UI both call the same code path.

### 1.2 Out of scope (explicit deferrals)

- Multi-admin invite/management UI — env-allowlist is the ACL for now.
- Bulk operations (bulk grant, bulk suspend, etc.).
- Tenant deletion / hard-delete (Plan 2.C right-of-erasure).
- Drug interactions (Plan 2.D), 2FA (Plan 2.C).
- Subdomain split (`admin.doctopus.ma`) — admin lives at `/admin/*` on the same app.
- Sending invite emails to the doctor (admin copies the URL manually for now).
- Date-range picker on the global report — fixed 30-day window in v1.
- Pagination beyond `LIMIT N` on heavy lists — "next page" UI is a future plan.

### 1.3 Non-goals

- The doctor-facing app gets ZERO new features. No "contact support" CTA from `/today`.
- No new doctor write paths.
- Admin operations reuse existing helpers (`grantCredits`, `createOwnerInvite`) where possible. New helpers only for state changes the CLI didn't cover (model change, chatbot toggle, suspension toggle, invite revoke).

---

## 2. Auth model & route structure

### 2.1 Single sign-in page, smart redirect

The existing `/sign-in` page stays the user-facing entry. The Server Action (`signInAction`) is extended:

1. `supabase.auth.signInWithPassword(email, password)` as today.
2. On success: read `env().SUPER_ADMIN_EMAILS` (comma-separated, normalized to lowercase).
3. If user's email is in the allowlist → redirect to `/admin` (or `?next=` target if it starts with `/admin/`).
4. Otherwise → existing flow (load `user_profiles`, redirect to `/today`).

This means a super admin and a doctor share the same email-and-password experience with no branching UI.

### 2.2 New env var

```
SUPER_ADMIN_EMAILS=you@example.com,cofounder@example.com
```

Optional in `lib/env.ts` (uses `z.string().optional()`). Empty/unset = no admins (admin routes return null from `loadAdminSession` and redirect away).

### 2.3 Admin user lifecycle

Super admins exist in `auth.users` (Supabase) only; they have NO `user_profiles` row (which is intentionally tenant-scoped). New helper script:

```bash
pnpm admin:create-super-admin --email you@example.com
```

This calls Supabase's admin client `auth.admin.createUser({ email, password, email_confirm: true })` with a generated random password and prints it. The admin signs in once and changes their password through Supabase's account UI (or a future "change password" page).

### 2.4 New session helpers (`lib/auth/admin.ts`)

```ts
export type AdminSession = { userId: string; email: string };

export function isAdminEmail(email: string): boolean;
export async function loadAdminSession(): Promise<AdminSession | null>;
export async function requireAdmin(): Promise<AdminSession>; // redirects to /sign-in?next=/admin if not
```

### 2.5 Route structure

```
app/
  (admin)/
    admin/
      layout.tsx              # requires admin; renders <AdminShell>
      page.tsx                # global usage report (default landing)
      tenants/
        page.tsx              # tenants list
        [id]/
          page.tsx            # tenant detail
          actions.ts          # grant-credits, set-model, toggle-chatbot, toggle-suspension
      invites/
        page.tsx              # list + create form
        actions.ts            # createInviteAction, revokeInviteAction
```

`(admin)` is a route group (no URL prefix) sharing `<AdminShell>`. The admin pages live under `/admin/*`.

### 2.6 Middleware

Existing `middleware.ts` redirects unauthenticated users from `/today`, `/settings`, `/sign-out`. Extend the matcher to include `/admin/*`. Authorization (allowlist match) stays in `requireAdmin()` server-side — middleware only enforces "must be logged in".

### 2.7 Security boundaries

- Admin mutations only via Server Actions in `app/(admin)/admin/.../actions.ts`. Each one calls `requireAdmin()` first.
- Admin reads tenant data via `dbAdmin()` (bypasses RLS — admins see ALL tenants).
- Doctors and assistants are untouched: their session loaders keep using `requireSession`/`requireDoctor`, which still require a `user_profiles` row.
- A super admin who lands on `/today` (manually typing the URL) gets a redirect to `/sign-in` because `loadSession()` returns null when no `user_profiles` row exists for the user.

---

## 3. Data model & audit

### 3.1 Tenant denormalization for the list view

The tenants table already has everything we need (`status`, `chatbot_*`, `created_at`). The list query joins `user_profiles` (to show the doctor's email) and aggregates `chatbot_usage` (last AI use). No schema change.

### 3.2 Audit log — new action types only

The `audit_log` table from Plan 1.E supports arbitrary action strings + tenant-scoped writes. Extend the `AuditAction` TypeScript union with admin variants. **No DB migration.**

```ts
// added to the existing union in lib/audit/record.ts
| 'admin.tenant.grant_credits'
| 'admin.tenant.set_model'
| 'admin.tenant.enable_chatbot'
| 'admin.tenant.disable_chatbot'
| 'admin.tenant.suspend'
| 'admin.tenant.reactivate'
| 'admin.invite.create'
| 'admin.invite.revoke'
```

Each admin action calls `recordAudit({ tenantId: <affected tenant>, actorUserId: adminSession.userId, ...})`. The `metadata` JSON captures the change — for example, `set_model` records `{ from: { provider, model }, to: { provider, model } }`.

**Doctor visibility:** the existing `/settings/audit` page already shows all rows for the tenant. So when an admin grants credits, the doctor sees it in their journal — by design, transparent.

**Action labels.** Add French labels for the 8 new actions in the audit page's `ACTION_LABEL` map:

| Key | Label |
|---|---|
| `admin.tenant.grant_credits` | Crédits IA accordés (admin) |
| `admin.tenant.set_model` | Modèle IA modifié (admin) |
| `admin.tenant.enable_chatbot` | Assistant IA activé (admin) |
| `admin.tenant.disable_chatbot` | Assistant IA désactivé (admin) |
| `admin.tenant.suspend` | Cabinet suspendu (admin) |
| `admin.tenant.reactivate` | Cabinet réactivé (admin) |
| `admin.invite.create` | Invitation médecin créée (admin) |
| `admin.invite.revoke` | Invitation révoquée (admin) |

For `admin.invite.create`, `tenant_id` is null at the moment of creation (no tenant exists yet). We skip writing to `audit_log` for this case to avoid a NOT-NULL constraint error and instead log to console/Sentry. After invite consumption, the standard `tenant.invite_consumed` row is written by Plan 1.A's existing flow, so the trail is intact.

### 3.3 Invite revocation — one new column

Soft revoke so the audit trail stays intact:

```ts
// db/schema/invites.ts — addition
revokedAt: timestamp('revoked_at', { withTimezone: true }),
```

Drizzle migration generates the ALTER. The `lookupInvite` helper from Plan 1.A is updated to treat `revoked_at IS NOT NULL` as invalid (returns `{ ok: false, reason: 'consumed' }` for simplicity — same UX message).

RLS unchanged (invites stay service-role-only for writes).

### 3.4 No new tables

Everything else uses existing tables:
- Tenants list reads `tenants` + joins `user_profiles` + aggregates `chatbot_usage`.
- Tenant detail reads `tenants` + `chatbot_credit_ledger` + `chatbot_usage` + `audit_log`.
- Invites page reads `tenant_invites`.
- Global usage report aggregates `chatbot_usage` and `chatbot_credit_ledger`.

### 3.5 Concurrency / consistency

Admin write paths reuse existing helpers:
- Grant credits → `grantCredits()` from `lib/chatbot/credits.ts` (already atomic).
- Set provider/model → direct `dbAdmin().update(tenants)` with `updatedAt` bump.
- Suspend/reactivate → direct update setting `status='suspended'|'active'`. Existing middleware kicks suspended-tenant users out on next request.
- Enable/disable chatbot → direct update on `chatbot_enabled`.
- Revoke invite → direct update setting `revoked_at = now()`.

Each write completes in one transaction; cross-resource transactions are not needed.

---

## 4. Admin UI pages

### 4.1 `<AdminShell>` and the admin layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Doctopus [ADMIN]   Tableau de bord  Cabinets  Invitations        │
│                                                  you@example.com │
└──────────────────────────────────────────────────────────────────┘
```

Orange "ADMIN" badge next to the logo + `bg-orange-50` header tint as a warning paint, so an admin who's also signed into a doctor account in another tab can't get confused. Sign-out works the same way (POST `/sign-out`).

The layout is `app/(admin)/admin/layout.tsx`. It calls `requireAdmin()` and renders `<AdminShell>` around the page content.

### 4.2 `/admin` — global usage report (default landing)

**Top: four stat cards.**

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ 12          │  │ 547         │  │ $14.30      │  │ 2 735 MAD   │
│ Cabinets    │  │ Crédits     │  │ Coût IA     │  │ Marge       │
│ actifs      │  │ consommés   │  │ estimé      │  │ estimée     │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
                  (30 derniers jours)
```

**Below: Recharts area chart.** Last-30-days credits-consumed-per-day, with an overlaid line for cumulative provider cost in microUSD-converted-to-MAD.

**Below: per-provider breakdown table** — provider, # tenants, credits this month, tokens in/out, cost USD, revenue MAD, margin MAD/%.

All numbers come from a single Server Component that aggregates `chatbot_usage` + `chatbot_credit_ledger` rows. The "30 days" window is hardcoded in v1.

### 4.3 `/admin/tenants` — tenants list

A single sortable/filterable table. Default sort: most-recent-AI-use first (puts active cabinets at the top).

| Cabinet | Statut | Médecin | Assistant IA | Modèle | Crédits | Dernière IA |
|---|---|---|---|---|---|---|
| Cabinet Dr. Bennani | ● actif | dr@ben.ma | ✓ activé | claude-haiku-4-5 | ~46 | il y a 2h |
| Cabinet Dr. Tazi | ● suspendu | dr@tazi.ma | ✗ | — | 0 | jamais |

A search input filters by cabinet name or doctor email (server-side — `?q=...` query string, RSC re-renders). A status filter chip set: `Tous` / `Actifs` / `Suspendus`.

Click a row → `/admin/tenants/[id]`.

A "Créer une invitation" button in the page header links to `/admin/invites`.

### 4.4 `/admin/tenants/[id]` — tenant detail

Layout: a 2-column split.

**Left column (state + history):**

- **Cabinet info card** — name, address, phone, RPM/CNOM, doctor name + email, assistant emails, created date, status chip.
- **Credit ledger table** — last 50 entries with timestamp, change (+100 or −1), reason, granted_by, notes. Newest first.
- **Recent AI usage** — last 20 rows from `chatbot_usage`: timestamp, consultation id (truncated), provider, model, tokens in/out, estimated cost.
- **Admin audit** — last 20 rows from `audit_log` filtered to admin actions (`action LIKE 'admin.%'`).

**Right column (actions):**

- **Grant credits** — form: number of consultations + optional note + Submit. Calls `grantCredits()`. Records audit row.
- **Set provider / model** — two `Select`s. Save button disabled until something changed. Records audit row with `{ from, to }`.
- **Toggle chatbot** — single button: "Activer" or "Désactiver". Records audit row.
- **Toggle suspension** — single button: "Suspendre" or "Réactiver". Records audit row.

Each action panel is a single Server Action. Validation in zod. The page revalidates after each action.

### 4.5 `/admin/invites` — invite management

Top: a small card with one input ("Email du médecin") + Create button. Uses the shared `createOwnerInvite()` helper. The invite URL is shown in a confirmation panel right after creation (admin copies it manually).

Below: a table of all invites — token-hash prefix, kind, email hint, created_at, expires_at, status (`pending` / `consumed` / `expired` / `revoked`), tenant name (for assistant invites or consumed owner invites), action menu (`Copier l'URL` for the just-created invite, `Révoquer` for pending invites).

### 4.6 Empty states + errors

- No tenants → big card: "Aucun cabinet. Créez une invitation médecin pour commencer." with a button to `/admin/invites`.
- No usage → report shows zeros with a note "Pas encore d'utilisation IA ce mois-ci."
- No invites → invites page shows just the create form.

Server Action errors surface inline next to the form that triggered them.

---

## 5. Tech stack & implementation notes

### 5.1 Dependencies (new)

| Package | Why |
|---|---|
| `recharts` | Lightweight charting for the global usage report (area + line). |
| `date-fns` | Pinned explicitly for daily bucketing of usage rows. |

No other new deps.

### 5.2 Env additions

```
SUPER_ADMIN_EMAILS=
```

Optional in `lib/env.ts`. Empty/unset = admin routes are effectively closed.

### 5.3 Auth helpers (`lib/auth/admin.ts`)

`isAdminEmail(email)` (sync, pure), `loadAdminSession()` (async, returns null when not admin), `requireAdmin()` (async, redirects when not admin).

### 5.4 Sign-in smart redirect

Modify `signInAction` in `app/(public)/sign-in/actions.ts`. After Supabase auth succeeds, before the existing `/today` redirect:

```ts
if (data.user?.email && isAdminEmail(data.user.email)) {
  await recordAuditUnscoped('auth.sign_in_success', { email: data.user.email, kind: 'admin' });
  redirect(parsed.data.next?.startsWith('/admin') ? parsed.data.next : '/admin');
}
```

The doctor flow runs only if the email is NOT in the allowlist.

### 5.5 Middleware

Add `/admin` to the existing `requiresAuth` path check in `lib/supabase/middleware.ts`.

### 5.6 Shared invite helper (`lib/invites/admin.ts`)

```ts
export async function createOwnerInvite(
  email: string,
  expiresInDays: number,
  createdBy: string,
): Promise<{ url: string; tokenHash: string; expiresAt: Date }>;
```

Both `scripts/invite-doctor.ts` (Plan 1.A CLI) and the new `/admin/invites/actions.ts` Server Action call this. The CLI script becomes a thin wrapper. The Server Action wraps the call with `recordAudit('admin.invite.create', ...)` (skipped per Section 3.2 since tenant_id is null at creation; logged to Sentry/console instead).

### 5.7 Aggregations (`lib/admin/queries.ts`)

```ts
getGlobalUsageReport(days = 30)
listTenantsForAdmin({ q?, status?, limit? })
getTenantDetail(tenantId)
listInvites({ limit? })
```

All use `dbAdmin()` (no RLS — admins see everything). Heavy aggregations push down to SQL (`SUM`, `COUNT`, `date_trunc`).

### 5.8 Server Actions

```
app/(admin)/admin/tenants/[id]/actions.ts
  adminGrantCreditsAction(formData)
  adminSetModelAction(formData)
  adminToggleChatbotAction(formData)
  adminToggleSuspensionAction(formData)

app/(admin)/admin/invites/actions.ts
  adminCreateInviteAction(formData)
  adminRevokeInviteAction(formData)
```

Each calls `requireAdmin()` first, validates input with zod, runs the operation, records audit, then `revalidatePath('/admin')` and the specific page path.

### 5.9 `<AdminShell>`

Server component with the orange-tinted header described in Section 4.1.

### 5.10 Testing strategy

| Layer | Test |
|---|---|
| `isAdminEmail` | Vitest: case-insensitive, trims whitespace, handles empty allowlist |
| `loadAdminSession` | Vitest: returns null when not in allowlist, returns session when in |
| `getGlobalUsageReport` | Vitest with seeded usage rows: totals match the math |
| `listTenantsForAdmin` | Vitest with seeded tenants: filter by name, by status |
| Admin Server Actions | Vitest: each action requires admin, writes audit row, mutates state |
| `createOwnerInvite` | Vitest: roundtrip (call → look up by hash → URL valid) |
| E2E | Playwright with admin email in env: log in → land on `/admin` → grant 10 credits in tenant detail → balance updates; revoke an invite → status changes |

### 5.11 Plan slicing

This is **Plan 2.B (revised)** — admin web UI. Estimated **20–25 tasks**. End state: admin signs in via the shared `/sign-in` page, lands on `/admin` with revenue/cost/margin dashboard; navigates to tenants list, into a tenant detail; grants credits, switches model, toggles chatbot, suspends/reactivates; creates a doctor invite from the UI; every state change writes an audit row visible to the affected doctor's `/settings/audit`.

---

## 6. Open items handed to the implementation plan

- **Default page size** for the credit ledger / usage tables on tenant detail — set to 50 / 20 respectively in v1; pagination is a future plan.
- **Invite expiry default** — keep 7 days (matches CLI default).
- **MAD per credit / USD-MAD rate** — already constants in `lib/chatbot/pricing.ts`; admin queries reuse them.
- **Assistant invites in `/admin/invites`** — the page lists both kinds (`tenant_owner` and `assistant`), but creation in the admin UI only supports `tenant_owner` (assistant invites stay generated by the doctor on `/settings/team`).
