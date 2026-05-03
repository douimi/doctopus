import { config as loadDotenv } from 'dotenv';
loadDotenv({ path: '.env.local' });
loadDotenv({ path: '.env' });

import { eq } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { tenants } from '@/db/schema';
import { ALLOWED_MODELS_BY_PROVIDER } from '@/lib/chatbot/pricing';
import { findTenant, parseArgs } from './admin-shared';

async function main() {
  const args = parseArgs(process.argv);
  const tenantQ = args.tenant;
  if (!tenantQ) {
    console.error('Usage: pnpm admin:set-model --tenant <id|name> [--provider anthropic|openai|mistral] [--model <m>] [--enable|--disable]');
    process.exit(2);
  }
  const tenant = await findTenant(tenantQ);
  if (!tenant) {
    console.error(`Tenant not found: ${tenantQ}`);
    process.exit(1);
  }

  const updates: Partial<typeof tenants.$inferInsert> = { updatedAt: new Date() };

  if (args.provider) {
    if (!['anthropic', 'openai', 'mistral'].includes(args.provider)) {
      console.error(`Provider must be one of: anthropic, openai, mistral`);
      process.exit(2);
    }
    updates.chatbotProvider = args.provider as 'anthropic' | 'openai' | 'mistral';
  }
  if (args.model) {
    const provider = (updates.chatbotProvider ?? tenant.chatbotProvider) as 'anthropic' | 'openai' | 'mistral' | null;
    if (!provider) {
      console.error(`Set --provider first or pass it on the same command.`);
      process.exit(2);
    }
    if (!ALLOWED_MODELS_BY_PROVIDER[provider].includes(args.model)) {
      console.error(`Model ${args.model} not allowed for ${provider}. Allowed: ${ALLOWED_MODELS_BY_PROVIDER[provider].join(', ')}`);
      process.exit(2);
    }
    updates.chatbotModel = args.model;
  }
  if (args.enable === '1') updates.chatbotEnabled = true;
  if (args.disable === '1') updates.chatbotEnabled = false;

  await dbAdmin().update(tenants).set(updates).where(eq(tenants.id, tenant.id));
  console.log(`✅ Updated ${tenant.name}.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
