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
 *   - phone            optional
 *   - cin              optional
 *   - coverage_type    optional   one of COVERAGE_VALUES (e.g. cnss, cmim, axa_maroc, ramed…)
 *   - coverage_id      optional
 *   - address          optional
 *   - notes            optional
 *
 * CSV files are parsed manually rather than via xlsx — xlsx's CSV
 * date detection loses precision on ISO date strings (1997-01-01 →
 * 35430.99976 → "12/31/96" after rounding), corrupting every patient
 * DOB by one day.
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
  /** Raw values from the source row (canonical column → string). Lets the
   *  caller download the failed rows as CSV so the operator can correct
   *  them in a spreadsheet and re-import. */
  raw?: Record<string, string>;
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
  phone: string | null;
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
  // XLSX path: cellDates:true returns a Date built via xlsx's local-time
  // constructor (with a ~20s rounding artifact), so the wall-clock time
  // in local TZ corresponds to the Excel serial date. Local accessors
  // recover the right day; UTC ones shift it in non-UTC timezones.
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  }
  const s = asString(v);
  if (!s) return null;
  // ISO YYYY-MM-DD (or YYYY-M-D)
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const frMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (frMatch) {
    const [, d, m, y] = frMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

function isXlsxBuffer(buffer: Buffer): boolean {
  // XLSX is a ZIP archive — PK\x03\x04 magic.
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

function parseCsvText(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"' && field === '') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === '')) {
    rows.pop();
  }
  return rows;
}

function readCsvRows(buffer: Buffer): Record<string, unknown>[] {
  const rows = parseCsvText(buffer.toString('utf-8'));
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      if (!h) return;
      const v = i < row.length ? row[i] : '';
      obj[h] = v === '' ? null : v;
    });
    return obj;
  });
}

function readXlsxRows(buffer: Buffer): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet || !sheet['!ref']) return [];
  const range = XLSX.utils.decode_range(sheet['!ref']);

  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
    headers.push(cell ? String(cell.v ?? '') : '');
  }

  const rows: Record<string, unknown>[] = [];
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const obj: Record<string, unknown> = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
      const h = headers[c - range.s.c];
      if (!h) continue;
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell) {
        obj[h] = null;
      } else if (cell.t === 'd' && cell.v instanceof Date) {
        // Hand the raw Date to parseDate — its formatted .w would be
        // locale-dependent ("12/31/96") and lose precision.
        obj[h] = cell.v;
      } else {
        // Prefer formatted text (cell.w) so number cells displayed with
        // leading zeros — phone "0612345678" — survive.
        obj[h] = cell.w != null ? cell.w : cell.v ?? null;
      }
    }
    rows.push(obj);
  }
  return rows;
}

const COVERAGE_SET = new Set(COVERAGE_VALUES);

export function parsePatientImport(buffer: Buffer): ImportPreview {
  let raw: Record<string, unknown>[];
  try {
    raw = isXlsxBuffer(buffer) ? readXlsxRows(buffer) : readCsvRows(buffer);
  } catch (e) {
    return {
      columnsRecognised: {},
      rows: [],
      errors: [{ row: 0, field: '_file', message: `Fichier illisible : ${(e as Error).message}` }],
    };
  }
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
  for (const required of ['last_name', 'first_name', 'gender', 'date_of_birth'] as const) {
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

    // Snapshot of raw values keyed by canonical column name, used to
    // include in error rows so the operator can download + fix + re-upload.
    const rawByCanonical: Record<string, string> = {};
    for (const canonical of PATIENT_IMPORT_HEADERS) {
      const v = get(canonical);
      rawByCanonical[canonical] = v == null ? '' : String(v);
    }

    const last_name = asString(get('last_name'));
    const first_name = asString(get('first_name'));
    const gender = parseGender(get('gender'));
    const date_of_birth = parseDate(get('date_of_birth'));
    const phone = asString(get('phone'));

    const rowErrors: ImportRowError[] = [];
    const pushErr = (field: string, message: string) =>
      rowErrors.push({ row: rowNumber, field, message, raw: rawByCanonical });

    if (!last_name) pushErr('last_name', 'Nom requis.');
    if (!first_name) pushErr('first_name', 'Prénom requis.');
    if (!gender) pushErr('gender', 'Sexe attendu : m / f / Homme / Femme.');
    if (!date_of_birth) {
      pushErr('date_of_birth', 'Date de naissance attendue : YYYY-MM-DD ou DD/MM/YYYY.');
    }

    const coverage_type_raw = asString(get('coverage_type'));
    let coverage_type: string | null = null;
    if (coverage_type_raw) {
      const lc = coverage_type_raw.toLowerCase();
      if (COVERAGE_SET.has(lc)) {
        coverage_type = lc;
      } else {
        pushErr(
          'coverage_type',
          `Couverture inconnue "${coverage_type_raw}". Voir la liste dans le modèle.`,
        );
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
      phone,
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
