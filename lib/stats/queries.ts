import 'server-only';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { consultations, patients } from '@/db/schema';
import { CABINET_TZ, rangeBoundsUtc, type StatsRange } from '@/lib/time';

export type RevenueSummary = {
  totalRevenue: string;
  totalCount: number;
  paidCount: number;
  awaitingCount: number;
  freeCount: number;
  avgPrice: string | null;
  awaitingTotal: string;
};

export type RevenueByDay = Array<{ date: string; revenue: string; count: number }>;
export type RevenueByMethod = Array<{ method: string; revenue: string; count: number }>;
export type OutstandingRow = {
  consultationId: string;
  patientFullName: string;
  priceMad: string;
  finalizedAt: Date;
};
export type TopPatientRow = {
  patientId: string;
  patientFullName: string;
  revenue: string;
  consultationCount: number;
};

export async function getRevenueSummary(tenantId: string, range: StatsRange): Promise<RevenueSummary> {
  const { startUtc, endUtc } = rangeBoundsUtc(range);
  const rows = await dbAdmin().execute<{
    total_count: number;
    paid_count: number;
    awaiting_count: number;
    free_count: number;
    paid_revenue: string;
    awaiting_total: string;
    avg_price: string | null;
  }>(sql`
    SELECT
      COUNT(*)::int                                            AS total_count,
      COUNT(*) FILTER (WHERE payment_status = 'paid')::int     AS paid_count,
      COUNT(*) FILTER (WHERE payment_status = 'awaiting')::int AS awaiting_count,
      COUNT(*) FILTER (WHERE payment_status = 'free')::int     AS free_count,
      COALESCE(SUM(price_mad) FILTER (WHERE payment_status = 'paid'), 0)::text     AS paid_revenue,
      COALESCE(SUM(price_mad) FILTER (WHERE payment_status = 'awaiting'), 0)::text AS awaiting_total,
      AVG(price_mad) FILTER (WHERE is_free = false)::text                          AS avg_price
    FROM consultations
    WHERE tenant_id = ${tenantId}
      AND finalized_at >= ${startUtc.toISOString()}
      AND finalized_at <  ${endUtc.toISOString()}
  `);
  const counts = rows[0];
  return {
    totalRevenue: counts.paid_revenue,
    totalCount: counts.total_count,
    paidCount: counts.paid_count,
    awaitingCount: counts.awaiting_count,
    freeCount: counts.free_count,
    avgPrice: counts.avg_price,
    awaitingTotal: counts.awaiting_total,
  };
}

export async function getRevenueByDay(tenantId: string, range: StatsRange): Promise<RevenueByDay> {
  const { startUtc, endUtc } = rangeBoundsUtc(range);
  const rows = await dbAdmin().execute<{ date: string; revenue: string; count: number }>(sql`
    SELECT
      to_char(date_trunc('day', paid_at AT TIME ZONE ${CABINET_TZ}), 'YYYY-MM-DD') AS date,
      COALESCE(SUM(price_mad), 0)::text                                                  AS revenue,
      COUNT(*)::int                                                                       AS count
    FROM consultations
    WHERE tenant_id = ${tenantId}
      AND payment_status = 'paid'
      AND paid_at >= ${startUtc.toISOString()}
      AND paid_at <  ${endUtc.toISOString()}
    GROUP BY 1
    ORDER BY 1
  `);
  return rows.map((r) => ({ date: r.date, revenue: r.revenue, count: r.count }));
}

export async function getRevenueByMethod(tenantId: string, range: StatsRange): Promise<RevenueByMethod> {
  const { startUtc, endUtc } = rangeBoundsUtc(range);
  const rows = await dbAdmin().execute<{ method: string; revenue: string; count: number }>(sql`
    SELECT
      payment_method                          AS method,
      COALESCE(SUM(price_mad), 0)::text       AS revenue,
      COUNT(*)::int                            AS count
    FROM consultations
    WHERE tenant_id = ${tenantId}
      AND payment_status = 'paid'
      AND paid_at >= ${startUtc.toISOString()}
      AND paid_at <  ${endUtc.toISOString()}
    GROUP BY payment_method
    ORDER BY revenue DESC
  `);
  return rows.map((r) => ({ method: r.method, revenue: r.revenue, count: r.count }));
}

export async function getOutstandingPayments(tenantId: string, range: StatsRange): Promise<OutstandingRow[]> {
  const { startUtc } = rangeBoundsUtc(range);
  const rows = await dbAdmin()
    .select({
      consultationId: consultations.id,
      lastName: patients.lastName,
      firstName: patients.firstName,
      priceMad: consultations.priceMad,
      finalizedAt: consultations.finalizedAt,
    })
    .from(consultations)
    .leftJoin(patients, eq(patients.id, consultations.patientId))
    .where(
      and(
        eq(consultations.tenantId, tenantId),
        eq(consultations.paymentStatus, 'awaiting'),
        // Exclude in-progress consultations (also payment_status='awaiting'
        // by default per migration 0008); only finalized rows are truly
        // awaiting payment.
        eq(consultations.isFinalized, true),
        gte(consultations.finalizedAt, startUtc),
      ),
    )
    .orderBy(desc(consultations.finalizedAt));
  return rows.map((r) => ({
    consultationId: r.consultationId,
    patientFullName: `${r.lastName ?? ''} ${r.firstName ?? ''}`.trim(),
    priceMad: r.priceMad ?? '0',
    finalizedAt: r.finalizedAt!,
  }));
}

export async function getTopPatients(
  tenantId: string,
  range: StatsRange,
  limit = 10,
): Promise<TopPatientRow[]> {
  const { startUtc, endUtc } = rangeBoundsUtc(range);
  const rows = await dbAdmin().execute<{
    patient_id: string;
    last_name: string;
    first_name: string;
    revenue: string;
    consultation_count: number;
  }>(sql`
    SELECT
      c.patient_id                                        AS patient_id,
      p.last_name                                         AS last_name,
      p.first_name                                        AS first_name,
      COALESCE(SUM(c.price_mad), 0)::text                 AS revenue,
      COUNT(*)::int                                        AS consultation_count
    FROM consultations c
    JOIN patients p ON p.id = c.patient_id
    WHERE c.tenant_id = ${tenantId}
      AND c.payment_status = 'paid'
      AND c.paid_at >= ${startUtc.toISOString()}
      AND c.paid_at <  ${endUtc.toISOString()}
    GROUP BY c.patient_id, p.last_name, p.first_name
    ORDER BY revenue DESC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({
    patientId: r.patient_id,
    patientFullName: `${r.last_name} ${r.first_name}`.trim(),
    revenue: r.revenue,
    consultationCount: r.consultation_count,
  }));
}
