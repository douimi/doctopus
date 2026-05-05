'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { formatMad } from '@/lib/medications/format';
import type { MedicationSearchHit, SearchMedicationsResult } from '@/lib/medications/types';

export function MedicationSearchInput({
  onPick,
  disabled,
}: {
  onPick: (hit: MedicationSearchHit) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<MedicationSearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/medications/search?q=${encodeURIComponent(trimmed)}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SearchMedicationsResult;
        if (data.ok) {
          setHits(data.hits);
          setError(null);
        } else {
          setHits([]);
          setError(data.error);
        }
      } catch (e) {
        if ((e as { name?: string }).name === 'AbortError') return;
        setHits([]);
        setError('Service de recherche temporairement indisponible.');
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  return (
    <div className="space-y-1">
      <Input
        placeholder="Rechercher un médicament (nom commercial ou DCI)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
      />
      {error ? (
        <p className="text-small text-danger">{error}</p>
      ) : null}
      {hits.length > 0 ? (
        <ul className="border rounded-md max-h-72 overflow-auto text-small bg-card">
          {hits.map((h) => (
            <li key={h.codeEan13}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted flex items-start gap-3"
                onClick={() => {
                  onPick(h);
                  setQuery('');
                  setHits([]);
                  setError(null);
                }}
              >
                <span className="flex-1 min-w-0">
                  <span className="block">
                    <span className="font-medium">{h.nomCommercial}</span>
                    {h.formeDosage ? (
                      <span className="text-muted-foreground"> · {h.formeDosage}</span>
                    ) : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {h.dci}
                    {h.presentation ? ` · ${h.presentation}` : ''}
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1 flex-wrap">
                    {h.typeMed ? (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {h.typeMed === 'PRINCEPS' ? 'Princeps' : h.typeMed === 'GENERIQUE' ? 'Générique' : h.typeMed}
                      </span>
                    ) : null}
                    {h.isReimbursable ? (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-success-tint text-success">
                        Remboursé
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className="block text-foreground">{formatMad(h.ppm)}</span>
                  {h.isReimbursable && h.pbrPpm && h.pbrPpm !== h.ppm ? (
                    <span className="block text-[11px] text-muted-foreground">
                      base remb. {formatMad(h.pbrPpm)}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
