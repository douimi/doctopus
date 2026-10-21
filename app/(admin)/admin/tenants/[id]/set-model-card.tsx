'use client';

import { useState } from 'react';
import { Cpu } from 'lucide-react';
import { useFormAction } from '@/components/admin/use-form-action';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { showToast } from '@/components/ui/toast';
import { ALLOWED_MODELS_BY_PROVIDER } from '@/lib/chatbot/pricing';
import { adminSetModelAction, type SetModelState } from './actions';

const initial: SetModelState = { error: null, ok: false };

const PROVIDERS = ['anthropic', 'openai', 'mistral'] as const;
type Provider = (typeof PROVIDERS)[number];

const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  mistral: 'Mistral',
};

function isProvider(v: string | null): v is Provider {
  return v !== null && (PROVIDERS as readonly string[]).includes(v);
}

export function SetModelCard({
  tenantId,
  initialProvider,
  initialModel,
}: {
  tenantId: string;
  initialProvider: string | null;
  initialModel: string | null;
}) {
  const [provider, setProvider] = useState<Provider | null>(
    isProvider(initialProvider) ? initialProvider : null,
  );
  const [model, setModel] = useState<string | null>(initialModel);
  const { state, pending, onSubmit } = useFormAction(adminSetModelAction, initial, {
    onSuccess: () => showToast({ title: 'Modèle IA mis à jour.', variant: 'success' }),
  });

  const models = provider ? ALLOWED_MODELS_BY_PROVIDER[provider] : [];
  const unchanged = provider === initialProvider && model === initialModel;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="size-4 text-subtle-foreground" aria-hidden />
          Modèle IA
        </CardTitle>
        <CardDescription>Fournisseur et modèle utilisés par l&apos;assistant du cabinet.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <input type="hidden" name="tenantId" value={tenantId} />
          <FormField label="Fournisseur">
            <Select
              name="provider"
              value={provider}
              onValueChange={(v) => {
                const next = isProvider(v as string | null) ? (v as Provider) : null;
                setProvider(next);
                // Keep the model only if the new provider offers it.
                if (!next || !model || !ALLOWED_MODELS_BY_PROVIDER[next].includes(model)) {
                  setModel(null);
                }
              }}
              required
            >
              <SelectTrigger id="provider">
                <SelectValue placeholder="Choisir un fournisseur">
                  {(v: string | null) => (isProvider(v) ? PROVIDER_LABEL[v] : 'Choisir un fournisseur')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PROVIDER_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Modèle"
            hint={provider ? undefined : "Choisissez d'abord un fournisseur."}
          >
            <Select
              name="model"
              value={model}
              onValueChange={(v) => setModel((v as string | null) ?? null)}
              disabled={!provider}
              required
            >
              <SelectTrigger id="model">
                <SelectValue placeholder="Choisir un modèle" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
          <Button type="submit" size="sm" loading={pending} disabled={!provider || !model || unchanged}>
            Enregistrer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
