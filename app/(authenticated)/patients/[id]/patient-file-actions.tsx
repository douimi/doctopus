'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, FilePlus2, Pencil } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { showToast } from '@/components/ui/toast';
import { OverflowMenu, type OverflowItem } from '@/components/today/overflow-menu';
import { BookAppointmentDialog, WalkInDialog } from '@/components/today/patient-flow-dialogs';
import type { FlowPatient } from '@/components/today/selected-patient';
import { archivePatientAction } from './actions';

/**
 * Patient file header actions (UX brief §3.3): "Planifier RDV" and
 * "Mettre en salle d'attente" up front; Modifier, "Saisir une consultation
 * passée" (doctor) and Archiver (confirmed) in the ⋯ menu.
 */
export function PatientFileActions({
  patient,
  isDoctor,
  isArchived,
}: {
  patient: FlowPatient;
  isDoctor: boolean;
  isArchived: boolean;
}) {
  const router = useRouter();
  const [archiveOpen, setArchiveOpen] = useState(false);

  const items: OverflowItem[] = [
    { kind: 'link', label: 'Modifier le dossier', href: `/patients/${patient.id}/edit`, icon: Pencil },
  ];
  if (isDoctor) {
    items.push({
      kind: 'link',
      label: 'Saisir une consultation passée',
      href: `/consultations/new?patient=${patient.id}`,
      icon: FilePlus2,
    });
  }
  if (!isArchived) {
    items.push(
      { kind: 'separator' },
      {
        kind: 'action',
        label: 'Archiver le patient…',
        icon: Archive,
        danger: true,
        onSelect: () => setArchiveOpen(true),
      },
    );
  }

  return (
    <>
      {!isArchived ? (
        <>
          <BookAppointmentDialog patient={patient} triggerLabel="Planifier un RDV" />
          <WalkInDialog patient={patient} triggerLabel="Mettre en salle d'attente" />
        </>
      ) : null}
      <OverflowMenu
        label="Plus d'actions sur le dossier"
        items={items}
        triggerSize="icon"
        triggerVariant="secondary"
      />
      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archiver ce patient ?"
        description={`${patient.fullName} n'apparaîtra plus dans la liste ni dans la recherche de patients. Son dossier et ses consultations sont conservés et restent visibles avec « Inclure les archivés ».`}
        confirmLabel="Archiver"
        pendingLabel="Archivage…"
        onConfirm={async () => {
          const fd = new FormData();
          fd.set('id', patient.id);
          const res = await archivePatientAction(fd);
          if (res.ok) {
            showToast({ variant: 'success', title: 'Patient archivé', description: patient.fullName });
            router.push('/patients');
          }
          return res;
        }}
      />
    </>
  );
}
