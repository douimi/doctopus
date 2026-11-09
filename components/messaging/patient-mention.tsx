'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { searchPatientsForPickerAction } from '@/app/(authenticated)/patients/picker-actions';
import type { PickerPatient } from '@/components/patients/patient-picker';
import type { PatientRef } from '@/lib/messaging/types';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 200;

/**
 * "@" popover above the composer: search a patient by name / phone / CIN
 * and attach them to the message (↑/↓ + Entrée, Échap to close).
 */
export function PatientMentionPicker({
  onSelect,
  onClose,
}: {
  onSelect: (patient: PatientRef) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickerPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const reqRef = useRef(0);

  useEffect(() => {
    const id = ++reqRef.current;
    const t = setTimeout(() => {
      setLoading(true);
      searchPatientsForPickerAction(query)
        .then((rows) => {
          if (id !== reqRef.current) return;
          setResults(rows);
          setActive(0);
        })
        .catch(() => {
          if (id === reqRef.current) setResults([]);
        })
        .finally(() => {
          if (id === reqRef.current) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  function pick(p: PickerPatient) {
    onSelect({ id: p.id, name: p.fullName });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = results[active];
      if (p) pick(p);
    }
  }

  return (
    <div
      className="absolute inset-x-2.5 bottom-full z-10 mb-2 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-popover"
      role="dialog"
      aria-label="Mentionner un patient"
    >
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search className="size-4 shrink-0 text-subtle-foreground" aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Patient : nom, téléphone, CIN…"
          aria-label="Rechercher un patient"
          className="h-10 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-subtle-foreground"
        />
        {loading ? <Loader2 className="size-4 animate-spin text-subtle-foreground" aria-hidden /> : null}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <ul className="max-h-60 overflow-y-auto py-1" role="listbox" aria-label="Patients">
        {!loading && results.length === 0 ? (
          <li className="px-3 py-4 text-center text-small text-muted-foreground">Aucun patient trouvé.</li>
        ) : null}
        {results.map((p, i) => (
          <li key={p.id} role="option" aria-selected={i === active}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(p)}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-left',
                i === active ? 'bg-muted' : 'hover:bg-muted',
              )}
            >
              <Avatar name={p.fullName} size="sm" tone="muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body text-foreground">{p.fullName}</span>
                <span className="block truncate text-micro text-muted-foreground">
                  {[p.ageLabel, p.phone].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
