import 'server-only';
import * as XLSX from 'xlsx';
import { dbAdmin } from '@/db/client';
import { patients } from '@/db/schema';
import { COVERAGE_VALUES } from '@/lib/patients/coverage';

/**
 * Patient bulk-import from a CSV / XLSX file. Used by super-admin to
 * onboard a cabinet with their existing patient base in one shot.
 *
 * Columns the parser recognises (case- and accent-insensitive header
 * matching, snake_case canonical names below):
 *
 *   - last_name        REQUIRED
 *   - first_name       REQUIRED
 *   - gender           REQUIRED   "m" | "f" (also accepts "h"/"homme"/"femme")
 *   - date_of_birth    REQUIRED   ISO YYYY-MM-DD or DD/MM/YYYY
 *   - phone            REQUIRED
 *   - cin              optional
 *   - coverage_type    optional   one of COVERAGE_VALUES (e.g. cnss, cmim, axa_maroc, ramed…)
 *   - coverage_id      optional
 *   - address          optional
 *   - notes            optional
 */

export const PATIENT_IMPORT_HEADERS = [
  'last_name',
  'first_name',
  'gender',
  'date_of_birth',
  'phone',
  'cin',
  'coverage_type',
  'coverage_id',
  'address',
  'notes',
] as const;

const HEADER_ALIASES: Record<string, string> = {
  // Canonical
  last_name: 'last_name',
  first_name: 'first_name',
  gender: 'gender',
  date_of_birth: 'date_of_birth',
  phone: 'phone',
  cin: 'cin',
  coverage_type: 'coverage_type',
  coverage_id: 'coverage_id',
  address: 'address',
  notes: 'notes',
  // FR aliases
  nom: 'last_name',
  prenom: 'first_name',
  prénom: 'first_name',
  sexe: 'gender',
  'date de naissance': 'date_of_birth',
  date_naissance: 'date_of_birth',
  'naissance': 'date_of_birth',
  telephone: 'phone',
  téléphone: 'phone',
  tel: 'phone',
  'n° cin': 'cin',
  'numero cin': 'cin',
  numéro_cin: 'cin',
  couverture: 'coverage_type',
  type_couverture: 'coverage_type',
  'type de couverture': 'coverage_type',
  assurance: 'coverage_type',
  'n° assure': 'coverage_id',
  'n° assuré': 'coverage_id',
  'numero assure': 'coverage_id',
  num_assure: 'coverage_id',
  matricule: 'coverage_id',
  adresse: 'address',
};

export type ImportRowError = {
  row: number; // 1-indexed row number in the source file (header excluded)
  field: string;
  message: string;
};

export type ImportPreview = {
  columnsRecognised: Record<string, string>; // header in file → canonical
  rows: ParsedPatientRow[];
  errors: ImportRowError[];
};

export type ParsedPatientRow = {
  rowNumber: number;
  last_name: string;
  first_name: string;
  gender: 'm' | 'f';
  date_of_birth: string;
  phone: string;
  cin: string | null;
  coverage_type: string | null;
  coverage_id: string | null;
  address: string | null;
  notes: string | null;
};

export type ImportResult = {
  ok: true;
  inserted: number;
  failed: number;
  errors: ImportRowError[];
} | {
  ok: false;
  error: string;
};

function normaliseHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function buildColumnMap(headers: string[]): {
  byCanonical: Record<string, string>;
  byHeader: Record<string, string>;
} {
  const byCanonical: Record<string, string> = {};
  const byHeader: Record<string, string> = {};
  for (const h of headers) {
    const norm = normaliseHeader(h);
    const canonical = HEADER_ALIASES[norm] ?? HEADER_ALIASES[norm.replace(/\s+/g, '_')];
    if (canonical) {
      byCanonical[canonical] = h;
      byHeader[h] = canonical;
    }
  }
  return { byCanonical, byHeader };
}

function asString(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function parseGender(v: unknown): 'm' | 'f' | null {
  const s = asString(v);
  if (!s) return null;
  const lower = s.toLowerCase();
  if (['m', 'h', 'male', 'homme', 'masculin'].includes(lower)) return 'm';
  if (['f', 'female', 'femme', 'feminin', 'féminin'].includes(lower)) return 'f';
  return null;
}

function parseDate(v: unknown): string | null {
  const s = asString(v);
  if (!s) return null;
  // ISO YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return s;
  // DD/MM/YYYY or DD-MM-YYYY
  const frMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (frMatch) {
    const [, d, m, y] = frMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Excel might give us a Date object via cellDates: true
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  }
  return null;
}

const COVERAGE_SET = new Set(COVERAGE_VALUES);

export function parsePatientImport(buffer: Buffer): ImportPreview {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    return { columnsRecognised: {}, rows: [], errors: [{ row: 0, field: '_file', message: 'Feuille vide.' }] };
  }
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  });
  if (raw.length === 0) {
    return {
      columnsRecognised: {},
      rows: [],
      errors: [{ row: 0, field: '_file', message: 'Aucune ligne détectée.' }],
    };
  }

  const headers = Object.keys(raw[0]);
  const { byCanonical, byHeader } = buildColumnMap(headers);

  const rows: ParsedPatientRow[] = [];
  const errors: ImportRowError[] = [];

  // Required columns present?
  const requiredMissing: string[] = [];
  for (const required of ['last_name', 'first_name', 'gender', 'date_of_birth', 'phone'] as const) {
    if (!byCanonical[required]) requiredMissing.push(required);
  }
  if (requiredMissing.length > 0) {
    errors.push({
      row: 0,
      field: '_columns',
      message: `Colonnes obligatoires manquantes : ${requiredMissing.join(', ')}.`,
    });
    return { columnsRecognised: byHeader, rows: [], errors };
  }

  raw.forEach((rawRow, idx) => {
    const rowNumber = idx + 2; // +1 for header, +1 for 1-based
    const get = (canonical: string): unknown => {
      const header = byCanonical[canonical];
      return header ? rawRow[header] : null;
    };

    const last_name = asString(get('last_name'));
    const first_name = asString(get('first_name'));
    const gender = parseGender(get('gender'));
    const date_of_birth = parseDate(get('date_of_birth'));
    const phone = asString(get('phone'));

    const rowErrors: ImportRowError[] = [];
    if (!last_name) rowErrors.push({ row: rowNumber, field: 'last_name', message: 'Nom requis.' });
    if (!first_name) rowErrors.push({ row: rowNumber, field: 'first_name', message: 'Prénom requis.' });
    if (!gender) {
      rowErrors.push({ row: rowNumber, field: 'gender', message: 'Sexe attendu : m / f / Homme / Femme.' });
    }
    if (!date_of_birth) {
      rowErrors.push({
        row: rowNumber,
        field: 'date_of_birth',
        message: 'Date de naissance attendue : YYYY-MM-DD ou DD/MM/YYYY.',
      });
    }
    if (!phone) rowErrors.push({ row: rowNumber, field: 'phone', message: 'Téléphone requis.' });

    const coverage_type_raw = asString(get('coverage_type'));
    let coverage_type: string | null = null;
    if (coverage_type_raw) {
      const lc = coverage_type_raw.toLowerCase();
      if (COVERAGE_SET.has(lc)) {
        coverage_type = lc;
      } else {
        rowErrors.push({
          row: rowNumber,
          field: 'coverage_type',
          message: `Couverture inconnue "${coverage_type_raw}". Voir la liste dans le modèle.`,
        });
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }

    rows.push({
      rowNumber,
      last_name: last_name!,
      first_name: first_name!,
      gender: gender!,
      date_of_birth: date_of_birth!,
      phone: phone!,
      cin: asString(get('cin')),
      coverage_type,
      coverage_id: asString(get('coverage_id')),
      address: asString(get('address')),
      notes: asString(get('notes')),
    });
  });

  return { columnsRecognised: byHeader, rows, errors };
}

/**
 * Persists parsed rows to the tenant's patients table. Uses dbAdmin()
 * with an explicit tenant_id predicate (RLS bypass is safe because the
 * super-admin guard already verified the actor is authorized).
 */
export async function importPatients(
  tenantId: string,
  rows: ParsedPatientRow[],
): Promise<{ inserted: number; failed: ImportRowError[] }> {
  if (rows.length === 0) return { inserted: 0, failed: [] };

  const failed: ImportRowError[] = [];
  let inserted = 0;

  // Insert in batches to keep query size sane.
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    try {
      const values = batch.map((r) => ({
        tenantId,
        firstName: r.first_name,
        lastName: r.last_name,
        gender: r.gender,
        dateOfBirth: r.date_of_birth,
        phone: r.phone,
        cin: r.cin,
        coverageType: r.coverage_type,
        coverageId: r.coverage_id,
        address: r.address,
        notes: r.notes,
      }));
      await dbAdmin().insert(patients).values(values);
      inserted += batch.length;
    } catch (err) {
      // Whole batch failed — surface a single error message; clients
      // can re-import the failed rows individually.
      failed.push({
        row: batch[0]?.rowNumber ?? 0,
        field: '_batch',
        message: `Échec d'insertion (lignes ${batch[0]?.rowNumber}-${
          batch[batch.length - 1]?.rowNumber
        }) : ${(err as Error).message}`,
      });
    }
  }

  return { inserted, failed };
}

/**
 * Returns the import template as a CSV string with header row + one
 * sample data row. Served by the API route.
 */
export function buildPatientImportTemplate(): string {
  const headers = PATIENT_IMPORT_HEADERS;
  const sample = [
    'Berrada',
    'Yasmine',
    'f',
    '1985-03-12',
    '0612345678',
    'A123456',
    'cnss',
    'CNSS-456789',
    'Casablanca',
    'Patient existant',
  ];
  // Quote any cell containing comma / quote / newline.
  const quote = (s: string) => {
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.join(','), sample.map(quote).join(',')].join('\n') + '\n';
}
