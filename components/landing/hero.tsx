'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Magnetic } from './magnetic';
import { FREE_TRIAL_MONTHS, WHATSAPP_NUMBER_DISPLAY, WHATSAPP_URL } from './contact';
import { WhatsAppIcon } from './whatsapp-icon';

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
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[12px] font-medium mb-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 hover:bg-emerald-500/25 hover:border-emerald-400/50 hover:text-emerald-200 transition-colors"
        >
          <Sparkles className="size-3.5" aria-hidden />
          Offre lancement · {FREE_TRIAL_MONTHS} mois gratuits
        </a>
        <h1 className="text-6xl md:text-8xl font-semibold tracking-tight leading-none max-w-4xl animate-in fade-in-0 slide-in-from-bottom-4 duration-700 [animation-delay:100ms] [animation-fill-mode:both]">
          Le cabinet,{' '}
          <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            repensé.
          </span>
        </h1>
        <p className="text-xl text-white/70 max-w-xl mt-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 [animation-delay:200ms] [animation-fill-mode:both]">
          Consultations, ordonnances, paiements et statistiques dans une interface conçue pour les médecins du Maroc.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-10 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 [animation-delay:300ms] [animation-fill-mode:both]">
          <Magnetic>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-base font-medium bg-emerald-500 text-white hover:bg-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_18px_48px_-18px_rgba(16,185,129,0.7)] transition-all"
            >
              <WhatsAppIcon className="size-5" />
              Essayer {FREE_TRIAL_MONTHS} mois gratuits
            </a>
          </Magnetic>
          <Magnetic>
            <Link
              href="/sign-in"
              className="inline-flex px-7 py-3.5 rounded-lg text-base font-medium text-white border border-white/20 hover:bg-white/5 hover:border-white/40 transition-colors"
            >
              Se connecter
            </Link>
          </Magnetic>
        </div>
        <p className="text-small text-white/40 mt-4 tabular-nums animate-in fade-in-0 duration-700 [animation-delay:400ms] [animation-fill-mode:both]">
          Sur WhatsApp : {WHATSAPP_NUMBER_DISPLAY}
        </p>
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 text-white/30 text-sm animate-bounce [animation-duration:2s] [animation-delay:600ms] [animation-fill-mode:both]">
          ↓ découvrir
        </div>
      </div>
    </section>
  );
}
