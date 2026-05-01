-- ===========================================================
-- Doctopus RLS — Plan 1.C
-- ===========================================================

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations FORCE ROW LEVEL SECURITY;

CREATE POLICY consultations_tenant_select ON public.consultations FOR SELECT TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY consultations_tenant_insert ON public.consultations FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY consultations_tenant_update ON public.consultations FOR UPDATE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY consultations_tenant_delete ON public.consultations FOR DELETE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE public.consultation_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_vitals FORCE ROW LEVEL SECURITY;

CREATE POLICY cvitals_tenant_select ON public.consultation_vitals FOR SELECT TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY cvitals_tenant_insert ON public.consultation_vitals FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY cvitals_tenant_update ON public.consultation_vitals FOR UPDATE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY cvitals_tenant_delete ON public.consultation_vitals FOR DELETE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_vitals TO authenticated;
