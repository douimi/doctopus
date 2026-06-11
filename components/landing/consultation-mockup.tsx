'use client';

import { useTypewriter } from './animations';

const MOTIF = 'Toux persistante depuis 5 jours';
const DIAGNOSTIC = 'Bronchite aiguë, probable origine virale';

export function ConsultationMockup({ revealed }: { revealed: boolean }) {
  const motifText = useTypewriter(MOTIF, { startWhen: revealed, charDelayMs: 30 });
  const diagnosticText = useTypewriter(DIAGNOSTIC, {
    startWhen: revealed,
    charDelayMs: 30,
    startDelayMs: MOTIF.length * 30 + 400,
  });
  const motifDone = motifText.length === MOTIF.length;
  const diagnosticDone = diagnosticText.length === DIAGNOSTIC.length;

  return (
    <div className="bg-[#f5f5f5] text-slate-900 p-6 min-h-[320px]">
        {/* Patient card */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-full bg-sky-500 text-white flex items-center justify-center font-semibold">
            BY
          </div>
          <div className="flex-1">
            <div className="font-semibold">Berrada Yasmine</div>
            <div className="text-sm text-slate-500">F · 34 ans · CIN BK123456</div>
          </div>
          <div
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
              motifDone
                ? 'bg-green-100 text-green-800 animate-pulse [animation-iteration-count:1] [animation-duration:1s]'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {motifDone ? '● Enregistré' : '● Brouillon'}
          </div>
        </div>
        {/* Motif field */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 mb-2">
          <div className="text-[11px] uppercase text-slate-400 tracking-wide mb-1 font-medium">
            Motif
          </div>
          <div className="text-sm">
            {motifText}
            {!motifDone && revealed ? <span className="opacity-60">|</span> : null}
          </div>
        </div>
        {/* Diagnostic field */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <div className="text-[11px] uppercase text-slate-400 tracking-wide mb-1 font-medium">
            Diagnostic
          </div>
          <div className="text-sm">
            {diagnosticText}
            {!diagnosticDone && motifDone ? <span className="opacity-60">|</span> : null}
          </div>
        </div>
    </div>
  );
}
