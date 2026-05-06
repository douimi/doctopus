'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertTriangle, KeyRound, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { adminSetApiKeyAction, adminClearApiKeyAction, type SetApiKeyState } from './actions';

const initial: SetApiKeyState = { error: null, ok: false };

function SaveSubmit({ hasKey }: { hasKey: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      <KeyRound aria-hidden />
      {hasKey ? 'Remplacer la clé' : 'Enregistrer la clé'}
    </Button>
  );
}

function ClearSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant="destructive"
      loading={pending}
      aria-label="Supprimer la clé API"
    >
      <Trash2 aria-hidden />
      Supprimer
    </Button>
  );
}

export function ApiKeyCard({
  tenantId,
  provider,
  last4,
}: {
  tenantId: string;
  provider: string | null;
  last4: string | null;
}) {
  const [state, action] = useActionState(adminSetApiKeyAction, initial);
  const hasKey = last4 !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" aria-hidden />
            Clé API du cabinet
            <span className="text-[10px] uppercase tracking-wide font-medium text-danger">
              Requise
            </span>
          </span>
          {hasKey ? (
            <StatusBadge variant="success">Configurée</StatusBadge>
          ) : (
            <StatusBadge variant="warning" icon={AlertTriangle}>
              Manquante
            </StatusBadge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasKey ? (
          <p className="text-small text-muted-foreground">
            Clé enregistrée pour{' '}
            <span className="font-medium">{provider ?? 'aucun fournisseur'}</span> —{' '}
            <code className="bg-muted px-1.5 py-0.5 rounded text-foreground tabular-nums">
              ••••••••{last4}
            </code>
            . Tous les appels IA de ce cabinet l&apos;utilisent.
          </p>
        ) : (
          <Alert variant="warning" title="Aucune clé API configurée">
            L&apos;assistant IA est désactivé pour ce cabinet tant qu&apos;une clé API
            n&apos;est pas enregistrée ici. Chaque cabinet doit avoir sa propre clé
            pour isoler l&apos;usage et le suivi.
          </Alert>
        )}

        <form action={action} className="space-y-2">
          <input type="hidden" name="tenantId" value={tenantId} />
          <FormField label={hasKey ? 'Nouvelle clé API' : 'Clé API'}>
            <Input
              type="password"
              name="apiKey"
              placeholder="sk-…"
              autoComplete="off"
              required
              minLength={8}
            />
          </FormField>
          {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
          {state.ok ? <Alert variant="success">Clé enregistrée.</Alert> : null}
          <SaveSubmit hasKey={hasKey} />
        </form>

        {hasKey ? (
          <form action={adminClearApiKeyAction} className="pt-2 border-t border-border">
            <input type="hidden" name="tenantId" value={tenantId} />
            <ClearSubmit />
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
