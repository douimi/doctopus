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
