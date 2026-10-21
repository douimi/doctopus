'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Search, UserSearch } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { searchPatientsForPickerAction } from '@/app/(authenticated)/patients/picker-actions';

export type PickerPatient = {
  id: string;
  fullName: string;
  ageLabel: string;
  phone: string | null;
  cin: string | null;
};

const DEBOUNCE_MS = 200;

/**
 * Shared patient combobox (UX brief P-10 / §4). One behaviour everywhere:
 * type to search by nom, prénom, téléphone or CIN; ↑/↓ to move, Entrée to
 * pick; clicking a row SELECTS the patient (it never navigates to the
 * file). Results come from a server action so it works inside dialogs.
 */
export function PatientPicker({
  onSelect,
  defaultQuery = '',
  autoFocus = true,
  newPatientHref,
  label = 'Rechercher un patient',
  className,
}: {
  onSelect: (patient: PickerPatient) => void;
  defaultQuery?: string;
  autoFocus?: boolean;
  /** Shows a "Nouveau patient" link (e.g. `/patients/new?next=/today/book`). */
  newPatientHref?: string;
  label?: string;
  className?: string;
}) {
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<PickerPatient[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function run(q: string) {
    const mine = ++seq.current;
    void searchPatientsForPickerAction(q.trim())
      .then((rows) => {
        if (mine !== seq.current) return;
        setResults(rows);
        setActive(0);
        setFailed(false);
      })
      .catch(() => {
        if (mine !== seq.current) return;
        setFailed(true);
      })
      .finally(() => {
        if (mine === seq.current) setLoading(false);
      });
  }

  // Initial load (recent patients, or the prefilled query).
  useEffect(() => {
    run(defaultQuery);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onChange(next: string) {
    setQuery(next);
    setLoading(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => run(next), DEBOUNCE_MS);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const rows = results ?? [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(rows.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const pick = rows[active];
      if (pick) {
        e.preventDefault();
        onSelect(pick);
      }
    }
  }

  const rows = results ?? [];
  const trimmed = query.trim();
  const activeId = rows[active] ? `${listId}-${rows[active].id}` : undefined;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
            aria-hidden
          />
          <Input
            id={inputId}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            autoFocus={autoFocus}
            autoComplete="off"
            value={query}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Nom, prénom, téléphone ou CIN"
            className="pl-9 pr-9"
          />
          {loading ? (
            <Loader2
              className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-subtle-foreground"
              aria-hidden
            />
          ) : null}
        </div>
        {newPatientHref ? (
          <Link
            href={newPatientHref}
            className={buttonVariants({ variant: 'secondary', className: 'shrink-0' })}
          >
            <Plus aria-hidden />
            Nouveau patient
          </Link>
        ) : null}
      </div>

      <p className="eyebrow" aria-live="polite">
        {failed
          ? 'Recherche indisponible'
          : trimmed
            ? `${rows.length} résultat${rows.length === 1 ? '' : 's'}`
            : 'Patients récents'}
      </p>

      <ul
        id={listId}
        role="listbox"
        aria-label="Patients"
        className="panel max-h-80 divide-y divide-border overflow-y-auto"
      >
        {failed ? (
          <li className="px-4 py-6 text-center text-small text-danger-ink">
            La recherche a échoué. Vérifiez la connexion et réessayez.
          </li>
        ) : results !== null && rows.length === 0 && !loading ? (
          <li className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <UserSearch className="size-5 text-subtle-foreground" aria-hidden />
            <span className="text-body font-medium">
              {trimmed ? `Aucun patient ne correspond à « ${trimmed} »` : 'Aucun patient enregistré'}
            </span>
            {newPatientHref ? (
              <span className="text-small text-muted-foreground">
                Créez le dossier avec « Nouveau patient ».
              </span>
            ) : null}
          </li>
        ) : results === null ? (
          <li className="px-4 py-6 text-center text-small text-muted-foreground">
            Chargement…
          </li>
        ) : (
          rows.map((p, i) => {
            const meta = [p.ageLabel, p.phone, p.cin].filter(Boolean).join(' · ');
            return (
              <li
                key={p.id}
                id={`${listId}-${p.id}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(p)}
                className={cn(
                  'flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 transition-colors duration-(--duration-fast)',
                  i === active ? 'bg-primary-tint' : 'hover:bg-muted/50',
                )}
              >
                <Avatar name={p.fullName} size="sm" tone="muted" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body font-medium text-foreground">{p.fullName}</div>
                  {meta ? (
                    <div className="truncate text-small text-muted-foreground tabular-nums">{meta}</div>
                  ) : null}
                </div>
                <span
                  className={cn(
                    'text-small font-medium text-primary',
                    i === active ? 'opacity-100' : 'opacity-0',
                  )}
                  aria-hidden
                >
                  Choisir
                </span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
