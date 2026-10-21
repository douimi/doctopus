'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Check, Lock, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SectionCard } from '@/components/consultations/section-card';
import { useCockpit } from '@/components/consultations/cockpit-context';
import { computeBmi } from '@/components/consultations/vitals-format';
import { useConsultationFlush, type FlushResult } from '@/lib/consultations/flush-editor';
import type { PrescriptionItem } from '@/db/schema';
import type { AutocompleteSuggestions } from '@/lib/prescriptions/autocomplete';
import { cn } from '@/lib/utils';
import { saveSectionsAction, saveVitalsAction, type SaveResult } from './actions';
import { PrescriptionEditor } from './prescription/editor';

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

/** Debounce between the last keystroke and the autosave. */
const AUTOSAVE_MS = 1500;

function sameRecord<T extends Record<string, string>>(a: T, b: T): boolean {
  for (const k of Object.keys(a)) if (a[k] !== b[k]) return false;
  return true;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * The consultation note. Two save models, chosen by lifecycle:
 * - draft (not finalized): no "Modifier" gate; every change is saved
 *   ~1.5 s after the last keystroke through the same server actions,
 *   and the header shows "Enregistré · HH:MM".
 * - finalized: read-only behind a "clôturée" banner; "Modifier" opens
 *   an explicit edit with Annuler / Enregistrer.
 * Either way the editor is a flush participant, so the finalize dialog
 * persists pending edits (and waits for in-flight saves) before locking.
 */
export function ConsultationEditor({
  consultationId,
  isFinalized,
  finalizedAt,
  initialSections,
  initialVitals,
  previousVitals,
  prescription,
}: {
  consultationId: string;
  isFinalized: boolean;
  finalizedAt: Date | null;
  initialSections: Sections;
  initialVitals: Vitals;
  /** Last earlier visit's vitals, shown as a hint under the inputs. */
  previousVitals: { consultedAt: Date; line: string } | null;
  prescription: {
    prescriptionId: string | null;
    items: PrescriptionItem[];
    suggestions: AutocompleteSuggestions;
  };
}) {
  const autosave = !isFinalized;
  const { saveState, setSaveState } = useCockpit();
  const [mode, setMode] = useState<Mode>(autosave ? 'edit' : 'view');
  const [sections, setSections] = useState<Sections>(initialSections);
  const [vitals, setVitals] = useState<Vitals>(initialVitals);
  const [savedSections, setSavedSections] = useState<Sections>(initialSections);
  const [savedVitals, setSavedVitals] = useState<Vitals>(initialVitals);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showVitalsNotes, setShowVitalsNotes] = useState(initialVitals.notes.length > 0);

  // Async save machinery reads/writes refs so a save started with one
  // snapshot never clobbers newer keystrokes.
  const latestRef = useRef({ sections: initialSections, vitals: initialVitals });
  const savedRef = useRef({ sections: initialSections, vitals: initialVitals });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chainRef = useRef<Promise<SaveResult>>(Promise.resolve({ ok: true }));

  const dirty = !sameRecord(sections, savedSections) || !sameRecord(vitals, savedVitals);
  const readOnly = mode === 'view';
  const saving = saveState.status === 'saving';

  function isDirtyNow(): boolean {
    const l = latestRef.current;
    const s = savedRef.current;
    return !sameRecord(l.sections, s.sections) || !sameRecord(l.vitals, s.vitals);
  }

  function cancelTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  /** Saves whatever differs from the last saved snapshot. Serialized. */
  function persist(): Promise<SaveResult> {
    cancelTimer();
    const run = async (): Promise<SaveResult> => {
      const { sections: s, vitals: v } = latestRef.current;
      const saved = savedRef.current;
      const sDirty = !sameRecord(s, saved.sections);
      const vDirty = !sameRecord(v, saved.vitals);
      if (!sDirty && !vDirty) return { ok: true };
      setSaveState({ status: 'saving' });
      const [sr, vr] = await Promise.all([
        sDirty ? saveSectionsAction(consultationId, s) : Promise.resolve<SaveResult>({ ok: true }),
        vDirty ? saveVitalsAction(consultationId, v) : Promise.resolve<SaveResult>({ ok: true }),
      ]);
      if (sDirty && sr.ok) {
        savedRef.current = { ...savedRef.current, sections: s };
        setSavedSections(s);
      }
      if (vDirty && vr.ok) {
        savedRef.current = { ...savedRef.current, vitals: v };
        setSavedVitals(v);
      }
      const failed = !sr.ok ? sr : !vr.ok ? vr : null;
      if (failed) {
        const error = failed.error ?? 'Erreur de sauvegarde.';
        setSaveError(error);
        setSaveState({ status: 'error', error });
        return { ok: false, error };
      }
      setSaveError(null);
      setSaveState(isDirtyNow() ? { status: 'dirty' } : { status: 'saved', at: new Date() });
      return { ok: true };
    };
    const next = chainRef.current.then(run, run);
    chainRef.current = next;
    return next;
  }

  function onChange(next: { sections?: Sections; vitals?: Vitals }) {
    const s = next.sections ?? latestRef.current.sections;
    const v = next.vitals ?? latestRef.current.vitals;
    latestRef.current = { sections: s, vitals: v };
    if (next.sections) setSections(s);
    if (next.vitals) setVitals(v);
    if (!isDirtyNow()) {
      cancelTimer();
      return;
    }
    // Keep a visible error until the next successful save.
    if (saveState.status !== 'error') setSaveState({ status: 'dirty' });
    if (autosave) {
      cancelTimer();
      timerRef.current = setTimeout(() => void persist(), AUTOSAVE_MS);
    }
  }

  const setSection = (key: keyof Sections, value: string) =>
    onChange({ sections: { ...latestRef.current.sections, [key]: value } });
  const setVital = (key: keyof Vitals, value: string) =>
    onChange({ vitals: { ...latestRef.current.vitals, [key]: value } });

  // --- finalized consultations: explicit edit -----------------------
  function enterEdit() {
    setMode('edit');
    setSaveError(null);
  }

  function cancelEdit() {
    if (dirty && !window.confirm('Annuler les modifications non enregistrées ?')) return;
    cancelTimer();
    latestRef.current = { ...savedRef.current };
    setSections(savedRef.current.sections);
    setVitals(savedRef.current.vitals);
    setSaveError(null);
    setSaveState({ status: 'idle' });
    setMode('view');
  }

  async function saveExplicit() {
    const r = await persist();
    if (r.ok) setMode('view');
  }

  // Browser-level "unsaved changes" guard while anything is pending.
  useEffect(() => {
    if (!dirty && !saving) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      // Required by some browsers — value is ignored, browser shows its own copy.
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, saving]);

  // Save immediately when the tab is hidden (laptop lid, app switch),
  // and on Ctrl/Cmd+S.
  const onVisibility = useEffectEvent(() => {
    if (document.visibilityState === 'hidden' && autosave && isDirtyNow()) void persist();
  });
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return;
    e.preventDefault();
    if (mode === 'edit') void (autosave ? persist() : saveExplicit());
  });
  useEffect(() => {
    const vis = () => onVisibility();
    const key = (e: KeyboardEvent) => onKeyDown(e);
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('keydown', key);
    };
  }, []);

  useEffect(() => () => cancelTimer(), []);

  useConsultationFlush(consultationId, async (): Promise<FlushResult> => {
    const r = await persist();
    const summary = { diagnosis: latestRef.current.sections.diagnosis };
    return r.ok ? { ok: true, summary } : { ok: false, error: r.error, summary };
  });

  const bmi = computeBmi(vitals.weightKg, vitals.heightCm);

  const vitalInput = (
    key: keyof Vitals,
    label: string,
    opts: { inputMode: 'decimal' | 'numeric'; className?: string; ariaLabel?: string },
  ) => (
    <Input
      id={key}
      inputMode={opts.inputMode}
      value={vitals[key]}
      disabled={readOnly}
      aria-label={opts.ariaLabel}
      className={cn('tabular-nums', opts.className)}
      onChange={(e) => setVital(key, e.target.value)}
      placeholder={label}
    />
  );

  return (
    <div className="space-y-3">
      {isFinalized ? (
        <div className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="flex items-center gap-2 text-body">
            <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>
              Consultation clôturée
              {finalizedAt ? (
                <>
                  {' '}
                  le <span className="tabular-nums">{fmtDate(finalizedAt)}</span>
                </>
              ) : null}
              .{' '}
              <span className="text-muted-foreground">
                {mode === 'view'
                  ? 'Le dossier reste corrigeable.'
                  : 'Modification en cours — pensez à enregistrer.'}
              </span>
            </span>
          </p>
          {mode === 'view' ? (
            <Button type="button" size="sm" variant="secondary" onClick={enterEdit}>
              <Pencil aria-hidden />
              Modifier
            </Button>
          ) : null}
        </div>
      ) : null}

      {saveError ? (
        <p role="alert" className="rounded-lg border border-danger/20 bg-danger-tint px-3 py-2 text-small text-danger-ink">
          Non enregistré — {saveError}
        </p>
      ) : null}

      <SectionCard title="Motif">
        <Textarea
          name="motif"
          rows={2}
          aria-label="Motif"
          value={sections.motif}
          disabled={readOnly}
          onChange={(e) => setSection('motif', e.target.value)}
        />
      </SectionCard>

      <SectionCard title="Constantes" hint={bmi ? `IMC ${bmi.toLocaleString('fr-FR')}` : undefined}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-24 space-y-1">
            <Label htmlFor="weightKg">Poids (kg)</Label>
            {vitalInput('weightKg', 'kg', { inputMode: 'decimal' })}
          </div>
          <div className="w-24 space-y-1">
            <Label htmlFor="heightCm">Taille (cm)</Label>
            {vitalInput('heightCm', 'cm', { inputMode: 'decimal' })}
          </div>
          <div className="w-16 space-y-1">
            <span className="block text-small font-medium text-foreground">IMC</span>
            <output
              htmlFor="weightKg heightCm"
              className="flex h-9 items-center text-body font-medium tabular-nums"
              aria-live="polite"
            >
              {bmi ? bmi.toLocaleString('fr-FR') : '—'}
            </output>
          </div>
          <div className="space-y-1">
            <Label htmlFor="bpSystolic">TA (mmHg)</Label>
            <div className="flex items-center gap-1">
              {vitalInput('bpSystolic', 'syst.', {
                inputMode: 'numeric',
                className: 'w-18',
                ariaLabel: 'TA syst.',
              })}
              <span className="text-muted-foreground" aria-hidden>
                /
              </span>
              {vitalInput('bpDiastolic', 'diast.', {
                inputMode: 'numeric',
                className: 'w-18',
                ariaLabel: 'TA diast.',
              })}
            </div>
          </div>
          <div className="w-20 space-y-1">
            <Label htmlFor="heartRate">FC (bpm)</Label>
            {vitalInput('heartRate', 'bpm', { inputMode: 'numeric' })}
          </div>
          <div className="w-20 space-y-1">
            <Label htmlFor="temperatureC">Temp. (°C)</Label>
            {vitalInput('temperatureC', '°C', { inputMode: 'decimal' })}
          </div>
          {!showVitalsNotes ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowVitalsNotes(true)}
              disabled={readOnly}
            >
              + Notes
            </Button>
          ) : null}
        </div>
        {previousVitals ? (
          <p className="mt-2 text-small text-muted-foreground tabular-nums">
            ↳ Dernière visite ({fmtDate(previousVitals.consultedAt)}) : {previousVitals.line}
          </p>
        ) : null}
        {showVitalsNotes ? (
          <div className="mt-3 space-y-1">
            <Label htmlFor="vitalsNotes">Notes constantes</Label>
            <Textarea
              id="vitalsNotes"
              rows={2}
              value={vitals.notes}
              disabled={readOnly}
              onChange={(e) => setVital('notes', e.target.value)}
            />
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Histoire de la maladie" hint="Antécédents : voir le dossier">
        <Textarea
          rows={3}
          aria-label="Histoire de la maladie"
          value={sections.historyNotes}
          disabled={readOnly}
          onChange={(e) => setSection('historyNotes', e.target.value)}
        />
      </SectionCard>

      <SectionCard title="Examen clinique">
        <Textarea
          rows={4}
          aria-label="Examen clinique"
          value={sections.examNotes}
          disabled={readOnly}
          onChange={(e) => setSection('examNotes', e.target.value)}
        />
      </SectionCard>

      <SectionCard title="Diagnostic">
        <Textarea
          rows={2}
          aria-label="Diagnostic"
          value={sections.diagnosis}
          disabled={readOnly}
          onChange={(e) => setSection('diagnosis', e.target.value)}
        />
      </SectionCard>

      <SectionCard title="Ordonnance">
        <PrescriptionEditor
          consultationId={consultationId}
          prescriptionId={prescription.prescriptionId}
          items={prescription.items}
          suggestions={prescription.suggestions}
          readOnly={readOnly}
        />
      </SectionCard>

      <SectionCard
        title="Suite / prochain contrôle"
        defaultOpen={initialSections.followUpNotes.trim().length > 0}
      >
        <Textarea
          rows={3}
          aria-label="Suite / prochain contrôle"
          value={sections.followUpNotes}
          disabled={readOnly}
          onChange={(e) => setSection('followUpNotes', e.target.value)}
          placeholder="Visites de contrôle, relecture d'examens, suivi à distance. Ex. : retour dans 6 mois pour relecture biologie."
        />
      </SectionCard>

      {isFinalized && mode === 'edit' ? (
        <div className="sticky bottom-3 z-10 mt-4">
          <div className="panel shadow-popover flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-small text-muted-foreground">
              {dirty ? 'Vous avez des modifications non enregistrées.' : 'Aucune modification.'}
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={cancelEdit} disabled={saving}>
                <X aria-hidden />
                Annuler
              </Button>
              <Button
                type="button"
                onClick={() => void saveExplicit()}
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
