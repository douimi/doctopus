'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { recordPaymentAction } from '@/app/(authenticated)/today/payments/actions';
import { formatMad } from '@/lib/medications/format';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/lib/payments/schemas';
import { cn } from '@/lib/utils';

export function EncaisserDialog({
  consultationId,
  patientFullName,
  priceMad,
}: {
  consultationId: string;
  patientFullName: string;
  priceMad: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('especes');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const noteRequired = method === 'autre';
  const submitDisabled = noteRequired && note.trim().length === 0;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setMethod('especes');
      setNote('');
      setError(null);
    }
  }

  function handleSubmit() {
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set('consultationId', consultationId);
      fd.set('paymentMethod', method);
      if (note.trim().length > 0) fd.set('paymentNote', note.trim());
      const r = await recordPaymentAction(fd);
      if (!r.ok) {
        setError(r.error ?? 'Erreur inconnue.');
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Encaisser
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogTitle>Encaisser le paiement de {patientFullName}</DialogTitle>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!submitDisabled && !pending) handleSubmit();
            }}
          >
            <div className="text-body">
              <span className="text-muted-foreground">Prix : </span>
              <span className="font-medium tabular-nums">{formatMad(priceMad)}</span>
            </div>

            <div className="space-y-2">
              <Label>Méthode de paiement</Label>
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setMethod(m)}
                    aria-pressed={method === m}
                    className={cn(
                      'px-3 py-1.5 rounded-pill border text-small transition-colors',
                      'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                      method === m
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-card text-foreground border-border hover:bg-muted',
                    )}
                  >
                    {PAYMENT_METHOD_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment-note">
                Note{' '}
                {noteRequired ? (
                  <span className="text-danger">*</span>
                ) : (
                  <span className="text-muted-foreground">(optionnelle)</span>
                )}
              </Label>
              <textarea
                id="payment-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-body resize-y"
                placeholder={
                  noteRequired
                    ? 'Précisez la méthode (split, mutuelle, …)'
                    : 'Détails optionnels'
                }
              />
            </div>

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
                Confirmer l&apos;encaissement
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
