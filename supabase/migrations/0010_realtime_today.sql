-- Migration 0010: enable Postgres-changes realtime for /today.
--
-- The doctor and assistant share the /today screen and need to see new
-- walk-ins, finalised consultations, and payment-status flips without
-- having to refresh. We expose two tables to the supabase_realtime
-- publication and set REPLICA IDENTITY FULL so per-tenant filtering
-- (filter=tenant_id=eq.<uuid>) also works on UPDATE events.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'appointments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'consultations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.consultations';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
--> statement-breakpoint
ALTER TABLE public.consultations REPLICA IDENTITY FULL;
