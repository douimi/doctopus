import 'server-only';
import { and, desc, eq, gte, lt, inArray } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { consultations, patients, userProfiles } from '@/db/schema';
import { todayBoundsUtc } from '@/lib/time';

export type PaymentRow = {
  consultationId: string;
  patientFullName: string;
  priceMad: string | null;
  isFree: boolean;
  paymentStatus: 'awaiting' | 'paid' | 'free';
  paymentMethod: string | null;
  paidAt: Date | null;
  paidByName: string | null;
  finalizedAt: Date;
};

/**
 * Returns the data needed to render the /today PaymentsPanel:
 * - awaiting: ALL awaiting consultations regardless of date, ordered by finalizedAt DESC.
 * - collectedToday: paid + free consultations whose paid_at is today (Casablanca local), ordered by paidAt DESC.
 */
export async function getPaymentsForToday(
  tenantId: string,
): Promise<{ awaiting: PaymentRow[]; collectedToday: PaymentRow[] }> {
  const { startUtc, endUtc } = todayBoundsUtc();
  const db = dbAdmin();

  const awaitingRows = await db
    .select({
      consultationId: consultations.id,
      lastName: patients.lastName,
      firstName: patients.firstName,
      priceMad: consultations.priceMad,
      isFree: consultations.isFree,
      paymentStatus: consultations.paymentStatus,
      paymentMethod: consultations.paymentMethod,
      paidAt: consultations.paidAt,
      paidByName: userProfiles.fullName,
      finalizedAt: consultations.finalizedAt,
    })
    .from(consultations)
    .leftJoin(patients, eq(patients.id, consultations.patientId))
    .leftJoin(userProfiles, eq(userProfiles.id, consultations.paidBy))
    .where(
      and(
        eq(consultations.tenantId, tenantId),
        eq(consultations.paymentStatus, 'awaiting'),
      ),
    )
    .orderBy(desc(consultations.finalizedAt));

  const collectedRows = await db
    .select({
      consultationId: consultations.id,
      lastName: patients.lastName,
      firstName: patients.firstName,
      priceMad: consultations.priceMad,
      isFree: consultations.isFree,
      paymentStatus: consultations.paymentStatus,
      paymentMethod: consultations.paymentMethod,
      paidAt: consultations.paidAt,
      paidByName: userProfiles.fullName,
      finalizedAt: consultations.finalizedAt,
    })
    .from(consultations)
    .leftJoin(patients, eq(patients.id, consultations.patientId))
    .leftJoin(userProfiles, eq(userProfiles.id, consultations.paidBy))
    .where(
      and(
        eq(consultations.tenantId, tenantId),
        inArray(consultations.paymentStatus, ['paid', 'free']),
        gte(consultations.paidAt, startUtc),
        lt(consultations.paidAt, endUtc),
      ),
    )
    .orderBy(desc(consultations.paidAt));

  const toRow = (r: typeof awaitingRows[number]): PaymentRow => ({
    consultationId: r.consultationId,
    patientFullName: `${r.lastName ?? ''} ${r.firstName ?? ''}`.trim(),
    priceMad: r.priceMad,
    isFree: r.isFree,
    paymentStatus: r.paymentStatus as 'awaiting' | 'paid' | 'free',
    paymentMethod: r.paymentMethod,
    paidAt: r.paidAt,
    paidByName: r.paidByName,
    finalizedAt: r.finalizedAt!,
  });

  return {
    awaiting: awaitingRows.map(toRow),
    collectedToday: collectedRows.map(toRow),
  };
}
