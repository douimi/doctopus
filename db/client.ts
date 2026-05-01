import 'server-only';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';
import * as schema from './schema';

let userClient: PostgresJsDatabase<typeof schema> | null = null;
let userSql: ReturnType<typeof postgres> | null = null;
let adminClient: PostgresJsDatabase<typeof schema> | null = null;
let adminSql: ReturnType<typeof postgres> | null = null;

/**
 * Connection used by request handlers. Every query MUST be wrapped in
 * withTenantTx — direct use is forbidden in app/(authenticated)/**.
 */
export function dbUser() {
  if (!userClient) {
    userSql = postgres(env().DATABASE_URL, { prepare: false, max: 10 });
    userClient = drizzle(userSql, { schema });
  }
  return userClient;
}

/**
 * Service-role connection used by CLI scripts and cron handlers ONLY.
 * Bypasses RLS. NEVER use inside app/(authenticated)/**.
 */
export function dbAdmin() {
  if (!adminClient) {
    adminSql = postgres(env().DATABASE_URL_DIRECT, { prepare: false, max: 4 });
    adminClient = drizzle(adminSql, { schema });
  }
  return adminClient;
}

/** For tests only. Closes both pools. */
export async function __closeDbForTests() {
  if (userSql) {
    await userSql.end({ timeout: 1 });
    userSql = null;
    userClient = null;
  }
  if (adminSql) {
    await adminSql.end({ timeout: 1 });
    adminSql = null;
    adminClient = null;
  }
}
