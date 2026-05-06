'use client';

import { SectionFrame } from './section-frame';
import { StatsMockup } from './stats-mockup';
import { SectionEyebrow } from './section-eyebrow';
import { Parallax } from './parallax';

export function StatsSection() {
  return (
    <SectionFrame id="section-stats">
      {(revealed) => (
        <>
          <SectionEyebrow revealed={revealed}>04 — Statistiques</SectionEyebrow>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight max-w-3xl text-center">
            Votre cabinet,{' '}
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              en chiffres.
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mt-6 text-center">
            Recettes du jour, du mois, de l&apos;année. Méthodes de paiement, paiements en attente, top patients. Tout ce qu&apos;il faut pour piloter.
          </p>
          <Parallax className="w-full flex flex-col items-center">
            <StatsMockup revealed={revealed} />
          </Parallax>
        </>
      )}
    </SectionFrame>
  );
}
