'use client';

import { SectionFrame } from './section-frame';
import { OrdonnanceMockup } from './ordonnance-mockup';

export function OrdonnanceSection() {
  return (
    <SectionFrame>
      {(revealed) => (
        <>
          <div className="text-sky-400 text-[13px] uppercase tracking-[0.1em] font-semibold mb-4">
            02 — Ordonnance intelligente
          </div>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight max-w-3xl text-center">
            3000+ médicaments du registre AMMPS.{' '}
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              Avec leur prix.
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mt-6 text-center">
            Recherche en temps réel dans le registre officiel marocain. Le PPV s&apos;affiche directement, l&apos;autocomplétion mémorise vos posologies habituelles.
          </p>
          <OrdonnanceMockup revealed={revealed} />
        </>
      )}
    </SectionFrame>
  );
}
