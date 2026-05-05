/**
 * Healthcare coverage providers commonly seen in Moroccan cabinets.
 * Used by patient forms, the patient card, the prescription template,
 * and Zod validation. The single source of truth for the value list.
 *
 * The grouping informs the rendered <SelectGroup>s. Order within a
 * group is roughly by frequency (most common first).
 */

export type CoverageGroup = 'public' | 'mutuelle' | 'insurance' | 'other';

export type CoverageOption = {
  value: string;
  label: string;
  group: CoverageGroup;
};

export const COVERAGE_OPTIONS: CoverageOption[] = [
  // Régimes obligatoires
  { value: 'cnss', label: 'CNSS', group: 'public' },
  { value: 'cnops', label: 'CNOPS', group: 'public' },
  { value: 'amo', label: 'AMO', group: 'public' },
  { value: 'amo_tns', label: 'AMO TNS (indépendants)', group: 'public' },
  { value: 'ramed', label: 'RAMED', group: 'public' },

  // Mutuelles
  { value: 'cmim', label: 'CMIM', group: 'mutuelle' },
  { value: 'mgpap', label: 'MGPAP', group: 'mutuelle' },
  { value: 'omfam', label: 'OMFAM', group: 'mutuelle' },
  { value: 'mutuelle_fp', label: 'Mutuelle de la Fonction Publique', group: 'mutuelle' },
  { value: 'mutuelle_other', label: 'Autre mutuelle', group: 'mutuelle' },

  // Assurances privées
  { value: 'wafa_assurance', label: 'Wafa Assurance', group: 'insurance' },
  { value: 'axa_maroc', label: 'AXA Assurance Maroc', group: 'insurance' },
  { value: 'atlantasanad', label: 'AtlantaSanad', group: 'insurance' },
  { value: 'rma', label: 'RMA Watanya', group: 'insurance' },
  { value: 'mamda', label: 'MAMDA', group: 'insurance' },
  { value: 'sanlam', label: 'Sanlam (ex-Saham)', group: 'insurance' },
  { value: 'marocaine_vie', label: 'Marocaine Vie', group: 'insurance' },
  { value: 'allianz', label: 'Allianz Maroc', group: 'insurance' },
  { value: 'mcma', label: 'MCMA', group: 'insurance' },
  { value: 'insurance_other', label: 'Autre assurance privée', group: 'insurance' },

  // Autres
  { value: 'mutuelle', label: 'Mutuelle (générique)', group: 'other' },
  { value: 'other', label: 'Autre', group: 'other' },
  { value: 'none', label: 'Sans couverture', group: 'other' },
];

export const COVERAGE_VALUES = COVERAGE_OPTIONS.map((c) => c.value);

const LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  COVERAGE_OPTIONS.map((c) => [c.value, c.label]),
);

export function coverageLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return LABEL_BY_VALUE[value] ?? value;
}

export const GROUP_LABEL: Record<CoverageGroup, string> = {
  public: 'Régimes obligatoires',
  mutuelle: 'Mutuelles',
  insurance: 'Assurances privées',
  other: 'Autre',
};

const GROUP_ORDER: CoverageGroup[] = ['public', 'mutuelle', 'insurance', 'other'];

export type CoverageGroupView = {
  group: CoverageGroup;
  label: string;
  options: CoverageOption[];
};

export const COVERAGE_GROUPS: CoverageGroupView[] = GROUP_ORDER.map((g) => ({
  group: g,
  label: GROUP_LABEL[g],
  options: COVERAGE_OPTIONS.filter((o) => o.group === g),
}));
