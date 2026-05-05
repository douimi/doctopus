'use client';

import { SectionFrame } from './section-frame';
import { OrdonnanceMockup } from './ordonnance-mockup';
import { SectionEyebrow } from './section-eyebrow';
import { Parallax } from './parallax';

export function OrdonnanceSection() {
  return (
    <SectionFrame>
      {(revealed) => (
        <>
          <SectionEyebrow revealed={revealed}>02 — Ordonnance intelligente</SectionEyebrow>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight max-w-3xl text-center">
            Une base à jour.{' '}
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              Avec prix et remboursement.
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mt-6 text-center">
            Recherche en temps réel sur une base de médicaments tenue à jour. PPM, base de remboursement et statut Princeps/Générique s&apos;affichent directement ; l&apos;autocomplétion mémorise vos posologies habituelles.
          </p>
          <Parallax className="w-full flex flex-col items-center">
            <OrdonnanceMockup revealed={revealed} />
          </Parallax>
        </>
      )}
    </SectionFrame>
  );
}
