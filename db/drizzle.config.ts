import type { Config } from 'drizzle-kit';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env.local' });
loadDotenv({ path: '.env' });

const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL_DIRECT or DATABASE_URL must be set for drizzle-kit');

export default {
  schema: './db/schema/index.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
} satisfies Config;
