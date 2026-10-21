'use client';

import { Search } from 'lucide-react';
import { usePrefersReducedMotion, useTypewriter } from './animations';
import { Caret, MChip, MLabel, MPanel } from './mockup-ui';

type Med = {
  name: string;
  form: string;
  dci: string;
  type: 'Princeps' | 'Générique';
  reimbursable: boolean;
  price: string;
  highlighted?: boolean;
};

/** Same shape as the app's search dropdown (prescription/search-input.tsx). */
const MEDS: Med[] = [
  { name: 'DOLIPRANE', form: '1 g, comprimé', dci: 'Paracétamol', type: 'Princeps', reimbursable: true, price: '13,10 MAD', highlighted: true },
  { name: 'DOLIPRANE', form: '500 mg, comprimé', dci: 'Paracétamol', type: 'Princeps', reimbursable: true, price: '9,60 MAD' },
  { name: 'DOLICOX', form: '90 mg, comprimé pelliculé', dci: 'Étoricoxib', type: 'Générique', reimbursable: true, price: '124,00 MAD' },
  { name: 'DOLI PÉDIATRIQUE', form: 'sirop', dci: 'Paracétamol', type: 'Princeps', reimbursable: false, price: '18,40 MAD' },
];

const QUERY = 'doli';

export function OrdonnanceMockup({ revealed }: { revealed: boolean }) {
  const reduce = usePrefersReducedMotion();
  const typed = useTypewriter(QUERY, { startWhen: revealed && !reduce, charDelayMs: 90 });
  const query = reduce ? QUERY : typed;
  const done = query === QUERY;

  return (
    <div className="space-y-2 p-3 sm:p-4">
      <MLabel>Ordonnance · Ajouter un médicament</MLabel>
      <MPanel className="flex items-center gap-2 px-3 py-2.5 text-[12.5px]">
        <Search className="size-3.5 shrink-0 text-slate-400" />
        {query ? (
          <span>{query}</span>
        ) : (
          <span className="text-slate-400">Nom commercial ou DCI…</span>
        )}
        <Caret show={revealed && !done} />
      </MPanel>

      <MPanel
        className={`overflow-hidden transition-opacity duration-200 ${done ? 'opacity-100' : 'opacity-0'}`}
      >
        {MEDS.map((m, idx) => (
          <div
            key={`${m.name}-${m.form}`}
            className={`flex items-start gap-3 px-3 py-2 ${m.highlighted ? 'bg-sky-50' : ''} ${
              idx < MEDS.length - 1 ? 'border-b border-slate-100' : ''
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px]">
                <span className="font-medium">{m.name}</span>
                <span className="text-slate-500"> · {m.form}</span>
              </div>
              <div className="text-[11px] text-slate-500">{m.dci}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                <MChip className="uppercase tracking-wide text-[9.5px]">{m.type}</MChip>
                {m.reimbursable ? (
                  <MChip tone="success" className="uppercase tracking-wide text-[9.5px]">Remboursé</MChip>
                ) : null}
              </div>
            </div>
            <div className="shrink-0 text-[12.5px] font-medium tabular-nums">{m.price}</div>
          </div>
        ))}
      </MPanel>

      <div
        className={`rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-[11.5px] text-slate-600 transition-opacity duration-200 ${done ? 'opacity-100' : 'opacity-0'}`}
      >
        Posologie habituelle proposée : <span className="font-medium text-slate-900">1 cp 3 fois par jour · 5 jours</span>
      </div>
    </div>
  );
}
