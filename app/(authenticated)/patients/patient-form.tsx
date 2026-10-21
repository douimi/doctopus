'use client';

import { startTransition, useActionState, useId } from 'react';
import Link from 'next/link';
import { CircleAlert } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { FormSection } from '@/components/ui/form-section';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { COVERAGE_GROUPS, coverageLabel } from '@/lib/patients/coverage';

export type PatientFormValues = {
  lastName: string;
  firstName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  cin: string;
  coverageType: string;
  coverageId: string;
  address: string;
  notes: string;
};

export type PatientFormState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
  /** Submitted values echoed back on failure so nothing is lost. */
  values?: Partial<Record<keyof PatientFormValues, string>>;
};

export const EMPTY_PATIENT: PatientFormValues = {
  lastName: '',
  firstName: '',
  gender: '',
  dateOfBirth: '',
  phone: '',
  cin: '',
  coverageType: '',
  coverageId: '',
  address: '',
  notes: '',
};

const GENDER_LABEL: Record<string, string> = { m: 'Homme', f: 'Femme' };

/**
 * Shared create/edit patient form (ui-spec §6.6). Submits through
 * `onSubmit` + the action dispatcher rather than `<form action>` so React
 * never resets the fields: on a validation error everything the user
 * typed stays put, each faulty field shows its French message, and a
 * summary sits above the buttons.
 */
export function PatientForm({
  action,
  defaults,
  hidden,
  submitLabel,
  cancelHref,
}: {
  action: (prev: PatientFormState, formData: FormData) => Promise<PatientFormState>;
  defaults: PatientFormValues;
  /** Extra hidden inputs (id, next…). */
  hidden?: Record<string, string>;
  submitLabel: string;
  cancelHref: string;
}) {
  const uid = useId();
  const [state, dispatch, pending] = useActionState(action, { error: null });
  const fe = state.fieldErrors ?? {};
  // No form reset happens (onSubmit dispatch), so typed values survive an
  // error; the echoed values only matter if the form remounts.
  const v = { ...defaults, ...(state.values ?? {}) };

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {Object.entries(hidden ?? {}).map(([k, val]) => (
        <input key={k} type="hidden" name={k} value={val} />
      ))}
      <Card>
        <CardContent className="space-y-6">
          <FormSection title="Identité">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Nom" error={fe.lastName}>
                <Input
                  id="lastName"
                  name="lastName"
                  defaultValue={v.lastName}
                  required
                  maxLength={80}
                  autoComplete="family-name"
                />
              </FormField>
              <FormField label="Prénom" error={fe.firstName}>
                <Input
                  id="firstName"
                  name="firstName"
                  defaultValue={v.firstName}
                  required
                  maxLength={80}
                  autoComplete="given-name"
                />
              </FormField>
              <div className="grid gap-1.5">
                <Label htmlFor="gender">Sexe</Label>
                <Select name="gender" defaultValue={v.gender || undefined} required>
                  <SelectTrigger
                    id="gender"
                    aria-invalid={fe.gender ? true : undefined}
                    aria-describedby={fe.gender ? `${uid}-gender-error` : undefined}
                  >
                    <SelectValue placeholder="Choisir">
                      {(val: string | null) => (val ? GENDER_LABEL[val] ?? val : 'Choisir')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m">Homme</SelectItem>
                    <SelectItem value="f">Femme</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError id={`${uid}-gender-error`} message={fe.gender} />
              </div>
              <FormField label="Date de naissance" optional error={fe.dateOfBirth}>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  defaultValue={v.dateOfBirth}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Contact">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Téléphone" optional error={fe.phone}>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={v.phone}
                  maxLength={40}
                  autoComplete="tel"
                />
              </FormField>
              <FormField label="CIN" optional error={fe.cin} hint="Ex. AB123456">
                <Input id="cin" name="cin" defaultValue={v.cin} autoComplete="off" />
              </FormField>
            </div>
            <FormField label="Adresse" optional error={fe.address}>
              <Input
                id="address"
                name="address"
                defaultValue={v.address}
                maxLength={300}
                autoComplete="street-address"
              />
            </FormField>
          </FormSection>

          <FormSection title="Couverture">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="coverageType">Type</Label>
                  <span className="text-small text-subtle-foreground">Optionnel</span>
                </div>
                <Select name="coverageType" defaultValue={v.coverageType || undefined}>
                  <SelectTrigger
                    id="coverageType"
                    aria-invalid={fe.coverageType ? true : undefined}
                  >
                    <SelectValue placeholder="Aucune">
                      {(val: string | null) => (val ? coverageLabel(val) : 'Aucune')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {COVERAGE_GROUPS.map((g, idx) => (
                      <SelectGroup key={g.group}>
                        {idx > 0 ? <SelectSeparator /> : null}
                        <SelectLabel>{g.label}</SelectLabel>
                        {g.options.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={fe.coverageType} />
              </div>
              <FormField label="N° d'assuré" optional error={fe.coverageId}>
                <Input id="coverageId" name="coverageId" defaultValue={v.coverageId} maxLength={80} />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Notes">
            <FormField label="Notes" optional error={fe.notes}>
              <Textarea id="notes" name="notes" rows={3} defaultValue={v.notes} maxLength={2000} />
            </FormField>
          </FormSection>

          {state.error ? (
            <Alert variant="danger" role="alert">
              {state.error}
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="sticky bottom-0 z-10">
          <Link href={cancelHref} className={buttonVariants({ variant: 'secondary' })}>
            Annuler
          </Link>
          <Button type="submit" loading={pending}>
            {submitLabel}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-center gap-1 text-small text-danger-ink">
      <CircleAlert className="size-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}
