'use client';

import { useTypewriter } from './animations';

type Med = {
  name: string;
  dci: string;
  lab: string;
  ppv: string;
  highlighted?: boolean;
};

const MEDS: Med[] = [
  { name: 'Doliprane 1000mg · comprimé', dci: 'Paracétamol', lab: 'Sanofi', ppv: '12,50 MAD', highlighted: true },
  { name: 'Doliprane 500mg · comprimé', dci: 'Paracétamol', lab: 'Sanofi', ppv: '8,20 MAD' },
  { name: 'DOLICOX 120 mg · comprimé pelliculé', dci: 'Diclofénac', lab: 'BOTTU', ppv: '81,70 MAD' },
  { name: 'Doliprane Codéine', dci: 'Paracétamol/Codéine', lab: 'Sanofi', ppv: '18,40 MAD' },
];

export function OrdonnanceMockup({ revealed }: { revealed: boolean }) {
  const queryText = useTypewriter('doli', { startWhen: revealed, charDelayMs: 80 });
  const queryDone = queryText === 'doli';

  return (
    <div className="mt-16 max-w-[900px] w-full bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] border border-white/10 rounded-2xl p-2 shadow-2xl">
      <div className="flex gap-1.5 px-3.5 py-2.5">
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="w-3 h-3 rounded-full bg-white/10" />
      </div>
      <div className="bg-[#f5f5f5] text-slate-900 rounded-xl p-6 min-h-[320px]">
        <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-3 mb-2 text-sm">
          {queryText || <span className="text-slate-400">Rechercher un médicament…</span>}
          {!queryDone && revealed ? <span className="opacity-60">|</span> : null}
        </div>
        {queryDone ? (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden animate-in slide-in-from-top-2 fade-in duration-300">
            {MEDS.map((m, idx) => (
              <div
                key={m.name}
                className={`px-3.5 py-2.5 flex items-baseline gap-3 text-sm ${
                  m.highlighted
                    ? 'bg-sky-50 animate-pulse [animation-iteration-count:1] [animation-duration:600ms] [animation-delay:300ms] [animation-fill-mode:both]'
                    : ''
                } ${idx < MEDS.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-semibold">{m.name}</span>
                  <span className="text-slate-500 text-xs"> — {m.dci} ({m.lab})</span>
                </div>
                <div className="text-slate-500 tabular-nums shrink-0">{m.ppv}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
