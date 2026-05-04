'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALLOWED_MODELS_BY_PROVIDER } from '@/lib/chatbot/pricing';
import { adminSetModelAction, type SetModelState } from './actions';

const initial: SetModelState = { error: null, ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Enregistrer
    </Button>
  );
}

const PROVIDERS = ['anthropic', 'openai', 'mistral'] as const;

export function SetModelCard({
  tenantId,
  initialProvider,
  initialModel,
}: {
  tenantId: string;
  initialProvider: string | null;
  initialModel: string | null;
}) {
  const [state, action] = useActionState(adminSetModelAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Modèle IA</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-2">
          <input type="hidden" name="tenantId" value={tenantId} />
          <FormField label="Fournisseur">
            <Select name="provider" defaultValue={initialProvider ?? undefined} required>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Choisir un fournisseur" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Modèle">
            <Select name="model" defaultValue={initialModel ?? undefined} required>
              <SelectTrigger id="model">
                <SelectValue placeholder="Choisir un modèle" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ALLOWED_MODELS_BY_PROVIDER)
                  .flat()
                  .map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </FormField>
          {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
          {state.ok ? <Alert variant="success">Modèle mis à jour.</Alert> : null}
          <Submit />
        </form>
      </CardContent>
    </Card>
  );
}
