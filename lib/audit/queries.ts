import 'server-only';
import { desc, eq } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { auditLog, type AuditLogEntry } from '@/db/schema';

export type AuditPage = {
  rows: AuditLogEntry[];
  hasMore: boolean;
};

export async function listAuditLog(
  tenantId: string,
  opts: { limit?: number } = {},
): Promise<AuditPage> {
  const limit = Math.min(opts.limit ?? 50, 200);
  return withTenantTx(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(auditLog)
      .where(eq(auditLog.tenantId, tenantId))
      .orderBy(desc(auditLog.at))
      .limit(limit + 1);
    return {
      rows: rows.slice(0, limit),
      hasMore: rows.length > limit,
    };
  });
}
