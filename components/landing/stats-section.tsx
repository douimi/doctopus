'use client';

import { SectionFrame } from './section-frame';
import { StatsMockup } from './stats-mockup';
import { MockupFrame } from './mockup-frame';
import { SectionEyebrow } from './section-eyebrow';
import { Parallax } from './parallax';

export function StatsSection() {
  return (
    <SectionFrame id="section-stats">
      {(revealed) => (
        <>
          <SectionEyebrow revealed={revealed}>04 — Statistiques</SectionEyebrow>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.02em] leading-[1.05] text-foreground max-w-3xl text-center">
            Votre cabinet,{' '}
            <span className="bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
              en chiffres.
            </span>
          </h2>
          <p className="text-xl text-foreground/70 max-w-2xl mt-6 text-center">
            Recettes du jour, du mois, de l&apos;année. Méthodes de paiement, paiements en attente, top patients. Tout ce qu&apos;il faut pour piloter.
          </p>
          <Parallax className="w-full flex flex-col items-center">
            <MockupFrame>
              <StatsMockup revealed={revealed} />
            </MockupFrame>
          </Parallax>
        </>
      )}
    </SectionFrame>
  );
}
