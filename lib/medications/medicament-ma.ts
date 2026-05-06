import 'server-only';

/**
 * Client for the medicament.ma medication database (Morocco).
 *
 * Two endpoints:
 *   - POST https://medicament.ma/wp-admin/admin-ajax.php
 *       action=api_autocomplete
 *       keyword=<query>           (3+ chars)
 *       comparison=specialite|generique
 *     → {data: [{id, name, snapshot, princeps, generics_count, dci_count}], total, …}
 *
 *   - GET https://api.medicament.ma/v2/medicines/id/{id}
 *     → full record with details[] (presentation, dosage, princeps, distributeur,
 *       composition, famille, statut, atc, ppv, prix_hospitalier, tableau, …)
 *
 * Search runs both `specialite` (commercial name) and `generique` (DCI) queries
 * in parallel and merges + dedupes by id. Detail is fetched lazily by callers
 * that need the full record (rich prescription metadata).
 */

const AJAX_URL = 'https://medicament.ma/wp-admin/admin-ajax.php';
const API_URL = 'https://api.medicament.ma/v2';
const TIMEOUT_MS = 5000;
const MAX_HITS = 30;

export type AutocompleteHit = {
  id: number;
  name: string;
  snapshot: string;
  princeps: 0 | 1;
  generics_count: number;
  dci_count: number;
};

type AutocompleteResponse = {
  data: AutocompleteHit[];
  total: number;
  pageSize: number;
  page: number;
  totalPages: number;
};

export type Detail = {
  id: number;
  name: string;
  snapshot: string;
  url: string;
  hasBarcode: boolean;
  details: Array<{
    id: string;
    label: string;
    format: string;
    value: string;
    multiple: boolean;
  }>;
};

async function timed<T>(p: Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await p;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAjax(
  keyword: string,
  comparison: 'specialite' | 'generique',
): Promise<AutocompleteHit[]> {
  if (keyword.trim().length < 3) return [];
  const body = new URLSearchParams();
  body.set('action', 'api_autocomplete');
  body.set('keyword', keyword.trim());
  body.set('comparison', comparison);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(AJAX_URL, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`medicament.ma ${res.status}`);
    const json = (await res.json()) as AutocompleteResponse;
    return Array.isArray(json.data) ? json.data : [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Search medicament.ma by commercial name + DCI in parallel; dedupe by id.
 * Returns up to `MAX_HITS` results.
 */
export async function searchMedicamentMa(query: string): Promise<AutocompleteHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  // The site requires 3+ chars; for length-2 queries we degrade gracefully to empty.
  if (trimmed.length < 3) return [];

  const [bySpec, byGen] = await Promise.all([
    fetchAjax(trimmed, 'specialite').catch(() => []),
    fetchAjax(trimmed, 'generique').catch(() => []),
  ]);

  const seen = new Set<number>();
  const out: AutocompleteHit[] = [];
  for (const h of [...bySpec, ...byGen]) {
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    out.push(h);
    if (out.length >= MAX_HITS) break;
  }
  return out;
}

export async function getMedicamentMaDetail(id: number): Promise<Detail | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/medicines/id/${encodeURIComponent(String(id))}`, {
      signal: ctrl.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as Detail;
  } finally {
    clearTimeout(timer);
  }
}

/** Helper: read a typed detail value from the array. */
export function readDetail(detail: Detail, id: string): string | null {
  return detail.details.find((d) => d.id === id)?.value ?? null;
}

/** Parse "16.40 dhs" → "16.40", or null if it can't be parsed. */
export function parsePriceDhs(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/([\d]+(?:[.,][\d]+)?)/);
  if (!m) return null;
  return m[1].replace(',', '.');
}
