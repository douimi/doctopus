import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getMedicamentMaDetail,
  parsePriceDhs,
  searchMedicamentMa,
} from '@/lib/medications/medicament-ma';

const HIT_DOLI = {
  id: 1177,
  name: 'DOLI PEDIATRIQUE 3 %, Solution buvable',
  snapshot: 'Flaccon de 90 ml - PPV: 16.40 dhs - BOTTU S.A.',
  princeps: 1 as const,
  generics_count: 0,
  dci_count: 64,
};

const HIT_DOLICOX = {
  id: 11808,
  name: 'DOLICOX 120 MG, Comprimé pelliculé',
  snapshot: 'Boite de 7 - PPV: 81.70 dhs - BOTTU S.A.',
  princeps: 0 as const,
  generics_count: 2,
  dci_count: 18,
};

const HIT_PARACETAMOL = {
  id: 14726,
  name: 'PARACETAMOL B BRAUN 10 MG, Solution pour perfusion',
  snapshot: '10 poches de 50 ml - PPV: 130.10 dhs - PHI ',
  princeps: 0 as const,
  generics_count: 0,
  dci_count: 64,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('medicament.ma client', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('searchMedicamentMa', () => {
    it('returns [] for queries shorter than 3 characters without calling fetch', async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy as unknown as typeof fetch;
      expect(await searchMedicamentMa('do')).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('queries both specialite + generique and dedupes by id', async () => {
      const fetchSpy = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
        const body = String(init?.body ?? '');
        if (body.includes('comparison=specialite')) {
          return jsonResponse({
            data: [HIT_DOLI, HIT_DOLICOX],
            total: 2,
            pageSize: 20,
            page: 1,
            totalPages: 1,
          });
        }
        if (body.includes('comparison=generique')) {
          // PARACETAMOL also matches via DCI; HIT_DOLI shows up here too — should be deduped.
          return jsonResponse({
            data: [HIT_DOLI, HIT_PARACETAMOL],
            total: 2,
            pageSize: 20,
            page: 1,
            totalPages: 1,
          });
        }
        throw new Error(`unexpected body: ${body}`);
      });
      globalThis.fetch = fetchSpy as unknown as typeof fetch;

      const out = await searchMedicamentMa('doli');
      expect(out.map((h) => h.id)).toEqual([1177, 11808, 14726]);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('survives a failure on one of the two parallel calls', async () => {
      globalThis.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
        const body = String(init?.body ?? '');
        if (body.includes('comparison=specialite')) {
          return jsonResponse({ data: [HIT_DOLICOX], total: 1, pageSize: 20, page: 1, totalPages: 1 });
        }
        return new Response('boom', { status: 500 });
      }) as unknown as typeof fetch;

      const out = await searchMedicamentMa('doli');
      expect(out.map((h) => h.id)).toEqual([11808]);
    });
  });

  describe('getMedicamentMaDetail', () => {
    it('parses the detail payload', async () => {
      globalThis.fetch = vi.fn(async () =>
        jsonResponse({
          id: 1177,
          name: 'DOLI PEDIATRIQUE 3 %, Solution buvable',
          snapshot: 'Flaccon de 90 ml - PPV: 16.40 dhs - BOTTU S.A.',
          url: 'https://medicament.ma/medicament/doli',
          hasBarcode: true,
          details: [
            { id: 'ppv', label: 'PPV', format: 'string', value: '16.40 dhs', multiple: false },
            { id: 'composition', label: 'Composition', format: 'string', value: 'Paracétamol', multiple: false },
          ],
        }),
      ) as unknown as typeof fetch;

      const d = await getMedicamentMaDetail(1177);
      expect(d?.id).toBe(1177);
      expect(d?.details.find((x) => x.id === 'composition')?.value).toBe('Paracétamol');
    });

    it('returns null on 404', async () => {
      globalThis.fetch = vi.fn(async () => new Response('Not found', { status: 404 })) as unknown as typeof fetch;
      expect(await getMedicamentMaDetail(0)).toBeNull();
    });
  });

  describe('parsePriceDhs', () => {
    it('strips "dhs" and normalises commas', () => {
      expect(parsePriceDhs('16.40 dhs')).toBe('16.40');
      expect(parsePriceDhs('19,10 dhs')).toBe('19.10');
      expect(parsePriceDhs('1099.00 dhs')).toBe('1099.00');
      expect(parsePriceDhs(null)).toBeNull();
      expect(parsePriceDhs('—')).toBeNull();
    });
  });
});
