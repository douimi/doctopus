'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { finalizeConsultationAction } from '@/app/(authenticated)/consultations/[id]/actions';
import { flushConsultationEditor } from '@/lib/consultations/flush-editor';
import { cn } from '@/lib/utils';

export function FinalizePricingDialog({
  consultationId,
  defaultPriceMad,
  defaultIsFree = false,
}: {
  consultationId: string;
  defaultPriceMad: string | null;
  /** Follow-up consultations are pre-checked as Gratuit (the patient
   *  already paid for the initial visit). Doctor can still uncheck. */
  defaultIsFree?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isFree, setIsFree] = useState(defaultIsFree);
  const [price, setPrice] = useState(defaultPriceMad ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submitDisabled =
    !isFree && (!price || Number.isNaN(Number(price)) || Number(price) <= 0);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setIsFree(defaultIsFree);
      setPrice(defaultPriceMad ?? '');
      setError(null);
    }
  }

  function handleSubmit() {
    setError(null);
    start(async () => {
      // Flush any unsaved edits in the consultation editor BEFORE
      // finalizing. Without this, clicking Terminer on an in-progress
      // edit (with dirty motif/vitals/etc) locks the row with stale
      // data on the server — the doctor's last changes silently
      // disappear. The flush helper resolves ok=true when no editor
      // is mounted, so other call sites stay unaffected.
      const flushed = await flushConsultationEditor(consultationId);
      if (!flushed.ok) {
        setError(
          flushed.error
            ? `Échec de la sauvegarde des modifications : ${flushed.error}`
            : 'Échec de la sauvegarde des modifications.',
        );
        return;
      }
      const fd = new FormData();
      fd.set('consultationId', consultationId);
      fd.set('isFree', isFree ? 'true' : 'false');
      if (!isFree) fd.set('priceMad', price);
      const r = await finalizeConsultationAction(fd);
      if (!r.ok) {
        setError(r.error ?? 'Erreur inconnue.');
        return;
      }
      setOpen(false);
      router.push('/today');
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Terminer la consultation
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogTitle>Tarification et clôture</DialogTitle>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!submitDisabled && !pending) handleSubmit();
            }}
          >
            <div className={cn('space-y-1.5', isFree && 'opacity-50')}>
              <Label htmlFor="price-mad">Prix (MAD)</Label>
              <Input
                id="price-mad"
                type="number"
                step="any"
                min="0.01"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={isFree}
                autoFocus
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="size-4"
              />
              <span className="text-body">Gratuit</span>
            </label>
            {error ? <Alert variant="danger">{error}</Alert> : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={pending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={submitDisabled || pending}
                loading={pending}
              >
                Terminer la consultation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
