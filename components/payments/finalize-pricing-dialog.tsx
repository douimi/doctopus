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
import { cn } from '@/lib/utils';

export function FinalizePricingDialog({
  consultationId,
  defaultPriceMad,
}: {
  consultationId: string;
  defaultPriceMad: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState(defaultPriceMad ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submitDisabled =
    !isFree && (!price || Number.isNaN(Number(price)) || Number(price) <= 0);

  function handleSubmit() {
    setError(null);
    start(async () => {
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Tarification et clôture</DialogTitle>
          <div className="mt-4 space-y-4">
            <div className={cn('space-y-1.5', isFree && 'opacity-50')}>
              <Label htmlFor="price-mad">Prix (MAD)</Label>
              <Input
                id="price-mad"
                type="number"
                step="0.50"
                min="0.01"
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
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitDisabled || pending}
                loading={pending}
              >
                Terminer la consultation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
