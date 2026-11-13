'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileText, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { showToast } from '@/components/ui/toast';
import { finalizeConsultationAction } from '@/app/(authenticated)/consultations/[id]/actions';
import { flushConsultationEditor, type FlushSummary } from '@/lib/consultations/flush-editor';
import { formatMad } from '@/lib/medications/format';
import { cn } from '@/lib/utils';

function parsePrice(v: string): number | null {
  const t = v.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * "Terminer la consultation": a closing summary rather than a bare
 * price prompt. Opening it flushes every editor on the page (notes,
 * vitals, prescription lines) so the summary reflects what will be
 * locked; a medication picked but never added blocks the finalize with
 * an explicit message instead of being silently dropped.
 */
export function FinalizePricingDialog({
  consultationId,
  patientName,
  defaultPriceMad,
  defaultIsFree = false,
}: {
  consultationId: string;
  patientName: string;
  defaultPriceMad: string | null;
  /** Follow-up consultations are pre-checked as Gratuit (the patient
   *  already paid for the initial visit). Doctor can still uncheck. */
  defaultIsFree?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isFree, setIsFree] = useState(defaultIsFree);
  const [price, setPrice] = useState(defaultPriceMad ?? '');
  const [openPdf, setOpenPdf] = useState(true);
  const [summary, setSummary] = useState<FlushSummary | null>(null);
  const [blocker, setBlocker] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();
  const [pending, start] = useTransition();
  const router = useRouter();

  const priceNum = parsePrice(price);
  const priceInvalid = !isFree && (priceNum === null || priceNum <= 0);
  const rxCount = summary?.rxCount ?? 0;
  const pdfUrl =
    summary?.prescriptionId && rxCount > 0
      ? `/api/prescriptions/${summary.prescriptionId}/pdf`
      : null;

  function openDialog() {
    setOpen(true);
    setError(null);
    setBlocker(null);
    startChecking(async () => {
      const flushed = await flushConsultationEditor(consultationId);
      setSummary(flushed.summary ?? null);
      setBlocker(flushed.ok ? null : (flushed.error ?? 'Échec de la sauvegarde des modifications.'));
    });
  }

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) {
      setIsFree(defaultIsFree);
      setPrice(defaultPriceMad ?? '');
      setOpenPdf(true);
      setError(null);
      setBlocker(null);
    }
  }

  function handleSubmit() {
    setError(null);
    // Popup blockers only allow window.open in the click handler itself,
    // so reserve the tab now and point it at the PDF once finalized.
    const pdfWindow = openPdf && pdfUrl ? window.open('about:blank', '_blank') : null;
    start(async () => {
      // Flush again: the doctor may have typed since the dialog opened
      // (e.g. in another field before clicking), and in-flight autosaves
      // must land before the row is locked.
      const flushed = await flushConsultationEditor(consultationId);
      if (!flushed.ok) {
        pdfWindow?.close();
        setSummary(flushed.summary ?? summary);
        setBlocker(flushed.error ?? 'Échec de la sauvegarde des modifications.');
        return;
      }
      setBlocker(null);
      const fd = new FormData();
      fd.set('consultationId', consultationId);
      fd.set('isFree', isFree ? 'true' : 'false');
      if (!isFree) fd.set('priceMad', price.trim().replace(',', '.'));
      const r = await finalizeConsultationAction(fd);
      if (!r.ok) {
        pdfWindow?.close();
        setError(r.error ?? 'Erreur inconnue.');
        return;
      }
      if (pdfWindow && pdfUrl) pdfWindow.location.href = pdfUrl;
      showToast({
        id: `finalized-${consultationId}`,
        variant: 'success',
        title: `Consultation clôturée — ${patientName}`,
        description: isFree
          ? 'Consultation gratuite.'
          : `${formatMad(String(priceNum))} en attente d'encaissement.`,
      });
      setOpen(false);
      router.push('/today');
      router.refresh();
    });
  }

  const diagnosis = summary?.diagnosis?.trim() ?? '';

  return (
    <>
      <Button type="button" onClick={openDialog}>
        <CheckCircle2 aria-hidden />
        Terminer<span className="sr-only sm:not-sr-only"> la consultation</span>
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent size="md">
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              if (!priceInvalid && !pending && !checking && !blocker) handleSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>Terminer la consultation</DialogTitle>
              <DialogDescription>{patientName}</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <dl className="divide-y divide-border rounded-lg border border-border">
                <div className="flex items-start gap-3 px-3 py-2.5">
                  <Stethoscope className="mt-0.5 size-4 shrink-0 text-subtle-foreground" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-small text-muted-foreground">Diagnostic</dt>
                    <dd
                      className={cn(
                        'text-body line-clamp-3 whitespace-pre-wrap',
                        !diagnosis && 'text-warning-ink',
                      )}
                    >
                      {checking && !summary ? '…' : diagnosis || 'Non renseigné'}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3 px-3 py-2.5">
                  <FileText className="mt-0.5 size-4 shrink-0 text-subtle-foreground" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-small text-muted-foreground">Ordonnance</dt>
                    <dd className="text-body">
                      {checking && !summary
                        ? '…'
                        : rxCount === 0
                          ? 'Aucun médicament'
                          : `${rxCount} médicament${rxCount > 1 ? 's' : ''}`}
                    </dd>
                  </div>
                </div>
              </dl>

              {checking ? (
                <p className="text-small text-muted-foreground" role="status">
                  Enregistrement des dernières modifications…
                </p>
              ) : null}
              {blocker ? (
                <Alert variant="warning" title="Impossible de terminer pour l'instant">
                  {blocker}
                </Alert>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className={cn('space-y-1.5', isFree && 'opacity-50')}>
                  <Label htmlFor="price-mad">Prix (MAD)</Label>
                  <Input
                    id="price-mad"
                    inputMode="decimal"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={isFree}
                    aria-invalid={!isFree && price !== '' && priceInvalid ? true : undefined}
                    autoFocus
                  />
                </div>
                <label className="flex h-9 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    className="size-4 rounded border-input accent-primary"
                  />
                  <span className="text-body">Gratuit</span>
                </label>
              </div>

              {pdfUrl ? (
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={openPdf}
                    onChange={(e) => setOpenPdf(e.target.checked)}
                    className="size-4 rounded border-input accent-primary"
                  />
                  <span className="text-body">Ouvrir l&apos;ordonnance PDF après clôture</span>
                </label>
              ) : null}

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
                disabled={priceInvalid || pending || checking || blocker !== null}
                loading={pending}
              >
                Terminer la consultation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
