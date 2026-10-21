'use client';

import { Suspense, useActionState } from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Alert } from '@/components/ui/alert';
import { signInAction, type SignInState } from './actions';

const initial: SignInState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" loading={pending} className="w-full">
      {pending ? 'Connexion…' : 'Se connecter'}
    </Button>
  );
}

function SignInForm() {
  const params = useSearchParams();
  const next = params.get('next') ?? '';
  const [state, action] = useActionState(signInAction, initial);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
      <FormField label="Email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="vous@cabinet.ma"
          defaultValue={state.email ?? ''}
        />
      </FormField>
      <FormField label="Mot de passe" error={state.fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </FormField>
      <div className="pt-1">
        <Submit />
      </div>
    </form>
  );
}

function NextNotice() {
  const params = useSearchParams();
  return params.get('next')
    ? 'Connectez-vous pour accéder à cette page.'
    : 'Accédez à votre cabinet Doctopus.';
}

export default function SignInPage() {
  return (
    <AuthCard
      title="Connexion"
      subtitle={
        <Suspense fallback="Accédez à votre cabinet Doctopus.">
          <NextNotice />
        </Suspense>
      }
      footer={
        <>
          Pas encore de compte ? Doctopus est accessible sur invitation.{' '}
          <Link
            href="/"
            className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Découvrir Doctopus
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </AuthCard>
  );
}
