import { Clock, Stethoscope, Wallet } from 'lucide-react';
import { MAvatar, MButton, MChip, MLabel, MPanel } from './mockup-ui';

/**
 * Hero mockup: the /today board (salle d'attente, en consultation,
 * à encaisser). Static: no animation, so it never delays LCP or shifts
 * layout. Labels match the app ("Salle d'attente", "Commencer",
 * "Encaisser", "En consultation").
 */
const KPIS = [
  { label: 'Programmés', value: '8' },
  { label: 'En attente', value: '2', tone: 'text-amber-800' },
  { label: 'En consultation', value: '1', tone: 'text-sky-800' },
  { label: 'Terminés', value: '4' },
];

const WAITING = [
  { initials: 'AK', name: 'ALAMI Karim', meta: 'RDV 10:30', wait: '12 min' },
  { initials: 'TS', name: 'TAZI Salma', meta: 'sans RDV', wait: '4 min' },
];

const TO_COLLECT = [
  { initials: 'BY', name: 'BERRADA Yasmine', meta: 'il y a 2 min', amount: '250,00 MAD' },
  { initials: 'IO', name: 'IDRISSI Omar', meta: 'ce matin', amount: '300,00 MAD' },
];

export function TodayMockup() {
  return (
    <div className="p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-tight">Aujourd&apos;hui</div>
          <div className="text-[11.5px] text-slate-500">Cabinet Dr Benjelloun · Casablanca</div>
        </div>
        <div className="flex gap-1.5">
          <MButton variant="outline" className="hidden sm:inline-flex">+ Rendez-vous</MButton>
          <MButton>+ Salle d&apos;attente</MButton>
        </div>
      </div>

      <MPanel className="grid grid-cols-2 sm:grid-cols-4 divide-slate-200 sm:divide-x">
        {KPIS.map((k, i) => (
          <div
            key={k.label}
            className={`px-3 py-2 ${i < 2 ? 'border-b border-slate-200 sm:border-b-0' : ''} ${i % 2 === 0 ? 'border-r border-slate-200 sm:border-r-0' : ''}`}
          >
            <MLabel>{k.label}</MLabel>
            <div className={`text-lg font-semibold tabular-nums leading-tight ${k.tone ?? ''}`}>
              {k.value}
            </div>
          </div>
        ))}
      </MPanel>

      <div className="grid gap-3 sm:grid-cols-2">
        <MPanel>
          <div className="flex items-center gap-1.5 border-b border-slate-200 px-3 py-2 text-[12.5px] font-semibold">
            <Clock className="size-3.5 text-slate-400" />
            Salle d&apos;attente
            <span className="ml-auto text-[11px] font-medium text-slate-500 tabular-nums">2</span>
          </div>
          <div className="flex items-center gap-2 border-b border-slate-100 bg-sky-50/60 px-3 py-2">
            <Stethoscope className="size-3.5 shrink-0 text-sky-700" />
            <div className="min-w-0 flex-1 truncate text-[12px]">
              <span className="font-medium">BENALI Fatima</span>
              <span className="text-slate-500"> · en cours</span>
            </div>
            <MChip tone="info">Ouvrir</MChip>
          </div>
          {WAITING.map((p, i) => (
            <div
              key={p.name}
              className={`flex items-center gap-2 px-3 py-2 ${i < WAITING.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <MAvatar initials={p.initials} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-medium">{p.name}</div>
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500">
                  <MChip tone="warning" className="px-1 py-0 tabular-nums">{p.wait}</MChip>
                  <span className="truncate">{p.meta}</span>
                </div>
              </div>
              <MButton>Commencer</MButton>
            </div>
          ))}
        </MPanel>

        <MPanel>
          <div className="flex items-center gap-1.5 border-b border-slate-200 px-3 py-2 text-[12.5px] font-semibold">
            <Wallet className="size-3.5 text-slate-400" />
            À encaisser
            <span className="ml-auto text-[11px] font-medium text-slate-500 tabular-nums">550,00 MAD</span>
          </div>
          {TO_COLLECT.map((p, i) => (
            <div
              key={p.name}
              className={`flex items-center gap-2 px-3 py-2 ${i < TO_COLLECT.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <MAvatar initials={p.initials} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-medium">{p.name}</div>
                <div className="truncate text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-800 tabular-nums">{p.amount}</span> · {p.meta}
                </div>
              </div>
              <MButton variant="outline">Encaisser</MButton>
            </div>
          ))}
          <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
            Encaissés aujourd&apos;hui · <span className="font-medium text-emerald-800 tabular-nums">1 200,00 MAD</span>
          </div>
        </MPanel>
      </div>
    </div>
  );
}
