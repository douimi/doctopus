'use client';

import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, FileWarning, Upload } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/components/ui/toast';

type FailedRow = {
  row: number;
  field: string;
  message: string;
  raw?: Record<string, string>;
};

type Status =
  | { kind: 'idle' }
  | { kind: 'uploading'; pct: number }
  | { kind: 'parsing' } // file uploaded; server is parsing + inserting
  | { kind: 'done'; inserted: number; skipped: number; failed: FailedRow[] }
  | { kind: 'error'; message: string; failed?: FailedRow[] };

const FAILED_HEADERS = [
  'row',
  'field',
  'message',
  'last_name',
  'first_name',
  'gender',
  'date_of_birth',
  'phone',
  'cin',
  'coverage_type',
  'coverage_id',
  'address',
  'notes',
] as const;

function csvCell(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildFailedRowsCsv(failed: FailedRow[]): string {
  const lines = [FAILED_HEADERS.join(',')];
  for (const f of failed) {
    const cells = FAILED_HEADERS.map((h) => {
      if (h === 'row') return String(f.row);
      if (h === 'field') return f.field;
      if (h === 'message') return f.message;
      return f.raw?.[h] ?? '';
    });
    lines.push(cells.map(csvCell).join(','));
  }
  return lines.join('\n') + '\n';
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ImportPatientsCard({ tenantId }: { tenantId: string }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [fileName, setFileName] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStatus({ kind: 'idle' });
    setFileName('');
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setStatus({ kind: 'error', message: 'Aucun fichier sélectionné.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus({ kind: 'error', message: 'Fichier trop volumineux (max 5 Mo).' });
      return;
    }
    setFileName(file.name);
    setStatus({ kind: 'uploading', pct: 0 });

    const fd = new FormData();
    fd.set('tenantId', tenantId);
    fd.set('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/patient-import');
    xhr.responseType = 'json';

    xhr.upload.addEventListener('progress', (ev) => {
      if (!ev.lengthComputable) return;
      const pct = Math.round((ev.loaded / ev.total) * 100);
      setStatus({ kind: 'uploading', pct });
    });
    xhr.upload.addEventListener('load', () => {
      // Upload finished; server now parses + inserts.
      setStatus({ kind: 'parsing' });
    });
    xhr.addEventListener('load', () => {
      const res = xhr.response as
        | { ok: true; inserted: number; skipped: number; failed: FailedRow[] }
        | { ok: false; error: string; failed?: FailedRow[] }
        | null;
      if (!res) {
        setStatus({ kind: 'error', message: 'Réponse invalide du serveur.' });
        return;
      }
      if (res.ok) {
        setStatus({
          kind: 'done',
          inserted: res.inserted,
          skipped: res.skipped ?? 0,
          failed: res.failed ?? [],
        });
        showToast({
          title: `${res.inserted} patient${res.inserted === 1 ? '' : 's'} importé${res.inserted === 1 ? '' : 's'}.`,
          variant: (res.failed ?? []).length > 0 ? 'warning' : 'success',
        });
      } else {
        setStatus({ kind: 'error', message: res.error, failed: res.failed });
      }
    });
    xhr.addEventListener('error', () => {
      setStatus({ kind: 'error', message: 'Erreur réseau.' });
    });
    xhr.addEventListener('abort', () => {
      setStatus({ kind: 'idle' });
    });

    xhr.send(fd);
  }

  const isWorking = status.kind === 'uploading' || status.kind === 'parsing';
  const failedRows =
    (status.kind === 'done' && status.failed.length > 0
      ? status.failed
      : status.kind === 'error' && status.failed && status.failed.length > 0
        ? status.failed
        : null) ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-subtle-foreground" aria-hidden />
          Importer les patients
        </CardTitle>
        <CardDescription>
          Reprise depuis l&apos;ancien système du cabinet (CSV ou Excel). Les patients déjà
          présents sont ignorés.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <a
          href="/api/admin/patient-import-template"
          download
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          <Download aria-hidden />
          Télécharger le modèle CSV
        </a>

        <form onSubmit={handleSubmit} className="space-y-3 border-t border-border pt-4">
          <label className="grid gap-1.5">
            <span className="text-small font-medium text-foreground">Fichier</span>
            <input
              ref={inputRef}
              type="file"
              name="file"
              accept=".csv,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              required
              disabled={isWorking}
              className="block w-full min-w-0 text-small text-muted-foreground file:mr-3 file:h-8 file:cursor-pointer file:rounded-lg file:border file:border-border-strong file:bg-card file:px-3 file:text-small file:font-medium file:text-foreground hover:file:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            />
            <span className="text-small text-muted-foreground">.csv ou .xlsx, 5 Mo maximum.</span>
          </label>

          {isWorking ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-small">
                <span className="text-muted-foreground">
                  {status.kind === 'uploading' && `Téléversement de ${fileName}…`}
                  {status.kind === 'parsing' && `Validation et insertion…`}
                </span>
                {status.kind === 'uploading' ? (
                  <span className="text-muted-foreground tabular-nums">{status.pct}%</span>
                ) : null}
              </div>
              <div className="h-2 rounded-pill bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-[width] duration-200 ease-out"
                  style={{
                    width:
                      status.kind === 'uploading'
                        ? `${status.pct}%`
                        : status.kind === 'parsing'
                          ? '100%'
                          : '0%',
                    animation:
                      status.kind === 'parsing' ? 'pulse 1.4s ease-in-out infinite' : undefined,
                  }}
                />
              </div>
            </div>
          ) : null}

          <Button type="submit" size="sm" loading={isWorking} disabled={isWorking}>
            <Upload aria-hidden />
            {isWorking ? 'Import en cours…' : 'Importer'}
          </Button>
        </form>

        {status.kind === 'error' ? (
          <Alert variant="danger">{status.message}</Alert>
        ) : null}

        {status.kind === 'done' ? (
          <Alert variant={status.failed.length === 0 ? 'success' : 'warning'}>
            {status.inserted} patient{status.inserted === 1 ? '' : 's'} importé
            {status.inserted === 1 ? '' : 's'}.
            {status.skipped > 0
              ? ` ${status.skipped} déjà présent${status.skipped === 1 ? '' : 's'} (sauté${status.skipped === 1 ? '' : 's'}).`
              : ''}
            {status.failed.length > 0
              ? ` ${status.failed.length} ligne${status.failed.length === 1 ? '' : 's'} en erreur — téléchargez la liste pour corriger et réimporter.`
              : status.skipped === 0
                ? ' Tout est passé.'
                : ''}
          </Alert>
        ) : null}

        {failedRows ? (
          <div className="space-y-2 rounded-lg border border-border bg-canvas p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-small font-medium">
                <FileWarning className="size-3.5 text-warning-ink" aria-hidden />
                {failedRows.length} ligne{failedRows.length === 1 ? '' : 's'} en erreur
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  downloadCsv(buildFailedRowsCsv(failedRows), 'patients-en-erreur.csv')
                }
              >
                <Download aria-hidden />
                Télécharger le CSV
              </Button>
            </div>
            <ul className="space-y-1 max-h-48 overflow-auto pr-2">
              {failedRows.slice(0, 20).map((e, i) => (
                <li key={i} className="text-small text-muted-foreground tabular-nums">
                  {e.row > 0 ? `Ligne ${e.row} · ` : ''}
                  <span className="text-foreground">{e.field}</span> — {e.message}
                </li>
              ))}
              {failedRows.length > 20 ? (
                <li className="text-small text-muted-foreground italic">
                  +{failedRows.length - 20} autres dans le CSV…
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {status.kind === 'done' || status.kind === 'error' ? (
          <Button type="button" size="sm" variant="ghost" onClick={reset}>
            Nouvel import
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
