-- Migration 0008: relax the awaiting CHECK to allow in-progress consultations.
--
-- The Task 1 (migration 0007) constraint
-- consultations_awaiting_requires_priced_nonfree forced
-- (price_mad NOT NULL AND > 0 AND is_free = false) for any row in
-- payment_status = 'awaiting'. But brand-new consultations are inserted by
-- startFromAppointment() with the default payment_status = 'awaiting' and
-- price_mad = NULL — the doctor has not entered a price yet. The CHECK
-- rejected the insert, blocking "Démarrer la consultation".
--
-- Fix: allow payment_status='awaiting' WITHOUT a price as long as the
-- consultation is not yet finalized. Once is_finalized = true, the original
-- invariant kicks in: an awaiting consultation must be priced and non-free.

ALTER TABLE "consultations"
  DROP CONSTRAINT "consultations_awaiting_requires_priced_nonfree";
--> statement-breakpoint
ALTER TABLE "consultations"
  ADD CONSTRAINT "consultations_awaiting_requires_priced_nonfree"
    CHECK (payment_status <> 'awaiting' OR is_finalized = false OR
           (price_mad IS NOT NULL AND price_mad > 0 AND is_free = false));
