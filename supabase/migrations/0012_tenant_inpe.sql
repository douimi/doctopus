-- Migration 0012: replace cabinet identifiers RPM + CNOM with the INPE
-- code (Identifiant National des Professionnels de Santé). The INPE is
-- the single regulatory ID issued by the Moroccan Ministry of Health
-- to every healthcare professional, and it is what should print on
-- ordonnances.
--
-- We add the new column, then drop the legacy ones. The cabinet
-- settings UI and the prescription PDF are updated alongside this
-- migration. Pre-launch, no production tenants relied on RPM/CNOM
-- numbers being preserved.

ALTER TABLE "tenants"
  ADD COLUMN "inpe_number" text;
--> statement-breakpoint
ALTER TABLE "tenants"
  DROP COLUMN IF EXISTS "rpm_number";
--> statement-breakpoint
ALTER TABLE "tenants"
  DROP COLUMN IF EXISTS "cnom_number";
