# Cabinet messaging — real-time doctor ↔ assistant chat

> **Status (2026-11-09)**: Phase 0 and Phase 1 shipped (migrations 0019, 0020). Phases 2–3 pending. Where this spec and the code disagree, the "Implementation notes" section at the end wins.

> **Why now**: doctors and assistants coordinate the day over WhatsApp ("faites entrer le suivant", "Mme X a appelé", photos of external lab results). That leaks patient data to a consumer app, splits context away from Doctopus, and forces the doctor to pick up a phone mid-consultation. This spec moves that channel inside the app, where messages can point at real patients and appointments.

**Goal**: every member of a cabinet can chat in real time with the rest of the team — one cabinet-wide thread plus private 1:1 threads — from a side panel available on every screen and from a full `/messages` page. Messages can reference a patient / today's appointment, be sent as one-click quick replies, carry photos/PDFs, or be voice notes. Unread state, typing, presence, sound, and browser notifications make it a credible WhatsApp replacement for intra-cabinet traffic.

**Architecture**: messages are persisted through server actions (`withTenantTx`, RLS on `app.tenant_id`, same as every other write). Fan-out uses **Supabase Realtime Broadcast on private channels**, emitted by a Postgres trigger (`realtime.send`) inside the insert transaction, and authorized by RLS policies on `realtime.messages` that resolve the caller from the JWT (`auth.uid()`). Presence and typing ride on the same private-channel mechanism. Attachments live in a private Storage bucket and are served through short-lived signed URLs.

**Tech stack**: Next.js 16, drizzle-orm, `@supabase/supabase-js` (Realtime private channels, Presence, Storage signed URLs), browser `MediaRecorder` + `Notification` APIs, existing UI primitives. **No new runtime dependency.**

---

## Decisions taken in brainstorming

| Topic | Choice |
|---|---|
| Conversations | Cabinet-wide thread **+** private 1:1 threads |
| Surface | Side panel (dock) on every screen **+** `/messages` page |
| V1 extras | Patient / appointment link, quick replies, attachments, voice notes |
| Out-of-focus alerts | Browser `Notification` while the tab is open in the background (no Web Push) |

---

## Pre-requisite finding: why we cannot use `postgres_changes`

Every RLS policy in the repo is `tenant_id = current_setting('app.tenant_id', true)::uuid`. That GUC is only set server-side by `withTenantTx`. Supabase Realtime evaluates RLS for `postgres_changes` with the **browser's JWT**, where `app.tenant_id` is NULL → no row passes → no event is delivered. Commit `4f3677d` already suspected this ("RLS is blocking the channel"); `c09715a` then removed the polling fallback, so `/today` live refresh, the notification bell, and the waiting-room toast are likely only refreshing on `visibilitychange` in production.

Consequences:

1. Messaging does **not** use `postgres_changes`. It uses Broadcast with explicit, JWT-based authorization (below). This also avoids the per-subscriber RLS evaluation cost of `postgres_changes`.
2. The existing `/today` realtime is a **separate bug**, tracked as Phase 0 — fixable with the same `current_user_tenant_id()` helper introduced here.

---

## What this spec does NOT do

- **No Web Push / service worker.** Notifications only fire while a Doctopus tab is open (foreground or background).
- **No patient-facing messaging.** Team-only; patients never see this.
- **No ad-hoc group threads** beyond the single cabinet thread. With 1 doctor + 1–3 assistants, cabinet + 1:1 covers every case.
- **No message editing.** Senders can delete their own message (soft delete → "Message supprimé") within 15 minutes.
- **No full-text search** across history (deferred; would need a `pg_trgm`/tsvector index).
- **No reactions, threads/replies, forwarding.** Deferred.
- **No voice transcription.** (A natural later hook for the existing chatbot provider.)
- **No admin / super-admin access** to message content from `/admin`.

---

## Data model (migration `0019_cabinet_messaging.sql`)

```
conversations
  id               uuid pk
  tenant_id        uuid fk tenants  (restrict)
  kind             text  'cabinet' | 'direct'
  direct_key       text  null        -- '<minUserId>:<maxUserId>' for direct, null for cabinet
  last_message_at  timestamptz null
  created_at       timestamptz
  UNIQUE (tenant_id) WHERE kind = 'cabinet'          -- exactly one cabinet thread
  UNIQUE (tenant_id, direct_key) WHERE kind = 'direct'

conversation_members
  conversation_id  uuid fk conversations (cascade)
  user_id          uuid fk user_profiles (cascade)
  tenant_id        uuid
  last_read_at     timestamptz null
  muted            boolean default false
  PK (conversation_id, user_id)
  INDEX (user_id)

messages
  id               uuid pk
  tenant_id        uuid
  conversation_id  uuid fk conversations (cascade)
  sender_id        uuid fk user_profiles
  kind             text 'text' | 'quick' | 'attachment' | 'voice'
  body             text null         -- ≤ 4000 chars, zod-validated
  patient_id       uuid null fk patients (set null)
  appointment_id   uuid null fk appointments (set null)
  attachment_path  text null         -- '<tenant>/<conversation>/<uuid>.<ext>'
  attachment_name  text null
  attachment_mime  text null
  attachment_bytes integer null
  voice_duration_ms integer null
  created_at       timestamptz default now()
  deleted_at       timestamptz null
  INDEX (conversation_id, created_at DESC)

quick_replies
  id         uuid pk
  tenant_id  uuid
  label      text   -- button text, ≤ 32 chars
  body       text   -- message sent, ≤ 280 chars
  sort_order integer
  created_at timestamptz
```

**Membership rules**

- The cabinet conversation is created lazily (first `/messages` load or first send) and its members are **all active `user_profiles` of the tenant**. Membership is reconciled on read: new assistants join, deactivated users are dropped. Deactivated users keep their authored messages (sender name shown greyed).
- Direct conversations are created on first open with `direct_key` = sorted user ids, both users as members.
- Quick replies: seeded per tenant on first use with defaults — « Faites entrer le patient suivant », « Pouvez-vous venir ? », « Appelez-moi », « Pause 10 min », « Patient en retard ». Editable by the doctor in `/settings/cabinet`.

**RLS** (same pattern as every table): `ENABLE` + `FORCE`, `tenant_id = current_setting('app.tenant_id', true)::uuid`. On top of tenant scoping, **message SELECT/INSERT is restricted to members of the conversation** (an `EXISTS` on `conversation_members` keyed on a second GUC `app.user_id`, which `withTenantTx` gains as an optional parameter). This keeps 1:1 threads private from the other assistants even at the DB layer.

---

## Realtime design

### Authorization helper

```sql
CREATE FUNCTION public.current_user_tenant_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid() AND is_active
$$;
```

### Topics (all `private: true`)

| Topic | Who may join | Carries |
|---|---|---|
| `user:<userId>` | only that user | `message.new`, `message.deleted`, `conversation.read` (others' read receipts) for every conversation the user belongs to |
| `presence:<tenantId>` | any active member of the tenant | Presence (`online`, `typing_in: conversationId \| null`) |

Policies on `realtime.messages`:

- SELECT: `realtime.topic() = 'user:' || auth.uid()` **OR** `realtime.topic() = 'presence:' || current_user_tenant_id()`.
- INSERT (client-sent, needed for Presence track): only `presence:` topic of the caller's tenant.

Per-user inbox topics (instead of per-conversation topics) mean each client holds **one** message channel regardless of how many threads exist, and a 1:1 payload is never sent to a non-member socket.

### Emission

An `AFTER INSERT OR UPDATE` trigger on `messages` calls `realtime.send(payload, event, 'user:' || member.user_id, true)` for each member of the conversation. Running inside the insert transaction guarantees no message is broadcast that was rolled back, and no committed message is silently skipped by a crashed Node process. The payload carries the full message row plus `sender_name` (no attachment URL — clients ask for a signed URL).

A similar trigger on `conversation_members.last_read_at` emits `conversation.read` to the other members (powers "Lu" ticks).

### Client

One `<MessagingProvider>` mounted in `DoctorShell` (client component):

- Calls `supabase.realtime.setAuth()` then joins `user:<me>` and `presence:<tenant>`, via `createTenantChannel` (already reaps stale channels).
- Holds the in-memory store: conversations, unread counts, last messages, presence, typing.
- **Gap recovery**: on (re)subscribe and on `visibilitychange`, fetches `messages WHERE created_at > lastSeenCreatedAt` via a server action, so a dropped socket never loses messages.
- **Optimistic send**: the message renders immediately with a client-generated id (`uuid` sent to the server action as the PK); the broadcast echo is de-duplicated by id.

---

## UI

### Shell

- **Message icon** next to the bell (desktop sidebar header + mobile top bar) with a red unread badge. Shortcut: `Alt+M` toggles the dock.
- **Dock** (`components/messaging/chat-dock.tsx`): right-side sheet, 380px on desktop, full-screen on mobile. Two views: conversation list → thread. Opening it never navigates; the doctor stays on the consultation.
- **`/messages`** (both roles): two-pane layout (list | thread) on desktop, list → thread on mobile. Added to sidebar ("Cabinet" group) and as a mobile bottom tab.
- Tab title prefix `(3)` when there are unread messages.

### Conversation list

Cabinet thread pinned first ("Cabinet — tout le monde"), then one row per teammate (avatar, online dot, last message preview, time, unread count). A row exists for every teammate even before the first message (creates the direct conversation on open).

### Thread

- Day separators, sender grouping, timestamps, "Lu" ticks on own messages (direct: ✓✓ when the other read; cabinet: small avatar stack of readers).
- "Dr X écrit…" typing line (throttled, 3s expiry).
- Infinite scroll upward (page size 50).
- Long-press / hover menu on own messages < 15 min: "Supprimer".

### Composer

- Auto-growing textarea; `Enter` sends, `Shift+Enter` new line.
- **Quick-reply chips** above the composer (horizontal scroll). One click sends a `kind: 'quick'` message immediately — rendered as a highlighted pill so it stands out in the thread.
- **`@` patient mention**: typing `@` opens the existing `PatientPicker` (`searchPatientsForPickerAction`). Selecting attaches `patient_id`; if that patient has an appointment today, `appointment_id` is attached too. One patient per message (keeps the model simple).
- **📎 Attachment**: images (jpeg/png/webp/heic→jpeg client-side where supported) and PDF, ≤ 10 MB.
- **🎤 Voice**: press to record, release/stop to send, swipe/cancel button to discard. ≤ 2 minutes. `MediaRecorder` with `audio/webm;codecs=opus`, falling back to `audio/mp4` on Safari.

### Patient card (in message)

Name, age, and — when `appointment_id` is set — today's appointment status badge (`waiting`, `in_consultation`, …) read live from the store. Click → `/patients/[id]`. Both roles can open patient pages; no consultation link (assistants cannot access consultations).

### Contextual entry point

On `/today`, each appointment row's action menu gets **"Envoyer un message à propos de ce patient"** → opens the dock on the cabinet thread with the patient pre-attached. (Cheap, high value: it is exactly the WhatsApp use case.)

### Notifications

| Situation | Behaviour |
|---|---|
| Dock open on that thread, tab visible | Nothing (mark read immediately) |
| Tab visible, elsewhere | Toast (sender, preview, "Répondre") + short sound + badge |
| Tab hidden | `new Notification(...)` (click focuses the tab and opens the thread) + sound + title prefix |
| Conversation muted | Badge only |

Notification permission is requested from a contextual prompt inside the dock ("Activer les notifications du bureau"), never on page load. Sound: one small bundled file in `public/sounds/message.mp3`, toggle in the dock's settings menu (persisted in `localStorage`).

---

## Attachments & voice: storage

- Bucket `chat-attachments`, **private**.
- Upload flow: server action `createAttachmentUploadAction(conversationId, mime, bytes)` validates membership, mime allow-list, and size, then returns a **signed upload URL** for `<tenant>/<conversation>/<uuid>.<ext>`. The client uploads directly to Storage (no Vercel body-size limit), then calls `sendMessageAction` with the path. The server verifies the object exists and its path prefix matches before inserting.
- Read flow: `getAttachmentUrlAction(messageId)` → membership check → signed URL, 5 min TTL. Images render as thumbnails (lightbox on click), PDFs as a file chip, voice as a compact player with duration.
- Deleting a message deletes the object.
- Storage RLS: no policies for `authenticated` on this bucket. All access goes through server-issued signed URLs.

---

## Security & compliance notes

- Tenant isolation is enforced three times: table RLS (`app.tenant_id`), membership RLS (`app.user_id`), and Realtime topic authorization (`auth.uid()`).
- Message bodies are not written to the audit log (they are the record). Attachment downloads and deletions are audited (`message.attachment_viewed`, `message.deleted`).
- No message content is ever sent to Sentry (`beforeSend` scrub of `body` fields in server-action errors).
- Patient data stays in the cabinet's Supabase project instead of WhatsApp. That is a real selling point for Loi 09-08 / CNDP posture, and could go on the landing page once shipped.
- **Production toggle**: Realtime "private channels only" must be enabled in the Supabase dashboard (runbook entry in `docs/runbooks/deploy.md`).

---

## Delivery plan (4 PRs, each shippable)

**Phase 0 — Fix existing realtime (small, independent)**
Add `current_user_tenant_id()` and JWT-aware SELECT policies (`tenant_id = current_user_tenant_id()`) on `appointments` / `consultations` so `postgres_changes` reaches browsers. Verify `/today` live refresh + bell + waiting toast in prod. RLS tests for cross-tenant denial.

**Phase 1 — Core messaging**
Migration (all tables + triggers + realtime policies), server actions (`listConversations`, `openDirect`, `listMessages`, `sendMessage`, `markRead`, `deleteMessage`, `catchUp`), `MessagingProvider`, dock, `/messages`, unread badges, typing, presence, read ticks, toast/sound/Notification. Text messages only.

**Phase 2 — Patient link + quick replies**
`@` mention via `PatientPicker`, patient card with live appointment status, `/today` contextual action, quick-reply chips + doctor settings editor + seed.

**Phase 3 — Attachments + voice notes**
Bucket, signed upload/read flow, image/PDF rendering, `MediaRecorder` voice recorder + player, audit entries.

---

## Testing

- **RLS** (`tests/rls/messaging.rls.test.ts`): cross-tenant read/insert denied; assistant B cannot read the doctor↔assistant A direct thread; non-member insert denied; deactivated user cannot read.
- **Realtime authorization** (`tests/rls/realtime-topics.test.ts`): SELECT on `realtime.messages` evaluated with forged `request.jwt.claims` for own user topic ✓, other user topic ✗, other tenant presence ✗.
- **Unit**: direct-key derivation, membership reconciliation, message zod schemas (body length, mime allow-list, size), store reducer (optimistic insert + echo de-dup + catch-up merge + unread counting).
- **E2E** (Playwright, two browser contexts doctor + assistant): send ↔ receive within 2s, unread badge, read tick, quick reply, patient mention card navigates, image upload renders.

---

## File structure (Phase 1–3)

**New**

```
supabase/migrations/0019_cabinet_messaging.sql
db/schema/messaging.ts
lib/messaging/{queries.ts,schemas.ts,membership.ts,attachments.ts}
app/(authenticated)/messages/{page.tsx,actions.ts}
components/messaging/
  messaging-provider.tsx   # realtime + store
  chat-dock.tsx
  chat-launcher.tsx        # icon + badge in shell
  conversation-list.tsx
  thread.tsx
  message-bubble.tsx
  composer.tsx
  quick-reply-bar.tsx
  patient-mention.tsx
  attachment-preview.tsx
  voice-recorder.tsx
  voice-player.tsx
components/settings/quick-replies-editor.tsx
public/sounds/message.mp3
tests/rls/messaging.rls.test.ts
tests/rls/realtime-topics.test.ts
tests/unit/messaging/*.test.ts
tests/e2e/messaging.spec.ts
```

**Modified**

```
db/schema/index.ts                       # export messaging tables
db/with-tenant.ts                        # optional userId → SET LOCAL app.user_id
components/shell/doctor-shell.tsx        # provider, launcher, nav item, mobile tab
components/today/*                       # "Envoyer un message" row action (Phase 2)
app/(authenticated)/settings/cabinet/*   # quick replies editor (Phase 2)
lib/audit/record.ts                      # new audit actions (Phase 3)
docs/runbooks/deploy.md                  # private-channel toggle + bucket
```

---

## Open questions (decide at implementation, defaults in bold)

- Message retention: **keep forever** vs auto-purge after N months.
- Should assistants be able to DM each other? **Yes** (every teammate appears in the list).
- Doctor "Ne pas déranger" toggle that silences sound/notifications during consultations? **Defer to after Phase 3.**

---

## Implementation notes (Phases 0–1, as built)

- **Phase 0 did not add JWT-aware SELECT policies.** That would have opened `appointments`/`consultations` to PostgREST reads with a user JWT (assistants could read clinical notes) and streamed full rows over the socket. Instead, migration 0019 adds a trigger that publishes a *minimal* ping (ids + status fields) to the private topic `tenant:<id>` via `realtime.send`. Content-only consultation autosaves don't ping (the editor is never refreshed mid-typing). The tables left the `supabase_realtime` publication. `TenantRealtimeProvider` owns that one channel (activity + Presence) and fans out through context.
- **Direct threads use `user_a < user_b` columns**, not a `direct_key` string, and visibility is `app_user_id() IN (user_a, user_b)`. `app_user_id()` maps `''` to NULL: custom GUCs revert to `''` (not NULL) after a `SET LOCAL` on a pooled connection, and `position('' in x)` would have matched everything.
- **Cabinet fan-out** goes to every active `user_profiles` row of the tenant (`conversation_participants()`), so `conversation_members` only stores read state + mute and is created lazily. The cabinet conversation itself is created on first bootstrap.
- **Typing** rides on Presence (`typingIn`), so clients never need broadcast INSERT rights (they can't forge activity events).
- **Sound** is synthesized with WebAudio (no `public/sounds` asset).
- `sendMessageAction` never rethrows driver errors (they embed the message text as SQL params); `body` / `attachmentName` were added to the Sentry scrubber.
- Mobile: messaging is reachable from the top-bar icon and the drawer, not a bottom tab (the tab bar stays at 3 + "Plus").
- Tests: `tests/rls/messaging.rls.test.ts`, `tests/rls/realtime-messaging.test.ts`, `tests/rls/realtime-tenant-activity.test.ts` (real GoTrue users + private channels), `tests/unit/messaging/store.test.ts`, `tests/e2e/messaging.spec.ts` (two browser contexts).
