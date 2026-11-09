-- Migration 0021: cabinet messaging — phases 2 & 3 + typing fix.
--
-- 1. quick_replies: one-tap messages per cabinet (editable by the doctor),
--    seeded once per tenant (tenants.quick_replies_seeded).
-- 2. typing:<tenant> broadcast topic. Typing used to ride on Presence
--    updates, but realtime-js 2.105 mutates old presence metas in place
--    (drops phx_ref) so a superseded "typing" meta is never removed and the
--    indicator stuck forever. Clients now broadcast short-lived typing
--    pings on a dedicated topic; it is separate from tenant:<id> so a
--    client can never forge `activity` events.
-- 3. chat-attachments: private bucket (photos, PDF, voice notes). No
--    storage policies for `authenticated`: every upload/download goes
--    through server-issued signed URLs after a membership check.
-- 4. Message broadcasts now carry the patient's name and the linked
--    appointment's status so the patient card renders without a fetch.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS quick_replies_seeded boolean NOT NULL DEFAULT false;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 32),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 280),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS quick_replies_tenant_idx ON public.quick_replies (tenant_id, sort_order);
--> statement-breakpoint
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.quick_replies FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS quick_replies_tenant_all ON public.quick_replies;
--> statement-breakpoint
CREATE POLICY quick_replies_tenant_all ON public.quick_replies
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quick_replies TO authenticated;
--> statement-breakpoint

-- ── typing topic ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS typing_topic_read ON realtime.messages;
--> statement-breakpoint
CREATE POLICY typing_topic_read ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.messages.extension = 'broadcast'
    AND realtime.topic() = 'typing:' || public.current_user_tenant_id()::text
  );
--> statement-breakpoint
DROP POLICY IF EXISTS typing_topic_write ON realtime.messages;
--> statement-breakpoint
CREATE POLICY typing_topic_write ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    realtime.messages.extension = 'broadcast'
    AND realtime.topic() = 'typing:' || public.current_user_tenant_id()::text
  );
--> statement-breakpoint

-- ── attachments bucket ────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf',
    'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
--> statement-breakpoint

-- ── richer message broadcasts ─────────────────────────────────────────
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
  deleted boolean;
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
  deleted := NEW.deleted_at IS NOT NULL;

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
      'body', CASE WHEN deleted THEN NULL ELSE NEW.body END,
      'patientId', CASE WHEN deleted THEN NULL ELSE NEW.patient_id END,
      'patientName', CASE WHEN deleted THEN NULL ELSE (
        SELECT p.last_name || ' ' || p.first_name FROM public.patients p WHERE p.id = NEW.patient_id
      ) END,
      'appointmentId', CASE WHEN deleted THEN NULL ELSE NEW.appointment_id END,
      'appointmentStatus', CASE WHEN deleted THEN NULL ELSE (
        SELECT a.status FROM public.appointments a WHERE a.id = NEW.appointment_id
      ) END,
      'attachmentName', CASE WHEN deleted THEN NULL ELSE NEW.attachment_name END,
      'attachmentMime', CASE WHEN deleted THEN NULL ELSE NEW.attachment_mime END,
      'attachmentBytes', CASE WHEN deleted THEN NULL ELSE NEW.attachment_bytes END,
      'voiceDurationMs', CASE WHEN deleted THEN NULL ELSE NEW.voice_duration_ms END,
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
