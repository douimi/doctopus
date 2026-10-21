-- Migration 0018: structured, patient-level medical history.
--
-- Until now the only place to write antécédents was the per-consultation
-- "history_notes" field, so the doctor had to dig through old
-- consultations to find them. These columns live on the patient and are
-- shown (and editable) on every consultation. All nullable, additive —
-- existing rows and RLS policies (row-level, on patients) are unaffected.
-- IF NOT EXISTS: it was first applied by hand in production, so a later
-- `supabase db push` must be able to replay it without failing.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS history_medical text,
  ADD COLUMN IF NOT EXISTS history_surgical text,
  ADD COLUMN IF NOT EXISTS history_family text,
  ADD COLUMN IF NOT EXISTS history_treatments text,
  ADD COLUMN IF NOT EXISTS history_lifestyle text,
  ADD COLUMN IF NOT EXISTS history_updated_at timestamptz;
