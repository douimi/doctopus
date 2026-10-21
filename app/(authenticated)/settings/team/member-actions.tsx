'use client';

import { UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { revokeInviteAction, toggleMemberActiveAction } from './actions';

/** "Désactiver" with a confirmation — it cuts the assistant's access at once. */
export function DeactivateMemberButton({ userId, name }: { userId: string; name: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          size="sm"
          variant="ghost"
          className="hover:bg-danger-tint hover:text-danger-ink"
        >
          <UserMinus aria-hidden />
          Désactiver
        </Button>
      }
      title={`Désactiver ${name} ?`}
      description="Son compte n'aura plus accès au cabinet. Vous pourrez le réactiver à tout moment."
      confirmLabel="Désactiver"
      pendingLabel="Désactivation…"
      onConfirm={async () => {
        const fd = new FormData();
        fd.set('userId', userId);
        fd.set('active', 'false');
        await toggleMemberActiveAction(fd);
      }}
    />
  );
}

/** "Révoquer" with a confirmation — the invite link stops working immediately. */
export function RevokeInviteButton({ inviteId, label }: { inviteId: string; label: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Révoquer l'invitation pour ${label}`}
          className="hover:bg-danger-tint hover:text-danger-ink"
        >
          Révoquer
        </Button>
      }
      title="Révoquer l'invitation ?"
      description={`Le lien envoyé à ${label} cessera de fonctionner. Vous pourrez en créer un nouveau.`}
      confirmLabel="Révoquer"
      pendingLabel="Révocation…"
      onConfirm={async () => {
        const fd = new FormData();
        fd.set('inviteId', inviteId);
        await revokeInviteAction(fd);
      }}
    />
  );
}
