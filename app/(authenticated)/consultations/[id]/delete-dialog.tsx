'use client';

import { useState, useTransition } from 'react';
import { Trash2, TriangleAlert } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { deleteConsultationAction } from './actions';

export function DeleteConsultationDialog({
  consultationId,
  patientFullName,
  isPaid,
}: {
  consultationId: string;
  patientFullName: string;
  isPaid: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function handleConfirm() {
    const fd = new FormData();
    fd.set('id', consultationId);
    start(async () => {
      // Server action redirects on success — control never returns here.
      await deleteConsultationAction(fd);
      // If we DO get back, the delete was a no-op (no perms / not found);
      // close the dialog so the user can re-try.
      setOpen(false);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-danger"
      >
        <Trash2 aria-hidden />
        Supprimer
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-5 text-danger" aria-hidden />
            Supprimer la consultation ?
          </DialogTitle>
          <div className="space-y-3 text-body">
            <p>
              La consultation de{' '}
              <span className="font-medium">{patientFullName}</span> sera
              supprimée définitivement, avec :
            </p>
            <ul className="list-disc list-inside text-small text-muted-foreground space-y-0.5">
              <li>les constantes (poids, taille, TA…) ;</li>
              <li>la prescription et tous ses médicaments ;</li>
              <li>l&apos;historique de l&apos;assistant IA.</li>
            </ul>
            {isPaid ? (
              <Alert variant="warning">
                Cette consultation a déjà été encaissée. La trace dans le
                registre des crédits IA est conservée, mais le paiement
                disparaît du rapport.
              </Alert>
            ) : null}
            <p className="text-small text-muted-foreground">
              Cette action est irréversible.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
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
              variant="destructive"
              onClick={handleConfirm}
              loading={pending}
            >
              <Trash2 aria-hidden />
              Supprimer définitivement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
