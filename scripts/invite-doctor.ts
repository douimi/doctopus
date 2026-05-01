import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env.local' });
loadDotenv({ path: '.env' });

import { dbAdmin } from '@/db/client';
import { tenantInvites } from '@/db/schema';
import { generateInviteToken, hashInviteToken } from '@/lib/invites/tokens';
import { env } from '@/lib/env';

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '';
      out[key] = value;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const email = args.email;
  if (!email) {
    console.error('Usage: pnpm invite:doctor --email dr@example.ma [--days 7]');
    process.exit(2);
  }
  const days = args.days ? Number(args.days) : 7;
  if (!Number.isFinite(days) || days <= 0) {
    console.error('--days must be a positive number');
    process.exit(2);
  }

  const token = generateInviteToken();
  const hash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await dbAdmin().insert(tenantInvites).values({
    tokenHash: hash,
    kind: 'tenant_owner',
    emailHint: email,
    expiresAt,
  });

  const url = `${env().APP_URL}/invite/${token}`;
  console.log(`\n✅ Invitation créée pour ${email}`);
  console.log(`   Expire le : ${expiresAt.toISOString()}`);
  console.log(`   Lien      : ${url}\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
