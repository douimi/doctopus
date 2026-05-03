import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env.local' });
loadDotenv({ path: '.env' });

import { Agent, fetch as undiciFetch } from 'undici';
import { sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { medicationImports } from '@/db/schema';

const BASE = 'https://ammps.sante.gov.ma/basesdedonnes/listes-medicaments';

// AMMPS serves an incomplete certificate chain; bypass TLS chain validation
// for this scraper only. Production WebFetch from the app continues to use
// strict TLS — this is a script-local override.
const httpsAgent = new Agent({ connect: { rejectUnauthorized: false } });

const COLUMN_RE = /<td class="text-left">([\s\S]*?)<\/td>/g;
const ROW_RE = /<tr class="text-left fs-15">([\s\S]*?)<\/tr>/g;
const PAGE_RE = /[?&]page=(\d+)/g;

type AmmpsRow = {
  statutAmm: string;
  statutCommercialisation: string;
  specialite: string;
  dosage: string;
  forme: string;
  presentation: string;
  ppGn: string;
  substanceActive: string;
  classeTherapeutique: string;
  epi: string;
  ppv: string;
  ph: string;
  pfht: string;
  tva: string;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function clean(s: string): string {
  return decodeEntities(
    s
      .replace(/<[^>]+>/g, '') // strip any nested tags (badge spans)
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function emptyToNull(s: string): string | null {
  return s.length > 0 ? s : null;
}

function parsePpv(s: string): string | null {
  if (!s) return null;
  const cleaned = s.replace(',', '.').replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

function parseRows(html: string): AmmpsRow[] {
  const rows: AmmpsRow[] = [];
  let m: RegExpExecArray | null;
  ROW_RE.lastIndex = 0;
  while ((m = ROW_RE.exec(html)) !== null) {
    const inner = m[1];
    COLUMN_RE.lastIndex = 0;
    const cells: string[] = [];
    let c: RegExpExecArray | null;
    while ((c = COLUMN_RE.exec(inner)) !== null) {
      cells.push(clean(c[1]));
    }
    if (cells.length !== 14) {
      console.warn(`  ⚠ unexpected cell count: ${cells.length} (skipping row)`);
      continue;
    }
    rows.push({
      statutAmm: cells[0],
      statutCommercialisation: cells[1],
      specialite: cells[2],
      dosage: cells[3],
      forme: cells[4],
      presentation: cells[5],
      ppGn: cells[6],
      substanceActive: cells[7],
      classeTherapeutique: cells[8],
      epi: cells[9],
      ppv: cells[10],
      ph: cells[11],
      pfht: cells[12],
      tva: cells[13],
    });
  }
  return rows;
}

async function fetchPage(page: number): Promise<string> {
  const res = await undiciFetch(`${BASE}?page=${page}`, {
    dispatcher: httpsAgent,
    headers: {
      'User-Agent': 'Doctopus/1.0 (medication sync; +https://doctopus.ma)',
      Accept: 'text/html',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`);
  return res.text();
}

function discoverMaxPage(html: string): number {
  let max = 1;
  let m: RegExpExecArray | null;
  PAGE_RE.lastIndex = 0;
  while ((m = PAGE_RE.exec(html)) !== null) {
    const p = parseInt(m[1], 10);
    if (Number.isFinite(p) && p > max) max = p;
  }
  return max;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '';
      out[k] = v || '1';
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const maxPagesOverride = args['max-pages'] ? Number(args['max-pages']) : undefined;
  const throttleMs = args['throttle'] ? Number(args['throttle']) : 100;

  console.log('Fetching page 1 to discover total page count…');
  const firstHtml = await fetchPage(1);
  const discoveredMax = discoverMaxPage(firstHtml);
  const lastPage = maxPagesOverride
    ? Math.min(discoveredMax, maxPagesOverride)
    : discoveredMax;
  console.log(`  pages 1..${lastPage} (discovered max = ${discoveredMax})`);

  const db = dbAdmin();
  const [batch] = await db
    .insert(medicationImports)
    .values({ sourceFileName: 'ammps:listes-medicaments', importedBy: 'sync-ammps' })
    .returning();

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let totalRows = 0;

  async function upsertRow(r: AmmpsRow): Promise<'inserted' | 'updated' | 'skipped'> {
    const nom = r.specialite;
    const dci = r.substanceActive;
    if (!nom || !dci) return 'skipped';

    const isActive = /commercialis/i.test(r.statutCommercialisation) && !/non/i.test(r.statutCommercialisation);
    const metadata = {
      ph: emptyToNull(r.ph),
      pfht: emptyToNull(r.pfht),
      tva: emptyToNull(r.tva),
      pp_gn: emptyToNull(r.ppGn),
      statut_amm: emptyToNull(r.statutAmm),
      statut_commercialisation: emptyToNull(r.statutCommercialisation),
    };

    const result = await db.execute(sql`
      INSERT INTO medications
        (nom_commercial, dci, dosage, forme, presentation, classe_therapeutique, laboratoire, ppv, is_active, import_batch_id, imported_at, metadata)
      VALUES
        (${nom}, ${dci}, ${emptyToNull(r.dosage)}, ${emptyToNull(r.forme)}, ${emptyToNull(r.presentation)},
         ${emptyToNull(r.classeTherapeutique)}, ${emptyToNull(r.epi)}, ${parsePpv(r.ppv)}, ${isActive},
         ${batch.id}::uuid, now(), ${JSON.stringify(metadata)}::jsonb)
      ON CONFLICT (lower(nom_commercial), coalesce(lower(dosage), ''), coalesce(lower(forme), ''), coalesce(lower(laboratoire), ''))
      DO UPDATE SET
        dci = EXCLUDED.dci,
        presentation = EXCLUDED.presentation,
        classe_therapeutique = EXCLUDED.classe_therapeutique,
        ppv = EXCLUDED.ppv,
        is_active = EXCLUDED.is_active,
        import_batch_id = EXCLUDED.import_batch_id,
        imported_at = EXCLUDED.imported_at,
        metadata = EXCLUDED.metadata
      RETURNING (xmax = 0) AS inserted
    `);
    const wasInsert = (result as unknown as Array<{ inserted: boolean }>)[0]?.inserted;
    return wasInsert ? 'inserted' : 'updated';
  }

  for (let page = 1; page <= lastPage; page++) {
    const html = page === 1 ? firstHtml : await fetchPage(page);
    const rows = parseRows(html);
    totalRows += rows.length;
    for (const row of rows) {
      const out = await upsertRow(row);
      if (out === 'inserted') inserted += 1;
      else if (out === 'updated') updated += 1;
      else skipped += 1;
    }
    if (page % 10 === 0 || page === lastPage) {
      console.log(`  page ${page}/${lastPage} — running totals: ins=${inserted} upd=${updated} skip=${skipped}`);
    }
    if (page < lastPage) await sleep(throttleMs);
  }

  await db
    .update(medicationImports)
    .set({
      rowCountInserted: String(inserted),
      rowCountUpdated: String(updated),
      rowCountSkipped: String(skipped),
      notes: `pages=1..${lastPage} totalRows=${totalRows}`,
    })
    .where(sql`${medicationImports.id} = ${batch.id}`);

  // Soft-deactivate rows we haven't seen in this batch and that were last touched > 90 days ago.
  const deactivated = await db.execute(sql`
    UPDATE medications SET is_active = false
    WHERE is_active = true
      AND (import_batch_id IS DISTINCT FROM ${batch.id}::uuid)
      AND imported_at < now() - interval '90 days'
    RETURNING id
  `);
  const deactivatedCount = (deactivated as unknown as Array<unknown>).length;
  if (deactivatedCount > 0) {
    await db
      .update(medicationImports)
      .set({ rowCountDeactivated: String(deactivatedCount) })
      .where(sql`${medicationImports.id} = ${batch.id}`);
  }

  console.log(
    `\n✅ AMMPS sync done: pages=${lastPage} rows=${totalRows} inserted=${inserted} updated=${updated} skipped=${skipped} deactivated=${deactivatedCount}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
