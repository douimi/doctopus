'use client';

import { AlertTriangle, KeyRound, Trash2 } from 'lucide-react';
import { ConfirmActionButton } from '@/components/admin/confirm-action';
import { useFormAction } from '@/components/admin/use-form-action';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { showToast } from '@/components/ui/toast';
import { adminSetApiKeyAction, adminClearApiKeyAction, type SetApiKeyState } from './actions';

const initial: SetApiKeyState = { error: null, ok: false };

export function ApiKeyCard({
  tenantId,
  provider,
  last4,
}: {
  tenantId: string;
  provider: string | null;
  last4: string | null;
}) {
  const hasKey = last4 !== null;
  const { state, pending, onSubmit } = useFormAction(adminSetApiKeyAction, initial, {
    onSuccess: (_, form) => {
      form?.reset();
      showToast({ title: hasKey ? 'Clé API remplacée.' : 'Clé API enregistrée.', variant: 'success' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <KeyRound className="size-4 text-subtle-foreground" aria-hidden />
            Clé API du cabinet
          </span>
          {hasKey ? (
            <StatusBadge variant="success">Configurée</StatusBadge>
          ) : (
            <StatusBadge variant="warning" icon={AlertTriangle}>
              Requise
            </StatusBadge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasKey ? (
          <p className="text-small text-muted-foreground">
            Clé{' '}
            <span className="font-medium text-foreground">{provider ?? 'sans fournisseur'}</span>{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-foreground tabular-nums">
              ••••{last4}
            </code>
            . Tous les appels IA de ce cabinet l&apos;utilisent.
          </p>
        ) : (
          <Alert variant="warning" title="Aucune clé API configurée">
            L&apos;assistant IA reste inactif pour ce cabinet tant qu&apos;aucune clé n&apos;est
            enregistrée. Chaque cabinet a sa propre clé pour isoler l&apos;usage et le suivi.
          </Alert>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <input type="hidden" name="tenantId" value={tenantId} />
          <FormField
            label={hasKey ? 'Nouvelle clé API' : 'Clé API'}
            hint="Chiffrée côté serveur ; seuls les 4 derniers caractères restent visibles."
          >
            <Input
              id="apiKey"
              type="password"
              name="apiKey"
              placeholder="sk-…"
              autoComplete="off"
              spellCheck={false}
              required
              minLength={8}
            />
          </FormField>
          {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="submit" size="sm" loading={pending}>
              <KeyRound aria-hidden />
              {hasKey ? 'Remplacer la clé' : 'Enregistrer la clé'}
            </Button>
            {hasKey ? (
              <ConfirmActionButton
                action={adminClearApiKeyAction}
                fields={{ tenantId }}
                title="Supprimer la clé API ?"
                description="L'assistant IA de ce cabinet cessera de fonctionner immédiatement, jusqu'à l'enregistrement d'une nouvelle clé."
                confirmLabel="Supprimer la clé"
                pendingLabel="Suppression…"
                successToast="Clé API supprimée."
                size="sm"
                variant="ghost"
                className="text-danger-ink hover:bg-danger-tint hover:text-danger-ink"
              >
                <Trash2 aria-hidden />
                Supprimer la clé
              </ConfirmActionButton>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
