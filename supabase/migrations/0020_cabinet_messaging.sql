-- Migration 0020: cabinet messaging (doctor ↔ assistants).
--
-- Spec: docs/superpowers/specs/2026-11-09-cabinet-messaging-design.md
--
-- Conversations are either the single cabinet-wide thread or a 1:1
-- thread between two members (user_a < user_b). Messages are persisted
-- through server actions (withTenantUserTx → app.tenant_id + app.user_id)
-- and fanned out by trigger to each participant's private realtime topic
-- `user:<id>` (realtime.send, authorized by RLS on realtime.messages).
--
-- Privacy: a direct thread is invisible — at the DB layer — to the other
-- members of the cabinet. Columns for patient links, attachments and voice
-- notes ship now so later phases don't need another migration.

-- app.user_id as uuid. NULL when unset OR reset to '' (custom GUCs revert
-- to '' — not NULL — after a SET LOCAL on a pooled connection).
CREATE OR REPLACE FUNCTION public.app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('cabinet', 'direct')),
  user_a uuid REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  user_b uuid REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_direct_pair CHECK (
    (kind = 'cabinet' AND user_a IS NULL AND user_b IS NULL)
    OR (kind = 'direct' AND user_a IS NOT NULL AND user_b IS NOT NULL AND user_a < user_b)
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS conversations_one_cabinet_per_tenant
  ON public.conversations (tenant_id) WHERE kind = 'cabinet';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS conversations_direct_pair_unique
  ON public.conversations (tenant_id, user_a, user_b) WHERE kind = 'direct';
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  last_read_at timestamptz,
  muted boolean NOT NULL DEFAULT false,
  PRIMARY KEY (conversation_id, user_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS conversation_members_user_idx
  ON public.conversation_members (user_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'quick', 'attachment', 'voice')),
  body text CHECK (body IS NULL OR char_length(body) <= 4000),
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  attachment_path text,
  attachment_name text,
  attachment_mime text,
  attachment_bytes integer,
  voice_duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS messages_tenant_created_idx
  ON public.messages (tenant_id, created_at);
--> statement-breakpoint

-- ── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.conversations FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.conversation_members FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- A conversation is visible to the cabinet (cabinet thread) or to its two
-- participants (direct thread).
DROP POLICY IF EXISTS conversations_participant_select ON public.conversations;
--> statement-breakpoint
CREATE POLICY conversations_participant_select ON public.conversations
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND (kind = 'cabinet' OR public.app_user_id() IN (user_a, user_b))
  );
--> statement-breakpoint
DROP POLICY IF EXISTS conversations_participant_insert ON public.conversations;
--> statement-breakpoint
CREATE POLICY conversations_participant_insert ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND (kind = 'cabinet' OR public.app_user_id() IN (user_a, user_b))
  );
--> statement-breakpoint

-- Read state: visible when the conversation is (sub-select applies the
-- conversations policy); each user only writes their own row.
DROP POLICY IF EXISTS conversation_members_select ON public.conversation_members;
--> statement-breakpoint
CREATE POLICY conversation_members_select ON public.conversation_members
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id)
  );
--> statement-breakpoint
DROP POLICY IF EXISTS conversation_members_insert_own ON public.conversation_members;
--> statement-breakpoint
CREATE POLICY conversation_members_insert_own ON public.conversation_members
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND user_id = public.app_user_id()
    AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id)
  );
--> statement-breakpoint
DROP POLICY IF EXISTS conversation_members_update_own ON public.conversation_members;
--> statement-breakpoint
CREATE POLICY conversation_members_update_own ON public.conversation_members
  FOR UPDATE TO authenticated
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND user_id = public.app_user_id()
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND user_id = public.app_user_id()
  );
--> statement-breakpoint

DROP POLICY IF EXISTS messages_participant_select ON public.messages;
--> statement-breakpoint
CREATE POLICY messages_participant_select ON public.messages
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id)
  );
--> statement-breakpoint
DROP POLICY IF EXISTS messages_sender_insert ON public.messages;
--> statement-breakpoint
CREATE POLICY messages_sender_insert ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND sender_id = public.app_user_id()
    AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id)
  );
--> statement-breakpoint
DROP POLICY IF EXISTS messages_sender_update ON public.messages;
--> statement-breakpoint
CREATE POLICY messages_sender_update ON public.messages
  FOR UPDATE TO authenticated
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND sender_id = public.app_user_id()
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND sender_id = public.app_user_id()
  );
--> statement-breakpoint

GRANT SELECT, INSERT ON public.conversations TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON public.conversation_members TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
--> statement-breakpoint

-- ── Realtime fan-out ──────────────────────────────────────────────────

-- Active participants of a conversation (cabinet → every active member).
CREATE OR REPLACE FUNCTION public.conversation_participants(conv public.conversations)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.id FROM public.user_profiles up
  WHERE up.tenant_id = conv.tenant_id
    AND up.is_active
    AND (conv.kind = 'cabinet' OR up.id IN (conv.user_a, conv.user_b))
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.conversation_participants(public.conversations) FROM PUBLIC;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.broadcast_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv public.conversations;
  evt text;
  payload jsonb;
  target uuid;
BEGIN
  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    UPDATE public.conversations
      SET last_message_at = GREATEST(COALESCE(last_message_at, NEW.created_at), NEW.created_at)
      WHERE id = conv.id;
    evt := 'message.new';
  ELSIF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    evt := 'message.deleted';
  ELSE
    RETURN NULL;
  END IF;

  payload := jsonb_build_object(
    'id', NEW.id,
    'conversation', jsonb_build_object(
      'id', conv.id, 'kind', conv.kind, 'userA', conv.user_a, 'userB', conv.user_b
    ),
    'message', jsonb_build_object(
      'id', NEW.id,
      'conversationId', NEW.conversation_id,
      'senderId', NEW.sender_id,
      'senderName', (SELECT full_name FROM public.user_profiles WHERE id = NEW.sender_id),
      'kind', NEW.kind,
      'body', CASE WHEN NEW.deleted_at IS NULL THEN NEW.body ELSE NULL END,
      'patientId', NEW.patient_id,
      'appointmentId', NEW.appointment_id,
      'attachmentName', NEW.attachment_name,
      'attachmentMime', NEW.attachment_mime,
      'attachmentBytes', NEW.attachment_bytes,
      'voiceDurationMs', NEW.voice_duration_ms,
      'createdAt', NEW.created_at,
      'deletedAt', NEW.deleted_at
    )
  );

  FOR target IN SELECT public.conversation_participants(conv) LOOP
    PERFORM realtime.send(payload, evt, 'user:' || target::text, true);
  END LOOP;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS messages_broadcast ON public.messages;
--> statement-breakpoint
CREATE TRIGGER messages_broadcast
  AFTER INSERT OR UPDATE OF deleted_at ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_message();
--> statement-breakpoint

-- Read receipts: tell every participant (incl. the reader's other tabs).
CREATE OR REPLACE FUNCTION public.broadcast_conversation_read()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv public.conversations;
  target uuid;
BEGIN
  IF NEW.last_read_at IS NULL
     OR (TG_OP = 'UPDATE' AND NEW.last_read_at IS NOT DISTINCT FROM OLD.last_read_at) THEN
    RETURN NULL;
  END IF;
  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  FOR target IN SELECT public.conversation_participants(conv) LOOP
    PERFORM realtime.send(
      jsonb_build_object(
        'conversationId', NEW.conversation_id,
        'userId', NEW.user_id,
        'lastReadAt', NEW.last_read_at
      ),
      'conversation.read',
      'user:' || target::text,
      true
    );
  END LOOP;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS conversation_members_broadcast_read ON public.conversation_members;
--> statement-breakpoint
CREATE TRIGGER conversation_members_broadcast_read
  AFTER INSERT OR UPDATE OF last_read_at ON public.conversation_members
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_conversation_read();
--> statement-breakpoint

-- Each active user may receive broadcasts on their own inbox topic only.
DROP POLICY IF EXISTS user_inbox_read ON realtime.messages;
--> statement-breakpoint
CREATE POLICY user_inbox_read ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.messages.extension = 'broadcast'
    AND realtime.topic() = 'user:' || auth.uid()::text
    AND public.current_user_tenant_id() IS NOT NULL
  );
