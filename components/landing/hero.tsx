'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Magnetic } from './magnetic';
import { FREE_TRIAL_MONTHS, WHATSAPP_NUMBER_DISPLAY, WHATSAPP_URL } from './contact';
import { WhatsAppIcon } from './whatsapp-icon';

export function Hero() {
  return (
    <section className="relative px-6 md:px-8 pt-20 md:pt-28 pb-28 md:pb-40 overflow-hidden">
      <div className="relative z-10 max-w-[1100px] mx-auto flex flex-col items-center text-center">
        {/* Eyebrow */}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-white/70 backdrop-blur-sm border border-foreground/10 text-foreground/80 text-[12px] font-medium mb-7 shadow-[0_1px_2px_rgb(0_0_0/0.04)] animate-in fade-in-0 slide-in-from-bottom-2 duration-700 hover:bg-white hover:border-foreground/20 hover:text-foreground transition-colors"
        >
          <Sparkles className="size-3 text-emerald-600" aria-hidden />
          <span>
            Offre lancement &middot; {FREE_TRIAL_MONTHS} mois gratuits
          </span>
          <ArrowRight className="size-3 text-foreground/40" aria-hidden />
        </a>

        {/* Headline */}
        <h1 className="text-[2.5rem] sm:text-6xl md:text-7xl lg:text-[5.5rem] font-semibold tracking-[-0.025em] leading-[1.02] text-foreground max-w-4xl animate-in fade-in-0 slide-in-from-bottom-3 duration-700 [animation-delay:100ms] [animation-fill-mode:both]">
          Le cabinet m&eacute;dical,{' '}
          <span className="bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
            simplifi&eacute;.
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-lg md:text-xl text-foreground/65 max-w-2xl mt-6 leading-relaxed animate-in fade-in-0 slide-in-from-bottom-3 duration-700 [animation-delay:200ms] [animation-fill-mode:both]">
          Consultations, ordonnances, paiements et statistiques &mdash; r&eacute;unis
          dans une interface con&ccedil;ue pour les m&eacute;decins du Maroc.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-2.5 justify-center mt-9 animate-in fade-in-0 slide-in-from-bottom-3 duration-700 [animation-delay:300ms] [animation-fill-mode:both]">
          <Magnetic>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium bg-foreground text-background hover:bg-foreground/90 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)] transition-all"
            >
              <WhatsAppIcon className="size-4" />
              Essayer {FREE_TRIAL_MONTHS} mois gratuits
              <ArrowRight className="size-4" aria-hidden />
            </a>
          </Magnetic>
          <Magnetic>
            <Link
              href="/sign-in"
              className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-medium text-foreground/80 bg-white/60 backdrop-blur-sm border border-foreground/15 hover:bg-white hover:border-foreground/25 hover:text-foreground transition-colors"
            >
              Se connecter
            </Link>
          </Magnetic>
        </div>

        {/* Trust line */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-7 text-xs text-foreground/55 animate-in fade-in-0 duration-700 [animation-delay:400ms] [animation-fill-mode:both]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden />
            Conforme RGPD-MA
          </span>
          <span aria-hidden className="text-foreground/20">
            &middot;
          </span>
          <span>Conçu au Maroc</span>
          <span aria-hidden className="text-foreground/20">
            &middot;
          </span>
          <span className="tabular-nums">WhatsApp · {WHATSAPP_NUMBER_DISPLAY}</span>
        </div>
      </div>
    </section>
  );
}
