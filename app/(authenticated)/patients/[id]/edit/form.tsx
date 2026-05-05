'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import { COVERAGE_GROUPS } from '@/lib/patients/coverage';
import { updatePatientAction, type UpdatePatientState } from './actions';

const initial: UpdatePatientState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Enregistrer
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

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'm' | 'f';
  dateOfBirth: string;
  phone: string;
  cin: string;
  coverageType: string;
  coverageId: string;
  address: string;
  notes: string;
};

export function EditPatientForm({ patient }: { patient: Patient }) {
  const [state, action] = useActionState(updatePatientAction, initial);
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={patient.id} />

      <FormSection title="Identité">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Nom">
            <Input
              id="lastName"
              name="lastName"
              defaultValue={patient.lastName}
              required
              autoComplete="family-name"
            />
          </FormField>
          <FormField label="Prénom">
            <Input
              id="firstName"
              name="firstName"
              defaultValue={patient.firstName}
              required
              autoComplete="given-name"
            />
          </FormField>
          <div className="space-y-1">
            <Label htmlFor="gender" className="text-small font-medium">
              Sexe
            </Label>
            <Select name="gender" defaultValue={patient.gender} required>
              <SelectTrigger id="gender">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="m">Homme</SelectItem>
                <SelectItem value="f">Femme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <FormField label="Date de naissance">
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              defaultValue={patient.dateOfBirth}
              required
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Contact">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Téléphone">
            <Input
              id="phone"
              name="phone"
              defaultValue={patient.phone}
              required
              type="tel"
              autoComplete="tel"
            />
          </FormField>
          <FormField label="CIN">
            <Input id="cin" name="cin" defaultValue={patient.cin} />
          </FormField>
        </div>
        <FormField label="Adresse">
          <Input id="address" name="address" defaultValue={patient.address} />
        </FormField>
      </FormSection>

      <FormSection title="Couverture">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="coverageType" className="text-small font-medium">
              Type
            </Label>
            <Select name="coverageType" defaultValue={patient.coverageType}>
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
          <FormField label="N° d'assuré">
            <Input id="coverageId" name="coverageId" defaultValue={patient.coverageId} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Notes">
        <FormField label="Notes">
          <Textarea id="notes" name="notes" rows={3} defaultValue={patient.notes} />
        </FormField>
      </FormSection>

      {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
      <div className="pt-2 border-t border-border">
        <Submit />
      </div>
    </form>
  );
}
