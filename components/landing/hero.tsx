'use client';

import Link from 'next/link';
import { Magnetic } from './magnetic';

const MAILTO = 'mailto:douimiotmane@gmail.com?subject=Doctopus%20%E2%80%94%20demande%20d%27acc%C3%A8s';

export function Hero() {
  return (
    <section className="min-h-screen px-8 py-32 flex flex-col items-center justify-center text-center relative overflow-hidden">
      {/* Drifting gradient orbs — pure CSS keyframes, no JS */}
      <div
        aria-hidden
        className="absolute top-[10%] left-[10%] w-[40rem] h-[40rem] rounded-full opacity-50 blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(56,189,248,0.30) 0%, transparent 65%)',
          animation: 'orb-drift-a 18s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden
        className="absolute bottom-[8%] right-[5%] w-[36rem] h-[36rem] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(129,140,248,0.28) 0%, transparent 65%)',
          animation: 'orb-drift-b 22s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden
        className="absolute top-[40%] right-[20%] w-[24rem] h-[24rem] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(34,211,238,0.18) 0%, transparent 65%)',
          animation: 'orb-drift-c 26s ease-in-out infinite',
        }}
      />

      {/* Inline keyframes so the section is self-contained */}
      <style>{`
        @keyframes orb-drift-a {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(60px, -40px, 0) scale(1.08); }
        }
        @keyframes orb-drift-b {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-50px, 50px, 0) scale(1.12); }
        }
        @keyframes orb-drift-c {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(40px, 30px, 0) scale(0.92); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="orb-drift"] { animation: none !important; }
        }
      `}</style>

      <div className="relative z-10 flex flex-col items-center">
        <div className="text-sky-400 text-[13px] uppercase tracking-[0.1em] font-semibold mb-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
          Logiciel de cabinet médical · Maroc
        </div>
        <h1 className="text-6xl md:text-8xl font-semibold tracking-tight leading-none max-w-4xl animate-in fade-in-0 slide-in-from-bottom-4 duration-700 [animation-delay:100ms] [animation-fill-mode:both]">
          Le cabinet,{' '}
          <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            repensé.
          </span>
        </h1>
        <p className="text-xl text-white/70 max-w-xl mt-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 [animation-delay:200ms] [animation-fill-mode:both]">
          Consultations, ordonnances, paiements et statistiques dans une interface conçue pour les médecins du Maroc.
        </p>
        <div className="flex gap-3 mt-10 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 [animation-delay:300ms] [animation-fill-mode:both]">
          <Magnetic>
            <Link
              href="/sign-in"
              className="inline-flex px-7 py-3.5 rounded-lg text-base font-medium bg-white text-black hover:bg-white/90 transition-colors"
            >
              Se connecter
            </Link>
          </Magnetic>
          <Magnetic>
            <a
              href={MAILTO}
              className="inline-flex px-7 py-3.5 rounded-lg text-base font-medium text-white border border-white/20 hover:bg-white/5 hover:border-white/40 transition-colors"
            >
              Demander un accès
            </a>
          </Magnetic>
        </div>
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 text-white/30 text-sm animate-bounce [animation-duration:2s] [animation-delay:600ms] [animation-fill-mode:both]">
          ↓ découvrir
        </div>
      </div>
    </section>
  );
}
