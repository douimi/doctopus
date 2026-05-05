import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';
import * as schema from './schema';

/**
 * Connection pools are cached on `globalThis` so they survive Next.js
 * module HMR reloads in dev — without this, every hot reload would leak
 * a full pool of idle Postgres connections and exhaust max_connections
 * within a few minutes.
 */
type Pools = {
  userSql: ReturnType<typeof postgres> | null;
  userClient: PostgresJsDatabase<typeof schema> | null;
  adminSql: ReturnType<typeof postgres> | null;
  adminClient: PostgresJsDatabase<typeof schema> | null;
};

const globalForDb = globalThis as unknown as { __doctopusDbPools?: Pools };
const pools: Pools =
  globalForDb.__doctopusDbPools ??
  (globalForDb.__doctopusDbPools = {
    userSql: null,
    userClient: null,
    adminSql: null,
    adminClient: null,
  });

const POSTGRES_OPTS = {
  prepare: false,
  // Keep pools small — the local Supabase Postgres caps non-superuser
  // connections aggressively. App pool + admin pool + Supabase Auth +
  // Realtime + Storage all share the same limit.
  idle_timeout: 20,
  max_lifetime: 60 * 30,
} as const;

/**
 * Connection used by request handlers. Every query MUST be wrapped in
 * withTenantTx — direct use is forbidden in app/(authenticated)/**.
 */
export function dbUser() {
  if (!pools.userClient) {
    pools.userSql = postgres(env().DATABASE_URL, { ...POSTGRES_OPTS, max: 5 });
    pools.userClient = drizzle(pools.userSql, { schema });
  }
  return pools.userClient;
}

/**
 * Service-role connection. Bypasses RLS — every query MUST include an
 * explicit `tenant_id = $tenantId` predicate (or equivalent), where the
 * tenantId comes from a server-resolved Session, never from user input.
 *
 * Acceptable uses:
 * - CLI scripts and cron handlers (no Session context).
 * - Server queries that aggregate across rows where RLS would force one
 *   `set_config('app.tenant_id', ...)` per query (see lib/payments/queries.ts,
 *   lib/stats/queries.ts, lib/admin/queries.ts).
 * - Settings / admin pages where the route guard already pinned the tenantId.
 *
 * Forbidden uses:
 * - Anywhere the tenantId comes from URL params, FormData, or other
 *   user-controlled input without prior validation against the Session.
 *
 * Prefer withTenantTx in lib/with-tenant.ts when you don't need raw SQL
 * aggregation — it sets the RLS GUC and gives you defense in depth.
 */
export function dbAdmin() {
  if (!pools.adminClient) {
    pools.adminSql = postgres(env().DATABASE_URL_DIRECT, { ...POSTGRES_OPTS, max: 3 });
    pools.adminClient = drizzle(pools.adminSql, { schema });
  }
  return pools.adminClient;
}

/** For tests only. Closes both pools. */
export async function __closeDbForTests() {
  if (pools.userSql) {
    await pools.userSql.end({ timeout: 1 });
    pools.userSql = null;
    pools.userClient = null;
  }
  if (pools.adminSql) {
    await pools.adminSql.end({ timeout: 1 });
    pools.adminSql = null;
    pools.adminClient = null;
  }
}
