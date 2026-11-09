-- Migration 0019: tenant activity over Realtime Broadcast (private channels).
--
-- Why: every RLS policy in this repo keys on current_setting('app.tenant_id'),
-- a GUC that only server transactions (withTenantTx) set. Supabase Realtime
-- evaluates postgres_changes RLS with the browser JWT, where that GUC is
-- NULL, so no appointments / consultations change ever reached a browser.
-- /today, the notification bell and the waiting-room toast only refreshed
-- on tab focus.
--
-- Fix: a trigger publishes a *minimal* activity ping (ids + status fields,
-- never clinical text) to the private topic `tenant:<tenant_id>` with
-- realtime.send(). Joining that topic is authorized by RLS on
-- realtime.messages, resolving the caller's tenant from auth.uid().
--
-- Consultation content autosaves (motif, notes, diagnosis…) do NOT ping:
-- only board-relevant columns do, so an open consultation editor is never
-- refreshed under the doctor's fingers.
--
-- The same topic also carries Presence (who is online / typing) for the
-- cabinet messaging feature; clients may only INSERT presence, never
-- broadcast, so nobody can forge activity events.

-- Caller's tenant from the JWT. NULL for anon, unknown or inactive users,
-- and in server transactions (no request.jwt.claims) — so policies using
-- it never widen what withTenantTx can see.
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.user_profiles
  WHERE id = auth.uid() AND is_active
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.current_user_tenant_id() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.current_user_tenant_id() TO authenticated;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.broadcast_tenant_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  payload jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec := OLD;
  ELSE
    rec := NEW;
  END IF;

  IF TG_TABLE_NAME = 'appointments' THEN
    IF TG_OP = 'UPDATE'
       AND NEW.status IS NOT DISTINCT FROM OLD.status
       AND NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at
       AND NEW.reason IS NOT DISTINCT FROM OLD.reason
       AND NEW.patient_id IS NOT DISTINCT FROM OLD.patient_id
       AND NEW.parent_consultation_id IS NOT DISTINCT FROM OLD.parent_consultation_id THEN
      RETURN NULL;
    END IF;
    payload := jsonb_build_object(
      'table', 'appointments',
      'op', TG_OP,
      'id', rec.id,
      'patientId', rec.patient_id,
      'status', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.status END,
      'oldStatus', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END
    );
  ELSE
    -- consultations: ignore content-only updates (autosave).
    IF TG_OP = 'UPDATE'
       AND NEW.is_finalized IS NOT DISTINCT FROM OLD.is_finalized
       AND NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status
       AND NEW.price_mad IS NOT DISTINCT FROM OLD.price_mad
       AND NEW.is_free IS NOT DISTINCT FROM OLD.is_free THEN
      RETURN NULL;
    END IF;
    payload := jsonb_build_object(
      'table', 'consultations',
      'op', TG_OP,
      'id', rec.id,
      'appointmentId', rec.appointment_id,
      'isFinalized', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.is_finalized END,
      'oldIsFinalized', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.is_finalized END,
      'paymentStatus', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.payment_status END,
      'oldPaymentStatus', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.payment_status END
    );
  END IF;

  PERFORM realtime.send(payload, 'activity', 'tenant:' || rec.tenant_id::text, true);
  RETURN NULL;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS appointments_broadcast_activity ON public.appointments;
--> statement-breakpoint
CREATE TRIGGER appointments_broadcast_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_tenant_activity();
--> statement-breakpoint
DROP TRIGGER IF EXISTS consultations_broadcast_activity ON public.consultations;
--> statement-breakpoint
CREATE TRIGGER consultations_broadcast_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_tenant_activity();
--> statement-breakpoint

-- Realtime authorization: members of a tenant may receive broadcasts and
-- presence on `tenant:<their tenant>`, and may only publish presence there.
DROP POLICY IF EXISTS tenant_topic_read ON realtime.messages;
--> statement-breakpoint
CREATE POLICY tenant_topic_read ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.messages.extension IN ('broadcast', 'presence')
    AND realtime.topic() = 'tenant:' || public.current_user_tenant_id()::text
  );
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_topic_presence_write ON realtime.messages;
--> statement-breakpoint
CREATE POLICY tenant_topic_presence_write ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    realtime.messages.extension = 'presence'
    AND realtime.topic() = 'tenant:' || public.current_user_tenant_id()::text
  );
--> statement-breakpoint

-- postgres_changes is no longer used by any client (it never delivered,
-- see header). Stop streaming these tables through the publication.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'appointments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.appointments';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'consultations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.consultations';
  END IF;
END $$;
