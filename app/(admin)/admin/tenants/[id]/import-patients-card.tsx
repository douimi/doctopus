'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminImportPatientsAction, type ImportPatientsState } from './actions';

const initial: ImportPatientsState = { error: null, inserted: null, failed: [] };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      <Upload aria-hidden />
      Importer
    </Button>
  );
}

export function ImportPatientsCard({ tenantId }: { tenantId: string }) {
  const [state, action] = useActionState(adminImportPatientsAction, initial);
  const hasErrors = state.failed.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden />
          Importer les patients
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-small text-muted-foreground">
          Importez en masse les patients depuis l&apos;ancien système du cabinet
          (CSV ou Excel). Téléchargez d&apos;abord le modèle pour connaître les
          colonnes attendues.
        </p>

        <a
          href="/api/admin/patient-import-template"
          download
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card text-small font-medium hover:bg-muted transition-colors"
        >
          <Download className="size-3.5" aria-hidden />
          Télécharger le modèle CSV
        </a>

        <form action={action} encType="multipart/form-data" className="space-y-2 pt-2 border-t border-border">
          <input type="hidden" name="tenantId" value={tenantId} />
          <label className="block space-y-1">
            <span className="text-small font-medium">Fichier (.csv ou .xlsx, ≤ 5 Mo)</span>
            <input
              type="file"
              name="file"
              accept=".csv,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              required
              className="block w-full text-small file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-foreground file:text-background hover:file:bg-foreground/90 file:cursor-pointer file:text-small file:font-medium"
            />
          </label>
          <Submit />
        </form>

        {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
        {state.inserted !== null ? (
          <Alert variant="success">
            {state.inserted} patient{state.inserted === 1 ? '' : 's'} importé
            {state.inserted === 1 ? '' : 's'}.
            {state.failed.length > 0
              ? ` ${state.failed.length} ligne${state.failed.length === 1 ? '' : 's'} ignorée${
                  state.failed.length === 1 ? '' : 's'
                }.`
              : ''}
          </Alert>
        ) : null}

        {hasErrors ? (
          <details className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <summary className="text-small font-medium cursor-pointer">
              {state.failed.length} erreur{state.failed.length === 1 ? '' : 's'} de validation
            </summary>
            <ul className="mt-2 space-y-1 max-h-48 overflow-auto pr-2">
              {state.failed.slice(0, 50).map((e, i) => (
                <li key={i} className="text-small text-muted-foreground tabular-nums">
                  {e.row > 0 ? `Ligne ${e.row} · ` : ''}
                  <span className="text-foreground">{e.field}</span> — {e.message}
                </li>
              ))}
              {state.failed.length > 50 ? (
                <li className="text-small text-muted-foreground italic">
                  +{state.failed.length - 50} autres…
                </li>
              ) : null}
            </ul>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
