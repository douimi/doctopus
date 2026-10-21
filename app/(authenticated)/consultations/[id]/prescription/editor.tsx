'use client';

import { useState, useTransition } from 'react';
import { ArrowDown, ArrowUp, Check, FileDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { PrescriptionItem } from '@/db/schema';
import { formatMedicationLabel, type MedicationSearchHit } from '@/lib/medications/types';
import type { AutocompleteSuggestions } from '@/lib/prescriptions/autocomplete';
import { useConsultationFlush, type FlushResult } from '@/lib/consultations/flush-editor';
import {
  addItemAction,
  removeItemAction,
  reorderItemAction,
  updateItemAction,
  type PrescriptionActionResult,
} from './actions';
import { MedicationSearchInput } from './search-input';

type Fields = {
  posologie: string;
  duration: string;
  quantity: string;
  instructions: string;
};

const EMPTY_FIELDS: Fields = { posologie: '', duration: '', quantity: '', instructions: '' };

function fieldsOf(it: PrescriptionItem): Fields {
  return {
    posologie: it.posologie ?? '',
    duration: it.duration ?? '',
    quantity: it.quantity ?? '',
    instructions: it.instructions ?? '',
  };
}

function sameFields(a: Fields, b: Fields): boolean {
  return (
    a.posologie === b.posologie &&
    a.duration === b.duration &&
    a.quantity === b.quantity &&
    a.instructions === b.instructions
  );
}

type ItemStatus = { saving?: boolean; error?: string; savedAt?: number };

const FIELD_META: Array<{
  key: keyof Fields;
  label: string;
  placeholder?: string;
  list?: string;
  className?: string;
}> = [
  {
    key: 'posologie',
    label: 'Posologie',
    placeholder: 'ex. 1 cp matin et soir',
    list: 'posologie-suggestions',
    className: 'col-span-2 lg:col-span-1',
  },
  { key: 'duration', label: 'Durée', placeholder: 'ex. 7 jours', list: 'duration-suggestions' },
  { key: 'quantity', label: 'Quantité', placeholder: 'ex. 1 boîte' },
  { key: 'instructions', label: 'Notes', className: 'col-span-2 lg:col-span-1' },
];

/**
 * Prescription lines. Item fields are controlled and saved when focus
 * leaves the line (or on Enter) — no per-line "Enregistrer". The editor
 * is a flush participant: "Terminer" saves dirty lines first and is
 * blocked while a picked medication hasn't been added.
 */
export function PrescriptionEditor({
  consultationId,
  prescriptionId,
  items,
  suggestions,
  readOnly = false,
}: {
  consultationId: string;
  prescriptionId: string | null;
  items: PrescriptionItem[];
  suggestions: AutocompleteSuggestions;
  readOnly?: boolean;
}) {
  // Item edits
  const [drafts, setDrafts] = useState<Record<string, Fields>>({});
  const [lastSaved, setLastSaved] = useState<Record<string, Fields>>({});
  const [itemStatus, setItemStatus] = useState<Record<string, ItemStatus>>({});
  // List operations (reorder / remove)
  const [listError, setListError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startList] = useTransition();
  // Add form
  const [pickedHit, setPickedHit] = useState<MedicationSearchHit | null>(null);
  const [freeLabel, setFreeLabel] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [newFields, setNewFields] = useState<Fields>(EMPTY_FIELDS);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, startAdding] = useTransition();

  const pendingLabel = isFree
    ? freeLabel.trim()
    : pickedHit
      ? formatMedicationLabel(pickedHit)
      : '';
  const hasPendingAdd = pendingLabel.length > 0;

  function valueOf(it: PrescriptionItem): Fields {
    return drafts[it.id] ?? fieldsOf(it);
  }

  function isDirty(it: PrescriptionItem): boolean {
    const d = drafts[it.id];
    if (!d) return false;
    return !sameFields(d, lastSaved[it.id] ?? fieldsOf(it));
  }

  function setField(it: PrescriptionItem, key: keyof Fields, value: string) {
    setDrafts((prev) => ({ ...prev, [it.id]: { ...(prev[it.id] ?? fieldsOf(it)), [key]: value } }));
  }

  async function saveItem(it: PrescriptionItem): Promise<PrescriptionActionResult> {
    if (!isDirty(it)) return { ok: true };
    const snapshot = drafts[it.id]!;
    setItemStatus((s) => ({ ...s, [it.id]: { saving: true } }));
    const r = await updateItemAction(consultationId, { itemId: it.id, ...snapshot });
    if (r.ok) {
      setLastSaved((s) => ({ ...s, [it.id]: snapshot }));
      setItemStatus((s) => ({ ...s, [it.id]: { savedAt: Date.now() } }));
    } else {
      setItemStatus((s) => ({
        ...s,
        [it.id]: { error: r.error ?? 'Enregistrement impossible.' },
      }));
    }
    return r;
  }

  useConsultationFlush(consultationId, async (): Promise<FlushResult> => {
    const results = await Promise.all(items.filter(isDirty).map((it) => saveItem(it)));
    const failed = results.find((r) => !r.ok);
    const summary = { rxCount: items.length, prescriptionId };
    if (failed) {
      return {
        ok: false,
        error: `Ordonnance : ${failed.error ?? 'une ligne n’a pas pu être enregistrée.'}`,
        summary,
      };
    }
    if (hasPendingAdd) {
      return {
        ok: false,
        error: `Un médicament est en cours de saisie (« ${pendingLabel} ») : cliquez sur « Ajouter » ou annulez-le avant de terminer.`,
        summary,
      };
    }
    return { ok: true, summary };
  });

  function runListOp(id: string, op: () => Promise<PrescriptionActionResult>) {
    setListError(null);
    setBusyId(id);
    startList(async () => {
      const r = await op();
      if (!r.ok) setListError(r.error ?? 'Action impossible.');
      setBusyId(null);
    });
  }

  function resetAddForm() {
    setPickedHit(null);
    setFreeLabel('');
    setNewFields(EMPTY_FIELDS);
    setAddError(null);
  }

  function add() {
    if (!hasPendingAdd) return;
    setAddError(null);
    const hit = !isFree ? pickedHit : null;
    startAdding(async () => {
      const r = await addItemAction({
        consultationId,
        label: pendingLabel,
        medicationEan13: hit?.codeEan13 ?? '',
        medicationMetadata: hit
          ? JSON.stringify({
              codeEan13: hit.codeEan13,
              nomCommercial: hit.nomCommercial,
              dci: hit.dci,
              formeDosage: hit.formeDosage,
              presentation: hit.presentation,
              classeTherapeutique: hit.classeTherapeutique,
              ppm: hit.ppm,
              pbrPpm: hit.pbrPpm,
              isReimbursable: hit.isReimbursable,
              typeMed: hit.typeMed,
            })
          : '',
        ...newFields,
      });
      if (!r.ok) {
        setAddError(r.error ?? "Impossible d'ajouter le médicament.");
        return;
      }
      resetAddForm();
    });
  }

  return (
    <div className="space-y-3">
      <datalist id="posologie-suggestions">
        {suggestions.posologies.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="duration-suggestions">
        {suggestions.durations.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {items.length === 0 ? (
        <p className="text-body text-muted-foreground">Aucun médicament prescrit.</p>
      ) : (
        <ol className="space-y-2">
          {items.map((it, idx) => {
            const v = valueOf(it);
            const st = itemStatus[it.id];
            const dirty = isDirty(it);
            return (
              <li key={it.id} className="rounded-lg border border-border bg-background p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-micro font-semibold tabular-nums text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1 font-medium text-body">
                    {it.medicationLabelSnapshot}
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-small',
                      st?.error ? 'text-danger-ink' : 'text-muted-foreground',
                    )}
                    aria-live="polite"
                  >
                    {st?.saving
                      ? 'Enregistrement…'
                      : dirty
                        ? 'Non enregistré'
                        : st?.savedAt
                          ? (
                              <span className="inline-flex items-center gap-1 text-success-ink">
                                <Check className="size-3.5" aria-hidden />
                                Enregistré
                              </span>
                            )
                          : null}
                  </span>
                  {!readOnly ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        disabled={idx === 0 || busyId !== null}
                        aria-label="Monter"
                        title="Monter"
                        onClick={() =>
                          runListOp(it.id, () =>
                            reorderItemAction(consultationId, { itemId: it.id, direction: 'up' }),
                          )
                        }
                      >
                        <ArrowUp aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        disabled={idx === items.length - 1 || busyId !== null}
                        aria-label="Descendre"
                        title="Descendre"
                        onClick={() =>
                          runListOp(it.id, () =>
                            reorderItemAction(consultationId, {
                              itemId: it.id,
                              direction: 'down',
                            }),
                          )
                        }
                      >
                        <ArrowDown aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Retirer ${it.medicationLabelSnapshot}`}
                        title="Retirer"
                        className="text-muted-foreground hover:text-danger"
                        loading={busyId === it.id}
                        disabled={busyId !== null}
                        onClick={() =>
                          runListOp(it.id, () => removeItemAction(consultationId, it.id))
                        }
                      >
                        {busyId === it.id ? null : <X aria-hidden />}
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div
                  className="grid grid-cols-2 gap-2 lg:grid-cols-[2fr_1fr_1fr_1.5fr]"
                  onBlur={(e) => {
                    if (readOnly) return;
                    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                    void saveItem(it);
                  }}
                >
                  {FIELD_META.map((f) => (
                    <div key={f.key} className={cn('space-y-1', f.className)}>
                      <Label className="text-small" htmlFor={`${f.key}-${it.id}`}>
                        {f.label}
                      </Label>
                      <Input
                        id={`${f.key}-${it.id}`}
                        value={v[f.key]}
                        placeholder={f.placeholder}
                        list={f.list}
                        disabled={readOnly}
                        onChange={(e) => setField(it, f.key, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void saveItem(it);
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
                {st?.error ? (
                  <p role="alert" className="text-small text-danger-ink">
                    {st.error}{' '}
                    <button
                      type="button"
                      className="font-medium underline"
                      onClick={() => void saveItem(it)}
                    >
                      Réessayer
                    </button>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      {listError ? (
        <p role="alert" className="text-small text-danger-ink">
          {listError}
        </p>
      ) : null}

      {!readOnly ? (
        <div className="rounded-lg border border-border bg-canvas p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium text-body">Ajouter un médicament</div>
            <div
              aria-label="Mode d'ajout"
              className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5"
            >
              {[
                { free: false, label: 'Depuis la base' },
                { free: true, label: 'Médicament libre' },
              ].map((m) => (
                <button
                  key={m.label}
                  type="button"
                  aria-pressed={isFree === m.free}
                  data-active={isFree === m.free ? '' : undefined}
                  onClick={() => setIsFree(m.free)}
                  className="inline-flex h-7 items-center rounded-md px-3 text-small font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-active:bg-card data-active:text-foreground data-active:shadow-card"
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {isFree ? (
            <div className="space-y-1">
              <Label htmlFor="free-label" className="text-small">
                Libellé
              </Label>
              <Input
                id="free-label"
                value={freeLabel}
                onChange={(e) => setFreeLabel(e.target.value)}
                placeholder="ex. Préparation magistrale…"
              />
            </div>
          ) : (
            <MedicationSearchInput onPick={setPickedHit} />
          )}

          {hasPendingAdd ? (
            <form
              className="space-y-2 border-t border-border pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
            >
              <div className="text-body">
                <span className="text-muted-foreground">À ajouter :</span>{' '}
                <span className="font-medium">{pendingLabel}</span>
                {!isFree && pickedHit?.isReimbursable ? (
                  <span className="ml-2 rounded-md bg-success-tint px-1.5 py-0.5 text-micro font-semibold uppercase text-success-ink">
                    Remboursé
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-[2fr_1fr_1fr_1.5fr]">
                {FIELD_META.map((f) => (
                  <div key={f.key} className={cn('space-y-1', f.className)}>
                    <Label className="text-small" htmlFor={`new-${f.key}`}>
                      {f.label}
                    </Label>
                    <Input
                      id={`new-${f.key}`}
                      value={newFields[f.key]}
                      placeholder={f.placeholder}
                      list={f.list}
                      onChange={(e) => setNewFields({ ...newFields, [f.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              {addError ? (
                <p role="alert" className="text-small text-danger-ink">
                  {addError}
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" loading={adding}>
                  {adding ? null : <Plus aria-hidden />}
                  Ajouter
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={resetAddForm}
                  disabled={adding}
                >
                  Annuler
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      {prescriptionId && items.length > 0 ? (
        <a
          href={`/api/prescriptions/${prescriptionId}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-sm text-body font-medium text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FileDown className="size-4" aria-hidden />
          Imprimer l&apos;ordonnance (PDF)
        </a>
      ) : null}
    </div>
  );
}
