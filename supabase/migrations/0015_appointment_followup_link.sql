-- Migration 0015: let an appointment carry a follow-up parent link.
--
-- Until now, a follow-up could only be created from an existing
-- consultation (via the "Créer un suivi" button) or manually from
-- /suivis. The doctor wants to be able to mark a walk-in or a booked
-- appointment as a follow-up from the START — so that when the
-- consultation eventually opens, it's already wired to its parent and
-- pre-filled with the prior visit's clinical context.
--
-- Same SET NULL semantics as consultations.parent_consultation_id
-- (migration 0014) so deleting the parent doesn't cascade.

ALTER TABLE public.appointments
  ADD COLUMN parent_consultation_id uuid
    REFERENCES public.consultations(id) ON DELETE SET NULL;

CREATE INDEX appointments_parent_consultation_idx
  ON public.appointments(parent_consultation_id)
  WHERE parent_consultation_id IS NOT NULL;
