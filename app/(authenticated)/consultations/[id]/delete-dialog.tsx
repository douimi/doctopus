'use client';

import { useTransition } from 'react';
import { Trash2, TriangleAlert } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deleteConsultationAction } from './actions';

/**
 * Controlled confirm dialog. The trigger lives in the consultation
 * header's overflow menu, away from the primary "Terminer" action.
 */
export function DeleteConsultationDialog({
  consultationId,
  patientFullName,
  isPaid,
  open,
  onOpenChange,
}: {
  consultationId: string;
  patientFullName: string;
  isPaid: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, start] = useTransition();

  function handleConfirm() {
    const fd = new FormData();
    fd.set('id', consultationId);
    start(async () => {
      // Server action redirects on success — control never returns here.
      await deleteConsultationAction(fd);
      // If we DO get back, the delete was a no-op (no perms / not found);
      // close the dialog so the user can re-try.
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-5 text-danger" aria-hidden />
            Supprimer la consultation ?
          </DialogTitle>
          <DialogDescription>
            La consultation de <span className="font-medium text-foreground">{patientFullName}</span>{' '}
            sera supprimée définitivement, avec :
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <ul className="list-disc list-inside text-small text-muted-foreground space-y-0.5">
            <li>les constantes (poids, taille, TA…) ;</li>
            <li>la prescription et tous ses médicaments ;</li>
            <li>l&apos;historique de l&apos;assistant IA.</li>
          </ul>
          {isPaid ? (
            <Alert variant="warning">
              Cette consultation a déjà été encaissée. La trace dans le registre des crédits IA
              est conservée, mais le paiement disparaît du rapport.
            </Alert>
          ) : null}
          <p className="text-small text-muted-foreground">Cette action est irréversible.</p>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive-solid"
            onClick={handleConfirm}
            loading={pending}
          >
            <Trash2 aria-hidden />
            Supprimer définitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
