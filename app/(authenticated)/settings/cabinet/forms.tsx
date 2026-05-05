'use client';

import Image from 'next/image';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { FormField } from '@/components/ui/form-field';
import {
  saveCabinetTextAction,
  uploadSignatureAction,
  uploadStampAction,
  uploadLogoAction,
  type SaveTextState,
  type UploadState,
} from './actions';

const textInitial: SaveTextState = { error: null, saved: false };
const upInitial: UploadState = { error: null, uploaded: false };

function TextSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Enregistrer
    </Button>
  );
}

function UploadSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
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
    logoUrl: string | null;
    chatbotEnabled: boolean;
    chatbotCreditsBalance: number;
    defaultConsultationPriceMad: string;
  };
}) {
  const [textState, textAction] = useActionState(saveCabinetTextAction, textInitial);
  const [sigState, sigAction] = useActionState(uploadSignatureAction, upInitial);
  const [stampState, stampAction] = useActionState(uploadStampAction, upInitial);
  const [logoState, logoAction] = useActionState(uploadLogoAction, upInitial);

  return (
    <div className="space-y-6">
      <form action={textAction} className="space-y-3">
        <FormField label="N° RPM">
          <Input id="rpmNumber" name="rpmNumber" defaultValue={initial.rpmNumber} />
        </FormField>
        <FormField label="N° CNOM">
          <Input id="cnomNumber" name="cnomNumber" defaultValue={initial.cnomNumber} />
        </FormField>
        <FormField label="En-tête personnalisé (texte ou HTML)">
          <Textarea
            id="prescriptionHeaderHtml"
            name="prescriptionHeaderHtml"
            rows={3}
            defaultValue={initial.prescriptionHeaderHtml}
          />
        </FormField>
        <FormField
          label="Tarif par défaut (MAD)"
          description="Prefille le champ Prix lors de la clôture des consultations."
        >
          <Input
            id="defaultConsultationPriceMad"
            name="defaultConsultationPriceMad"
            type="number"
            step="any"
            min="0.01"
            max="99999.99"
            inputMode="decimal"
            placeholder="300"
            defaultValue={initial.defaultConsultationPriceMad}
          />
        </FormField>
        {textState.error ? <Alert variant="danger">{textState.error}</Alert> : null}
        {textState.saved ? <Alert variant="success">Enregistré.</Alert> : null}
        <TextSubmit />
      </form>

      <hr className="border-border" />

      <div className="space-y-2">
        <div className="font-medium">Assistant IA</div>
        {initial.chatbotEnabled ? (
          <p className="text-sm">Crédits IA : ~{initial.chatbotCreditsBalance} consultations restantes.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Non activé. Contactez l&apos;administrateur de la plateforme pour activer l&apos;assistant.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Doctopus utilise des fournisseurs d&apos;IA (Anthropic, OpenAI, Mistral) comme sous-traitants pour
          l&apos;assistant. Le contexte clinique du patient (sans nom, CIN, téléphone ni adresse) leur est
          transmis. Aucune donnée n&apos;est utilisée pour entraîner leurs modèles.
        </p>
      </div>

      <hr className="border-border" />

      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-2">
          <div className="font-medium">Signature</div>
          {initial.signatureUrl ? (
            <Image
              src={initial.signatureUrl}
              alt="signature"
              width={160}
              height={80}
              className="border border-border rounded"
              unoptimized
            />
          ) : (
            <p className="text-sm text-muted-foreground">Aucune signature.</p>
          )}
          <form action={sigAction} className="space-y-2">
            <Input type="file" name="file" accept="image/png,image/jpeg" required />
            {sigState.error ? <Alert variant="danger">{sigState.error}</Alert> : null}
            {sigState.uploaded ? <Alert variant="success">Mise à jour.</Alert> : null}
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
              className="border border-border rounded"
              unoptimized
            />
          ) : (
            <p className="text-sm text-muted-foreground">Aucun cachet.</p>
          )}
          <form action={stampAction} className="space-y-2">
            <Input type="file" name="file" accept="image/png,image/jpeg" required />
            {stampState.error ? <Alert variant="danger">{stampState.error}</Alert> : null}
            {stampState.uploaded ? <Alert variant="success">Mise à jour.</Alert> : null}
            <UploadSubmit label="Téléverser le cachet" />
          </form>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Logo</div>
          {initial.logoUrl ? (
            <Image src={initial.logoUrl} alt="logo" width={120} height={80} className="border border-border rounded" unoptimized />
          ) : (
            <p className="text-sm text-muted-foreground">Aucun logo.</p>
          )}
          <form action={logoAction} className="space-y-2">
            <Input type="file" name="file" accept="image/png,image/jpeg" required />
            {logoState.error ? <Alert variant="danger">{logoState.error}</Alert> : null}
            {logoState.uploaded ? <Alert variant="success">Mise à jour.</Alert> : null}
            <UploadSubmit label="Téléverser le logo" />
          </form>
        </div>
      </div>
    </div>
  );
}
