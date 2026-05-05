'use client';

import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  FileDown,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { PrescriptionItem } from '@/db/schema';
import type { MedicationSearchHit } from '@/lib/medications/queries';
import { formatMedicationLabel } from '@/lib/medications/queries';
import type { AutocompleteSuggestions } from '@/lib/prescriptions/autocomplete';
import {
  addItemActionFromForm,
  removeItemAction,
  reorderItemAction,
  updateItemAction,
} from './actions';
import { MedicationSearchInput } from './search-input';

export function PrescriptionEditor({
  consultationId,
  prescriptionId,
  items,
  readOnly,
  suggestions,
}: {
  consultationId: string;
  prescriptionId: string | null;
  items: PrescriptionItem[];
  readOnly: boolean;
  suggestions: AutocompleteSuggestions;
}) {
  const [pickedHit, setPickedHit] = useState<MedicationSearchHit | null>(null);
  const [freeLabel, setFreeLabel] = useState('');
  const [isFree, setIsFree] = useState(false);

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
        <p className="text-body text-muted-foreground italic">
          Aucun médicament prescrit.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li
              key={it.id}
              className="rounded-lg border border-border bg-background p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-body">
                    {it.medicationLabelSnapshot}
                  </div>
                </div>
                {!readOnly ? (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <form action={reorderItemAction}>
                      <input type="hidden" name="consultationId" value={consultationId} />
                      <input type="hidden" name="itemId" value={it.id} />
                      <input type="hidden" name="direction" value="up" />
                      <Button
                        type="submit"
                        size="icon-xs"
                        variant="ghost"
                        disabled={idx === 0}
                        aria-label="Monter"
                        title="Monter"
                      >
                        <ArrowUp aria-hidden />
                      </Button>
                    </form>
                    <form action={reorderItemAction}>
                      <input type="hidden" name="consultationId" value={consultationId} />
                      <input type="hidden" name="itemId" value={it.id} />
                      <input type="hidden" name="direction" value="down" />
                      <Button
                        type="submit"
                        size="icon-xs"
                        variant="ghost"
                        disabled={idx === items.length - 1}
                        aria-label="Descendre"
                        title="Descendre"
                      >
                        <ArrowDown aria-hidden />
                      </Button>
                    </form>
                    <form action={removeItemAction}>
                      <input type="hidden" name="consultationId" value={consultationId} />
                      <input type="hidden" name="itemId" value={it.id} />
                      <Button
                        type="submit"
                        size="icon-xs"
                        variant="ghost"
                        aria-label="Retirer le médicament"
                        title="Retirer"
                        className="text-muted-foreground hover:text-danger"
                      >
                        <X aria-hidden />
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
              {readOnly ? (
                <dl className="text-small text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                  {it.posologie ? (
                    <div className="contents">
                      <dt className="font-medium text-foreground">Posologie</dt>
                      <dd>{it.posologie}</dd>
                    </div>
                  ) : null}
                  {it.duration ? (
                    <div className="contents">
                      <dt className="font-medium text-foreground">Durée</dt>
                      <dd>{it.duration}</dd>
                    </div>
                  ) : null}
                  {it.quantity ? (
                    <div className="contents">
                      <dt className="font-medium text-foreground">Quantité</dt>
                      <dd>{it.quantity}</dd>
                    </div>
                  ) : null}
                  {it.instructions ? (
                    <div className="contents">
                      <dt className="font-medium text-foreground">Notes</dt>
                      <dd>{it.instructions}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <form action={updateItemAction} className="grid grid-cols-2 gap-2">
                  <input type="hidden" name="consultationId" value={consultationId} />
                  <input type="hidden" name="itemId" value={it.id} />
                  <div className="space-y-1">
                    <Label className="text-small" htmlFor={`pos-${it.id}`}>
                      Posologie
                    </Label>
                    <Input
                      id={`pos-${it.id}`}
                      name="posologie"
                      defaultValue={it.posologie ?? ''}
                      placeholder="ex. 1 cp matin et soir"
                      list="posologie-suggestions"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-small" htmlFor={`dur-${it.id}`}>
                      Durée
                    </Label>
                    <Input
                      id={`dur-${it.id}`}
                      name="duration"
                      defaultValue={it.duration ?? ''}
                      placeholder="ex. 7 jours"
                      list="duration-suggestions"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-small" htmlFor={`qty-${it.id}`}>
                      Quantité
                    </Label>
                    <Input
                      id={`qty-${it.id}`}
                      name="quantity"
                      defaultValue={it.quantity ?? ''}
                      placeholder="ex. 1 boîte"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-small" htmlFor={`ins-${it.id}`}>
                      Notes
                    </Label>
                    <Input
                      id={`ins-${it.id}`}
                      name="instructions"
                      defaultValue={it.instructions ?? ''}
                    />
                  </div>
                  <div className="col-span-2">
                    <Button type="submit" size="sm" variant="secondary">
                      Enregistrer
                    </Button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          <div className="font-medium text-heading">Ajouter un médicament</div>
          <div
            role="tablist"
            aria-label="Mode d'ajout"
            className="inline-flex p-0.5 rounded-md bg-muted text-small"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isFree}
              onClick={() => setIsFree(false)}
              className={cn(
                'px-2.5 py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                !isFree
                  ? 'bg-card text-foreground shadow-card'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              style={{ transitionDuration: 'var(--duration-fast)' }}
            >
              Depuis la base
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isFree}
              onClick={() => setIsFree(true)}
              className={cn(
                'px-2.5 py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                isFree
                  ? 'bg-card text-foreground shadow-card'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              style={{ transitionDuration: 'var(--duration-fast)' }}
            >
              Médicament libre
            </button>
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

          {pickedHit || (isFree && freeLabel.trim().length > 0) ? (
            <form action={addItemActionFromForm} className="space-y-2 border-t border-border pt-3">
              <input type="hidden" name="consultationId" value={consultationId} />
              {!isFree && pickedHit ? (
                <>
                  <input type="hidden" name="medicationEan13" value={pickedHit.codeEan13} />
                  <input
                    type="hidden"
                    name="medicationMetadata"
                    value={JSON.stringify({
                      codeEan13: pickedHit.codeEan13,
                      nomCommercial: pickedHit.nomCommercial,
                      dci: pickedHit.dci,
                      formeDosage: pickedHit.formeDosage,
                      presentation: pickedHit.presentation,
                      classeTherapeutique: pickedHit.classeTherapeutique,
                      ppm: pickedHit.ppm,
                      pbrPpm: pickedHit.pbrPpm,
                      isReimbursable: pickedHit.isReimbursable,
                      typeMed: pickedHit.typeMed,
                    })}
                  />
                </>
              ) : null}
              <input
                type="hidden"
                name="label"
                value={isFree ? freeLabel : pickedHit ? formatMedicationLabel(pickedHit) : ''}
              />
              <div className="text-body">
                <span className="text-muted-foreground">À ajouter :</span>{' '}
                <span className="font-medium">
                  {isFree ? freeLabel : pickedHit ? formatMedicationLabel(pickedHit) : ''}
                </span>
                {pickedHit?.isReimbursable ? (
                  <span className="ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-success-tint text-success">
                    Remboursé
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-small" htmlFor="new-pos">
                    Posologie
                  </Label>
                  <Input id="new-pos" name="posologie" placeholder="ex. 1 cp matin et soir" list="posologie-suggestions" />
                </div>
                <div className="space-y-1">
                  <Label className="text-small" htmlFor="new-dur">
                    Durée
                  </Label>
                  <Input id="new-dur" name="duration" placeholder="ex. 7 jours" list="duration-suggestions" />
                </div>
                <div className="space-y-1">
                  <Label className="text-small" htmlFor="new-qty">
                    Quantité
                  </Label>
                  <Input id="new-qty" name="quantity" placeholder="ex. 1 boîte" />
                </div>
                <div className="space-y-1">
                  <Label className="text-small" htmlFor="new-ins">
                    Notes
                  </Label>
                  <Input id="new-ins" name="instructions" />
                </div>
              </div>
              <Button type="submit" size="sm">
                <Plus aria-hidden />
                Ajouter
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {prescriptionId && items.length > 0 ? (
        <a
          href={`/api/prescriptions/${prescriptionId}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-body font-medium text-primary hover:text-primary-hover transition-colors focus-visible:outline-none focus-visible:underline"
          style={{ transitionDuration: 'var(--duration-fast)' }}
        >
          <FileDown className="size-4" aria-hidden />
          Imprimer l&apos;ordonnance (PDF)
        </a>
      ) : null}
    </div>
  );
}
