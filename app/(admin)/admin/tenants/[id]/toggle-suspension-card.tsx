'use client';

import { useState, useTransition } from 'react';
import { ShieldAlert } from 'lucide-react';
import { ConfirmActionButton } from '@/components/admin/confirm-action';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/components/ui/toast';
import { adminToggleSuspensionAction } from './actions';

/** "Zone sensible": suspending locks every user of the cabinet out of the app. */
export function ToggleSuspensionCard({
  tenantId,
  tenantName,
  status,
}: {
  tenantId: string;
  tenantName: string;
  status: 'active' | 'suspended';
}) {
  const isSuspended = status === 'suspended';
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reactivate() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('tenantId', tenantId);
      fd.set('desired', 'reactivate');
      try {
        const res = await adminToggleSuspensionAction(fd);
        if (res.ok) showToast({ title: 'Cabinet réactivé.', variant: 'success' });
        else setError(res.error);
      } catch {
        setError('Action impossible. Réessayez dans un instant.');
      }
    });
  }

  return (
    <Card className="border-danger/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-danger-ink" aria-hidden />
          Zone sensible
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-small text-muted-foreground">
          {isSuspended
            ? "Ce cabinet est suspendu : le médecin et ses assistant(e)s ne peuvent plus accéder à l'application. Les données sont conservées."
            : "Suspendre bloque immédiatement l'accès du médecin et de ses assistant(e)s. Les données sont conservées et la suspension est réversible."}
        </p>
        {error ? <Alert variant="danger">{error}</Alert> : null}
        {isSuspended ? (
          <Button type="button" size="sm" variant="secondary" loading={pending} onClick={reactivate}>
            Réactiver le cabinet
          </Button>
        ) : (
          <ConfirmActionButton
            action={adminToggleSuspensionAction}
            fields={{ tenantId, desired: 'suspend' }}
            title={`Suspendre ${tenantName} ?`}
            description="Le médecin et ses assistant(e)s perdront l'accès à l'application jusqu'à la réactivation du cabinet. Aucune donnée n'est supprimée."
            confirmLabel="Suspendre le cabinet"
            pendingLabel="Suspension…"
            successToast="Cabinet suspendu."
            size="sm"
            variant="destructive"
          >
            Suspendre le cabinet
          </ConfirmActionButton>
        )}
      </CardContent>
    </Card>
  );
}
