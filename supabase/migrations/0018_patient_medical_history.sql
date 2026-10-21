-- Migration 0018: structured, patient-level medical history.
--
-- Until now the only place to write antécédents was the per-consultation
-- "history_notes" field, so the doctor had to dig through old
-- consultations to find them. These columns live on the patient and are
-- shown (and editable) on every consultation. All nullable, additive —
-- existing rows and RLS policies (row-level, on patients) are unaffected.

ALTER TABLE public.patients
  ADD COLUMN history_medical text,
  ADD COLUMN history_surgical text,
  ADD COLUMN history_family text,
  ADD COLUMN history_treatments text,
  ADD COLUMN history_lifestyle text,
  ADD COLUMN history_updated_at timestamptz;
