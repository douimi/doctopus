'use client';

import { Database, FileSpreadsheet, Sparkles } from 'lucide-react';
import { SectionFrame } from './section-frame';
import { SectionEyebrow } from './section-eyebrow';

const STEPS = [
  {
    icon: FileSpreadsheet,
    title: 'Vous nous envoyez votre fichier',
    body:
      'Excel, CSV, export depuis votre ancien logiciel — peu importe le format, on s’en charge.',
  },
  {
    icon: Sparkles,
    title: 'Nous mappons et vérifions',
    body:
      'Notre équipe nettoie, normalise et valide chaque fiche avec vous avant l’import.',
  },
  {
    icon: Database,
    title: 'Vous démarrez le jour même',
    body:
      'Vos patients, leur historique, leurs allergies — tout est en place dès la première consultation.',
  },
] as const;

export function MigrationSection() {
  return (
    <SectionFrame id="section-migration">
      {(revealed) => (
        <>
          <SectionEyebrow revealed={revealed}>06 — Reprise de données</SectionEyebrow>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight max-w-3xl text-center">
            Migration depuis votre ancien système.{' '}
            <span className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-transparent">
              On s’en occupe.
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mt-6 text-center">
            Rapide, sans accroc, et entièrement gérée par notre équipe. Vous
            continuez à voir vos patients pendant qu’on transfère leur historique.
          </p>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[1000px] w-full">
            {STEPS.map((s, idx) => (
              <div
                key={s.title}
                className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 text-left transition-all duration-700 ease-out"
                style={{
                  opacity: revealed ? 1 : 0,
                  transform: revealed ? 'translateY(0)' : 'translateY(16px)',
                  transitionDelay: `${idx * 120}ms`,
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    aria-hidden
                    className="flex items-center justify-center size-9 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
                  >
                    <s.icon className="size-4" aria-hidden />
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-white/50 font-semibold tabular-nums">
                    Étape {idx + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-small text-white/60 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </SectionFrame>
  );
}
