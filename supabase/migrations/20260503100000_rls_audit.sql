-- Audit log is tenant-scoped, append-only.
-- SELECT/INSERT only for authenticated; no UPDATE/DELETE policy → tampering blocked.

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_tenant_select ON public.audit_log FOR SELECT TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY audit_tenant_insert ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
