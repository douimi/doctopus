'use client';

import { AlertTriangle, ClipboardList } from 'lucide-react';
import { usePrefersReducedMotion, useTypewriter } from './animations';
import { Caret, MButton, MChip, MLabel, MPanel } from './mockup-ui';

const MOTIF = 'Toux persistante depuis 5 jours, fébricule le soir';
const DIAGNOSTIC = 'Bronchite aiguë, probable origine virale';

/** Mirrors components/patients/patient-history-panel.tsx field labels. */
const HISTORY: Array<{ label: string; value: string }> = [
  { label: 'Médicaux', value: 'Asthme léger depuis l’enfance' },
  { label: 'Chirurgicaux', value: 'Appendicectomie (2012)' },
  { label: 'Familiaux', value: 'Père diabétique de type 2' },
  { label: 'Traitements en cours', value: 'Salbutamol à la demande' },
  { label: 'Habitudes de vie', value: 'Non-fumeuse, sportive' },
];

const VITALS = [
  { label: 'T°', value: '37,8 °C' },
  { label: 'TA', value: '12/7' },
  { label: 'FC', value: '82' },
  { label: 'Poids', value: '61 kg' },
];

export function ConsultationMockup({ revealed }: { revealed: boolean }) {
  const reduce = usePrefersReducedMotion();
  const typedMotif = useTypewriter(MOTIF, { startWhen: revealed && !reduce, charDelayMs: 28 });
  const typedDiag = useTypewriter(DIAGNOSTIC, {
    startWhen: revealed && !reduce,
    charDelayMs: 28,
    startDelayMs: MOTIF.length * 28 + 350,
  });
  const motif = reduce ? MOTIF : typedMotif;
  const diagnostic = reduce ? DIAGNOSTIC : typedDiag;
  const motifDone = motif.length === MOTIF.length;
  const diagDone = diagnostic.length === DIAGNOSTIC.length;

  return (
    <div>
      {/* Sticky consultation header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold leading-tight">BERRADA Yasmine</div>
          <div className="text-[11.5px] text-slate-500">F · 34 ans · Consultation du jour</div>
        </div>
        <MChip tone="danger">
          <AlertTriangle className="size-3" />
          Allergie : Pénicilline
        </MChip>
        <div className="ml-auto flex items-center gap-2">
          {/* Mirrors the app's autosave state in the consultation header. */}
          <span className="hidden text-[11.5px] text-slate-500 sm:inline">Enregistré · 10:42</span>
          <MButton>Terminer la consultation</MButton>
        </div>
      </div>

      <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,210px)_minmax(0,1fr)] sm:p-4">
        {/* Patient-level antécédents: always on screen */}
        <MPanel className="self-start">
          <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px] font-semibold">
            <ClipboardList className="size-3.5 text-sky-700" />
            Antécédents
          </div>
          <div className="space-y-2.5 p-3">
            <div className="flex flex-wrap gap-1">
              <MChip tone="danger">
                <AlertTriangle className="size-3" />
                Allergie : Pénicilline
              </MChip>
              <MChip>Asthme</MChip>
            </div>
            {HISTORY.map((h) => (
              <div key={h.label}>
                <MLabel>{h.label}</MLabel>
                <div className="text-[12px] leading-snug text-slate-800">{h.value}</div>
              </div>
            ))}
          </div>
        </MPanel>

        {/* Editor */}
        <div className="min-w-0 space-y-2">
          <MPanel className="px-3 py-2.5">
            <MLabel className="mb-1">Motif</MLabel>
            <div className="min-h-[1.25rem] text-[12.5px]">
              {motif}
              <Caret show={revealed && !motifDone} />
            </div>
          </MPanel>
          <MPanel className="px-3 py-2.5">
            <MLabel className="mb-1.5">Constantes</MLabel>
            <div className="grid grid-cols-4 gap-1.5">
              {VITALS.map((v) => (
                <div key={v.label} className="rounded-md border border-slate-200 px-1.5 py-1">
                  <div className="text-[10px] text-slate-500">{v.label}</div>
                  <div className="truncate text-[12px] font-medium tabular-nums">{v.value}</div>
                </div>
              ))}
            </div>
          </MPanel>
          <MPanel className="px-3 py-2.5">
            <MLabel className="mb-1">Diagnostic</MLabel>
            <div className="min-h-[1.25rem] text-[12.5px]">
              {diagnostic}
              <Caret show={motifDone && !diagDone} />
            </div>
          </MPanel>
          <MPanel className="px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <MLabel>Ordonnance</MLabel>
              <MButton variant="outline" className="h-6 px-2 text-[11px]">Imprimer PDF</MButton>
            </div>
            <div className="flex items-baseline gap-2 text-[12px]">
              <span className="text-slate-400 tabular-nums">1.</span>
              <span className="min-w-0">
                <span className="font-medium">DOLIPRANE 1 g, comprimé</span>
                <span className="text-slate-500"> · 1 cp 3 fois par jour · 5 jours</span>
              </span>
            </div>
          </MPanel>
        </div>
      </div>
    </div>
  );
}
