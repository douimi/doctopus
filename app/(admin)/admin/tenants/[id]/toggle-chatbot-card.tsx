'use client';

import { useState, useTransition } from 'react';
import { Sparkles } from 'lucide-react';
import { ConfirmActionButton } from '@/components/admin/confirm-action';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { showToast } from '@/components/ui/toast';
import { adminToggleChatbotAction } from './actions';

export function ToggleChatbotCard({
  tenantId,
  enabled,
  hasApiKey,
  credits,
}: {
  tenantId: string;
  enabled: boolean;
  hasApiKey: boolean;
  credits: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function enable() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('tenantId', tenantId);
      fd.set('desired', 'enable');
      try {
        const res = await adminToggleChatbotAction(fd);
        if (res.ok) showToast({ title: 'Assistant IA activé.', variant: 'success' });
        else setError(res.error);
      } catch {
        setError('Action impossible. Réessayez dans un instant.');
      }
    });
  }

  const blockers = [
    !hasApiKey ? 'aucune clé API' : null,
    credits <= 0 ? 'aucun crédit' : null,
  ].filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="size-4 text-subtle-foreground" aria-hidden />
            Assistant IA
          </span>
          <StatusBadge variant={enabled ? 'success' : 'neutral'}>
            {enabled ? 'Activé' : 'Désactivé'}
          </StatusBadge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-small text-muted-foreground">
          {enabled
            ? "Le médecin peut utiliser l'assistant IA pendant ses consultations."
            : "L'assistant IA est masqué pour ce cabinet."}
        </p>
        {blockers.length > 0 ? (
          <Alert variant="warning">
            {enabled ? 'Activé mais inutilisable' : "Même activé, l'assistant restera inutilisable"} :{' '}
            {blockers.join(' et ')}.
          </Alert>
        ) : null}
        {error ? <Alert variant="danger">{error}</Alert> : null}
        {enabled ? (
          <ConfirmActionButton
            action={adminToggleChatbotAction}
            fields={{ tenantId, desired: 'disable' }}
            title="Désactiver l'assistant IA ?"
            description="Le médecin n'aura plus accès à l'assistant IA dans ses consultations. Vous pourrez le réactiver à tout moment ; les crédits sont conservés."
            confirmLabel="Désactiver"
            pendingLabel="Désactivation…"
            successToast="Assistant IA désactivé."
            size="sm"
            variant="secondary"
          >
            Désactiver
          </ConfirmActionButton>
        ) : (
          <Button type="button" size="sm" variant="secondary" loading={pending} onClick={enable}>
            Activer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
