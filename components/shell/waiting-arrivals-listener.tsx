'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { createTenantChannel } from '@/lib/supabase/realtime';
import { showToast } from '@/components/ui/toast';

type AppointmentRow = {
  id?: string;
  status?: string | null;
};

/**
 * Listens to appointments changes for the current tenant and fires a
 * "patient arrivé en salle d'attente" toast whenever a patient enters
 * the waiting state. Works on every page so the doctor knows about
 * arrivals while they're on the consultation editor, /patients, etc.
 *
 * Suppresses the toast on /today since the waiting panel is on-screen
 * and updates itself via LiveRefresh — the toast would just be noise.
 */
export function WaitingArrivalsListener({ tenantId }: { tenantId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = createTenantChannel(supabase, `waiting-toast:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          // /today renders the waiting list itself and refreshes via
          // LiveRefresh; the toast there would be redundant noise.
          if (pathname === '/today') return;

          const newRow = payload.new as AppointmentRow | null;
          const oldRow = payload.old as AppointmentRow | null;
          if (!newRow || newRow.status !== 'waiting') return;
          // INSERT that lands directly in waiting, or UPDATE that
          // transitions into waiting — both are "patient just arrived".
          if (payload.eventType === 'UPDATE' && oldRow?.status === 'waiting') return;

          showToast({
            // Dedup by appointment id so a quick INSERT-then-UPDATE
            // sequence doesn't double-toast for the same patient.
            id: `waiting:${newRow.id ?? Math.random()}`,
            title: 'Nouveau patient en salle d’attente',
            description: 'Un patient vient d’arriver au cabinet.',
            href: '/today',
            hrefLabel: "Voir l'aujourd'hui",
            variant: 'info',
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, pathname]);

  return null;
}
