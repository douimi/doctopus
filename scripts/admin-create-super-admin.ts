import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env.local' });
loadDotenv({ path: '.env' });

import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { parseArgs } from './admin-shared';

async function main() {
  const args = parseArgs(process.argv);
  const email = args.email;
  if (!email) {
    console.error('Usage: pnpm admin:create-super-admin --email you@example.com');
    process.exit(2);
  }

  // 16-char random password the operator will replace later.
  const password = randomBytes(12).toString('base64').slice(0, 16);

  const auth = createClient(env().NEXT_PUBLIC_SUPABASE_URL, env().SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const created = await auth.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    console.error('Failed:', created.error?.message ?? 'unknown error');
    process.exit(1);
  }

  console.log(`\n✅ Super admin user created.`);
  console.log(`   Email    : ${email}`);
  console.log(`   Password : ${password}  ← copy this now; it will not be shown again`);
  console.log(`\nNext steps:`);
  console.log(`   1. Add ${email} to the SUPER_ADMIN_EMAILS env var (locally and in Vercel).`);
  console.log(`   2. Sign in at /sign-in with the password above.`);
  console.log(`   3. Change the password through Supabase / future settings page.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
