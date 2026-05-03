import { config as loadDotenv } from 'dotenv';
loadDotenv({ path: '.env.local' });
loadDotenv({ path: '.env' });

import { sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';

async function main() {
  const rows = await dbAdmin().execute<{
    id: string;
    name: string;
    chatbot_provider: string | null;
    chatbot_model: string | null;
    chatbot_enabled: boolean;
    chatbot_credits_balance: number;
    last_ai_use: string | null;
  }>(sql`
    SELECT t.id, t.name, t.chatbot_provider, t.chatbot_model, t.chatbot_enabled,
           t.chatbot_credits_balance,
           (SELECT MAX(created_at)::text FROM chatbot_usage WHERE tenant_id = t.id) AS last_ai_use
    FROM tenants t
    ORDER BY t.name
  `);

  if (rows.length === 0) {
    console.log('(no tenants)');
    return;
  }

  for (const r of rows) {
    const enabled = r.chatbot_enabled ? '✓' : '✗';
    console.log(
      `${r.id.slice(0, 8)}  ${r.name.padEnd(28)}  ${enabled}  ${(r.chatbot_provider ?? '—').padEnd(10)}  ${(r.chatbot_model ?? '—').padEnd(28)}  bal=${String(r.chatbot_credits_balance).padStart(5)}  last=${r.last_ai_use ?? '(jamais)'}`,
    );
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
