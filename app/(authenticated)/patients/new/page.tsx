'use client';

import { Suspense, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Alert } from '@/components/ui/alert';
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

function NewPatientForm() {
  const params = useSearchParams();
  const next = params.get('next') ?? '';
  const [state, action] = useActionState(createPatientAction, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Nom">
          <Input id="lastName" name="lastName" required />
        </FormField>
        <FormField label="Prénom">
          <Input id="firstName" name="firstName" required />
        </FormField>
        <div className="space-y-1">
          <Label htmlFor="gender">Sexe</Label>
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
        <FormField label="Téléphone">
          <Input id="phone" name="phone" required />
        </FormField>
        <FormField label="CIN (optionnel)">
          <Input id="cin" name="cin" />
        </FormField>
        <div className="space-y-1">
          <Label htmlFor="coverageType">Couverture</Label>
          <Select name="coverageType">
            <SelectTrigger id="coverageType">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cnss">CNSS</SelectItem>
              <SelectItem value="cnops">CNOPS</SelectItem>
              <SelectItem value="amo">AMO</SelectItem>
              <SelectItem value="ramed">RAMED</SelectItem>
              <SelectItem value="mutuelle">Mutuelle</SelectItem>
              <SelectItem value="none">Sans</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <FormField label="N° d'assuré (optionnel)">
          <Input id="coverageId" name="coverageId" />
        </FormField>
      </div>
      <FormField label="Adresse (optionnel)">
        <Input id="address" name="address" />
      </FormField>
      <FormField label="Notes (optionnel)">
        <Textarea id="notes" name="notes" rows={3} />
      </FormField>
      {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
      <div className="flex gap-2">
        <Submit />
      </div>
    </form>
  );
}

export default function NewPatientPage() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Nouveau patient</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <NewPatientForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
