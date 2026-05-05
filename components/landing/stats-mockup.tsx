'use client';

import { useCountUp } from './animations';

const fmtMad = (v: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) +
  ' MAD';
const fmtInt = (v: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v));

const BAR_HEIGHTS = [30, 55, 45, 80, 65, 90, 70];

export function StatsMockup({ revealed }: { revealed: boolean }) {
  const recettes = useCountUp(42350, { startWhen: revealed, durationMs: 1200, startDelayMs: 0 });
  const consultations = useCountUp(142, { startWhen: revealed, durationMs: 1200, startDelayMs: 120 });
  const prixMoyen = useCountUp(309.12, { startWhen: revealed, durationMs: 1200, startDelayMs: 240 });
  const enAttente = useCountUp(5, { startWhen: revealed, durationMs: 1200, startDelayMs: 360 });

  return (
    <div className="mt-16 max-w-[900px] w-full bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] border border-white/10 rounded-2xl p-2 shadow-2xl">
      <div className="flex gap-1.5 px-3.5 py-2.5">
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="w-3 h-3 rounded-full bg-white/10" />
      </div>
      <div className="bg-[#f5f5f5] text-slate-900 rounded-xl p-6">
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Tile tone="success" label="Recettes" value={fmtMad(recettes)} hint="137 consultations" />
          <Tile tone="primary" label="Consultations" value={fmtInt(consultations)} hint="137 payés · 5 en attente" />
          <Tile tone="admin" label="Prix moyen" value={fmtMad(prixMoyen)} hint="MAD/consultation" />
          <Tile tone="warning" label="En attente" value={fmtInt(enAttente)} hint="1 250,00 MAD à encaisser" />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 h-36 flex items-end gap-2">
          {BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-sky-500 to-sky-400 rounded-t-md transition-all duration-700 ease-out"
              style={{
                height: revealed ? `${h}%` : '0%',
                transitionDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Tile({
  tone,
  label,
  value,
  hint,
}: {
  tone: 'success' | 'primary' | 'admin' | 'warning';
  label: string;
  value: string;
  hint: string;
}) {
  const toneClasses: Record<typeof tone, { wrap: string; icon: string }> = {
    success: { wrap: 'bg-green-100', icon: 'text-green-700' },
    primary: { wrap: 'bg-blue-100', icon: 'text-blue-700' },
    admin: { wrap: 'bg-orange-100', icon: 'text-orange-700' },
    warning: { wrap: 'bg-amber-100', icon: 'text-amber-700' },
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${toneClasses[tone].wrap}`}>
        <span className={`text-base ${toneClasses[tone].icon}`}>●</span>
      </div>
      <div className="text-[11px] uppercase text-slate-400 tracking-wide font-medium">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>
    </div>
  );
}
