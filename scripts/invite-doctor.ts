import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env.local' });
loadDotenv({ path: '.env' });

import { createOwnerInvite } from '@/lib/invites/admin';

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

  const result = await createOwnerInvite(email, days, null);
  console.log(`\n✅ Invitation créée pour ${email}`);
  console.log(`   Expire le : ${result.expiresAt.toISOString()}`);
  console.log(`   Lien      : ${result.url}\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
