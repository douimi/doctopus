import 'server-only';
import { searchAnamMedications, type AnamRow } from './anam';
import type { MedicationSearchHit } from './types';

export type { MedicationSearchHit } from './types';
export { formatMedicationLabel } from './types';

function fmt(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Number(n).toFixed(2);
}

function rowToHit(r: AnamRow): MedicationSearchHit {
  return {
    codeEan13: r.codeEan13,
    nomCommercial: r.nomCommercial,
    dci: r.dci,
    formeDosage: r.formeDosage || null,
    presentation: r.presentation || null,
    classeTherapeutique: r.classeTherapeutique || null,
    ppm: fmt(r.ppm),
    pbrPpm: fmt(r.pbrPpm),
    isReimbursable: typeof r.pbrPpm === 'number' && r.pbrPpm > 0,
    typeMed: r.typeMed || null,
  };
}

export async function searchMedications(query: string): Promise<MedicationSearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const rows = await searchAnamMedications(trimmed);
  return rows.map(rowToHit);
}
