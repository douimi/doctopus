'use client';

import { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { addAllergyAction, removeAllergyAction } from './allergies/actions';
import { addConditionAction, removeConditionAction } from './conditions/actions';
import type { LabelActionResult } from './allergies/actions';

type Item = { id: string; label: string };

function ListEditor({
  title,
  patientId,
  items,
  emptyLabel,
  placeholder,
  addLabel,
  tone,
  add,
  remove,
}: {
  title: string;
  patientId: string;
  items: Item[];
  emptyLabel: string;
  placeholder: string;
  addLabel: string;
  tone: 'danger' | 'warning';
  add: (fd: FormData) => Promise<LabelActionResult>;
  remove: (fd: FormData) => Promise<LabelActionResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputId = `${title}-${patientId}`.replace(/\W+/g, '-');

  return (
    <div className="space-y-2">
      <h3 className="eyebrow">{title}</h3>
      {items.length === 0 ? (
        <p className="text-small text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul role="list" className="flex flex-wrap gap-1.5">
          {items.map((it) => (
            <li
              key={it.id}
              className={
                tone === 'danger'
                  ? 'inline-flex h-7 items-center gap-1 rounded-md bg-danger-tint pl-2 text-small font-medium text-danger-ink ring-1 ring-inset ring-danger/20'
                  : 'inline-flex h-7 items-center gap-1 rounded-md bg-warning-tint pl-2 text-small font-medium text-warning-ink ring-1 ring-inset ring-warning/30'
              }
            >
              {it.label}
              <form
                action={async (fd) => {
                  setError(null);
                  const res = await remove(fd);
                  if (!res.ok) setError(res.error);
                }}
              >
                <input type="hidden" name="id" value={it.id} />
                <input type="hidden" name="patientId" value={patientId} />
                <SubmitButton
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Retirer ${it.label}`}
                  title="Retirer"
                  className="size-7 text-current hover:bg-transparent hover:text-foreground"
                >
                  <X aria-hidden />
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form
        ref={formRef}
        className="flex items-center gap-2"
        action={async (fd) => {
          setError(null);
          const res = await add(fd);
          if (!res.ok) setError(res.error);
          else formRef.current?.reset();
        }}
      >
        <input type="hidden" name="patientId" value={patientId} />
        <label htmlFor={inputId} className="sr-only">
          {addLabel}
        </label>
        <Input id={inputId} name="label" placeholder={placeholder} required maxLength={120} />
        <SubmitButton size="icon" variant="secondary" aria-label={addLabel} title={addLabel}>
          <Plus aria-hidden />
        </SubmitButton>
      </form>
      {error ? (
        <p role="alert" className="text-small text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Doctor-only editor for allergies and chronic conditions on the patient file. */
export function ClinicalLists({
  patientId,
  allergies,
  conditions,
}: {
  patientId: string;
  allergies: Item[];
  conditions: Item[];
}) {
  return (
    <section aria-labelledby={`clinical-${patientId}`} className="panel space-y-4 p-4">
      <h2 id={`clinical-${patientId}`} className="text-heading font-semibold">
        Allergies et maladies chroniques
      </h2>
      <ListEditor
        title="Allergies"
        patientId={patientId}
        items={allergies}
        emptyLabel="Aucune allergie connue."
        placeholder="ex. Pénicilline"
        addLabel="Ajouter une allergie"
        tone="danger"
        add={addAllergyAction}
        remove={removeAllergyAction}
      />
      <ListEditor
        title="Maladies chroniques"
        patientId={patientId}
        items={conditions}
        emptyLabel="Aucune maladie chronique."
        placeholder="ex. HTA, diabète…"
        addLabel="Ajouter une maladie chronique"
        tone="warning"
        add={addConditionAction}
        remove={removeConditionAction}
      />
    </section>
  );
}
