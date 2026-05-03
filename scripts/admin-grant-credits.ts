import { config as loadDotenv } from 'dotenv';
loadDotenv({ path: '.env.local' });
loadDotenv({ path: '.env' });

import { grantCredits } from '@/lib/chatbot/credits';
import { findTenant, parseArgs } from './admin-shared';

async function main() {
  const args = parseArgs(process.argv);
  const tenantQ = args.tenant;
  const consultations = Number(args.consultations);
  const note = args.note;
  if (!tenantQ || !Number.isInteger(consultations) || consultations <= 0) {
    console.error('Usage: pnpm admin:grant-credits --tenant <id|name> --consultations <N> [--note "..."]');
    process.exit(2);
  }
  const tenant = await findTenant(tenantQ);
  if (!tenant) {
    console.error(`Tenant not found: ${tenantQ}`);
    process.exit(1);
  }

  const grantedBy = `cli:${process.env.USER ?? process.env.USERNAME ?? 'admin'}`;
  const result = await grantCredits(tenant.id, consultations, grantedBy, note);
  console.log(`✅ Granted ${consultations} credits to ${tenant.name}. New balance: ${result.newBalance}.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
