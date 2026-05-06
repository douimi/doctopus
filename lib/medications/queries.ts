import 'server-only';
import {
  parsePriceDhs,
  searchMedicamentMa,
  type AutocompleteHit,
} from './medicament-ma';
import type { MedicationSearchHit } from './types';

/**
 * Convert an AutocompleteHit from medicament.ma into the shape the rest of
 * the app speaks. The autocomplete payload doesn't include DCI / dosage /
 * presentation as separate fields — only a combined `name` + `snapshot` —
 * so we parse:
 *
 *   name      "DOLIPRANE 1G, Comprimé effervescent"
 *               └─ commercial ─┘  └── forme/dosage ───┘
 *
 *   snapshot  "Boite de 16 - PPV: 14.80 dhs - SANOFI MAROC"
 *               └ presentation ─┘  └price┘     └── lab ───┘
 *
 * The medicament.ma id (a small integer like 1177) is stored in the
 * `codeEan13` field — we kept the field name to avoid a schema migration
 * on prescription_items.medication_ean13. Semantically it's the
 * medicament.ma external id now.
 */

const SNAPSHOT_PPV_RE = /-\s*PPV:\s*([\d.,]+)\s*dhs\s*-?/i;
const SNAPSHOT_LAB_RE = /-\s*PPV:\s*[\d.,]+\s*dhs\s*-\s*(.+?)\s*$/i;

function parseHit(h: AutocompleteHit): MedicationSearchHit {
  // Split the name on the first comma — first half is the commercial name,
  // second half is the form/dosage descriptor.
  const idx = h.name.indexOf(',');
  const nomCommercial = idx >= 0 ? h.name.slice(0, idx).trim() : h.name.trim();
  const formeDosage = idx >= 0 ? h.name.slice(idx + 1).trim() : null;

  // Snapshot: "<presentation> - PPV: <price> dhs - <laboratoire>"
  const snapshot = h.snapshot ?? '';
  const ppvMatch = snapshot.match(SNAPSHOT_PPV_RE);
  const ppm = ppvMatch ? parsePriceDhs(ppvMatch[1]) : null;
  const presentation = ppvMatch
    ? snapshot.slice(0, snapshot.indexOf(ppvMatch[0])).replace(/-\s*$/, '').trim() || null
    : snapshot.trim() || null;
  const labMatch = snapshot.match(SNAPSHOT_LAB_RE);
  const laboratoire = labMatch ? labMatch[1].trim() : null;

  return {
    codeEan13: String(h.id),
    nomCommercial,
    dci: '',
    formeDosage,
    presentation,
    classeTherapeutique: laboratoire, // shown in the dropdown's tertiary line slot
    ppm,
    pbrPpm: null, // medicament.ma does not expose a base de remboursement
    isReimbursable: false, // not tracked; chip never renders
    typeMed: h.princeps === 1 ? 'PRINCEPS' : 'GENERIQUE',
  };
}

export async function searchMedications(query: string): Promise<MedicationSearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const hits = await searchMedicamentMa(trimmed);
  return hits.map(parseHit);
}
