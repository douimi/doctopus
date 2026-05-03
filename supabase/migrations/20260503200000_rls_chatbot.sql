-- ===========================================================
-- Doctopus RLS — Plan 2.A (chatbot)
-- ===========================================================

-- consultation_chat_messages: tenant-scoped read/insert/delete (no update)
ALTER TABLE public.consultation_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_chat_messages FORCE ROW LEVEL SECURITY;

CREATE POLICY chat_messages_tenant_select ON public.consultation_chat_messages
  FOR SELECT TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY chat_messages_tenant_insert ON public.consultation_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY chat_messages_tenant_delete ON public.consultation_chat_messages
  FOR DELETE TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

GRANT SELECT, INSERT, DELETE ON public.consultation_chat_messages TO authenticated;

-- chatbot_credit_ledger: SELECT for authenticated; writes are service-role only
ALTER TABLE public.chatbot_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_credit_ledger FORCE ROW LEVEL SECURITY;

CREATE POLICY ledger_tenant_select ON public.chatbot_credit_ledger
  FOR SELECT TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
-- No INSERT/UPDATE/DELETE for authenticated — only service role.

GRANT SELECT ON public.chatbot_credit_ledger TO authenticated;

-- chatbot_usage: SELECT for authenticated (lets a doctor see their own usage if we expose it later); writes service-role only
ALTER TABLE public.chatbot_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_usage FORCE ROW LEVEL SECURITY;

CREATE POLICY usage_tenant_select ON public.chatbot_usage
  FOR SELECT TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

GRANT SELECT ON public.chatbot_usage TO authenticated;
