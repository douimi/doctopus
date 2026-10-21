'use client';

import Image from 'next/image';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { FormField } from '@/components/ui/form-field';
import { StatusBadge } from '@/components/ui/status-badge';
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
    <Button type="submit" size="sm" variant="secondary" loading={pending}>
      {pending ? null : <Upload aria-hidden />}
      {label}
    </Button>
  );
}

/** One image slot (signature / cachet / logo): preview + upload form. */
function ImageUpload({
  title,
  url,
  alt,
  width,
  height,
  emptyLabel,
  action,
  state,
  submitLabel,
}: {
  title: string;
  url: string | null;
  alt: string;
  width: number;
  height: number;
  emptyLabel: string;
  action: (formData: FormData) => void;
  state: UploadState;
  submitLabel: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="text-small font-medium text-foreground">{title}</div>
      <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border-strong bg-canvas p-2">
        {url ? (
          <Image
            src={url}
            alt={alt}
            width={width}
            height={height}
            className="max-h-full w-auto object-contain"
            unoptimized
          />
        ) : (
          <span className="text-small text-subtle-foreground">{emptyLabel}</span>
        )}
      </div>
      <form action={action} className="space-y-2">
        <Input
          type="file"
          name="file"
          accept="image/png,image/jpeg"
          required
          aria-label={`Fichier — ${title}`}
          className="h-auto py-1.5"
        />
        {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
        {state.uploaded ? <Alert variant="success">Mise à jour.</Alert> : null}
        <UploadSubmit label={submitLabel} />
      </form>
    </div>
  );
}

export function CabinetForms({
  initial,
}: {
  initial: {
    inpeNumber: string;
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
      <form action={textAction}>
        <Card>
          <CardHeader>
            <CardTitle>Ordonnance et tarif</CardTitle>
            <CardDescription>Ces informations apparaissent sur vos ordonnances.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Code INPE"
                description="Identifiant National des Professionnels de Santé."
              >
                <Input
                  id="inpeNumber"
                  name="inpeNumber"
                  defaultValue={initial.inpeNumber}
                  placeholder="ex. 12345678"
                  autoComplete="off"
                />
              </FormField>
              <FormField
                label="Tarif par défaut (MAD)"
                description="Pré-remplit le prix à la clôture des consultations."
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
            </div>
            <FormField label="En-tête personnalisé" description="Texte ou HTML, affiché en haut de l'ordonnance.">
              <Textarea
                id="prescriptionHeaderHtml"
                name="prescriptionHeaderHtml"
                rows={3}
                defaultValue={initial.prescriptionHeaderHtml}
              />
            </FormField>
            {textState.error ? <Alert variant="danger">{textState.error}</Alert> : null}
            {textState.saved ? <Alert variant="success">Enregistré.</Alert> : null}
          </CardContent>
          <CardFooter>
            <TextSubmit />
          </CardFooter>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Signature, cachet et logo</CardTitle>
          <CardDescription>Images PNG ou JPEG, apposées sur les ordonnances imprimées.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <ImageUpload
              title="Signature"
              url={initial.signatureUrl}
              alt="Signature"
              width={160}
              height={80}
              emptyLabel="Aucune signature"
              action={sigAction}
              state={sigState}
              submitLabel="Téléverser"
            />
            <ImageUpload
              title="Cachet"
              url={initial.stampUrl}
              alt="Cachet"
              width={120}
              height={120}
              emptyLabel="Aucun cachet"
              action={stampAction}
              state={stampState}
              submitLabel="Téléverser"
            />
            <ImageUpload
              title="Logo"
              url={initial.logoUrl}
              alt="Logo"
              width={120}
              height={80}
              emptyLabel="Aucun logo"
              action={logoAction}
              state={logoState}
              submitLabel="Téléverser"
            />
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-subtle-foreground" aria-hidden />
            Assistant IA
            {initial.chatbotEnabled ? (
              <StatusBadge variant="success" dot>
                Activé
              </StatusBadge>
            ) : (
              <StatusBadge variant="neutral">Non activé</StatusBadge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {initial.chatbotEnabled ? (
            <p className="text-body text-foreground">
              Crédits IA : <span className="tabular-nums">~{initial.chatbotCreditsBalance}</span>{' '}
              consultations restantes.
            </p>
          ) : (
            <p className="text-body text-muted-foreground">
              Contactez l&apos;administrateur de la plateforme pour activer l&apos;assistant.
            </p>
          )}
          <p className="text-small text-muted-foreground">
            Doctopus utilise des fournisseurs d&apos;IA (Anthropic, OpenAI, Mistral) comme sous-traitants pour
            l&apos;assistant. Le contexte clinique du patient (sans nom, CIN, téléphone ni adresse) leur est
            transmis. Aucune donnée n&apos;est utilisée pour entraîner leurs modèles.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
