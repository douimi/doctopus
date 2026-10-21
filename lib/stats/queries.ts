import 'server-only';
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { consultations, patients } from '@/db/schema';
import {
  CABINET_TZ,
  monthBoundsUtc,
  rangeBoundsUtc,
  type MonthKey,
  type StatsPeriod,
  type StatsRange,
} from '@/lib/time';

/** Every query takes either a rolling range or explicit [start, end) bounds. */
export type StatsWindow = StatsRange | StatsPeriod;

function bounds(w: StatsWindow): StatsPeriod {
  return typeof w === 'string' ? rangeBoundsUtc(w) : w;
}

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

export async function getRevenueSummary(tenantId: string, range: StatsWindow): Promise<RevenueSummary> {
  const { startUtc, endUtc } = bounds(range);
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

export async function getRevenueByDay(tenantId: string, range: StatsWindow): Promise<RevenueByDay> {
  const { startUtc, endUtc } = bounds(range);
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

export async function getRevenueByMethod(tenantId: string, range: StatsWindow): Promise<RevenueByMethod> {
  const { startUtc, endUtc } = bounds(range);
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

export async function getOutstandingPayments(tenantId: string, range: StatsWindow): Promise<OutstandingRow[]> {
  const { startUtc, endUtc } = bounds(range);
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
        lt(consultations.finalizedAt, endUtc),
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
  range: StatsWindow,
  limit = 10,
): Promise<TopPatientRow[]> {
  const { startUtc, endUtc } = bounds(range);
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

export type MonthlyStatsRow = {
  month: MonthKey;
  revenue: string;
  totalCount: number;
  paidCount: number;
  patientCount: number;
  avgPrice: string | null;
};

/**
 * One row per calendar month in [fromMonth, toMonth], zero-filled.
 * Same semantics as getRevenueSummary (bucketed on finalized_at) so the
 * monthly table agrees with the KPI cards for the same month.
 */
export async function getMonthlySeries(
  tenantId: string,
  fromMonth: MonthKey,
  toMonth: MonthKey,
): Promise<MonthlyStatsRow[]> {
  const startUtc = monthBoundsUtc(fromMonth).startUtc;
  const endUtc = monthBoundsUtc(toMonth).endUtc;
  const rows = await dbAdmin().execute<{
    month: string;
    revenue: string;
    total_count: number;
    paid_count: number;
    patient_count: number;
    avg_price: string | null;
  }>(sql`
    WITH months AS (
      SELECT generate_series(
        ${`${fromMonth}-01`}::timestamp,
        ${`${toMonth}-01`}::timestamp,
        interval '1 month'
      ) AS m
    ),
    c AS (
      SELECT
        date_trunc('month', finalized_at AT TIME ZONE ${CABINET_TZ}) AS m,
        payment_status, price_mad, is_free, patient_id
      FROM consultations
      WHERE tenant_id = ${tenantId}
        AND finalized_at >= ${startUtc.toISOString()}
        AND finalized_at <  ${endUtc.toISOString()}
    )
    SELECT
      to_char(months.m, 'YYYY-MM')                                                 AS month,
      COALESCE(SUM(c.price_mad) FILTER (WHERE c.payment_status = 'paid'), 0)::text AS revenue,
      COUNT(c.m)::int                                                              AS total_count,
      COUNT(c.m) FILTER (WHERE c.payment_status = 'paid')::int                     AS paid_count,
      COUNT(DISTINCT c.patient_id)::int                                            AS patient_count,
      AVG(c.price_mad) FILTER (WHERE c.is_free = false)::text                      AS avg_price
    FROM months
    LEFT JOIN c ON c.m = months.m
    GROUP BY months.m
    ORDER BY months.m
  `);
  return rows.map((r) => ({
    month: r.month,
    revenue: r.revenue,
    totalCount: r.total_count,
    paidCount: r.paid_count,
    patientCount: r.patient_count,
    avgPrice: r.avg_price,
  }));
}
