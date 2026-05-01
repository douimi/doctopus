'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
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
import { updatePatientAction, type UpdatePatientState } from './actions';

const initial: UpdatePatientState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Enregistrement…' : 'Enregistrer'}
    </Button>
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
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={patient.id} />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input id="lastName" name="lastName" defaultValue={patient.lastName} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input id="firstName" name="firstName" defaultValue={patient.firstName} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gender">Sexe</Label>
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
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date de naissance</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={patient.dateOfBirth}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" name="phone" defaultValue={patient.phone} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cin">CIN</Label>
          <Input id="cin" name="cin" defaultValue={patient.cin} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="coverageType">Couverture</Label>
          <Select name="coverageType" defaultValue={patient.coverageType}>
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
        <div className="space-y-2">
          <Label htmlFor="coverageId">N° d&apos;assuré</Label>
          <Input id="coverageId" name="coverageId" defaultValue={patient.coverageId} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Adresse</Label>
        <Input id="address" name="address" defaultValue={patient.address} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={patient.notes} />
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <Submit />
    </form>
  );
}
