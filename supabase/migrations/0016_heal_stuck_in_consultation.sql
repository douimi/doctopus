-- Migration 0016: heal appointments left in-consultation/waiting after
-- their consultation was already finalized.
--
-- finalizeConsultation() used to be able to reach a state where the
-- consultation row was flipped to is_finalized=true but the
-- appointment row wasn't transitioned to 'done' (state-machine bug on
-- synthetic-appointment flows before commit 3ed7e6f, or a transaction
-- that partially succeeded). The doctor sees the consultation as
-- "Terminée" on the detail page but the /today panel keeps showing
-- "En consultation" for that patient forever.
--
-- Every finalized consultation must have a done appointment. This
-- reconciles the drift once and for all. Idempotent — the WHERE clause
-- limits the update to actually-stuck rows, so re-running is a no-op.

UPDATE public.appointments AS a
SET
  status = 'done',
  ended_at = COALESCE(a.ended_at, c.finalized_at, now()),
  updated_at = now()
FROM public.consultations AS c
WHERE c.appointment_id = a.id
  AND c.is_finalized = true
  AND a.status IN ('waiting', 'in_consultation');
