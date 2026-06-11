'use client';

import { SectionFrame } from './section-frame';
import { ConsultationMockup } from './consultation-mockup';
import { MockupFrame } from './mockup-frame';
import { SectionEyebrow } from './section-eyebrow';
import { Parallax } from './parallax';

export function ConsultationSection() {
  return (
    <SectionFrame id="section-consultation">
      {(revealed) => (
        <>
          <SectionEyebrow revealed={revealed}>01 — Consultation</SectionEyebrow>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight max-w-3xl text-center">
            Une consultation complète.{' '}
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              Sans paperasse.
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mt-6 text-center">
            Motif, antécédents, examen, diagnostic, suivi, ordonnance — tout dans une seule fenêtre. L&apos;autosave veille pour vous.
          </p>
          <Parallax className="w-full flex flex-col items-center">
            <MockupFrame>
              <ConsultationMockup revealed={revealed} />
            </MockupFrame>
          </Parallax>
        </>
      )}
    </SectionFrame>
  );
}
