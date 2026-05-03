import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env.local' });
loadDotenv({ path: '.env' });

import { readFile } from 'node:fs/promises';
import { sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { dbAdmin } from '@/db/client';
import { medicationImports } from '@/db/schema';

type RawRow = Record<string, unknown>;

const HEADER_ALIASES: Record<string, string> = {
  'nom de specialite': 'nom_commercial',
  'nom commercial': 'nom_commercial',
  specialite: 'nom_commercial',
  dci: 'dci',
  dosage: 'dosage',
  forme: 'forme',
  presentation: 'presentation',
  'classe therapeutique': 'classe_therapeutique',
  laboratoire: 'laboratoire',
  ppv: 'ppv',
  'prix public de vente': 'ppv',
  'code atc': 'atc_code',
};

function normHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildColumnMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers) {
    const norm = normHeader(h);
    if (HEADER_ALIASES[norm]) map[h] = HEADER_ALIASES[norm];
  }
  return map;
}

function asString(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function asPpv(v: unknown): string | null {
  const s = asString(v);
  if (!s) return null;
  const cleaned = s.replace(',', '.').replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '';
      out[k] = v;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const file = args.file;
  if (!file) {
    console.error('Usage: pnpm import:medications --file path/to/dmp.xlsx');
    process.exit(2);
  }

  const buf = await readFile(file);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null });
  if (rows.length === 0) {
    console.error('Empty sheet.');
    process.exit(1);
  }

  const headers = Object.keys(rows[0]);
  const colMap = buildColumnMap(headers);
  console.log('Detected column mapping:', colMap);

  const db = dbAdmin();
  const [batch] = await db
    .insert(medicationImports)
    .values({ sourceFileName: file, importedBy: 'cli' })
    .returning();

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const get = (canonical: string) => {
      const header = Object.keys(colMap).find((h) => colMap[h] === canonical);
      return header ? row[header] : undefined;
    };

    const nomCommercial = asString(get('nom_commercial'));
    const dci = asString(get('dci'));
    if (!nomCommercial || !dci) {
      skipped += 1;
      continue;
    }

    const values = {
      nomCommercial,
      dci,
      dosage: asString(get('dosage')),
      forme: asString(get('forme')),
      presentation: asString(get('presentation')),
      classeTherapeutique: asString(get('classe_therapeutique')),
      laboratoire: asString(get('laboratoire')),
      ppv: asPpv(get('ppv')),
      metadata: get('atc_code') ? { atc_code: asString(get('atc_code')) } : null,
    };

    const result = await db.execute(sql`
      INSERT INTO medications
        (nom_commercial, dci, dosage, forme, presentation, classe_therapeutique, laboratoire, ppv, is_active, import_batch_id, imported_at, metadata)
      VALUES
        (${values.nomCommercial}, ${values.dci}, ${values.dosage}, ${values.forme}, ${values.presentation},
         ${values.classeTherapeutique}, ${values.laboratoire}, ${values.ppv}, true, ${batch.id}::uuid, now(), ${values.metadata}::jsonb)
      ON CONFLICT (lower(nom_commercial), coalesce(lower(dosage), ''), coalesce(lower(forme), ''), coalesce(lower(laboratoire), ''))
      DO UPDATE SET
        dci = EXCLUDED.dci,
        presentation = EXCLUDED.presentation,
        classe_therapeutique = EXCLUDED.classe_therapeutique,
        ppv = EXCLUDED.ppv,
        is_active = true,
        import_batch_id = EXCLUDED.import_batch_id,
        imported_at = EXCLUDED.imported_at,
        metadata = EXCLUDED.metadata
      RETURNING (xmax = 0) AS inserted
    `);
    const wasInsert = (result as unknown as Array<{ inserted: boolean }>)[0]?.inserted;
    if (wasInsert) inserted += 1;
    else updated += 1;
  }

  await db
    .update(medicationImports)
    .set({
      rowCountInserted: String(inserted),
      rowCountUpdated: String(updated),
      rowCountSkipped: String(skipped),
      notes: `mapping=${JSON.stringify(colMap)}`,
    })
    .where(sql`${medicationImports.id} = ${batch.id}`);

  console.log(`\n✅ Import done: inserted=${inserted}, updated=${updated}, skipped=${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
