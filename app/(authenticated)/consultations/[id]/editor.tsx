'use client';

import { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { SectionCard } from '@/components/consultations/section-card';
import { saveFollowUpAction, saveSectionsAction, saveVitalsAction } from './actions';

type Sections = {
  motif: string;
  historyNotes: string;
  examNotes: string;
  diagnosis: string;
  followUpNotes: string;
};

type EditableSections = Omit<Sections, 'followUpNotes'>;

type Vitals = {
  weightKg: string;
  heightCm: string;
  temperatureC: string;
  bpSystolic: string;
  bpDiastolic: string;
  heartRate: string;
  notes: string;
};

type Status = 'idle' | 'pending' | 'saved' | 'error';

const DEBOUNCE_MS = 1500;

export function ConsultationEditor({
  consultationId,
  readOnly,
  initialSections,
  initialVitals,
  prescriptionSlot,
}: {
  consultationId: string;
  readOnly: boolean;
  initialSections: Sections;
  initialVitals: Vitals;
  prescriptionSlot: React.ReactNode;
}) {
  const [sections, setSections] = useState<EditableSections>({
    motif: initialSections.motif,
    historyNotes: initialSections.historyNotes,
    examNotes: initialSections.examNotes,
    diagnosis: initialSections.diagnosis,
  });
  const [followUpNotes, setFollowUpNotes] = useState(initialSections.followUpNotes);
  const [vitals, setVitals] = useState<Vitals>(initialVitals);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const lastSavedSectionsRef = useRef(
    JSON.stringify({
      motif: initialSections.motif,
      historyNotes: initialSections.historyNotes,
      examNotes: initialSections.examNotes,
      diagnosis: initialSections.diagnosis,
    }),
  );
  const lastSavedFollowUpRef = useRef(initialSections.followUpNotes);
  const lastSavedVitalsRef = useRef(JSON.stringify(initialVitals));

  useEffect(() => {
    if (readOnly) return;
    const current = JSON.stringify(sections);
    if (current === lastSavedSectionsRef.current) return;
    setStatus('pending');
    const id = setTimeout(async () => {
      // Send all five fields — the server expects the full schema — but
      // include the latest followUpNotes from a ref so a follow-up edit
      // that hadn't yet been autosaved doesn't get clobbered by a stale
      // closure value.
      const res = await saveSectionsAction(consultationId, {
        ...sections,
        followUpNotes: lastSavedFollowUpRef.current,
      });
      if (res.ok) {
        lastSavedSectionsRef.current = current;
        setStatus('saved');
        setError(null);
      } else {
        setStatus('error');
        setError(res.error ?? 'Erreur de sauvegarde.');
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [sections, consultationId, readOnly]);

  // Follow-up notes autosave — runs even when the consultation is
  // finalized so the doctor can keep recording return-visit notes.
  useEffect(() => {
    if (followUpNotes === lastSavedFollowUpRef.current) return;
    setStatus('pending');
    const id = setTimeout(async () => {
      const res = await saveFollowUpAction(consultationId, followUpNotes);
      if (res.ok) {
        lastSavedFollowUpRef.current = followUpNotes;
        setStatus('saved');
        setError(null);
      } else {
        setStatus('error');
        setError(res.error ?? 'Erreur de sauvegarde.');
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [followUpNotes, consultationId]);

  useEffect(() => {
    if (readOnly) return;
    const current = JSON.stringify(vitals);
    if (current === lastSavedVitalsRef.current) return;
    setStatus('pending');
    const id = setTimeout(async () => {
      const res = await saveVitalsAction(consultationId, vitals);
      if (res.ok) {
        lastSavedVitalsRef.current = current;
        setStatus('saved');
        setError(null);
      } else {
        setStatus('error');
        setError(res.error ?? 'Erreur de sauvegarde.');
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [vitals, consultationId, readOnly]);

  // After finalization the main sections are locked but follow-up notes
  // remain editable, so we can't show a flat "read-only" label.
  const statusLabel =
    status === 'pending'
      ? 'Enregistrement…'
      : status === 'saved'
        ? 'Enregistré'
        : status === 'error'
          ? error ?? 'Erreur'
          : readOnly
            ? 'Finalisée · suivi modifiable'
            : 'Aucune modification';

  const variant =
    status === 'error'
      ? 'danger'
      : status === 'pending'
        ? 'warning'
        : status === 'saved'
          ? 'success'
          : 'neutral';

  const dotColor =
    status === 'error'
      ? 'bg-danger'
      : status === 'pending'
        ? 'bg-warning animate-pulse'
        : status === 'saved'
          ? 'bg-success'
          : 'bg-muted-foreground';

  return (
    <div className="space-y-3">
      <StatusBadge variant={variant} aria-live="polite" className="tabular-nums">
        <span aria-hidden className={`size-1.5 rounded-pill ${dotColor}`} />
        {statusLabel}
      </StatusBadge>

      <SectionCard title="Motif">
        <Textarea
          name="motif"
          rows={2}
          value={sections.motif}
          disabled={readOnly}
          onChange={(e) => setSections({ ...sections, motif: e.target.value })}
        />
      </SectionCard>

      <SectionCard title="Antécédents / historique">
        <Textarea
          rows={3}
          value={sections.historyNotes}
          disabled={readOnly}
          onChange={(e) => setSections({ ...sections, historyNotes: e.target.value })}
        />
      </SectionCard>

      <SectionCard title="Examen clinique">
        <Textarea
          rows={4}
          value={sections.examNotes}
          disabled={readOnly}
          onChange={(e) => setSections({ ...sections, examNotes: e.target.value })}
        />
      </SectionCard>

      <SectionCard title="Constantes">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="weightKg">Poids (kg)</Label>
            <Input
              id="weightKg"
              inputMode="decimal"
              value={vitals.weightKg}
              disabled={readOnly}
              onChange={(e) => setVitals({ ...vitals, weightKg: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="heightCm">Taille (cm)</Label>
            <Input
              id="heightCm"
              inputMode="decimal"
              value={vitals.heightCm}
              disabled={readOnly}
              onChange={(e) => setVitals({ ...vitals, heightCm: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="temperatureC">Temp. (°C)</Label>
            <Input
              id="temperatureC"
              inputMode="decimal"
              value={vitals.temperatureC}
              disabled={readOnly}
              onChange={(e) => setVitals({ ...vitals, temperatureC: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bpSystolic">TA syst.</Label>
            <Input
              id="bpSystolic"
              inputMode="numeric"
              value={vitals.bpSystolic}
              disabled={readOnly}
              onChange={(e) => setVitals({ ...vitals, bpSystolic: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bpDiastolic">TA diast.</Label>
            <Input
              id="bpDiastolic"
              inputMode="numeric"
              value={vitals.bpDiastolic}
              disabled={readOnly}
              onChange={(e) => setVitals({ ...vitals, bpDiastolic: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="heartRate">FC (bpm)</Label>
            <Input
              id="heartRate"
              inputMode="numeric"
              value={vitals.heartRate}
              disabled={readOnly}
              onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1 mt-3">
          <Label htmlFor="vitalsNotes">Notes constantes</Label>
          <Textarea
            id="vitalsNotes"
            rows={2}
            value={vitals.notes}
            disabled={readOnly}
            onChange={(e) => setVitals({ ...vitals, notes: e.target.value })}
          />
        </div>
      </SectionCard>

      <SectionCard title="Diagnostic">
        <Textarea
          rows={3}
          value={sections.diagnosis}
          disabled={readOnly}
          onChange={(e) => setSections({ ...sections, diagnosis: e.target.value })}
        />
      </SectionCard>

      <SectionCard title="Traitement (ordonnance)">{prescriptionSlot}</SectionCard>

      <SectionCard
        title="Suite / follow-up"
        hint={readOnly ? 'modifiable après finalisation' : undefined}
      >
        <Textarea
          rows={8}
          className="min-h-48"
          value={followUpNotes}
          onChange={(e) => setFollowUpNotes(e.target.value)}
          placeholder="Visites de contrôle, relecture d'examens, suivi à distance. Ex. : 2026-06-12 — retour pour relecture biologie : TSH normale, à revoir dans 6 mois."
        />
      </SectionCard>
    </div>
  );
}
