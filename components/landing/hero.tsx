'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Magnetic } from './magnetic';
import { FREE_TRIAL_MONTHS, WHATSAPP_NUMBER_DISPLAY, WHATSAPP_URL } from './contact';
import { WhatsAppIcon } from './whatsapp-icon';

export function Hero() {
  return (
    <section className="min-h-[88vh] px-6 md:px-8 pt-16 md:pt-24 pb-24 flex flex-col items-center justify-center text-center relative overflow-hidden">
      {/* Single soft gradient wash anchored below the headline. Replaces
          the previous three drifting orbs — same warmth, no animated
          noise behind the type. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/4 w-[80rem] h-[44rem] rounded-full opacity-60 blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(56,189,248,0.22) 0%, rgba(129,140,248,0.10) 38%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-4xl">
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-white/[0.06] border border-white/10 text-white/80 text-[12px] font-medium mb-7 animate-in fade-in-0 slide-in-from-bottom-2 duration-700 hover:bg-white/[0.10] hover:border-white/20 hover:text-white transition-colors"
        >
          <Sparkles className="size-3 text-emerald-400" aria-hidden />
          <span>Offre lancement · {FREE_TRIAL_MONTHS} mois gratuits</span>
        </a>
        <h1 className="text-[2.75rem] sm:text-6xl md:text-7xl lg:text-[5.5rem] font-semibold tracking-tight leading-[1.04] animate-in fade-in-0 slide-in-from-bottom-3 duration-700 [animation-delay:100ms] [animation-fill-mode:both]">
          Le cabinet,{' '}
          <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            repensé.
          </span>
        </h1>
        <p className="text-base md:text-lg text-white/65 max-w-xl mt-6 leading-relaxed animate-in fade-in-0 slide-in-from-bottom-3 duration-700 [animation-delay:200ms] [animation-fill-mode:both]">
          Consultations, ordonnances, paiements et statistiques — réunis dans une
          interface conçue pour les médecins du Maroc.
        </p>
        <div className="flex flex-wrap gap-2.5 justify-center mt-9 animate-in fade-in-0 slide-in-from-bottom-3 duration-700 [animation-delay:300ms] [animation-fill-mode:both]">
          <Magnetic>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_16px_40px_-18px_rgba(16,185,129,0.6)] transition-all"
            >
              <WhatsAppIcon className="size-4" />
              Essayer {FREE_TRIAL_MONTHS} mois gratuits
            </a>
          </Magnetic>
          <Magnetic>
            <Link
              href="/sign-in"
              className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-medium text-white/85 border border-white/15 hover:bg-white/5 hover:border-white/30 hover:text-white transition-colors"
            >
              Se connecter
            </Link>
          </Magnetic>
        </div>
        <p className="text-xs text-white/40 mt-5 tabular-nums animate-in fade-in-0 duration-700 [animation-delay:400ms] [animation-fill-mode:both]">
          Sur WhatsApp · {WHATSAPP_NUMBER_DISPLAY}
        </p>
      </div>

      {/* Subtle bottom fade so the section transitions into the next
          one without a visible seam. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-black pointer-events-none"
      />
    </section>
  );
}
