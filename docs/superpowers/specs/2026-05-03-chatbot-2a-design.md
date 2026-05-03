# Phase 2.A — LLM Consultation Chatbot (platform-managed credits) Design

**Date:** 2026-05-03
**Status:** Approved (brainstorming complete; ready for implementation planning)
**Scope:** Phase 2.A only. Phases 2.B (billing/CNSS), 2.C (2FA + hard-delete), 2.D (drug interactions + SMS) are referenced but not specified here.

---

## 1. Goal & scope

Add a contextual AI assistant beside the consultation editor so a Moroccan generalist can ask clinical questions ("What's the typical dose of ciprofloxacine for adult cystitis given this patient's allergies?") and get streaming answers grounded in the patient's structured data, without leaving the consultation flow. Doctopus owns the LLM provider relationship; doctors consume packs of "AI-assisted consultations" granted by the platform admin.

### In scope (this design)

- Right-side panel in `/consultations/[id]` with multi-turn streaming chat
- **Platform-managed** LLM keys (Anthropic / OpenAI / Mistral) via env vars; per-tenant model assignment by super admin
- **Credit ledger**: 1 credit = 1 consultation, regardless of turns. Atomic debit on first chat message in a consultation. Hard caps protect against runaway cost.
- Rich patient context per request: demographics, allergies, chronic conditions, current consultation draft, last 3 finalized consultations, recent prescriptions
- Streaming responses via Vercel AI SDK + `useChat`
- Chat persisted with the consultation; read-only after `finalize`
- Super-admin CLI scripts (`admin:grant-credits`, `admin:set-model`, `admin:list-tenants`, `admin:usage-report`)
- Per-turn usage tracking (`chatbot_usage`) for margin reporting
- **Bonus from this round:** cabinet logo upload + render in prescription PDF

### Out of scope (deferred)

- Differential-diagnosis surfaces (high liability — separate UX)
- Voice / transcription
- Auto-population of consultation fields from chat
- Drug-interaction warnings as proactive alerts (Plan 2.D)
- Cross-consultation chat memory
- Web admin UI (CLI-only for MVP; web UI is a future Plan 3.A)
- Stripe / pack purchase flow (admin grants credits manually for now)

### Non-goals

- No chatbot for public sign-in / invite pages (authenticated doctors only)
- No assistant-role chat (assistants don't have consultation editor access anyway)
- No use of patient identifiers (CIN, name, phone, address) in prompts

---

## 2. Architecture

**Provider keys live on the platform.** Three optional Vercel env vars: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `MISTRAL_API_KEY`. Doctopus is the **processor**; LLM providers are **sub-processors**.

**Per-tenant model assignment.** New columns on `tenants`:

| Field | Set by | Doctor sees? |
|---|---|---|
| `chatbot_enabled` | Super admin | Indirectly — panel availability |
| `chatbot_provider` (`'anthropic'`\|`'openai'`\|`'mistral'`) | Super admin | No |
| `chatbot_model` | Super admin | No |
| `chatbot_credits_balance` | Computed via ledger; mirrored on tenant | Yes (estimate, "~47 consultations") |

**Credit unit = 1 consultation.** The first chat message in a consultation:

1. Verifies `balance > 0`
2. Appends a `chatbot_credit_ledger` row with `change = -1`, `reason = 'debit'`, `consultation_id = X`
3. Updates `tenants.chatbot_credits_balance` by `-1`
4. Sets `consultations.ai_credit_consumed_at = now()`

All four operations run inside one `withTenantTx` transaction with `SELECT ... FOR UPDATE` on the tenant row, so concurrent requests cannot double-debit. Subsequent messages in the same consultation skip the balance check (the column is non-null).

**Per-consultation hard caps.** 30 turns total, 50 000 cumulative tokens, 60 s timeout per turn. Hitting any cap returns an error to the panel; the consultation already paid its 1 credit. No automatic refund on cap.

**Request flow.**

```
Browser ── useChat() ──► POST /api/chat
                           │  requireDoctor()
                           │  load tenant (provider/model/balance) + consultation
                           │  validate: enabled, provider/model set, not finalized, turns < 30
                           │  if first message in consultation: atomic debit (or 402 if balance == 0)
                           │  build patient context (Section 5)
                           │  streamText(provider client, system, ctx, history, msg)
                           │  on finish: persist user msg + assistant reply
                           │              insert chatbot_usage row (tokens + cost snapshot)
                           │              audit log: 'ai.chat_message_sent'
                           ▼
                       SSE token stream
```

**Super-admin path (CLI for MVP).**

| Command | Purpose |
|---|---|
| `pnpm admin:grant-credits --tenant <id\|name> --consultations <N> [--note "Pack 100"]` | Append `+N` to ledger, bump balance |
| `pnpm admin:set-model --tenant <id\|name> --provider <p> --model <m> [--enable\|--disable]` | Update tenant row |
| `pnpm admin:list-tenants` | Table: name, balance, model, last AI use |
| `pnpm admin:usage-report --tenant <id\|name> [--month YYYY-MM]` | Aggregate `chatbot_usage`; estimated provider cost vs. credits consumed |

A web admin UI is **out of scope** for this plan — it's a future Plan 3.A.

---

## 3. Data model

All ids are `uuid`. All new tenant-scoped tables follow the existing `withTenantTx`/RLS pattern.

### 3.1 Extend `tenants`

```ts
// db/schema/tenants.ts — additions
chatbotProvider: text('chatbot_provider', { enum: ['anthropic', 'openai', 'mistral'] }),
chatbotModel: text('chatbot_model'),
chatbotEnabled: boolean('chatbot_enabled').notNull().default(false),
chatbotCreditsBalance: integer('chatbot_credits_balance').notNull().default(0),
chatbotDisclaimerAcknowledgedAt: timestamp('chatbot_disclaimer_acknowledged_at', { withTimezone: true }),
logoUrl: text('logo_url'),
```

### 3.2 Extend `consultations`

```ts
aiCreditConsumedAt: timestamp('ai_credit_consumed_at', { withTimezone: true }),
```

Non-null = a credit has been debited for this consultation.

### 3.3 New `chatbot_credit_ledger` (append-only, tenant-scoped)

```ts
export const chatbotCreditLedger = pgTable('chatbot_credit_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  change: integer('change').notNull(),
  reason: text('reason', {
    enum: ['grant', 'debit', 'refund', 'admin_adjustment'],
  }).notNull(),
  consultationId: uuid('consultation_id')
    .references(() => consultations.id, { onDelete: 'set null' }),
  grantedBy: text('granted_by'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('credit_ledger_tenant_idx').on(t.tenantId, t.createdAt),
]);
```

Computed sanity check: `SELECT SUM(change) FROM chatbot_credit_ledger WHERE tenant_id = $X` must equal `tenants.chatbot_credits_balance`. Admin CLI verifies this on `list-tenants`.

### 3.4 New `chatbot_usage` (per-turn telemetry, tenant-scoped, admin-only reporting)

```ts
export const chatbotUsage = pgTable('chatbot_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  consultationId: uuid('consultation_id').notNull().references(() => consultations.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id').references(() => consultationChatMessages.id, { onDelete: 'set null' }),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  estimatedCostMicrousd: integer('estimated_cost_microusd'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('chat_usage_tenant_created_idx').on(t.tenantId, t.createdAt),
]);
```

The doctor never sees this table — only the admin CLI reads it.

### 3.5 New `consultation_chat_messages` (multi-turn chat persistence)

```ts
export const consultationChatMessages = pgTable('consultation_chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  consultationId: uuid('consultation_id').notNull().references(() => consultations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('chat_messages_consultation_idx').on(t.consultationId, t.createdAt),
]);
```

### 3.6 RLS policies (mirror existing patterns)

- `consultation_chat_messages`: tenant-scoped SELECT/INSERT/DELETE for `authenticated`. No UPDATE (append-only).
- `chatbot_credit_ledger`: tenant-scoped SELECT for `authenticated` — doctors can read their own ledger if we expose it later. **No INSERT/UPDATE/DELETE for `authenticated`** — only the service role writes. The route handler debits via `dbAdmin()`; admin CLI grants via `dbAdmin()`.
- `chatbot_usage`: tenant-scoped SELECT for `authenticated`. **No INSERT for `authenticated`** — only service role.

**Mixed-connection pattern in the route handler.** The chat route uses two connection scopes:

1. `withTenantTx` (authenticated role, RLS-enforced) for: reading consultation/patient/allergies/conditions, persisting chat messages.
2. `dbAdmin()` (service role) for: ledger debits, `tenants.chatbot_credits_balance` updates, `chatbot_usage` inserts.

The atomic debit logic in `debitOneCredit()` runs inside a `dbAdmin()` transaction with `SELECT chatbot_credits_balance FROM tenants WHERE id = ? FOR UPDATE`. Application-layer `requireDoctor()` plus the explicit `tenantId` parameter guarantee tenant scoping; RLS provides defense-in-depth on the read side only.

This mirrors Plan 1.A's invite-acceptance pattern (which also splits reads via withTenantTx and writes via dbAdmin).

---

## 4. User flows

### 4.1 Super-admin: top up a tenant

```bash
$ pnpm admin:list-tenants
id        | name                | provider  | model                       | balance | last_ai_use
7a3c-...  | Cabinet Dr. Bennani | anthropic | claude-haiku-4-5-20251001   |   46    | 2026-05-03
1e9b-...  | Cabinet Dr. Tazi    | (none)    | (none)                      |    0    | (jamais)

$ pnpm admin:set-model --tenant 1e9b-... --provider anthropic --model claude-haiku-4-5-20251001
✅ Model set for Cabinet Dr. Tazi.

$ pnpm admin:grant-credits --tenant 1e9b-... --consultations 100 --note "Pack initial 100"
✅ Granted 100 credits to Cabinet Dr. Tazi. New balance: 100.
```

### 4.2 Super-admin: usage report

```bash
$ pnpm admin:usage-report --tenant 1e9b-... --month 2026-05
Cabinet Dr. Tazi — May 2026
AI consultations used        : 54  (54 credits debited)
Total turns                  : 218
Total tokens (in/out)        : 412 308 / 87 145
Estimated provider cost      : $1.37  (≈ 13.70 MAD)
Pack revenue at 5 MAD/cons.  : 270 MAD
Estimated margin             : 256.30 MAD (95%)
```

Source: aggregate `chatbot_usage` rows + the price-snapshot column.

### 4.3 Doctor: in-consultation chat (the main flow)

The consultation page splits into a 2-column grid (`lg:grid-cols-[minmax(0,1fr)_360px]`). Below `lg`, the panel collapses into a `<details>` block above the editor.

Panel states:

| State | What's shown |
|---|---|
| Disabled by admin | "Assistant IA non activé pour ce cabinet. Contactez le support." |
| Enabled, balance > 0, no chat yet | Welcome card: "Crédits IA disponibles : ~47 consultations. Cette consultation utilisera 1 crédit dès votre premier message." + suggested prompts |
| Active chat (credit debited) | Streaming messages. Below input: "Crédits IA : ~46 consultations restantes." |
| Balance = 0 | "Crédits IA épuisés. Contactez votre administrateur pour recharger." Input disabled. |

**The doctor never sees** the provider name, model name, token counts, or cost figures.

### 4.4 Doctor: cabinet settings

Two changes to `/settings/cabinet`:

1. **"Assistant IA"** read-only section (between cabinet info and uploads):
   - If `chatbot_enabled = false`: "Non activé. Contactez l'administrateur."
   - If enabled: "Crédits IA : ~47 consultations restantes." (no model, no provider, no key)

2. **Logo upload field** below signature/stamp. PNG/JPEG, 2 MB cap, Supabase Storage `cabinet-assets` bucket (already provisioned in Plan 1.D).

### 4.5 Failure modes (panel behavior)

| Situation | Behavior |
|---|---|
| Provider API key unset on platform | "Service IA temporairement indisponible." (Sentry alert to admin) |
| Tenant has no provider configured | "Assistant IA non activé pour ce cabinet." |
| Balance hits 0 mid-consultation | Already-debited consultation continues; future consultations blocked |
| Per-consultation cap (30 turns / 50k tokens) hit | "Limite atteinte pour cette consultation." Input disabled. |
| Provider 429 / 5xx | "Réessayez dans un instant." No backoff/retry in MVP. |
| Provider 401 (key revoked) | Same generic message; Sentry alerts admin. |

### 4.6 PDF prescription with logo

`tenants.logo_url`, when set, renders at the top-left of the prescription PDF beside the cabinet name/address. Fixed 90×60 box with `objectFit: 'contain'`. No layout reshuffle when absent — the cabinet name block keeps full width.

---

## 5. Privacy, liability, and what we send

### 5.1 System prompt (verbatim French)

> *Vous êtes un assistant clinique pour un médecin généraliste au Maroc. Vous répondez en français concis. Vos réponses sont des suggestions, pas des avis médicaux : le médecin reste responsable de toute décision clinique. Ne posez pas de diagnostic définitif ; proposez plutôt des hypothèses à évaluer. Pour toute posologie, citez la source ou notez "à vérifier dans le Vidal/AMMPS". Ne demandez jamais d'identifiants patient (CIN, téléphone, adresse).*

### 5.2 Patient context sent (server-built, never client-influenced)

```
[Patient]
- Sexe : F · Âge : 35 ans
- Allergies : Pénicilline
- Antécédents : HTA, Diabète type 2

[Consultation en cours]
Motif : ... · Examen : ... · Constantes : poids 62 kg, TA 120/80, FC 70
Diagnostic provisoire : ...

[Consultations antérieures (3 dernières finalisées)]
- 2026-04-12 : Diagnostic = Céphalée de tension. Motif = ...
- 2026-02-03 : ...
- 2025-11-18 : ...

[Ordonnances récentes]
- 2026-04-12 : DOLIPRANE 1000 mg, AMOXICILLINE 500 mg
- 2026-02-03 : ...
```

Excluded: patient first/last name, CIN, phone, address, free-text `notes`.

### 5.3 Disclaimer surfaces

1. **Cabinet settings** — visible whether or not the chatbot is enabled:
   > *Doctopus utilise des fournisseurs d'intelligence artificielle (Anthropic, OpenAI, Mistral) comme sous-traitants pour l'assistant IA. Le contexte clinique du patient (sans nom, CIN, téléphone ni adresse) leur est transmis pour générer les réponses. Aucune donnée n'est utilisée pour entraîner leurs modèles.*
2. **First-ever opening of the assistant panel** — one-time modal stored as `tenants.chatbot_disclaimer_acknowledged_at`:
   > *Cet assistant transmet le contexte du patient (anonymisé : ni nom, ni CIN) à un fournisseur d'IA. C'est un outil d'aide ; le jugement clinique reste le vôtre. [J'ai compris]*
3. **Below every assistant message:** *Suggestion IA — vérifiez avant toute décision clinique.*

### 5.4 Audit log

```
action: 'ai.chat_message_sent'
entity_type: 'consultation'
entity_id: <consultation_id>
metadata: {
  provider: 'anthropic',
  model: 'claude-haiku-4-5-20251001',
  input_tokens: 1820,
  output_tokens: 542,
  credit_debited: true | false
}
```

Message content is **not** in audit metadata. Content lives in `consultation_chat_messages` under tenant RLS, same posture as consultation notes.

### 5.5 Sentry scrubber additions

Plan 1.E covered patient fields. Add to the deny list:

- `apiKey`, `chatbotApiKey`, `provider_api_key` — defense-in-depth
- Drop entire events whose `extra` contains the LLM raw `messages` array — so a stack from inside `streamText()` never carries patient context to Sentry

### 5.6 Legal posture

- **Doctor is the data controller.**
- **Doctopus is the data processor** (named in the doctor onboarding terms).
- **Anthropic / OpenAI / Mistral are sub-processors.**
- Add a one-line clause to the doctor onboarding terms: *"Doctopus peut, sur activation par l'administrateur, transmettre le contexte clinique du patient (anonymisé) à des fournisseurs d'IA pour générer des suggestions."*
- Maintain a public sub-processor list at `/static/sous-traitants` showing which providers are used.
- All three providers offer "no training on submitted data" by default for paid API tiers — documented but not relied on as our only safeguard.

---

## 6. Tech stack & implementation notes

### 6.1 Dependencies (new)

| Package | Why |
|---|---|
| `ai` (Vercel AI SDK core) | `streamText`, `convertToCoreMessages` |
| `@ai-sdk/anthropic` | Claude provider |
| `@ai-sdk/openai` | GPT provider |
| `@ai-sdk/mistral` | Mistral provider |
| `@ai-sdk/react` | `useChat` hook for streaming on the client |

No encryption helper — provider keys are plain env vars.

### 6.2 Provider abstraction (`lib/chatbot/provider.ts`)

```ts
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createMistral } from '@ai-sdk/mistral';
import { env } from '@/lib/env';

export function getModel(provider: 'anthropic' | 'openai' | 'mistral', model: string) {
  switch (provider) {
    case 'anthropic': return createAnthropic({ apiKey: env().ANTHROPIC_API_KEY })(model);
    case 'openai':    return createOpenAI({ apiKey: env().OPENAI_API_KEY })(model);
    case 'mistral':   return createMistral({ apiKey: env().MISTRAL_API_KEY })(model);
  }
}
```

`env()` is extended so the three provider keys are conditionally required — missing keys are tolerated unless a tenant uses that provider.

### 6.3 Pricing (`lib/chatbot/pricing.ts`)

```ts
export const PRICING_USD_PER_MTOKEN: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00 },
  'claude-sonnet-4-6':         { input: 3.00,  output: 15.00 },
  'claude-opus-4-7':           { input: 15.00, output: 75.00 },
  'gpt-4o-mini':               { input: 0.15,  output: 0.60 },
  'gpt-4o':                    { input: 2.50,  output: 10.00 },
  'mistral-small-latest':      { input: 0.20,  output: 0.60 },
  'mistral-large-latest':      { input: 2.00,  output: 6.00 },
};

export const MAD_PER_CREDIT = 5;
```

Used at write-time to compute `chatbot_usage.estimated_cost_microusd`. Updates here are checked into git so historical reports remain reproducible.

### 6.4 Credit ledger (`lib/chatbot/credits.ts`)

```ts
// Atomic via dbAdmin transaction with SELECT...FOR UPDATE on tenants.
// Throws { code: 'no_credits' } if balance is 0.
debitOneCredit(tenantId, consultationId): Promise<{ newBalance: number }>

// Append-only ledger insert + counter update; called by admin CLI.
grantCredits(tenantId, consultations, grantedBy, notes?): Promise<{ newBalance: number }>

// Read current balance (mirror on tenants table; ledger is the audit source of truth).
getBalance(tenantId): Promise<number>
```

Both writes use `dbAdmin()` and run inside a single Postgres transaction (`BEGIN ... COMMIT`) so the ledger row and the materialized counter on `tenants` cannot drift.

### 6.5 Context builder (`lib/chatbot/context.ts`)

Pure server function `(tx, consultationId) → string`. Returns the structured French text from Section 5.2. Token estimate via `chars / 4`; refuses early if context > 8 000 tokens.

### 6.6 Route handler (`app/api/chat/route.ts`, Node runtime, doctor-only)

Handles validation → debit (if first turn) → context build → `streamText` → `onFinish` persists messages, `chatbot_usage` row, audit. Returns SSE via `result.toDataStreamResponse()`.

Per-consultation hard caps (30 turns, 50 000 tokens cumulative, 60 s timeout) are checked before the streamText call.

### 6.7 Client component (`app/(authenticated)/consultations/[id]/assistant/panel.tsx`)

Uses `useChat({ api: '/api/chat', body: { consultationId } })`. Renders the four states from Section 4.3 and surfaces clear French error messages for each error code from the route.

### 6.8 Layout change

`consultations/[id]/page.tsx` switches to `lg:grid lg:grid-cols-[minmax(0,1fr)_360px]`. Below `lg`, the panel collapses into a `<details>` block above the editor.

### 6.9 Admin CLI scripts (`scripts/admin-*.ts`)

Each follows the existing `dotenv + dbAdmin` pattern from `scripts/invite-doctor.ts`. Lookups support `--tenant` by either UUID or cabinet name (case-insensitive).

### 6.10 Testing strategy

| Layer | Test |
|---|---|
| Pricing math | Vitest: token counts × pricing → expected microUSD |
| Credit debit | Vitest with seeded tenants: 0 balance throws, positive balance debits exactly 1, idempotent within same consultation |
| Context builder | Vitest: includes allergies + last 3 finalized + recent prescriptions; **excludes** patient first/last name, CIN, phone |
| RLS | New `tests/rls/chat-and-credits.rls.test.ts`: tenant A cannot SELECT B's chat messages, ledger, or usage |
| Route handler | Vitest with mocked `streamText`: requires doctor; rejects finalized consultation; respects turn cap; debits exactly once per consultation |
| Admin scripts | Vitest: grant + balance roundtrip; set-model writes the right row |
| E2E | Playwright with stubbed `/api/chat`: admin grants credits via DB seed → doctor sends message → balance decreases → finalize → panel becomes read-only |

---

## 7. Open items handed to the implementation plan

- **MAD_PER_CREDIT** — set to 5 in the constant; revisable. The plan should make this easy to change without code edits long-term (env var or admin command later).
- **Provider model defaults** — the spec lists Claude Haiku 4.5 as a sensible default. The plan should include a model allowlist so the admin CLI fails fast on typos.
- **Mobile layout** — under `lg`, the panel collapses to `<details>`. The plan should cover at least one Playwright run on a mobile viewport to confirm the editor stays usable.
- **Error telemetry** — provider 401 / 5xx cases route to Sentry. The plan should include a Sentry breadcrumb in the route handler with the error code (no message content).
