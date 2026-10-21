'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  addAllergyAction,
  removeAllergyAction,
} from '@/app/(authenticated)/patients/[id]/allergies/actions';

/**
 * Inline allergy editing where allergies are discovered — during the
 * consultation. Reuses the patient-file actions (which revalidate this
 * page), so the header chips update too.
 */
export function AllergiesEditor({
  patientId,
  allergies,
}: {
  patientId: string;
  allergies: Array<{ id: string; label: string }>;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  function add() {
    const trimmed = label.trim();
    if (!trimmed) {
      setError('Saisissez une allergie.');
      return;
    }
    if (trimmed.length > 120) {
      setError('120 caractères maximum.');
      return;
    }
    if (allergies.some((a) => a.label.toLowerCase() === trimmed.toLowerCase())) {
      setError('Cette allergie est déjà notée.');
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set('patientId', patientId);
    fd.set('label', trimmed);
    start(async () => {
      const r = await addAllergyAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setLabel('');
      setAdding(false);
    });
  }

  function remove(id: string, text: string) {
    if (!window.confirm(`Retirer l'allergie « ${text} » du dossier ?`)) return;
    const fd = new FormData();
    fd.set('patientId', patientId);
    fd.set('id', id);
    setRemovingId(id);
    setError(null);
    start(async () => {
      const r = await removeAllergyAction(fd);
      setRemovingId(null);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <section aria-labelledby="rail-allergies" className="panel p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="rail-allergies" className="eyebrow">
          Allergies
        </h2>
        {!adding ? (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => setAdding(true)}
            aria-label="Ajouter une allergie"
          >
            <Plus aria-hidden />
            Ajouter
          </Button>
        ) : null}
      </div>
      {allergies.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {allergies.map((a) => (
            <li
              key={a.id}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-danger-tint pl-2 pr-0.5 text-small font-medium text-danger-ink ring-1 ring-inset ring-danger/25"
            >
              <AlertTriangle className="size-3.5" aria-hidden />
              {a.label}
              <button
                type="button"
                onClick={() => remove(a.id, a.label)}
                disabled={pending && removingId === a.id}
                className="inline-flex size-6 items-center justify-center rounded-sm hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:opacity-50"
                aria-label={`Retirer l'allergie ${a.label}`}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-small text-muted-foreground">Aucune allergie connue.</p>
      )}
      {adding ? (
        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <div className="flex gap-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex. Pénicilline"
              aria-label="Nouvelle allergie"
              aria-invalid={error ? true : undefined}
              autoFocus
              maxLength={120}
            />
            <Button
              type="submit"
              size="sm"
              loading={pending && removingId === null}
              aria-label="Enregistrer l'allergie"
            >
              Ajouter
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Annuler"
              onClick={() => {
                setAdding(false);
                setLabel('');
                setError(null);
              }}
            >
              <X aria-hidden />
            </Button>
          </div>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="text-small text-danger-ink">
          {error}
        </p>
      ) : null}
    </section>
  );
}
