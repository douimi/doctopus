import 'server-only';
import { sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';

export type MedicationSearchHit = {
  id: string;
  nomCommercial: string;
  dci: string;
  dosage: string | null;
  forme: string | null;
  laboratoire: string | null;
  ppv: string | null;
};

export async function searchMedications(query: string): Promise<MedicationSearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const db = dbAdmin();
  const pattern = `%${trimmed.replace(/[\\%_]/g, (m) => '\\' + m)}%`;
  const rows = await db.execute<{
    id: string;
    nom_commercial: string;
    dci: string;
    dosage: string | null;
    forme: string | null;
    laboratoire: string | null;
    ppv: string | null;
  }>(sql`
    SELECT id, nom_commercial, dci, dosage, forme, laboratoire, ppv
    FROM medications
    WHERE is_active = true
      AND (nom_commercial ILIKE ${pattern} OR dci ILIKE ${pattern})
    ORDER BY similarity(nom_commercial, ${trimmed}) DESC, nom_commercial ASC
    LIMIT 20
  `);
  return rows.map((r) => ({
    id: r.id,
    nomCommercial: r.nom_commercial,
    dci: r.dci,
    dosage: r.dosage,
    forme: r.forme,
    laboratoire: r.laboratoire,
    ppv: r.ppv,
  }));
}

export function formatMedicationLabel(hit: MedicationSearchHit): string {
  const parts = [hit.nomCommercial, hit.dosage, hit.forme].filter(Boolean) as string[];
  return parts.join(' ');
}
