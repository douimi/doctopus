'use client';

import { Trash2 } from 'lucide-react';
import { ConfirmActionButton } from '@/components/admin/confirm-action';
import { adminRevokeInviteAction } from './actions';

export function RevokeInviteButton({ inviteId, email }: { inviteId: string; email: string | null }) {
  return (
    <ConfirmActionButton
      action={adminRevokeInviteAction}
      fields={{ inviteId }}
      title="Révoquer cette invitation ?"
      description={
        <>
          Le lien envoyé{email ? (
            <>
              {' '}à <span className="font-medium text-foreground">{email}</span>
            </>
          ) : null}{' '}
          cessera de fonctionner immédiatement. Vous pourrez créer une nouvelle invitation si
          besoin.
        </>
      }
      confirmLabel="Révoquer"
      pendingLabel="Révocation…"
      successToast="Invitation révoquée."
      size="icon-sm"
      variant="ghost"
      aria-label={`Révoquer l'invitation ${email ?? ''}`.trim()}
      className="text-muted-foreground hover:bg-danger-tint hover:text-danger-ink"
    >
      <Trash2 aria-hidden />
    </ConfirmActionButton>
  );
}
