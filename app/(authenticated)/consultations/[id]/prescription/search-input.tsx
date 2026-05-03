'use client';

import { useEffect, useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { searchMedicationsAction } from './actions';
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
      setHits([]);
      return;
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
                className="w-full text-left px-2 py-1 hover:bg-gray-100"
                onClick={() => {
                  onPick(h);
                  setQuery('');
                  setHits([]);
                }}
              >
                <span className="font-medium">{h.nomCommercial}</span>
                {h.dosage ? ` ${h.dosage}` : ''}
                {h.forme ? ` · ${h.forme}` : ''}
                <span className="text-gray-500"> — {h.dci}</span>
                {h.laboratoire ? (
                  <span className="text-xs text-gray-400"> ({h.laboratoire})</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
