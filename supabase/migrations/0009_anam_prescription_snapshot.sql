-- Migration 0009: ANAM live-search support for prescriptions.
--
-- We replaced the AMMPS scraper with the ANAM e-services live API, which
-- returns medications keyed by EAN-13 barcode. Prescriptions now snapshot the
-- EAN and the full ANAM row at prescribe time so prints stay stable even if
-- ANAM updates the row later. The legacy medication_id FK stays in place
-- (nullable) for back-compat with any existing rows but is no longer written.

ALTER TABLE "prescription_items"
  ADD COLUMN "medication_ean13" text;
--> statement-breakpoint
ALTER TABLE "prescription_items"
  ADD COLUMN "medication_metadata" jsonb;
