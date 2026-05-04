'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminGrantCreditsAction, type GrantState } from './actions';

const initial: GrantState = { error: null, ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? '…' : 'Accorder'}
    </Button>
  );
}

export function GrantCreditsCard({ tenantId }: { tenantId: string }) {
  const [state, action] = useActionState(adminGrantCreditsAction, initial);
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="font-medium text-sm">Accorder des crédits</div>
      <form action={action} className="space-y-2">
        <input type="hidden" name="tenantId" value={tenantId} />
        <div className="space-y-1">
          <Label htmlFor="consultations" className="text-xs">
            Nombre de consultations
          </Label>
          <Input
            id="consultations"
            name="consultations"
            type="number"
            min="1"
            max="10000"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="note" className="text-xs">
            Note (optionnel)
          </Label>
          <Input id="note" name="note" placeholder="Pack 100" />
        </div>
        {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
        {state.ok ? <p className="text-xs text-green-700">Crédits accordés.</p> : null}
        <Submit />
      </form>
    </div>
  );
}
