import 'server-only';
import { withTenantTx } from '@/db/with-tenant';
import { auditLog } from '@/db/schema';

export type AuditAction =
  | 'auth.sign_in_success'
  | 'auth.sign_in_failed'
  | 'tenant.invite_created'
  | 'tenant.invite_consumed'
  | 'patient.create'
  | 'patient.update'
  | 'patient.archive'
  | 'consultation.start'
  | 'consultation.finalize'
  | 'prescription.item_added'
  | 'prescription.printed';

export type RecordAuditInput = {
  tenantId: string;
  actorUserId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Best-effort audit row. Never throws; failure is logged but not propagated,
 * so a transient audit-write hiccup can't roll back patient data.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    await withTenantTx(input.tenantId, async (tx) => {
      await tx.insert(auditLog).values({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? null,
      });
    });
  } catch (err) {
    console.error('[audit] failed to record', input.action, (err as Error).message);
  }
}

/**
 * Pre-auth events have no tenant scope. We log to stderr (visible in Vercel
 * logs / Sentry) but don't write to audit_log (which requires tenant_id).
 */
export function recordAuditUnscoped(action: AuditAction, metadata?: Record<string, unknown>) {
  console.warn(`[audit:unscoped] ${action}`, metadata ?? {});
}
