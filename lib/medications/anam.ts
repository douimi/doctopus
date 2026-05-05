import 'server-only';

const BASE = 'https://e-services.anam.ma/eServices/api/Medicament';
const TIMEOUT_MS = 4500;
const MAX_NAMES = 8;
const MAX_HITS = 30;

export type AnamRow = {
  codeEan13: string;
  nomCommercial: string;
  dci: string;
  formeDosage: string;
  presentation: string;
  ppm: number | null;
  pbrPpm: number | null;
  phm: number | null;
  pbrPhm: number | null;
  classeTherapeutique: string | null;
  typeMed: string | null;
};

async function fetchJson<T>(url: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`ANAM ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function getAnamNames(prefix: string): Promise<string[]> {
  const trimmed = prefix.trim();
  if (trimmed.length < 2) return [];
  const url = `${BASE}/GetMedicamentClause/${encodeURIComponent(trimmed)}/`;
  const data = await fetchJson<unknown>(url);
  if (!Array.isArray(data)) return [];
  return data.filter(
    (s): s is string => typeof s === 'string' && s !== '0' && s.trim().length > 0,
  );
}

export async function getAnamRowsByName(name: string): Promise<AnamRow[]> {
  if (!name) return [];
  const url = `${BASE}/GetMedicament/${encodeURIComponent(name)}/`;
  const data = await fetchJson<unknown>(url);
  if (!Array.isArray(data)) return [];
  return data as AnamRow[];
}

export async function searchAnamMedications(query: string): Promise<AnamRow[]> {
  const names = await getAnamNames(query);
  if (names.length === 0) return [];
  const detailLists = await Promise.all(
    names.slice(0, MAX_NAMES).map((n) => getAnamRowsByName(n).catch(() => [])),
  );
  const seen = new Set<string>();
  const out: AnamRow[] = [];
  for (const r of detailLists.flat()) {
    if (!r || typeof r.codeEan13 !== 'string' || seen.has(r.codeEan13)) continue;
    seen.add(r.codeEan13);
    out.push(r);
    if (out.length >= MAX_HITS) break;
  }
  return out;
}
