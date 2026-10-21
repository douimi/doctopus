'use client';

import { useState } from 'react';
import { CheckCircle2, FolderOpen, UserMinus, XCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SubmitButton } from '@/components/ui/submit-button';
import { showToast } from '@/components/ui/toast';
import {
  cancelAppointmentAction,
  markArrivedAction,
  markNoShowAction,
  type RowActionResult,
} from '@/app/(authenticated)/today/actions';
import { OverflowMenu, type OverflowItem } from './overflow-menu';

function idForm(id: string): FormData {
  const fd = new FormData();
  fd.set('id', id);
  return fd;
}

function toastError(res: RowActionResult) {
  if (!res.ok) {
    showToast({ variant: 'warning', title: 'Action impossible', description: res.error });
  }
}

/** One-tap "Arrivé" (reversible enough: the patient is just seated). Pending + error feedback. */
export function ArriveButton({ id, fullName }: { id: string; fullName: string }) {
  return (
    <form
      action={async (fd) => {
        toastError(await markArrivedAction(fd));
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton
        size="sm"
        variant="secondary"
        aria-label={`Marquer ${fullName} arrivé`}
        className="h-10 lg:h-8"
      >
        <CheckCircle2 aria-hidden />
        Arrivé
      </SubmitButton>
    </form>
  );
}

/**
 * "⋯" for an agenda or waiting-room row: open the file, mark absent
 * (scheduled only) and cancel — both destructive, both confirmed.
 */
export function AppointmentMenu({
  id,
  fullName,
  patientId,
  status,
  timeLabel,
}: {
  id: string;
  fullName: string;
  patientId: string;
  status: 'scheduled' | 'waiting';
  /** e.g. "10:30" — repeated in the confirm text so the right row is cancelled. */
  timeLabel?: string;
}) {
  const [confirm, setConfirm] = useState<'cancel' | 'noShow' | null>(null);
  const isWaiting = status === 'waiting';

  const items: OverflowItem[] = [
    { kind: 'link', label: 'Ouvrir le dossier', href: `/patients/${patientId}`, icon: FolderOpen },
    { kind: 'separator' },
  ];
  if (!isWaiting) {
    items.push({
      kind: 'action',
      label: 'Marquer absent…',
      icon: UserMinus,
      danger: true,
      onSelect: () => setConfirm('noShow'),
    });
  }
  items.push({
    kind: 'action',
    label: isWaiting ? "Retirer de la salle d'attente…" : 'Annuler le rendez-vous…',
    icon: XCircle,
    danger: true,
    onSelect: () => setConfirm('cancel'),
  });

  const when = timeLabel ? ` de ${timeLabel}` : '';

  return (
    <>
      <OverflowMenu
        label={`Plus d'actions pour ${fullName}`}
        items={items}
        triggerClassName="size-10 lg:size-8"
      />
      <ConfirmDialog
        open={confirm === 'cancel'}
        onOpenChange={(o) => setConfirm(o ? 'cancel' : null)}
        title={isWaiting ? "Retirer de la salle d'attente ?" : 'Annuler le rendez-vous ?'}
        description={
          isWaiting
            ? `${fullName} sera retiré(e) de la file. Pour le faire revenir, il faudra le remettre en salle d'attente.`
            : `Le rendez-vous${when} de ${fullName} sera annulé. Cette action est définitive ; il faudra reprogrammer un nouveau rendez-vous.`
        }
        confirmLabel={isWaiting ? 'Retirer' : 'Annuler le RDV'}
        cancelLabel="Garder"
        pendingLabel="En cours…"
        onConfirm={async () => {
          const res = await cancelAppointmentAction(idForm(id));
          if (res.ok) {
            showToast({
              variant: 'info',
              title: isWaiting ? "Retiré de la salle d'attente" : 'Rendez-vous annulé',
              description: fullName,
            });
          }
          return res;
        }}
      />
      <ConfirmDialog
        open={confirm === 'noShow'}
        onOpenChange={(o) => setConfirm(o ? 'noShow' : null)}
        title="Marquer absent ?"
        description={`${fullName} ne s'est pas présenté(e) au rendez-vous${when}. Le statut « Absent » est définitif.`}
        confirmLabel="Marquer absent"
        cancelLabel="Garder"
        pendingLabel="En cours…"
        onConfirm={async () => {
          const res = await markNoShowAction(idForm(id));
          if (res.ok) showToast({ variant: 'info', title: 'Marqué absent', description: fullName });
          return res;
        }}
      />
    </>
  );
}
