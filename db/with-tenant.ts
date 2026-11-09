import 'server-only';
import { sql } from 'drizzle-orm';
import { dbUser } from './client';

type DbUser = ReturnType<typeof dbUser>;
type Tx = Parameters<Parameters<DbUser['transaction']>[0]>[0];

/**
 * Run callback inside a transaction scoped to `tenantId`.
 *
 * Inside the callback:
 *  - role is `authenticated` (RLS applies)
 *  - app.tenant_id is set, so RLS policies pass for matching rows
 *
 * NEVER pass tenantId from the client; resolve it server-side from the session.
 */
export async function withTenantTx<T>(
  tenantId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) {
    throw new Error(`Invalid tenantId: ${tenantId}`);
  }
  const db = dbUser();
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated`);
    await tx.execute(sql.raw(`SET LOCAL "app.tenant_id" = '${tenantId}'`));
    return fn(tx);
  });
}

/**
 * Like withTenantTx, but also pins `app.user_id` so per-user RLS (cabinet
 * messaging: direct threads, own read state, own messages) applies.
 * `userId` MUST come from the server-resolved Session.
 */
export async function withTenantUserTx<T>(
  tenantId: string,
  userId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new Error(`Invalid userId: ${userId}`);
  }
  return withTenantTx(tenantId, async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL "app.user_id" = '${userId}'`));
    return fn(tx);
  });
}
