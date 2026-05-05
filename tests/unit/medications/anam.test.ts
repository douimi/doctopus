import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('undici', () => ({
  fetch: vi.fn(),
  Agent: class {
    constructor(_opts?: unknown) {}
  },
}));

import * as undiciModule from 'undici';
import {
  getAnamNames,
  getAnamRowsByName,
  searchAnamMedications,
} from '@/lib/medications/anam';

const undiciFetch = undiciModule.fetch as unknown as ReturnType<typeof vi.fn>;

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
  beforeEach(() => {
    undiciFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAnamNames', () => {
    it('returns [] for queries shorter than 2 chars without calling fetch', async () => {
      expect(await getAnamNames('d')).toEqual([]);
      expect(await getAnamNames(' ')).toEqual([]);
      expect(undiciFetch).not.toHaveBeenCalled();
    });

    it('strips the "0" sentinel ANAM uses for empty results', async () => {
      undiciFetch.mockResolvedValueOnce(jsonResponse(['0']));
      expect(await getAnamNames('zzz')).toEqual([]);
    });

    it('returns the list of distinct medication names', async () => {
      undiciFetch.mockResolvedValueOnce(
        jsonResponse(['DOLIPRANE', 'DOLICOX 90 MG', 'DOLI PEDIATRIQUE']),
      );
      expect(await getAnamNames('doli')).toEqual([
        'DOLIPRANE',
        'DOLICOX 90 MG',
        'DOLI PEDIATRIQUE',
      ]);
    });

    it('throws on non-2xx responses so callers can fall back', async () => {
      undiciFetch.mockResolvedValueOnce(new Response('boom', { status: 503 }));
      await expect(getAnamNames('doli')).rejects.toThrow('ANAM 503');
    });
  });

  describe('getAnamRowsByName', () => {
    it('returns the parsed ANAM rows', async () => {
      undiciFetch.mockResolvedValueOnce(jsonResponse([ROW_DOLI, ROW_DOLICOX]));
      const rows = await getAnamRowsByName('DOLIPRANE');
      expect(rows).toHaveLength(2);
      expect(rows[0].codeEan13).toBe('6118000040286');
    });

    it('handles unknown names (ANAM returns [])', async () => {
      undiciFetch.mockResolvedValueOnce(jsonResponse([]));
      expect(await getAnamRowsByName('NOPE')).toEqual([]);
    });
  });

  describe('searchAnamMedications', () => {
    it('fans out to GetMedicament for each name and dedupes by codeEan13', async () => {
      undiciFetch.mockImplementation(async (input: unknown) => {
        const url = String(input);
        if (url.includes('/GetMedicamentClause/')) {
          return jsonResponse(['DOLIPRANE', 'DOLICOX 90 MG']);
        }
        if (url.includes('/GetMedicament/DOLIPRANE/')) {
          return jsonResponse([ROW_DOLI, ROW_DOLI]); // duplicate to test dedupe
        }
        if (url.includes('/GetMedicament/DOLICOX')) {
          return jsonResponse([ROW_DOLICOX]);
        }
        throw new Error(`unexpected url: ${url}`);
      });

      const out = await searchAnamMedications('doli');

      expect(out.map((r) => r.codeEan13)).toEqual([
        '6118000040286',
        '6118000041955',
      ]);
      expect(undiciFetch).toHaveBeenCalledTimes(3);
    });

    it('tolerates failures on individual name fetches', async () => {
      undiciFetch.mockImplementation(async (input: unknown) => {
        const url = String(input);
        if (url.includes('/GetMedicamentClause/')) {
          return jsonResponse(['DOLIPRANE', 'BROKEN']);
        }
        if (url.includes('/GetMedicament/DOLIPRANE/')) {
          return jsonResponse([ROW_DOLI]);
        }
        return new Response('boom', { status: 500 });
      });

      const out = await searchAnamMedications('doli');
      expect(out.map((r) => r.codeEan13)).toEqual(['6118000040286']);
    });
  });
});
