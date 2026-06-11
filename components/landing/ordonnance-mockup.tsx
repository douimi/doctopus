'use client';

import { useTypewriter } from './animations';

type Med = {
  name: string;
  dci: string;
  type: 'Princeps' | 'Générique';
  reimbursable: boolean;
  ppm: string;
  highlighted?: boolean;
};

const MEDS: Med[] = [
  {
    name: 'DOLIPRANE · COMPRIME à 1 G',
    dci: 'PARACETAMOL',
    type: 'Princeps',
    reimbursable: true,
    ppm: '13,10 MAD',
    highlighted: true,
  },
  {
    name: 'DOLIPRANE · COMPRIME à 500 MG',
    dci: 'PARACETAMOL',
    type: 'Princeps',
    reimbursable: true,
    ppm: '9,60 MAD',
  },
  {
    name: 'DOLICOX 90 MG · COMPRIME PELLICULE',
    dci: 'ETORICOXIB',
    type: 'Générique',
    reimbursable: true,
    ppm: '124,00 MAD',
  },
  {
    name: 'DOLI PEDIATRIQUE · SIROP',
    dci: 'PARACETAMOL',
    type: 'Princeps',
    reimbursable: false,
    ppm: '18,40 MAD',
  },
];

export function OrdonnanceMockup({ revealed }: { revealed: boolean }) {
  const queryText = useTypewriter('doli', { startWhen: revealed, charDelayMs: 80 });
  const queryDone = queryText === 'doli';

  return (
    <div className="bg-[#f5f5f5] text-slate-900 p-6 min-h-[340px]">
        <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-3 mb-2 text-sm">
          {queryText || <span className="text-slate-400">Rechercher un médicament…</span>}
          {!queryDone && revealed ? <span className="opacity-60">|</span> : null}
        </div>
        {queryDone ? (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden animate-in slide-in-from-top-2 fade-in duration-300">
            {MEDS.map((m, idx) => (
              <div
                key={m.name}
                className={`px-3.5 py-2.5 flex items-start gap-3 text-sm ${
                  m.highlighted
                    ? 'bg-sky-50 animate-pulse [animation-iteration-count:1] [animation-duration:600ms] [animation-delay:300ms] [animation-fill-mode:both]'
                    : ''
                } ${idx < MEDS.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold leading-tight">{m.name}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{m.dci}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {m.type}
                    </span>
                    {m.reimbursable ? (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        Remboursé
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        Non remb.
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-slate-700 tabular-nums shrink-0 font-medium">{m.ppm}</div>
              </div>
            ))}
          </div>
        ) : null}
    </div>
  );
}
