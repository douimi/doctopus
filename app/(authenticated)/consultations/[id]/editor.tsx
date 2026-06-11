'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { SectionCard } from '@/components/consultations/section-card';
import { saveSectionsAction, saveVitalsAction } from './actions';

type Sections = {
  motif: string;
  historyNotes: string;
  examNotes: string;
  diagnosis: string;
  followUpNotes: string;
};

type Vitals = {
  weightKg: string;
  heightCm: string;
  temperatureC: string;
  bpSystolic: string;
  bpDiastolic: string;
  heartRate: string;
  notes: string;
};

type Mode = 'view' | 'edit';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function isEmptySections(s: Sections): boolean {
  return !s.motif && !s.historyNotes && !s.examNotes && !s.diagnosis && !s.followUpNotes;
}

function isEmptyVitals(v: Vitals): boolean {
  return (
    !v.weightKg &&
    !v.heightCm &&
    !v.temperatureC &&
    !v.bpSystolic &&
    !v.bpDiastolic &&
    !v.heartRate &&
    !v.notes
  );
}

export function ConsultationEditor({
  consultationId,
  initialSections,
  initialVitals,
  isFollowUp,
  prescriptionSlot,
}: {
  consultationId: string;
  initialSections: Sections;
  initialVitals: Vitals;
  /**
   * Follow-up consultations land here pre-filled with the parent's
   * motif / history / exam / vitals. The doctor's intent is to amend
   * those during the new visit, so we open straight in edit mode
   * instead of forcing them to click Modifier first.
   */
  isFollowUp?: boolean;
  prescriptionSlot: React.ReactNode;
}) {
  // Empty consultation? Treat as fresh entry — start in edit so the doctor
  // doesn't have to click "Modifier" before typing anything. Otherwise
  // start in view; explicit "Modifier" gates every keystroke against the DB.
  const startInEdit =
    isFollowUp || (isEmptySections(initialSections) && isEmptyVitals(initialVitals));
  const [mode, setMode] = useState<Mode>(startInEdit ? 'edit' : 'view');
  const [sections, setSections] = useState<Sections>(initialSections);
  const [vitals, setVitals] = useState<Vitals>(initialVitals);
  const [savedSections, setSavedSections] = useState<Sections>(initialSections);
  const [savedVitals, setSavedVitals] = useState<Vitals>(initialVitals);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const sectionsDirty = useMemo(
    () => JSON.stringify(sections) !== JSON.stringify(savedSections),
    [sections, savedSections],
  );
  const vitalsDirty = useMemo(
    () => JSON.stringify(vitals) !== JSON.stringify(savedVitals),
    [vitals, savedVitals],
  );
  const dirty = sectionsDirty || vitalsDirty;
  const readOnly = mode === 'view';

  // Browser-level "you have unsaved changes" guard. Stays out of the way
  // until the doctor has actually typed something they haven't saved.
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      // Required by some browsers — value is ignored, browser shows its own copy.
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  function enterEdit() {
    setMode('edit');
    setStatus('idle');
    setError(null);
  }

  function cancelEdit() {
    if (dirty && !window.confirm('Annuler les modifications non enregistrées ?')) return;
    setSections(savedSections);
    setVitals(savedVitals);
    setMode('view');
    setStatus('idle');
    setError(null);
  }

  function save() {
    setStatus('saving');
    setError(null);
    startSaving(async () => {
      await flushDirty();
    });
  }

  // Persists whatever's dirty in the editor and returns the outcome.
  // Shared by the explicit Save button AND the FinalizePricingDialog,
  // which dispatches a window event so it can save the doctor's
  // unsaved edits before locking the consultation.
  async function flushDirty(): Promise<{ ok: boolean; error?: string }> {
    if (!sectionsDirty && !vitalsDirty) {
      setStatus('saved');
      setMode('view');
      return { ok: true };
    }
    const calls: Promise<{ ok: boolean; error?: string }>[] = [];
    if (sectionsDirty) calls.push(saveSectionsAction(consultationId, sections));
    if (vitalsDirty) calls.push(saveVitalsAction(consultationId, vitals));
    const results = await Promise.all(calls);
    const failed = results.find((r) => !r.ok);
    if (failed) {
      setStatus('error');
      setError(failed.error ?? 'Erreur de sauvegarde.');
      return { ok: false, error: failed.error };
    }
    setSavedSections(sections);
    setSavedVitals(vitals);
    setStatus('saved');
    setMode('view');
    return { ok: true };
  }

  // Listen for "save what you've got" requests from siblings (the
  // finalize dialog uses this so clicking "Terminer la consultation"
  // never silently throws away the doctor's unsaved edits).
  useEffect(() => {
    function onFlush(e: Event) {
      const detail = (e as CustomEvent<{
        consultationId: string;
        resolve: (r: { ok: boolean; error?: string }) => void;
      }>).detail;
      if (!detail || detail.consultationId !== consultationId) return;
      void flushDirty().then(detail.resolve);
    }
    window.addEventListener('doctopus:flush-consultation-editor', onFlush as EventListener);
    return () =>
      window.removeEventListener('doctopus:flush-consultation-editor', onFlush as EventListener);
    // flushDirty captures sections/vitals/sectionsDirty/vitalsDirty by
    // closure — rewire whenever they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId, sections, vitals, sectionsDirty, vitalsDirty]);

  const statusLabel =
    status === 'saving'
      ? 'Enregistrement…'
      : status === 'error'
        ? error ?? 'Erreur'
        : mode === 'edit'
          ? dirty
            ? 'Modifications non enregistrées'
            : 'Modification en cours'
          : status === 'saved'
            ? 'Enregistré'
            : 'Lecture seule';

  const variant: 'danger' | 'warning' | 'success' | 'neutral' =
    status === 'error'
      ? 'danger'
      : status === 'saving' || (mode === 'edit' && dirty)
        ? 'warning'
        : status === 'saved'
          ? 'success'
          : 'neutral';

  const dotColor =
    status === 'error'
      ? 'bg-danger'
      : status === 'saving' || (mode === 'edit' && dirty)
        ? 'bg-warning animate-pulse'
        : status === 'saved'
          ? 'bg-success'
          : 'bg-muted-foreground';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <StatusBadge variant={variant} aria-live="polite" className="tabular-nums">
          <span aria-hidden className={`size-1.5 rounded-pill ${dotColor}`} />
          {statusLabel}
        </StatusBadge>
        {mode === 'view' ? (
          <Button type="button" size="sm" variant="secondary" onClick={enterEdit}>
            <Pencil aria-hidden />
            Modifier
          </Button>
        ) : null}
      </div>

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

      <SectionCard title="Suite / follow-up">
        <Textarea
          rows={8}
          className="min-h-48"
          value={sections.followUpNotes}
          disabled={readOnly}
          onChange={(e) => setSections({ ...sections, followUpNotes: e.target.value })}
          placeholder="Visites de contrôle, relecture d'examens, suivi à distance. Ex. : 2026-06-12 — retour pour relecture biologie : TSH normale, à revoir dans 6 mois."
        />
      </SectionCard>

      {mode === 'edit' ? (
        <div className="sticky bottom-3 z-10 mt-4">
          <div className="rounded-xl border border-border bg-card shadow-card px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-small text-muted-foreground">
              {dirty
                ? 'Vous avez des modifications non enregistrées.'
                : 'Aucune modification.'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={cancelEdit}
                disabled={saving}
              >
                <X aria-hidden />
                Annuler
              </Button>
              <Button
                type="button"
                onClick={save}
                disabled={!dirty}
                loading={saving}
              >
                <Check aria-hidden />
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
