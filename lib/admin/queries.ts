import 'server-only';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import {
  auditLog,
  chatbotCreditLedger,
  chatbotUsage,
  tenantInvites,
  tenants,
  userProfiles,
  type AuditLogEntry,
  type ChatbotCreditLedgerEntry,
  type ChatbotUsageRow,
  type Tenant,
} from '@/db/schema';
import { MAD_PER_CREDIT, PRICING_USD_PER_MTOKEN } from '@/lib/chatbot/pricing';

const USD_TO_MAD = 10; // rough rate; same as admin-usage-report.ts

export type TenantListRow = {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  doctorEmail: string | null;
  chatbotEnabled: boolean;
  chatbotProvider: string | null;
  chatbotModel: string | null;
  chatbotCreditsBalance: number;
  lastAiUse: Date | null;
};

export async function listTenantsForAdmin(opts: {
  q?: string;
  status?: 'active' | 'suspended';
  limit?: number;
} = {}): Promise<TenantListRow[]> {
  const limit = Math.min(opts.limit ?? 100, 500);

  const trimmed = opts.q?.trim() ?? '';

  // Use a lateral join to pick up the doctor email per tenant.
  const doctorProfiles = dbAdmin()
    .select({ tenantId: userProfiles.tenantId, email: userProfiles.email })
    .from(userProfiles)
    .where(eq(userProfiles.role, 'doctor'))
    .as('doctor_profiles');

  const lastAiUse = sql<string | null>`(
    SELECT MAX(created_at)::text FROM chatbot_usage WHERE tenant_id = tenants.id
  )`;

  const rows = await dbAdmin()
    .select({
      id: tenants.id,
      name: tenants.name,
      status: tenants.status,
      doctorEmail: doctorProfiles.email,
      chatbotEnabled: tenants.chatbotEnabled,
      chatbotProvider: tenants.chatbotProvider,
      chatbotModel: tenants.chatbotModel,
      chatbotCreditsBalance: tenants.chatbotCreditsBalance,
      lastAiUse,
    })
    .from(tenants)
    .leftJoin(doctorProfiles, eq(doctorProfiles.tenantId, tenants.id))
    .where(
      and(
        opts.status ? eq(tenants.status, opts.status) : undefined,
        trimmed
          ? or(ilike(tenants.name, `%${trimmed}%`))
          : undefined,
      ),
    )
    .limit(limit);

  // Apply doctor-email filter in JS (subquery makes it awkward to filter inline).
  const filtered = trimmed
    ? rows.filter(
        (r) =>
          r.name.toLowerCase().includes(trimmed.toLowerCase()) ||
          (r.doctorEmail ?? '').toLowerCase().includes(trimmed.toLowerCase()),
      )
    : rows;

  return filtered.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status as 'active' | 'suspended',
    doctorEmail: r.doctorEmail,
    chatbotEnabled: r.chatbotEnabled,
    chatbotProvider: r.chatbotProvider,
    chatbotModel: r.chatbotModel,
    chatbotCreditsBalance: r.chatbotCreditsBalance,
    lastAiUse: r.lastAiUse ? new Date(r.lastAiUse) : null,
  }));
}

export type TenantDetailResult = {
  tenant: Tenant;
  doctor: { id: string; email: string; fullName: string } | null;
  assistants: Array<{ id: string; email: string; fullName: string }>;
  ledger: ChatbotCreditLedgerEntry[];
  recentUsage: ChatbotUsageRow[];
  adminAudit: AuditLogEntry[];
};

export async function getTenantDetail(tenantId: string): Promise<TenantDetailResult | null> {
  const [tenant] = await dbAdmin().select().from(tenants).where(eq(tenants.id, tenantId));
  if (!tenant) return null;

  const profiles = await dbAdmin()
    .select({ id: userProfiles.id, email: userProfiles.email, fullName: userProfiles.fullName, role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.tenantId, tenantId));
  const doctor = profiles.find((p) => p.role === 'doctor') ?? null;
  const assistants = profiles.filter((p) => p.role === 'assistant');

  const ledger = await dbAdmin()
    .select()
    .from(chatbotCreditLedger)
    .where(eq(chatbotCreditLedger.tenantId, tenantId))
    .orderBy(desc(chatbotCreditLedger.createdAt))
    .limit(50);

  const recentUsage = await dbAdmin()
    .select()
    .from(chatbotUsage)
    .where(eq(chatbotUsage.tenantId, tenantId))
    .orderBy(desc(chatbotUsage.createdAt))
    .limit(20);

  const adminAudit = await dbAdmin()
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.tenantId, tenantId), ilike(auditLog.action, 'admin.%')))
    .orderBy(desc(auditLog.at))
    .limit(20);

  return {
    tenant,
    doctor: doctor
      ? { id: doctor.id, email: doctor.email, fullName: doctor.fullName }
      : null,
    assistants: assistants.map((a) => ({ id: a.id, email: a.email, fullName: a.fullName })),
    ledger,
    recentUsage,
    adminAudit,
  };
}

export type GlobalUsageReport = {
  activeTenants: number;
  creditsConsumed30d: number;
  estCostUsd30d: number;
  estRevenueMad30d: number;
  estMarginMad30d: number;
  marginPct: number;
  perProvider: Array<{
    provider: string;
    tenants: number;
    creditsConsumed: number;
    inputTokens: number;
    outputTokens: number;
    estCostUsd: number;
    estRevenueMad: number;
  }>;
  daily: Array<{ date: string; consumed: number; costMicrousd: number }>;
};

export async function getGlobalUsageReport(days = 30): Promise<GlobalUsageReport> {
  const interval = sql.raw(String(days));

  const [active] = await dbAdmin().execute<{ n: number }>(
    sql`SELECT COUNT(*)::int AS n FROM tenants WHERE status = 'active'`,
  );

  const [debits] = await dbAdmin().execute<{ n: number }>(
    sql`SELECT COUNT(*)::int AS n FROM chatbot_credit_ledger WHERE reason = 'debit' AND created_at >= now() - interval '${interval} days'`,
  );

  const [usageTotals] = await dbAdmin().execute<{ cost_usd_micro: number }>(
    sql`SELECT COALESCE(SUM(estimated_cost_microusd), 0)::bigint AS cost_usd_micro FROM chatbot_usage WHERE created_at >= now() - interval '${interval} days'`,
  );

  const perProvider = await dbAdmin().execute<{
    provider: string;
    tenants: number;
    credits: number;
    in_tok: number;
    out_tok: number;
    cost_usd_micro: number;
  }>(sql`
    SELECT u.provider AS provider,
           COUNT(DISTINCT u.tenant_id)::int AS tenants,
           COALESCE(SUM(u.input_tokens), 0)::int AS in_tok,
           COALESCE(SUM(u.output_tokens), 0)::int AS out_tok,
           COALESCE(SUM(u.estimated_cost_microusd), 0)::bigint AS cost_usd_micro,
           (SELECT COUNT(*)::int FROM chatbot_credit_ledger l
              WHERE l.reason = 'debit'
              AND l.created_at >= now() - interval '${interval} days'
              AND l.tenant_id IN (
                SELECT DISTINCT tenant_id FROM chatbot_usage u2
                WHERE u2.provider = u.provider
                AND u2.created_at >= now() - interval '${interval} days'
              )) AS credits
    FROM chatbot_usage u
    WHERE u.created_at >= now() - interval '${interval} days'
    GROUP BY u.provider
    ORDER BY u.provider
  `);

  const daily = await dbAdmin().execute<{ d: string; consumed: number; cost_usd_micro: number }>(sql`
    SELECT date_trunc('day', l.created_at)::date::text AS d,
           COUNT(*)::int AS consumed,
           COALESCE(SUM(u.estimated_cost_microusd)::bigint, 0)::int AS cost_usd_micro
    FROM chatbot_credit_ledger l
    LEFT JOIN chatbot_usage u ON date_trunc('day', u.created_at) = date_trunc('day', l.created_at)
    WHERE l.reason = 'debit' AND l.created_at >= now() - interval '${interval} days'
    GROUP BY d
    ORDER BY d
  `);

  const costUsd30d = Number(usageTotals?.cost_usd_micro ?? 0) / 1_000_000;
  const creditsConsumed30d = debits?.n ?? 0;
  const revenueMad30d = creditsConsumed30d * MAD_PER_CREDIT;
  const costMad30d = costUsd30d * USD_TO_MAD;
  const marginMad30d = revenueMad30d - costMad30d;
  const marginPct = revenueMad30d > 0 ? Math.round((marginMad30d / revenueMad30d) * 100) : 0;

  return {
    activeTenants: active?.n ?? 0,
    creditsConsumed30d,
    estCostUsd30d: costUsd30d,
    estRevenueMad30d: revenueMad30d,
    estMarginMad30d: marginMad30d,
    marginPct,
    perProvider: perProvider.map((p) => ({
      provider: p.provider,
      tenants: p.tenants,
      creditsConsumed: p.credits,
      inputTokens: p.in_tok,
      outputTokens: p.out_tok,
      estCostUsd: Number(p.cost_usd_micro) / 1_000_000,
      estRevenueMad: p.credits * MAD_PER_CREDIT,
    })),
    daily: daily.map((d) => ({
      date: d.d,
      consumed: d.consumed,
      costMicrousd: d.cost_usd_micro,
    })),
  };
}

export type InviteListRow = typeof tenantInvites.$inferSelect & {
  status: 'pending' | 'consumed' | 'expired' | 'revoked';
  tenantName: string | null;
};

export async function listInvitesForAdmin(opts: { limit?: number } = {}): Promise<InviteListRow[]> {
  const limit = Math.min(opts.limit ?? 100, 500);
  const rows = await dbAdmin()
    .select({
      invite: tenantInvites,
      tenantName: tenants.name,
    })
    .from(tenantInvites)
    .leftJoin(tenants, eq(tenants.id, tenantInvites.tenantId))
    .orderBy(desc(tenantInvites.createdAt))
    .limit(limit);

  const now = Date.now();
  return rows.map((r) => {
    const inv = r.invite;
    const status: 'pending' | 'consumed' | 'expired' | 'revoked' =
      inv.revokedAt ? 'revoked' :
      inv.consumedAt ? 'consumed' :
      inv.expiresAt.getTime() < now ? 'expired' :
      'pending';
    return { ...inv, status, tenantName: r.tenantName };
  });
}

// Reference re-exports so unused-import lint doesn't trigger:
export const _refs = { PRICING_USD_PER_MTOKEN };
