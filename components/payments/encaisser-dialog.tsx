'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/components/ui/toast';
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
      showToast({
        id: `paid-${consultationId}`,
        variant: 'success',
        title: 'Paiement encaissé',
        description: `${patientFullName} · ${formatMad(priceMad)}`,
      });
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
        <DialogContent size="md">
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              if (!submitDisabled && !pending) handleSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>Encaisser le paiement de {patientFullName}</DialogTitle>
            </DialogHeader>
            <DialogBody>
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
                      'inline-flex h-8 items-center rounded-md border px-3 text-small font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      method === m
                        ? 'border-primary/40 bg-primary-tint text-primary-ink'
                        : 'border-border bg-card text-foreground hover:bg-muted',
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
                  <span className="text-danger-ink">*</span>
                ) : (
                  <span className="font-normal text-subtle-foreground">Optionnelle</span>
                )}
              </Label>
              <Textarea
                id="payment-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={
                  noteRequired
                    ? 'Précisez la méthode (split, mutuelle, …)'
                    : 'Détails optionnels'
                }
              />
            </div>

            {error ? <Alert variant="danger">{error}</Alert> : null}
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
