-- ===========================================================
-- Doctopus RLS — Plan 1.D
-- ===========================================================

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications FORCE ROW LEVEL SECURITY;

CREATE POLICY medications_authenticated_read ON public.medications FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.medications TO authenticated;

ALTER TABLE public.medication_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_imports FORCE ROW LEVEL SECURITY;

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY prescriptions_tenant_select ON public.prescriptions FOR SELECT TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY prescriptions_tenant_insert ON public.prescriptions FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY prescriptions_tenant_update ON public.prescriptions FOR UPDATE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY prescriptions_tenant_delete ON public.prescriptions FOR DELETE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO authenticated;

ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items FORCE ROW LEVEL SECURITY;

CREATE POLICY pitems_tenant_select ON public.prescription_items FOR SELECT TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY pitems_tenant_insert ON public.prescription_items FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY pitems_tenant_update ON public.prescription_items FOR UPDATE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY pitems_tenant_delete ON public.prescription_items FOR DELETE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescription_items TO authenticated;
