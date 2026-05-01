-- ===========================================================
-- Doctopus RLS — Plan 1.A
-- Enable RLS + FORCE on tenant-scoped tables. Policies read
-- app.tenant_id set by withTenantTx in the request lifecycle.
-- The 'authenticated' role is what request transactions assume
-- via SET LOCAL ROLE; service_role bypasses RLS by attribute.
-- ===========================================================

-- TENANTS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;

CREATE POLICY tenants_self_read ON public.tenants
  FOR SELECT TO authenticated
  USING (id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenants_self_update ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (id = current_setting('app.tenant_id', true)::uuid);

-- No INSERT / DELETE for authenticated. Tenant rows are only
-- ever created/deleted by the service role (invite acceptance, support).

-- USER_PROFILES
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY user_profiles_tenant_read ON public.user_profiles
  FOR SELECT TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY user_profiles_tenant_update ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY user_profiles_tenant_insert ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY user_profiles_tenant_delete ON public.user_profiles
  FOR DELETE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- TENANT_INVITES: globally restricted. Only service_role accesses these.
-- We still enable RLS to prevent any leak through misconfigured roles.
ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invites FORCE ROW LEVEL SECURITY;
-- No policies defined → authenticated cannot read or write.
-- service_role bypasses RLS by its BYPASSRLS attribute (Supabase default).

-- Grant base privileges to authenticated (RLS still applies).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
-- tenant_invites: no grants to authenticated.
