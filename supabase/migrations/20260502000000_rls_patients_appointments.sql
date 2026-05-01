-- ===========================================================
-- Doctopus RLS — Plan 1.B
-- Tenant-scoped policies for patients, patient_allergies,
-- patient_chronic_conditions, appointments.
-- ===========================================================

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients FORCE ROW LEVEL SECURITY;

CREATE POLICY patients_tenant_select ON public.patients FOR SELECT TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY patients_tenant_insert ON public.patients FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY patients_tenant_update ON public.patients FOR UPDATE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY patients_tenant_delete ON public.patients FOR DELETE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_allergies FORCE ROW LEVEL SECURITY;

CREATE POLICY patient_allergies_tenant_select ON public.patient_allergies FOR SELECT TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY patient_allergies_tenant_insert ON public.patient_allergies FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY patient_allergies_tenant_delete ON public.patient_allergies FOR DELETE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE public.patient_chronic_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_chronic_conditions FORCE ROW LEVEL SECURITY;

CREATE POLICY pcc_tenant_select ON public.patient_chronic_conditions FOR SELECT TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY pcc_tenant_insert ON public.patient_chronic_conditions FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY pcc_tenant_delete ON public.patient_chronic_conditions FOR DELETE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;

CREATE POLICY appointments_tenant_select ON public.appointments FOR SELECT TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY appointments_tenant_insert ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY appointments_tenant_update ON public.appointments FOR UPDATE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY appointments_tenant_delete ON public.appointments FOR DELETE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.patient_allergies TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.patient_chronic_conditions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
