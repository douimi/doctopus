'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { adminGrantCreditsAction, type GrantState } from './actions';

const initial: GrantState = { error: null, ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Accorder
    </Button>
  );
}

export function GrantCreditsCard({ tenantId }: { tenantId: string }) {
  const [state, action] = useActionState(adminGrantCreditsAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accorder des crédits</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-2">
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
            <Input id="note" name="note" placeholder="Pack 100" />
          </FormField>
          {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
          {state.ok ? <Alert variant="success">Crédits accordés.</Alert> : null}
          <Submit />
        </form>
      </CardContent>
    </Card>
  );
}
