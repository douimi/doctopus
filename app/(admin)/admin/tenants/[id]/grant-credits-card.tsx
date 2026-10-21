'use client';

import { useState, type FormEvent } from 'react';
import { ChevronDown, Coins, Plus } from 'lucide-react';
import { useFormAction } from '@/components/admin/use-form-action';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { showToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  adminGrantCreditsAction,
  adminSetCreditsAction,
  type GrantState,
  type SetCreditsState,
} from './actions';

const grantInitial: GrantState = { error: null, ok: false };
const setInitial: SetCreditsState = { error: null, ok: false, newBalance: null };

function plural(n: number, word: string): string {
  return `${word}${Math.abs(n) === 1 ? '' : 's'}`;
}

export function GrantCreditsCard({
  tenantId,
  currentBalance,
}: {
  tenantId: string;
  currentBalance: number;
}) {
  const grant = useFormAction(adminGrantCreditsAction, grantInitial, {
    onSuccess: (_, form) => {
      const n = Number(new FormData(form ?? undefined).get('consultations') ?? 0);
      form?.reset();
      showToast({
        title: 'Crédits accordés.',
        description: n > 0 ? `+${n} ${plural(n, 'consultation')} ajoutée${n === 1 ? '' : 's'} au solde.` : undefined,
        variant: 'success',
      });
    },
  });
  const set = useFormAction(adminSetCreditsAction, setInitial, {
    onSuccess: (s) =>
      showToast({
        title: 'Solde mis à jour.',
        description: s.newBalance !== null ? `Nouveau solde : ${s.newBalance}.` : undefined,
        variant: 'success',
      }),
  });

  // Set-balance is confirmed in a dialog showing the delta before it runs.
  const [pendingSet, setPendingSet] = useState<{ fd: FormData; next: number } | null>(null);

  function onSetSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = Number(fd.get('newBalance'));
    setPendingSet({ fd, next });
  }

  const delta = pendingSet ? pendingSet.next - currentBalance : 0;
  const empty = currentBalance <= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="size-4 text-subtle-foreground" aria-hidden />
          Crédits IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          className={cn(
            'rounded-lg border px-3 py-2.5',
            empty ? 'border-warning/30 bg-warning-tint' : 'border-border bg-canvas',
          )}
        >
          <div className="eyebrow">Solde actuel</div>
          <div
            className={cn(
              'mt-1 text-display font-semibold tabular-nums',
              empty ? 'text-warning-ink' : 'text-foreground',
            )}
          >
            {currentBalance}
          </div>
          <div className={cn('text-small', empty ? 'text-warning-ink' : 'text-muted-foreground')}>
            {empty
              ? "Plus de crédits : l'assistant IA est bloqué pour les nouvelles consultations."
              : `${plural(currentBalance, 'consultation')} IA ${plural(currentBalance, 'restante')}`}
          </div>
        </div>

        <form onSubmit={grant.onSubmit} className="space-y-3">
          <input type="hidden" name="tenantId" value={tenantId} />
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3">
            <FormField label="Nombre de consultations">
              <Input
                id="consultations"
                name="consultations"
                type="number"
                inputMode="numeric"
                min="1"
                max="10000"
                placeholder="100"
                required
              />
            </FormField>
            <FormField label="Note" optional>
              <Input id="grant-note" name="note" placeholder="Pack 100" maxLength={200} />
            </FormField>
          </div>
          {grant.state.error ? <Alert variant="danger">{grant.state.error}</Alert> : null}
          <Button type="submit" size="sm" loading={grant.pending}>
            <Plus aria-hidden />
            Accorder
          </Button>
        </form>

        <details className="group/details rounded-lg border border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-small font-medium text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            Corriger le solde
            <ChevronDown
              className="size-4 text-subtle-foreground transition-transform group-open/details:rotate-180"
              aria-hidden
            />
          </summary>
          <form
            key={currentBalance}
            onSubmit={onSetSubmit}
            className="space-y-3 border-t border-border px-3 pt-3 pb-3"
          >
            <input type="hidden" name="tenantId" value={tenantId} />
            <FormField
              label="Nouveau solde"
              hint="Remplace le solde par la valeur saisie (à la hausse ou à la baisse)."
            >
              <Input
                id="newBalance"
                name="newBalance"
                type="number"
                inputMode="numeric"
                min="0"
                max="100000"
                defaultValue={currentBalance}
                required
              />
            </FormField>
            <FormField label="Note" optional>
              <Input
                id="set-note"
                name="note"
                placeholder="ex. ajustement post-paiement"
                maxLength={200}
              />
            </FormField>
            {set.state.error && !pendingSet ? (
              <Alert variant="danger">{set.state.error}</Alert>
            ) : null}
            <Button type="submit" size="sm" variant="secondary">
              Définir le solde…
            </Button>
          </form>
        </details>

        <ConfirmDialog
          open={pendingSet !== null}
          onOpenChange={(open) => {
            if (!open) setPendingSet(null);
          }}
          tone={delta < 0 ? 'danger' : 'default'}
          title="Modifier le solde de crédits ?"
          description={
            pendingSet ? (
              <>
                Le solde passera de{' '}
                <span className="font-medium text-foreground tabular-nums">{currentBalance}</span>{' '}
                à{' '}
                <span className="font-medium text-foreground tabular-nums">{pendingSet.next}</span>{' '}
                ({delta > 0 ? '+' : delta < 0 ? '−' : '±'}
                {Math.abs(delta)}). L&apos;opération est enregistrée dans l&apos;historique.
              </>
            ) : null
          }
          confirmLabel="Définir le solde"
          pendingLabel="Enregistrement…"
          onConfirm={async () => {
            if (!pendingSet) return;
            const res = await set.run(pendingSet.fd);
            if (!res.ok) return { ok: false, error: res.error ?? undefined };
            return { ok: true };
          }}
        />
      </CardContent>
    </Card>
  );
}
