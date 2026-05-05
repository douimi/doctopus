'use client';

import { useEffect, useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { searchMedicationsAction } from './actions';
import { formatMad } from '@/lib/medications/format';
import type { MedicationSearchHit } from '@/lib/medications/types';

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
  const [, start] = useTransition();

  useEffect(() => {
    if (query.trim().length < 2) {
      const id = setTimeout(() => {
        setHits([]);
        setError(null);
      }, 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => {
      start(async () => {
        const result = await searchMedicationsAction(query);
        if (result.ok) {
          setHits(result.hits);
          setError(null);
        } else {
          setHits([]);
          setError(result.error);
        }
      });
    }, 250);
    return () => clearTimeout(id);
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
