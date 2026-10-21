'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, ClipboardList, HeartPulse, History, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { savePatientHistoryAction } from '@/app/(authenticated)/patients/[id]/history/actions';

export type PatientHistory = {
  historyMedical: string;
  historySurgical: string;
  historyFamily: string;
  historyTreatments: string;
  historyLifestyle: string;
};

const FIELDS: Array<{ key: keyof PatientHistory; label: string; placeholder: string }> = [
  { key: 'historyMedical', label: 'Médicaux', placeholder: 'ex. HTA depuis 2018, asthme dans l’enfance…' },
  { key: 'historySurgical', label: 'Chirurgicaux', placeholder: 'ex. Appendicectomie (2012)…' },
  { key: 'historyFamily', label: 'Familiaux', placeholder: 'ex. Père diabétique, mère HTA…' },
  { key: 'historyTreatments', label: 'Traitements en cours', placeholder: 'ex. Amlodipine 5 mg 1/j…' },
  { key: 'historyLifestyle', label: 'Habitudes de vie', placeholder: 'ex. Tabac 10 PA, sédentaire…' },
];

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/**
 * Patient-level antécédents, always on screen during a consultation.
 * Allergies and chronic conditions come first — they are the facts a
 * prescriber must never miss — then the structured history fields.
 */
export function PatientHistoryPanel({
  patientId,
  initial,
  allergies,
  conditions,
  updatedAt,
  latestNote,
  canEdit,
  hideAllergies = false,
  className,
}: {
  patientId: string;
  initial: PatientHistory;
  allergies: string[];
  conditions: string[];
  updatedAt: Date | null;
  /** Last per-consultation history note — offered as a one-click import when the record is empty. */
  latestNote?: { consultedAt: Date; text: string } | null;
  canEdit: boolean;
  /** Set when allergies are shown (and edited) right next to this panel. */
  hideAllergies?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<PatientHistory>(initial);
  const [draft, setDraft] = useState<PatientHistory>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const filled = FIELDS.filter((f) => saved[f.key].trim().length > 0);
  const missing = FIELDS.filter((f) => saved[f.key].trim().length === 0);
  const showImport = canEdit && !editing && filled.length === 0 && latestNote;

  function startEdit(prefill?: Partial<PatientHistory>) {
    setDraft({ ...saved, ...prefill });
    setError(null);
    setEditing(true);
  }

  function save() {
    setError(null);
    startSaving(async () => {
      const res = await savePatientHistoryAction({ patientId, ...draft });
      if (!res.ok) {
        setError(res.error ?? 'Enregistrement impossible.');
        return;
      }
      setSaved(draft);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby={`history-${patientId}`}
      className={cn('panel flex flex-col', className)}
    >
      <header className="border-b border-border px-4 py-2.5 flex items-center justify-between gap-2">
        <h2 id={`history-${patientId}`} className="flex items-center gap-2 text-heading font-semibold leading-none">
          <ClipboardList className="size-4 text-subtle-foreground" aria-hidden />
          Antécédents
        </h2>
        {canEdit && !editing ? (
          <Button size="xs" variant="ghost" onClick={() => startEdit()}>
            <Pencil aria-hidden />
            Modifier
          </Button>
        ) : null}
      </header>

      <div className="p-4 space-y-3 overflow-auto min-h-0">
        {!hideAllergies || conditions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {hideAllergies ? null : allergies.length > 0 ? (
            allergies.map((a) => (
              <StatusBadge key={`a-${a}`} variant="danger" icon={AlertTriangle}>
                Allergie : {a}
              </StatusBadge>
            ))
          ) : (
            <StatusBadge variant="neutral" icon={AlertTriangle}>
              Aucune allergie connue
            </StatusBadge>
          )}
          {conditions.map((c) => (
            <StatusBadge key={`c-${c}`} variant="warning" icon={HeartPulse}>
              {c}
            </StatusBadge>
          ))}
        </div>
        ) : null}

        {editing ? (
          <div className="space-y-3">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={`${patientId}-${f.key}`} className="text-small">
                  {f.label}
                </Label>
                <Textarea
                  id={`${patientId}-${f.key}`}
                  rows={2}
                  value={draft[f.key]}
                  placeholder={f.placeholder}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                />
              </div>
            ))}
            {error ? (
              <p role="alert" className="text-small text-danger-ink">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
              >
                <X aria-hidden />
                Annuler
              </Button>
              <Button size="sm" disabled={saving} onClick={save}>
                <Check aria-hidden />
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {filled.length > 0 ? (
              <dl className="space-y-2.5">
                {filled.map((f) => (
                  <div key={f.key}>
                    <dt className="text-small font-medium text-muted-foreground">{f.label}</dt>
                    <dd className="text-body whitespace-pre-wrap">{saved[f.key]}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-small text-muted-foreground italic">
                Aucun antécédent renseigné dans le dossier.
              </p>
            )}
            {filled.length > 0 && missing.length > 0 ? (
              <p className="text-small text-muted-foreground">
                Non renseignés : {missing.map((f) => f.label.toLowerCase()).join(', ')}
              </p>
            ) : null}
            {showImport ? (
              <div className="rounded-lg border border-info/20 bg-info-tint p-3 space-y-2">
                <p className="flex items-center gap-1.5 text-small font-medium text-info-ink">
                  <History className="size-3.5" aria-hidden />
                  Noté lors de la consultation du {fmtDate(latestNote.consultedAt)}
                </p>
                <p className="text-small whitespace-pre-wrap line-clamp-6">{latestNote.text}</p>
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => startEdit({ historyMedical: latestNote.text })}
                >
                  Reprendre dans le dossier
                </Button>
              </div>
            ) : null}
            {updatedAt ? (
              <p className="text-small text-muted-foreground tabular-nums">
                Mis à jour le {fmtDate(updatedAt)}
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
