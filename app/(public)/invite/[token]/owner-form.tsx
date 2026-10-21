'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { FormSection } from '@/components/ui/form-section';
import { Input } from '@/components/ui/input';
import { acceptOwnerInvite, type OwnerState } from './actions';

const initial: OwnerState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" loading={pending} className="w-full">
      {pending ? 'Création du cabinet…' : 'Créer mon cabinet'}
    </Button>
  );
}

export function OwnerInviteForm({ token, emailHint }: { token: string; emailHint: string }) {
  const [state, action] = useActionState(acceptOwnerInvite, initial);
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="token" value={token} />
      {state.error ? <Alert variant="danger">{state.error}</Alert> : null}

      <FormSection title="Votre compte">
        <FormField label="Nom complet du médecin" error={fe.fullName}>
          <Input
            id="fullName"
            name="fullName"
            required
            autoComplete="name"
            placeholder="Dr Amina El Idrissi"
            defaultValue={v.fullName ?? ''}
          />
        </FormField>
        <FormField label="Email" error={fe.email}>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            defaultValue={v.email ?? emailHint}
          />
        </FormField>
        <FormField
          label="Mot de passe"
          hint="12 caractères minimum."
          error={fe.password}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
        </FormField>
      </FormSection>

      <FormSection title="Votre cabinet">
        <FormField label="Nom du cabinet" error={fe.cabinetName}>
          <Input
            id="cabinetName"
            name="cabinetName"
            required
            autoComplete="organization"
            placeholder="Cabinet El Idrissi"
            defaultValue={v.cabinetName ?? ''}
          />
        </FormField>
        <FormField label="Adresse" optional error={fe.cabinetAddress}>
          <Input
            id="cabinetAddress"
            name="cabinetAddress"
            autoComplete="street-address"
            defaultValue={v.cabinetAddress ?? ''}
          />
        </FormField>
        <FormField label="Téléphone" optional error={fe.cabinetPhone}>
          <Input
            id="cabinetPhone"
            name="cabinetPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="05 22 00 00 00"
            defaultValue={v.cabinetPhone ?? ''}
          />
        </FormField>
      </FormSection>

      <div className="space-y-2">
        <Submit />
        <p className="text-center text-small text-muted-foreground">
          Vous pourrez compléter les informations du cabinet plus tard dans les paramètres.
        </p>
      </div>
    </form>
  );
}
