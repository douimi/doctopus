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

export function formatMedicationLabel(hit: MedicationSearchHit): string {
  return [hit.nomCommercial, hit.formeDosage, hit.presentation]
    .filter((s): s is string => Boolean(s))
    .join(' · ');
}
