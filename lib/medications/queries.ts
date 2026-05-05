import 'server-only';
import { searchAnamMedications, type AnamRow } from './anam';

export type MedicationSearchHit = {
  codeEan13: string;
  nomCommercial: string;
  dci: string;
  formeDosage: string | null;
  presentation: string | null;
  classeTherapeutique: string | null;
  ppm: string | null;
  pbrPpm: string | null;
  isReimbursable: boolean;
  typeMed: string | null;
};

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

export function formatMedicationLabel(hit: MedicationSearchHit): string {
  return [hit.nomCommercial, hit.formeDosage, hit.presentation]
    .filter((s): s is string => Boolean(s))
    .join(' · ');
}
