'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PrescriptionItem } from '@/db/schema';
import type { MedicationSearchHit } from '@/lib/medications/queries';
import {
  addItemActionFromForm,
  removeItemAction,
  reorderItemAction,
  updateItemAction,
} from './actions';
import { MedicationSearchInput } from './search-input';

function formatLabel(hit: MedicationSearchHit): string {
  return [hit.nomCommercial, hit.dosage, hit.forme].filter(Boolean).join(' ');
}

export function PrescriptionEditor({
  consultationId,
  prescriptionId,
  items,
  readOnly,
}: {
  consultationId: string;
  prescriptionId: string | null;
  items: PrescriptionItem[];
  readOnly: boolean;
}) {
  const [pickedHit, setPickedHit] = useState<MedicationSearchHit | null>(null);
  const [freeLabel, setFreeLabel] = useState('');
  const [isFree, setIsFree] = useState(false);

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun médicament prescrit.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li key={it.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="font-medium text-sm">{it.medicationLabelSnapshot}</div>
                </div>
                {!readOnly ? (
                  <div className="flex gap-1 text-xs">
                    <form action={reorderItemAction}>
                      <input type="hidden" name="consultationId" value={consultationId} />
                      <input type="hidden" name="itemId" value={it.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        disabled={idx === 0}
                        className="underline disabled:opacity-30"
                      >
                        ↑
                      </button>
                    </form>
                    <form action={reorderItemAction}>
                      <input type="hidden" name="consultationId" value={consultationId} />
                      <input type="hidden" name="itemId" value={it.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        disabled={idx === items.length - 1}
                        className="underline disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </form>
                    <form action={removeItemAction}>
                      <input type="hidden" name="consultationId" value={consultationId} />
                      <input type="hidden" name="itemId" value={it.id} />
                      <button type="submit" className="text-danger underline">
                        retirer
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
              {readOnly ? (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {it.posologie ? <div>Posologie : {it.posologie}</div> : null}
                  {it.duration ? <div>Durée : {it.duration}</div> : null}
                  {it.quantity ? <div>Quantité : {it.quantity}</div> : null}
                  {it.instructions ? <div>Notes : {it.instructions}</div> : null}
                </div>
              ) : (
                <form action={updateItemAction} className="grid grid-cols-2 gap-2">
                  <input type="hidden" name="consultationId" value={consultationId} />
                  <input type="hidden" name="itemId" value={it.id} />
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`pos-${it.id}`}>
                      Posologie
                    </Label>
                    <Input
                      id={`pos-${it.id}`}
                      name="posologie"
                      defaultValue={it.posologie ?? ''}
                      placeholder="ex. 1 cp matin et soir"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`dur-${it.id}`}>
                      Durée
                    </Label>
                    <Input
                      id={`dur-${it.id}`}
                      name="duration"
                      defaultValue={it.duration ?? ''}
                      placeholder="ex. 7 jours"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`qty-${it.id}`}>
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
                    <Label className="text-xs" htmlFor={`ins-${it.id}`}>
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
        <div className="rounded-md border p-3 space-y-3">
          <div className="font-medium text-sm">Ajouter un médicament</div>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsFree(false)}
              className={`underline ${!isFree ? 'font-semibold' : ''}`}
            >
              Depuis la base
            </button>
            <button
              type="button"
              onClick={() => setIsFree(true)}
              className={`underline ${isFree ? 'font-semibold' : ''}`}
            >
              Médicament libre
            </button>
          </div>
          {isFree ? (
            <div className="space-y-1">
              <Label htmlFor="free-label" className="text-xs">
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
            <form action={addItemActionFromForm} className="space-y-2 border-t pt-3">
              <input type="hidden" name="consultationId" value={consultationId} />
              {!isFree && pickedHit ? (
                <input type="hidden" name="medicationId" value={pickedHit.id} />
              ) : null}
              <input
                type="hidden"
                name="label"
                value={isFree ? freeLabel : pickedHit ? formatLabel(pickedHit) : ''}
              />
              <div className="text-sm">
                <span className="font-medium">À ajouter : </span>
                <span>{isFree ? freeLabel : pickedHit ? formatLabel(pickedHit) : ''}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="new-pos">
                    Posologie
                  </Label>
                  <Input id="new-pos" name="posologie" placeholder="ex. 1 cp matin et soir" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="new-dur">
                    Durée
                  </Label>
                  <Input id="new-dur" name="duration" placeholder="ex. 7 jours" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="new-qty">
                    Quantité
                  </Label>
                  <Input id="new-qty" name="quantity" placeholder="ex. 1 boîte" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="new-ins">
                    Notes
                  </Label>
                  <Input id="new-ins" name="instructions" />
                </div>
              </div>
              <Button type="submit" size="sm">
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
          className="text-sm underline"
        >
          📄 Imprimer l&apos;ordonnance (PDF)
        </a>
      ) : null}
    </div>
  );
}
