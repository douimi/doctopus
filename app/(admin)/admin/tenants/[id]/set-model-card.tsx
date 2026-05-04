'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
    <Button type="submit" disabled={pending} size="sm">
      {pending ? '…' : 'Enregistrer'}
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
    <div className="rounded-md border p-3 space-y-2">
      <div className="font-medium text-sm">Modèle IA</div>
      <form action={action} className="space-y-2">
        <input type="hidden" name="tenantId" value={tenantId} />
        <div className="space-y-1">
          <Label htmlFor="provider" className="text-xs">
            Fournisseur
          </Label>
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
        </div>
        <div className="space-y-1">
          <Label htmlFor="model" className="text-xs">
            Modèle
          </Label>
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
        </div>
        {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
        {state.ok ? <p className="text-xs text-green-700">Modèle mis à jour.</p> : null}
        <Submit />
      </form>
    </div>
  );
}
