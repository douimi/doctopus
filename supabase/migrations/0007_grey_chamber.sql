-- Migration 0007: consultation pricing + payment columns.
--
-- Assumption: this migration runs against an environment with no existing
-- consultation rows (pre-launch fresh deploy, or `pnpm supabase:reset`).
-- The consultations_awaiting_requires_priced_nonfree CHECK would otherwise
-- reject pre-existing rows back-filled to payment_status='awaiting' with
-- price_mad=NULL.
--
-- If applying this against a populated environment, first back-fill
-- price_mad on existing finalized consultations (or temporarily relax
-- the CHECK) before re-applying.
--
ALTER TABLE "tenants" ADD COLUMN "default_consultation_price_mad" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN "price_mad" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN "is_free" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN "payment_status" text DEFAULT 'awaiting' NOT NULL;--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN "paid_by" uuid;--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN "payment_note" text;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_paid_by_user_profiles_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations"
  ADD CONSTRAINT "consultations_free_implies_no_price"
    CHECK (is_free = false OR price_mad IS NULL);
--> statement-breakpoint
ALTER TABLE "consultations"
  ADD CONSTRAINT "consultations_paid_requires_method_meta"
    CHECK (payment_status <> 'paid' OR
           (payment_method IS NOT NULL AND paid_at IS NOT NULL AND paid_by IS NOT NULL));
--> statement-breakpoint
ALTER TABLE "consultations"
  ADD CONSTRAINT "consultations_free_status_implies_is_free"
    CHECK (payment_status <> 'free' OR is_free = true);
--> statement-breakpoint
ALTER TABLE "consultations"
  ADD CONSTRAINT "consultations_awaiting_requires_priced_nonfree"
    CHECK (payment_status <> 'awaiting' OR
           (price_mad IS NOT NULL AND price_mad > 0 AND is_free = false));
--> statement-breakpoint
ALTER TABLE "consultations"
  ADD CONSTRAINT "consultations_free_implies_free_status_and_no_method"
    CHECK (is_free = false OR (payment_status = 'free' AND payment_method IS NULL));
--> statement-breakpoint
CREATE INDEX "consultations_payment_status_idx"
  ON "consultations" (tenant_id, payment_status);
--> statement-breakpoint
CREATE INDEX "consultations_paid_at_idx"
  ON "consultations" (tenant_id, paid_at)
  WHERE paid_at IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "consultations"
  ADD CONSTRAINT "consultations_payment_status_domain"
    CHECK (payment_status IN ('awaiting','paid','free'));
--> statement-breakpoint
ALTER TABLE "consultations"
  ADD CONSTRAINT "consultations_payment_method_domain"
    CHECK (payment_method IS NULL OR
           payment_method IN ('especes','carte','cheque','virement','autre'));