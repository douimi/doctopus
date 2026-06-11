'use client';

import { SectionFrame } from './section-frame';
import { AIMockup } from './ai-mockup';
import { MockupFrame } from './mockup-frame';
import { SectionEyebrow } from './section-eyebrow';
import { Parallax } from './parallax';

export function AISection() {
  return (
    <SectionFrame id="section-ai">
      {(revealed) => (
        <>
          <SectionEyebrow revealed={revealed}>05 — Assistant clinique IA</SectionEyebrow>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight max-w-3xl text-center">
            Un coup de main,{' '}
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              quand vous en avez besoin.
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mt-6 text-center">
            Posez une question — l&apos;assistant connaît le motif, les allergies, les antécédents du patient. Sans jamais transmettre son identité.
          </p>
          <Parallax className="w-full flex flex-col items-center">
            <MockupFrame size="narrow">
              <AIMockup revealed={revealed} />
            </MockupFrame>
          </Parallax>
          <p className="text-sm text-white/50 mt-6 text-center max-w-2xl">
            Modèle propriétaire entraîné sur du contexte et des données du Maroc — terminologie clinique, pratiques locales, AMO/RAMED. Données patient anonymisées avant transmission.
          </p>
        </>
      )}
    </SectionFrame>
  );
}
