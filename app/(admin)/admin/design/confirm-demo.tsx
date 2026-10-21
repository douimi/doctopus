'use client';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { showToast } from '@/components/ui/toast';

/** Showcase only: the confirm resolves after a short fake delay. */
export function ConfirmDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmDialog
        trigger={<Button variant="destructive">Supprimer…</Button>}
        title="Supprimer cet élément ?"
        description="Exemple de confirmation destructive : bouton plein rouge, Annuler en secondaire."
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        onConfirm={async () => {
          await new Promise((r) => setTimeout(r, 600));
          showToast({ title: 'Élément supprimé (démo).', variant: 'success' });
          return { ok: true };
        }}
      />
      <ConfirmDialog
        trigger={<Button variant="secondary">Confirmation qui échoue…</Button>}
        tone="default"
        title="Action qui échoue"
        description="La boîte reste ouverte et affiche l'erreur renvoyée par l'action."
        confirmLabel="Confirmer"
        onConfirm={async () => {
          await new Promise((r) => setTimeout(r, 400));
          return { ok: false, error: 'Action impossible (démo).' };
        }}
      />
      <Button
        variant="secondary"
        onClick={() =>
          showToast({
            title: 'Modifications enregistrées.',
            description: 'Toast de succès.',
            variant: 'success',
          })
        }
      >
        Afficher un toast
      </Button>
    </div>
  );
}
