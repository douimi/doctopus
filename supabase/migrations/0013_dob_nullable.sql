-- Migration 0013: allow patients without a date of birth.
--
-- Real-world walk-ins frequently arrive without an ID card, so the
-- doctor needs to be able to register the patient first and back-fill
-- the DOB later. The Zod schema, forms and display layer already
-- handle null; this drops the column's NOT NULL constraint.

ALTER TABLE public.patients
  ALTER COLUMN date_of_birth DROP NOT NULL;
