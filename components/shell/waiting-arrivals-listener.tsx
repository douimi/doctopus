'use client';

import { usePathname } from 'next/navigation';
import { showToast } from '@/components/ui/toast';
import { getPatientForPickerAction } from '@/app/(authenticated)/patients/picker-actions';
import { useTenantActivity } from './tenant-realtime';

/**
 * Fires a "patient arrivé en salle d'attente" toast whenever a patient
 * enters the waiting state. Works on every page so the doctor knows about
 * arrivals while they're on the consultation editor, /patients, etc.
 *
 * Suppresses the toast on /today since the waiting panel is on-screen
 * and updates itself via LiveRefresh — the toast would just be noise.
 */
export function WaitingArrivalsListener() {
  const pathname = usePathname();

  useTenantActivity((event) => {
    if (event.table !== 'appointments') return;
    // /today renders the waiting list itself; the toast there is noise.
    if (pathname === '/today') return;
    if (event.status !== 'waiting') return;
    // INSERT that lands directly in waiting, or UPDATE that transitions
    // into waiting — both are "patient just arrived".
    if (event.op === 'UPDATE' && event.oldStatus === 'waiting') return;
    if (event.op === 'DELETE') return;

    const toast = (name: string | null) =>
      showToast({
        // Dedup by appointment id so a quick INSERT-then-UPDATE
        // sequence doesn't double-toast for the same patient.
        id: `waiting:${event.id}`,
        title: 'Nouveau patient en salle d’attente',
        description: name
          ? `${name} vient d’arriver au cabinet.`
          : 'Un patient vient d’arriver au cabinet.',
        href: '/today',
        hrefLabel: "Voir l'aujourd'hui",
        variant: 'info',
      });
    // The ping only carries ids; resolve the name through a tenant-scoped
    // action, falling back to a generic toast.
    if (!event.patientId) return toast(null);
    getPatientForPickerAction(event.patientId)
      .then((p) => toast(p?.fullName ?? null))
      .catch(() => toast(null));
  });

  return null;
}
