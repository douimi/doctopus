-- Migration 0014: link follow-up consultations to their parent.
--
-- A "follow-up" is a return visit to review test results, monitor a
-- chronic condition, or check on a treatment — the same kind of work as
-- a full consultation, but typically free of charge because the patient
-- has already paid for the initial visit.
--
-- Model: just a self-FK on consultations. A follow-up is a regular
-- consultation row whose parent_consultation_id points at the original
-- visit. SET NULL on delete so the follow-up survives if the parent is
-- removed (the medical record stays in the patient's history).

ALTER TABLE public.consultations
  ADD COLUMN parent_consultation_id uuid
    REFERENCES public.consultations(id) ON DELETE SET NULL;

CREATE INDEX consultations_parent_idx
  ON public.consultations(parent_consultation_id)
  WHERE parent_consultation_id IS NOT NULL;
