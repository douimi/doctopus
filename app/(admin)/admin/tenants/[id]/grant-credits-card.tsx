'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Coins, Plus, Save } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  adminGrantCreditsAction,
  adminSetCreditsAction,
  type GrantState,
  type SetCreditsState,
} from './actions';

const grantInitial: GrantState = { error: null, ok: false };
const setInitial: SetCreditsState = { error: null, ok: false, newBalance: null };

function GrantSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending} variant="secondary">
      <Plus aria-hidden />
      Accorder
    </Button>
  );
}

function SetSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      <Save aria-hidden />
      Enregistrer
    </Button>
  );
}

export function GrantCreditsCard({
  tenantId,
  currentBalance,
}: {
  tenantId: string;
  currentBalance: number;
}) {
  const [grantState, grantAction] = useActionState(adminGrantCreditsAction, grantInitial);
  const [setState, setAction] = useActionState(adminSetCreditsAction, setInitial);

  const displayedBalance = setState.newBalance ?? currentBalance;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="size-4 text-muted-foreground" aria-hidden />
          Crédits IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            Solde actuel
          </div>
          <div className="text-display font-semibold leading-none tabular-nums mt-1">
            {displayedBalance}
          </div>
          <div className="text-small text-muted-foreground mt-1">
            consultation{displayedBalance === 1 ? '' : 's'} restante
            {displayedBalance === 1 ? '' : 's'}
          </div>
        </div>

        <form action={setAction} className="space-y-2">
          <input type="hidden" name="tenantId" value={tenantId} />
          <FormField
            label="Modifier le solde"
            description="Définit le solde à la valeur exacte saisie (peut diminuer ou augmenter le compteur)."
          >
            <Input
              id="newBalance"
              name="newBalance"
              type="number"
              min="0"
              max="100000"
              defaultValue={displayedBalance}
              required
            />
          </FormField>
          <FormField label="Note (optionnel)">
            <Input id="set-note" name="note" placeholder="ex. ajustement post-paiement" />
          </FormField>
          {setState.error ? <Alert variant="danger">{setState.error}</Alert> : null}
          {setState.ok ? (
            <Alert variant="success">Solde mis à jour ({setState.newBalance}).</Alert>
          ) : null}
          <SetSubmit />
        </form>

        <details className="rounded-lg border border-border bg-card">
          <summary className="cursor-pointer px-3 py-2 text-small font-medium hover:bg-muted/40">
            Accorder un pack (ajouter au solde)
          </summary>
          <form action={grantAction} className="space-y-2 px-3 pb-3 pt-1">
            <input type="hidden" name="tenantId" value={tenantId} />
            <FormField label="Nombre de consultations">
              <Input
                id="consultations"
                name="consultations"
                type="number"
                min="1"
                max="10000"
                required
              />
            </FormField>
            <FormField label="Note (optionnel)">
              <Input id="grant-note" name="note" placeholder="Pack 100" />
            </FormField>
            {grantState.error ? <Alert variant="danger">{grantState.error}</Alert> : null}
            {grantState.ok ? <Alert variant="success">Crédits accordés.</Alert> : null}
            <GrantSubmit />
          </form>
        </details>
      </CardContent>
    </Card>
  );
}
