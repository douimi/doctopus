import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAnamNames,
  getAnamRowsByName,
  searchAnamMedications,
} from '@/lib/medications/anam';

const ROW_DOLI = {
  codeEan13: '6118000040286',
  nomCommercial: 'DOLIPRANE',
  dci: 'PARACETAMOL',
  formeDosage: 'COMPRIME à 500 MG',
  presentation: '1 BOITE 20 COMPRIME',
  ppm: 9.6,
  pbrPpm: 9.5,
  phm: 6,
  pbrPhm: 5.9,
  classeTherapeutique: 'ANALGESIQUE ANTIPYRETIQUE',
  typeMed: 'PRINCEPS',
};

const ROW_DOLICOX = {
  codeEan13: '6118000041955',
  nomCommercial: 'DOLICOX 90 MG',
  dci: 'ETORICOXIB',
  formeDosage: 'COMPRIME PELLICULE à 90 MG',
  presentation: '1 BOITE 14 COMPRIME PELLICULE',
  ppm: 124,
  pbrPpm: 124,
  phm: 77.5,
  pbrPhm: 77.5,
  classeTherapeutique: 'ANTI-INFLAMMATOIRE NON STEROIDIEN',
  typeMed: 'GENERIQUE',
};

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('ANAM client', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('getAnamNames', () => {
    it('returns [] for queries shorter than 2 chars without calling fetch', async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy as unknown as typeof fetch;
      expect(await getAnamNames('d')).toEqual([]);
      expect(await getAnamNames(' ')).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('strips the "0" sentinel ANAM uses for empty results', async () => {
      globalThis.fetch = vi.fn(async () => jsonResponse(['0'])) as unknown as typeof fetch;
      expect(await getAnamNames('zzz')).toEqual([]);
    });

    it('returns the list of distinct medication names', async () => {
      globalThis.fetch = vi.fn(async () =>
        jsonResponse(['DOLIPRANE', 'DOLICOX 90 MG', 'DOLI PEDIATRIQUE']),
      ) as unknown as typeof fetch;
      expect(await getAnamNames('doli')).toEqual([
        'DOLIPRANE',
        'DOLICOX 90 MG',
        'DOLI PEDIATRIQUE',
      ]);
    });

    it('throws on non-2xx responses so callers can fall back', async () => {
      globalThis.fetch = vi.fn(async () =>
        new Response('boom', { status: 503 }),
      ) as unknown as typeof fetch;
      await expect(getAnamNames('doli')).rejects.toThrow('ANAM 503');
    });
  });

  describe('getAnamRowsByName', () => {
    it('returns the parsed ANAM rows', async () => {
      globalThis.fetch = vi.fn(async () =>
        jsonResponse([ROW_DOLI, ROW_DOLICOX]),
      ) as unknown as typeof fetch;
      const rows = await getAnamRowsByName('DOLIPRANE');
      expect(rows).toHaveLength(2);
      expect(rows[0].codeEan13).toBe('6118000040286');
    });

    it('handles unknown names (ANAM returns [])', async () => {
      globalThis.fetch = vi.fn(async () => jsonResponse([])) as unknown as typeof fetch;
      expect(await getAnamRowsByName('NOPE')).toEqual([]);
    });
  });

  describe('searchAnamMedications', () => {
    it('fans out to GetMedicament for each name and dedupes by codeEan13', async () => {
      const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/GetMedicamentClause/')) {
          return jsonResponse(['DOLIPRANE', 'DOLICOX 90 MG']);
        }
        if (url.includes('/GetMedicament/DOLIPRANE/')) {
          return jsonResponse([ROW_DOLI, ROW_DOLI]); // duplicate row to test dedupe
        }
        if (url.includes('/GetMedicament/DOLICOX')) {
          return jsonResponse([ROW_DOLICOX]);
        }
        throw new Error(`unexpected url: ${url}`);
      });
      globalThis.fetch = fetchSpy as unknown as typeof fetch;

      const out = await searchAnamMedications('doli');

      expect(out.map((r) => r.codeEan13)).toEqual([
        '6118000040286',
        '6118000041955',
      ]);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('tolerates failures on individual name fetches', async () => {
      globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/GetMedicamentClause/')) {
          return jsonResponse(['DOLIPRANE', 'BROKEN']);
        }
        if (url.includes('/GetMedicament/DOLIPRANE/')) {
          return jsonResponse([ROW_DOLI]);
        }
        return new Response('boom', { status: 500 });
      }) as unknown as typeof fetch;

      const out = await searchAnamMedications('doli');
      expect(out.map((r) => r.codeEan13)).toEqual(['6118000040286']);
    });
  });
});
