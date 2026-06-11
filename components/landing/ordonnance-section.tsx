'use client';

import { SectionFrame } from './section-frame';
import { OrdonnanceMockup } from './ordonnance-mockup';
import { MockupFrame } from './mockup-frame';
import { SectionEyebrow } from './section-eyebrow';
import { Parallax } from './parallax';

export function OrdonnanceSection() {
  return (
    <SectionFrame id="section-ordonnance">
      {(revealed) => (
        <>
          <SectionEyebrow revealed={revealed}>02 — Ordonnance intelligente</SectionEyebrow>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.02em] leading-[1.05] text-foreground max-w-3xl text-center">
            Une base à jour.{' '}
            <span className="bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
              Avec prix et remboursement.
            </span>
          </h2>
          <p className="text-xl text-foreground/70 max-w-2xl mt-6 text-center">
            Recherche en temps réel sur une base de médicaments tenue à jour. PPM, base de remboursement et statut Princeps/Générique s&apos;affichent directement ; l&apos;autocomplétion mémorise vos posologies habituelles.
          </p>
          <Parallax className="w-full flex flex-col items-center">
            <MockupFrame>
              <OrdonnanceMockup revealed={revealed} />
            </MockupFrame>
          </Parallax>
        </>
      )}
    </SectionFrame>
  );
}
