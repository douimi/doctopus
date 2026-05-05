import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env.local' });
loadDotenv({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { parseArgs } from './admin-shared';

/**
 * Set or create a super-admin login.
 *
 * Usage:
 *   pnpm tsx scripts/admin-set-password.ts --email <email> --password <password>
 *
 * Behaviour:
 *   - If a Supabase auth user with that email exists, its password is updated.
 *   - Otherwise a new user is created with the given password (email confirmed).
 *   - Either way, prints whether the email is whitelisted in SUPER_ADMIN_EMAILS.
 */
async function main() {
  const args = parseArgs(process.argv);
  const email = args.email?.trim().toLowerCase();
  const password = args.password;

  if (!email || !password) {
    console.error(
      'Usage: pnpm tsx scripts/admin-set-password.ts --email you@example.com --password "MyPass123!"',
    );
    process.exit(2);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(2);
  }

  const auth = createClient(
    env().NEXT_PUBLIC_SUPABASE_URL,
    env().SUPABASE_SERVICE_ROLE,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Look up the existing user by email (Supabase admin API has no
  // single-shot getUserByEmail, so we list and match).
  let existingId: string | null = null;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await auth.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error('Failed to list users:', error.message);
      process.exit(1);
    }
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) {
      existingId = found.id;
      break;
    }
    if (data.users.length < 200) break;
  }

  if (existingId) {
    const { error } = await auth.auth.admin.updateUserById(existingId, {
      password,
      email_confirm: true,
    });
    if (error) {
      console.error('Failed to update password:', error.message);
      process.exit(1);
    }
    console.log(`\nUpdated password for ${email}.`);
  } else {
    const { error } = await auth.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) {
      console.error('Failed to create user:', error.message);
      process.exit(1);
    }
    console.log(`\nCreated user ${email}.`);
  }

  // Whitelist hint — without the email being in SUPER_ADMIN_EMAILS, the user
  // can sign in but won't reach /admin.
  const whitelist = (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const matchesWildcard = whitelist.some((entry) => {
    if (!entry.startsWith('*@')) return false;
    return email.endsWith(entry.slice(1));
  });
  const whitelisted = whitelist.includes(email) || matchesWildcard;

  console.log(`Email     : ${email}`);
  console.log(`Password  : ${password}`);
  console.log(
    `Admin role: ${
      whitelisted
        ? 'YES — listed in SUPER_ADMIN_EMAILS, will land on /admin after sign-in.'
        : 'NO — add this email to SUPER_ADMIN_EMAILS in .env.local to grant admin access.'
    }`,
  );
  console.log(`\nSign in at http://localhost:3000/sign-in\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
