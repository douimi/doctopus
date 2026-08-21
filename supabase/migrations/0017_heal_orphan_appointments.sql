-- Migration 0017: heal appointments left in-consultation/waiting after
-- their consultation was deleted.
--
-- Second drift class after migration 0016: when the doctor deletes an
-- in-progress consultation via the delete-consultation dialog, the
-- consultation row is removed but the appointment is left untouched.
-- The state machine has no in_consultation → cancelled edge, so those
-- appointments are stuck in in_consultation forever and /today's
-- "En consultation" panel keeps showing patients who no longer have
-- any consultation on file.
--
-- Anything waiting/in_consultation without a corresponding consultation
-- is either a deleted consultation or (much less likely) a legacy
-- partial startFromAppointment. Both are semantically "cancelled" now
-- — the visit was aborted, no record survives — so we move them there.
-- Idempotent — safe to re-run.

UPDATE public.appointments AS a
SET
  status = 'cancelled',
  updated_at = now()
WHERE a.status IN ('waiting', 'in_consultation')
  AND NOT EXISTS (
    SELECT 1 FROM public.consultations c WHERE c.appointment_id = a.id
  );
