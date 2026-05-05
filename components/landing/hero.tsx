'use client';

import Link from 'next/link';

const MAILTO = 'mailto:douimiotmane@gmail.com?subject=Doctopus%20%E2%80%94%20demande%20d%27acc%C3%A8s';

export function Hero() {
  return (
    <section
      className="min-h-screen px-8 py-32 flex flex-col items-center justify-center text-center relative"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 30% 20%, rgba(56,189,248,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(129,140,248,0.10) 0%, transparent 50%)',
      }}
    >
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
        <Link
          href="/sign-in"
          className="px-7 py-3.5 rounded-lg text-base font-medium bg-white text-black hover:bg-white/90 transition-colors"
        >
          Se connecter
        </Link>
        <a
          href={MAILTO}
          className="px-7 py-3.5 rounded-lg text-base font-medium text-white border border-white/20 hover:bg-white/5 transition-colors"
        >
          Demander un accès
        </a>
      </div>
      <div className="absolute bottom-8 text-white/30 text-sm animate-bounce [animation-duration:2s] [animation-delay:600ms] [animation-fill-mode:both]">
        ↓ découvrir
      </div>
    </section>
  );
}
