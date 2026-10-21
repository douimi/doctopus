'use client';

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { usePrefersReducedMotion, useCountUp } from './animations';
import { MLabel, MPanel } from './mockup-ui';

const fmtMad = (v: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) +
  ' MAD';
const fmtInt = (v: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v));

/*
 * Fake but internally consistent data: October (running, day 21) vs
 * September cut at the same day, like the app's like-for-like comparison.
 */
const CURRENT_DAY = 21;
const DAYS = 30;
// Cumulative revenue (kMAD) per day, September (full month) and October (to day 21).
const SEPT = Array.from({ length: DAYS }, (_, i) => Math.round((i + 1) * 1.6 * (1 + 0.04 * Math.sin(i)) * 10) / 10);
const OCT = Array.from({ length: CURRENT_DAY }, (_, i) => Math.round((i + 1) * 1.78 * (1 + 0.05 * Math.cos(i)) * 10) / 10);
const MONTHS = [
  { m: 'nov.', v: 31 }, { m: 'déc.', v: 28 }, { m: 'janv.', v: 33 }, { m: 'févr.', v: 30 },
  { m: 'mars', v: 35 }, { m: 'avr.', v: 34 }, { m: 'mai', v: 38 }, { m: 'juin', v: 36 },
  { m: 'juil.', v: 29 }, { m: 'août', v: 26 }, { m: 'sept.', v: 47 }, { m: 'oct.', v: 37 },
];

const W = 300;
const H = 110;
const MAX = 52;
const x = (day: number) => ((day - 1) / (DAYS - 1)) * W;
const y = (v: number) => H - (v / MAX) * H;
const path = (pts: number[]) => pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

export function StatsMockup({ revealed }: { revealed: boolean }) {
  const reduce = usePrefersReducedMotion();
  const run = revealed && !reduce;
  const recettes = useCountUp(37450, { startWhen: run, durationMs: 1100 });
  const consultations = useCountUp(121, { startWhen: run, durationMs: 1100, startDelayMs: 100 });
  const prixMoyen = useCountUp(309.5, { startWhen: run, durationMs: 1100, startDelayMs: 200 });
  const enAttente = useCountUp(5, { startWhen: run, durationMs: 1100, startDelayMs: 300 });
  const shown = reduce || revealed;

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[14px] font-semibold">Statistiques</div>
        <div className="ml-auto flex items-center gap-1 rounded-md border border-slate-200 bg-white p-0.5 text-[11px]">
          <span className="rounded px-2 py-0.5 bg-slate-900 text-white">Octobre 2026</span>
          <span className="px-1.5 text-slate-500">vs</span>
          <span className="rounded px-2 py-0.5 text-slate-700">Septembre</span>
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        Mois en cours : les écarts comparent du 1er au {CURRENT_DAY} de chaque mois.
      </p>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="Recettes" value={`${fmtInt(reduce ? 37450 : recettes)} MAD`} delta="+12 %" good />
        <Kpi label="Consultations" value={fmtInt(reduce ? 121 : consultations)} delta="+8 %" good />
        <Kpi label="Prix moyen" value={fmtMad(reduce ? 309.5 : prixMoyen)} delta="+4 %" good />
        <Kpi label="En attente" value={fmtInt(reduce ? 5 : enAttente)} delta="−29 %" good down />
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <MPanel className="p-3">
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <MLabel>Recettes cumulées</MLabel>
            <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-600">
              <span className="h-0.5 w-3 rounded bg-sky-700" /> oct.
            </span>
            <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-600">
              <span className="h-0 w-3 border-t border-dashed border-slate-400" /> sept.
            </span>
          </div>
          <svg viewBox={`0 0 ${W} ${H + 4}`} className="h-28 w-full overflow-visible" preserveAspectRatio="none">
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="rgb(226 232 240)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            <line x1={0} x2={W} y1={H} y2={H} stroke="rgb(203 213 225)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <path d={path(SEPT)} fill="none" stroke="rgb(148 163 184)" strokeWidth={1.5} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
            <path
              d={path(OCT)}
              fill="none"
              stroke="rgb(3 105 161)"
              strokeWidth={2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset={shown ? 0 : 1}
              className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000 motion-safe:ease-out"
            />
            <circle cx={x(CURRENT_DAY)} cy={y(OCT[CURRENT_DAY - 1])} r={3} fill="rgb(3 105 161)" opacity={shown ? 1 : 0} />
          </svg>
          <div className="relative mt-1 h-3 text-[10px] text-slate-500 tabular-nums">
            {[1, 10, CURRENT_DAY, DAYS].map((d) => (
              <span
                key={d}
                className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
                style={{ left: `${(x(d) / W) * 100}%` }}
              >
                {d}
              </span>
            ))}
          </div>
        </MPanel>

        <MPanel className="p-3">
          <MLabel className="mb-2">Évolution sur 12 mois</MLabel>
          <div className="flex h-28 items-end gap-[3px]">
            {MONTHS.map((mo, i) => (
              <div
                key={mo.m}
                className={`flex-1 rounded-t-[2px] motion-safe:transition-[height] motion-safe:duration-700 motion-safe:ease-out ${
                  i === MONTHS.length - 1 ? 'bg-sky-700' : i === MONTHS.length - 2 ? 'bg-sky-300' : 'bg-slate-200'
                }`}
                style={{ height: shown ? `${(mo.v / 50) * 100}%` : '4%', transitionDelay: `${i * 40}ms` }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-500">
            <span>nov.</span><span>oct.</span>
          </div>
        </MPanel>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  good,
  down,
}: {
  label: string;
  value: string;
  delta: string;
  good: boolean;
  down?: boolean;
}) {
  const Icon = down ? ArrowDownRight : ArrowUpRight;
  return (
    <MPanel className="min-w-0 px-3 py-2.5">
      <MLabel>{label}</MLabel>
      <div className="truncate text-[17px] font-semibold leading-tight tabular-nums">{value}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-1 text-[10.5px]">
        <span className={`inline-flex items-center font-medium tabular-nums ${good ? 'text-emerald-800' : 'text-red-800'}`}>
          <Icon className="size-3" />
          {delta}
        </span>
        <span className="text-slate-500">vs sept. (1–{CURRENT_DAY})</span>
      </div>
    </MPanel>
  );
}
