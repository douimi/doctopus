import { config as loadDotenv } from 'dotenv';
loadDotenv({ path: '.env.local' });
loadDotenv({ path: '.env' });

import { sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { MAD_PER_CREDIT } from '@/lib/chatbot/pricing';
import { findTenant, parseArgs } from './admin-shared';

async function main() {
  const args = parseArgs(process.argv);
  const tenantQ = args.tenant;
  const month = args.month; // YYYY-MM
  if (!tenantQ) {
    console.error('Usage: pnpm admin:usage-report --tenant <id|name> [--month YYYY-MM]');
    process.exit(2);
  }
  const tenant = await findTenant(tenantQ);
  if (!tenant) { console.error(`Tenant not found: ${tenantQ}`); process.exit(1); }

  const monthFilter = month
    ? sql`AND date_trunc('month', created_at) = ${`${month}-01`}::date`
    : sql``;

  const [usage] = await dbAdmin().execute<{
    consults: number;
    turns: number;
    in_tok: number;
    out_tok: number;
    cost_usd_micro: number;
  }>(sql`
    SELECT COUNT(DISTINCT consultation_id)::int AS consults,
           COUNT(*)::int AS turns,
           COALESCE(SUM(input_tokens), 0)::int AS in_tok,
           COALESCE(SUM(output_tokens), 0)::int AS out_tok,
           COALESCE(SUM(estimated_cost_microusd), 0)::int AS cost_usd_micro
    FROM chatbot_usage
    WHERE tenant_id = ${tenant.id}::uuid
    ${monthFilter}
  `);

  const [debits] = await dbAdmin().execute<{ debits: number }>(sql`
    SELECT COUNT(*)::int AS debits FROM chatbot_credit_ledger
    WHERE tenant_id = ${tenant.id}::uuid AND reason = 'debit'
    ${monthFilter}
  `);

  const costUsd = (usage.cost_usd_micro ?? 0) / 1_000_000;
  const costMad = costUsd * 10; // rough USD→MAD; tweak with real rate later
  const revenueMad = (debits.debits ?? 0) * MAD_PER_CREDIT;
  const margin = revenueMad - costMad;
  const marginPct = revenueMad > 0 ? Math.round((margin / revenueMad) * 100) : 0;

  console.log(`${tenant.name} — ${month ?? 'all time'}`);
  console.log(`AI consultations used        : ${debits.debits} (${debits.debits} credits debited)`);
  console.log(`Total turns                  : ${usage.turns}`);
  console.log(`Total tokens (in/out)        : ${usage.in_tok} / ${usage.out_tok}`);
  console.log(`Estimated provider cost      : $${costUsd.toFixed(2)} (≈ ${costMad.toFixed(2)} MAD)`);
  console.log(`Pack revenue at ${MAD_PER_CREDIT} MAD/cons. : ${revenueMad.toFixed(2)} MAD`);
  console.log(`Estimated margin             : ${margin.toFixed(2)} MAD (${marginPct}%)`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
