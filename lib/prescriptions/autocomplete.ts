import 'server-only';
import { and, desc, eq, isNotNull, ne, sql } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { prescriptions, prescriptionItems } from '@/db/schema';

export const STATIC_POSOLOGIES = [
  '1 cp matin et soir',
  '1 cp 3 fois par jour',
  '1 cp par jour le matin',
  '1 cp par jour le soir',
  '2 cps par jour',
  '1 cp toutes les 8 heures',
  '1 cp toutes les 6 heures',
  '1 sachet par jour',
  '1 sachet 3 fois par jour',
  '1 cuillère à café 3 fois par jour',
  '5 ml 3 fois par jour',
  '1 application 2 fois par jour',
  '1 goutte 3 fois par jour',
  '1 inhalation 2 fois par jour',
  'À la demande',
] as const;

export const STATIC_DURATIONS = [
  '3 jours',
  '5 jours',
  '7 jours',
  '10 jours',
  '14 jours',
  '21 jours',
  '1 mois',
  '3 mois',
  '6 mois',
  'À renouveler',
] as const;

export type AutocompleteSuggestions = {
  posologies: string[];
  durations: string[];
};

/**
 * Merge the doctor's history list (most-frequent first) with the static
 * fallback list. Case-insensitive trimmed dedup. History wins ties — when
 * both lists contain the same value (modulo case/whitespace), the history
 * variant is kept.
 */
export function mergeUnique(history: readonly string[], staticList: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of [...history, ...staticList]) {
    const key = v.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/**
 * Returns the autocomplete suggestion lists for the doctor's prescription
 * editor. Two parallel GROUP BY queries against prescription_items, joined
 * to prescriptions for doctor_id scope. Tenant isolation via withTenantTx.
 *
 * Each returned list = doctor's top-10 most-used non-empty values, merged
 * with the static fallback list (history first, deduped).
 */
export async function getAutocompleteSuggestions(
  tenantId: string,
  doctorId: string,
): Promise<AutocompleteSuggestions> {
  return withTenantTx(tenantId, async (tx) => {
    const posologyRows = await tx
      .select({
        value: prescriptionItems.posologie,
        n: sql<number>`COUNT(*)::int`,
      })
      .from(prescriptionItems)
      .innerJoin(prescriptions, eq(prescriptions.id, prescriptionItems.prescriptionId))
      .where(
        and(
          eq(prescriptions.doctorId, doctorId),
          isNotNull(prescriptionItems.posologie),
          ne(prescriptionItems.posologie, ''),
        ),
      )
      .groupBy(prescriptionItems.posologie)
      .orderBy(desc(sql`COUNT(*)`), prescriptionItems.posologie)
      .limit(10);

    const durationRows = await tx
      .select({
        value: prescriptionItems.duration,
        n: sql<number>`COUNT(*)::int`,
      })
      .from(prescriptionItems)
      .innerJoin(prescriptions, eq(prescriptions.id, prescriptionItems.prescriptionId))
      .where(
        and(
          eq(prescriptions.doctorId, doctorId),
          isNotNull(prescriptionItems.duration),
          ne(prescriptionItems.duration, ''),
        ),
      )
      .groupBy(prescriptionItems.duration)
      .orderBy(desc(sql`COUNT(*)`), prescriptionItems.duration)
      .limit(10);

    const historyPosologies = posologyRows
      .map((r) => r.value!)
      .filter((v) => v.trim().length > 0);
    const historyDurations = durationRows
      .map((r) => r.value!)
      .filter((v) => v.trim().length > 0);

    return {
      posologies: mergeUnique(historyPosologies, STATIC_POSOLOGIES),
      durations: mergeUnique(historyDurations, STATIC_DURATIONS),
    };
  });
}
