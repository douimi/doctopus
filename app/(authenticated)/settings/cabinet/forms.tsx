'use client';

import Image from 'next/image';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  saveCabinetTextAction,
  uploadSignatureAction,
  uploadStampAction,
  type SaveTextState,
  type UploadState,
} from './actions';

const textInitial: SaveTextState = { error: null, saved: false };
const upInitial: UploadState = { error: null, uploaded: false };

function TextSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Enregistrement…' : 'Enregistrer'}
    </Button>
  );
}

function UploadSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Téléversement…' : label}
    </Button>
  );
}

export function CabinetForms({
  initial,
}: {
  initial: {
    rpmNumber: string;
    cnomNumber: string;
    prescriptionHeaderHtml: string;
    signatureUrl: string | null;
    stampUrl: string | null;
  };
}) {
  const [textState, textAction] = useActionState(saveCabinetTextAction, textInitial);
  const [sigState, sigAction] = useActionState(uploadSignatureAction, upInitial);
  const [stampState, stampAction] = useActionState(uploadStampAction, upInitial);

  return (
    <div className="space-y-6">
      <form action={textAction} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="rpmNumber">N° RPM</Label>
          <Input id="rpmNumber" name="rpmNumber" defaultValue={initial.rpmNumber} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cnomNumber">N° CNOM</Label>
          <Input id="cnomNumber" name="cnomNumber" defaultValue={initial.cnomNumber} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="prescriptionHeaderHtml">En-tête personnalisé (texte ou HTML)</Label>
          <Textarea
            id="prescriptionHeaderHtml"
            name="prescriptionHeaderHtml"
            rows={3}
            defaultValue={initial.prescriptionHeaderHtml}
          />
        </div>
        {textState.error ? <p className="text-sm text-red-600">{textState.error}</p> : null}
        {textState.saved ? <p className="text-sm text-green-700">Enregistré.</p> : null}
        <TextSubmit />
      </form>

      <hr />

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="font-medium">Signature</div>
          {initial.signatureUrl ? (
            <Image
              src={initial.signatureUrl}
              alt="signature"
              width={160}
              height={80}
              className="border rounded"
              unoptimized
            />
          ) : (
            <p className="text-sm text-gray-500">Aucune signature.</p>
          )}
          <form action={sigAction} className="space-y-2">
            <Input type="file" name="file" accept="image/png,image/jpeg" required />
            {sigState.error ? <p className="text-sm text-red-600">{sigState.error}</p> : null}
            {sigState.uploaded ? <p className="text-sm text-green-700">Mise à jour.</p> : null}
            <UploadSubmit label="Téléverser la signature" />
          </form>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Cachet</div>
          {initial.stampUrl ? (
            <Image
              src={initial.stampUrl}
              alt="cachet"
              width={120}
              height={120}
              className="border rounded"
              unoptimized
            />
          ) : (
            <p className="text-sm text-gray-500">Aucun cachet.</p>
          )}
          <form action={stampAction} className="space-y-2">
            <Input type="file" name="file" accept="image/png,image/jpeg" required />
            {stampState.error ? <p className="text-sm text-red-600">{stampState.error}</p> : null}
            {stampState.uploaded ? <p className="text-sm text-green-700">Mise à jour.</p> : null}
            <UploadSubmit label="Téléverser le cachet" />
          </form>
        </div>
      </div>
    </div>
  );
}
