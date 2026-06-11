'use client';

import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { StatsMockup } from './stats-mockup';

/**
 * Scroll-driven product showcase sitting between the Hero and the
 * first feature section. The card rises and rotates into place as the
 * user scrolls past the hero, then the StatsMockup inside animates its
 * count-up + bars on first paint (revealed=true from the start so the
 * data is settled by the time the bezel is in view).
 */
export function ShowcaseSection() {
  return (
    <section id="section-showcase" className="relative">
      <ContainerScroll
        innerClassName="bg-zinc-950 p-2 md:p-6"
        titleComponent={
          <>
            <p className="text-small font-medium text-white/50 uppercase tracking-[0.18em] mb-3">
              Vue d&apos;ensemble
            </p>
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight text-white">
              Tout votre cabinet.{' '}
              <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                Sur un seul écran.
              </span>
            </h2>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mt-4">
              Recettes, consultations, paiements en attente — en temps réel.
            </p>
          </>
        }
      >
        <div className="h-full w-full">
          {/* StatsMockup is now chrome-less (the device frame is provided
              by the surrounding ContainerScroll card) — we can drop the
              strip-hack wrappers and just render the body directly. */}
          <StatsMockup revealed />
        </div>
      </ContainerScroll>
    </section>
  );
}
