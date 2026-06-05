'use client';

import { Suspense, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/shell/page-header';
import { COVERAGE_GROUPS } from '@/lib/patients/coverage';
import { createPatientAction, type CreatePatientState } from './actions';

const initial: CreatePatientState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Créer le patient
    </Button>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-small font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function NewPatientForm() {
  const params = useSearchParams();
  const next = params.get('next') ?? '';
  const [state, action] = useActionState(createPatientAction, initial);
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="next" value={next} />

      <FormSection title="Identité">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Nom">
            <Input id="lastName" name="lastName" required autoComplete="family-name" />
          </FormField>
          <FormField label="Prénom">
            <Input id="firstName" name="firstName" required autoComplete="given-name" />
          </FormField>
          <div className="space-y-1">
            <Label htmlFor="gender" className="text-small font-medium">
              Sexe
            </Label>
            <Select name="gender" required>
              <SelectTrigger id="gender">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="m">Homme</SelectItem>
                <SelectItem value="f">Femme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <FormField label="Date de naissance">
            <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Contact">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Téléphone (optionnel)">
            <Input id="phone" name="phone" type="tel" autoComplete="tel" />
          </FormField>
          <FormField label="CIN (optionnel)">
            <Input id="cin" name="cin" />
          </FormField>
        </div>
        <FormField label="Adresse (optionnel)">
          <Input id="address" name="address" autoComplete="street-address" />
        </FormField>
      </FormSection>

      <FormSection title="Couverture">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="coverageType" className="text-small font-medium">
              Type
            </Label>
            <Select name="coverageType">
              <SelectTrigger id="coverageType">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {COVERAGE_GROUPS.map((g, idx) => (
                  <div key={g.group}>
                    {idx > 0 ? (
                      <div className="my-1 h-px bg-border" aria-hidden />
                    ) : null}
                    <div className="px-2 pt-1.5 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                      {g.label}
                    </div>
                    {g.options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FormField label="N° d'assuré (optionnel)">
            <Input id="coverageId" name="coverageId" />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Notes">
        <FormField label="Notes (optionnel)">
          <Textarea id="notes" name="notes" rows={3} />
        </FormField>
      </FormSection>

      {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Submit />
        <Link
          href={next || '/patients'}
          className="text-small text-muted-foreground hover:text-foreground transition-colors"
          style={{ transitionDuration: 'var(--duration-fast)' }}
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}

export default function NewPatientPage() {
  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href="/patients"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            style={{ transitionDuration: 'var(--duration-fast)' }}
          >
            <ArrowLeft className="size-3" aria-hidden />
            Patients
          </Link>
        }
        title="Nouveau patient"
        description="Créez le dossier d'un nouveau patient pour votre cabinet."
      />
      <div className="px-6 py-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="space-y-4">
            <Suspense fallback={null}>
              <NewPatientForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
