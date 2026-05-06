import { sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { chatbotCreditLedger, consultations, tenants } from '@/db/schema';

export class NoCreditsError extends Error {
  code = 'no_credits' as const;
  constructor(tenantId: string) {
    super(`Tenant ${tenantId} has no chatbot credits remaining`);
  }
}

/**
 * Atomically debit one credit when the doctor first uses the chatbot
 * in a consultation. Idempotent: if `consultations.ai_credit_consumed_at`
 * is already set, returns the current balance without re-debiting.
 */
export async function debitOneCredit(
  tenantId: string,
  consultationId: string,
): Promise<{ newBalance: number; alreadyDebited: boolean }> {
  const db = dbAdmin();
  return db.transaction(async (tx) => {
    // Idempotency check.
    const [c] = await tx.execute<{ ai_credit_consumed_at: string | null }>(
      sql`SELECT ai_credit_consumed_at FROM consultations WHERE id = ${consultationId}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE`,
    );
    if (!c) throw new Error(`Consultation ${consultationId} not found in tenant ${tenantId}`);
    if (c.ai_credit_consumed_at !== null) {
      const balance = await getBalanceInTx(tx, tenantId);
      return { newBalance: balance, alreadyDebited: true };
    }

    // SELECT FOR UPDATE lock + balance check.
    const [t] = await tx.execute<{ chatbot_credits_balance: number }>(
      sql`SELECT chatbot_credits_balance FROM tenants WHERE id = ${tenantId}::uuid FOR UPDATE`,
    );
    if (!t) throw new Error(`Tenant ${tenantId} not found`);
    if (t.chatbot_credits_balance <= 0) {
      throw new NoCreditsError(tenantId);
    }

    // Append ledger row.
    await tx.insert(chatbotCreditLedger).values({
      tenantId,
      change: -1,
      reason: 'debit',
      consultationId,
    });

    // Decrement counter.
    const newBalance = t.chatbot_credits_balance - 1;
    await tx.execute(
      sql`UPDATE tenants SET chatbot_credits_balance = ${newBalance} WHERE id = ${tenantId}::uuid`,
    );

    // Mark consultation as having consumed a credit.
    await tx.execute(
      sql`UPDATE consultations SET ai_credit_consumed_at = now() WHERE id = ${consultationId}::uuid`,
    );

    return { newBalance, alreadyDebited: false };
  });
}

/**
 * Atomically set the cabinet's credit balance to an arbitrary value.
 * Computes `delta = newBalance - currentBalance` and writes a single
 * ledger row tagged `admin_adjustment` so the change is auditable. The
 * balance is updated in the same transaction with a `FOR UPDATE` lock.
 *
 * Use this when the super-admin wants to edit the remaining credits
 * directly (raise or lower), as opposed to grantCredits() which only
 * adds.
 */
export async function setCredits(
  tenantId: string,
  newBalance: number,
  adjustedBy: string,
  notes?: string,
): Promise<{ previousBalance: number; newBalance: number; delta: number }> {
  if (!Number.isInteger(newBalance) || newBalance < 0) {
    throw new Error('newBalance must be a non-negative integer');
  }
  const db = dbAdmin();
  return db.transaction(async (tx) => {
    const [t] = await tx.execute<{ chatbot_credits_balance: number }>(
      sql`SELECT chatbot_credits_balance FROM tenants WHERE id = ${tenantId}::uuid FOR UPDATE`,
    );
    if (!t) throw new Error(`Tenant ${tenantId} not found`);

    const previousBalance = t.chatbot_credits_balance;
    const delta = newBalance - previousBalance;
    if (delta === 0) {
      return { previousBalance, newBalance, delta };
    }

    await tx.insert(chatbotCreditLedger).values({
      tenantId,
      change: delta,
      reason: 'admin_adjustment',
      grantedBy: adjustedBy,
      notes: notes ?? null,
    });

    await tx.execute(
      sql`UPDATE tenants SET chatbot_credits_balance = ${newBalance} WHERE id = ${tenantId}::uuid`,
    );

    return { previousBalance, newBalance, delta };
  });
}

/**
 * Append a grant row and bump the materialized counter.
 */
export async function grantCredits(
  tenantId: string,
  count: number,
  grantedBy: string,
  notes?: string,
): Promise<{ newBalance: number }> {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('count must be a positive integer');
  }
  const db = dbAdmin();
  return db.transaction(async (tx) => {
    const [t] = await tx.execute<{ chatbot_credits_balance: number }>(
      sql`SELECT chatbot_credits_balance FROM tenants WHERE id = ${tenantId}::uuid FOR UPDATE`,
    );
    if (!t) throw new Error(`Tenant ${tenantId} not found`);

    await tx.insert(chatbotCreditLedger).values({
      tenantId,
      change: count,
      reason: 'grant',
      grantedBy,
      notes: notes ?? null,
    });

    const newBalance = t.chatbot_credits_balance + count;
    await tx.execute(
      sql`UPDATE tenants SET chatbot_credits_balance = ${newBalance} WHERE id = ${tenantId}::uuid`,
    );

    return { newBalance };
  });
}

export async function getBalance(tenantId: string): Promise<number> {
  const [row] = await dbAdmin().execute<{ chatbot_credits_balance: number }>(
    sql`SELECT chatbot_credits_balance FROM tenants WHERE id = ${tenantId}::uuid`,
  );
  return row?.chatbot_credits_balance ?? 0;
}

async function getBalanceInTx(
  tx: Parameters<Parameters<ReturnType<typeof dbAdmin>['transaction']>[0]>[0],
  tenantId: string,
): Promise<number> {
  const [row] = await tx.execute<{ chatbot_credits_balance: number }>(
    sql`SELECT chatbot_credits_balance FROM tenants WHERE id = ${tenantId}::uuid`,
  );
  return row?.chatbot_credits_balance ?? 0;
}

// Suppress the unused-import warning on tenants/consultations re-exports.
export const _schemaRefs = { tenants, consultations };
