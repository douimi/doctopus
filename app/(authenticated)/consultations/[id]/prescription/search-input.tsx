'use client';

import { useEffect, useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { searchMedicationsAction } from './actions';
import { formatMad } from '@/lib/medications/format';
import type { MedicationSearchHit } from '@/lib/medications/queries';

export function MedicationSearchInput({
  onPick,
  disabled,
}: {
  onPick: (hit: MedicationSearchHit) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<MedicationSearchHit[]>([]);
  const [, start] = useTransition();

  useEffect(() => {
    if (query.trim().length < 2) {
      const id = setTimeout(() => setHits([]), 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => {
      start(async () => {
        const results = await searchMedicationsAction(query);
        setHits(results);
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
      {hits.length > 0 ? (
        <ul className="border rounded-md max-h-64 overflow-auto text-sm">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="w-full text-left px-2 py-1 hover:bg-muted flex items-baseline gap-3"
                onClick={() => {
                  onPick(h);
                  setQuery('');
                  setHits([]);
                }}
              >
                <span className="flex-1 min-w-0 truncate">
                  <span className="font-medium">{h.nomCommercial}</span>
                  {h.dosage ? ` ${h.dosage}` : ''}
                  {h.forme ? ` · ${h.forme}` : ''}
                  <span className="text-muted-foreground"> — {h.dci}</span>
                  {h.laboratoire ? (
                    <span className="text-xs text-muted-foreground"> ({h.laboratoire})</span>
                  ) : null}
                </span>
                <span className="shrink-0 pl-3 text-right tabular-nums text-muted-foreground">
                  {formatMad(h.ppv)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
