'use client';

import Link from 'next/link';
import { BrandLockup } from '@/components/ui/brand';
import { useIsScrolled } from './animations';
import { FREE_TRIAL_MONTHS, WHATSAPP_URL } from './contact';
import { WhatsAppIcon } from './whatsapp-icon';

export function Topbar() {
  const scrolled = useIsScrolled(80);
  const logoSize = scrolled ? 48 : 88;
  return (
    <div
      className={`sticky top-0 z-50 backdrop-blur-md transition-all duration-300 ease-out ${
        scrolled
          ? 'bg-white/75 border-b border-foreground/10 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.18)]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-2 flex items-center justify-between">
        <Link
          href="/"
          aria-label="Accueil"
          className="flex items-center transition-transform duration-300 ease-out"
        >
          <div
            className="transition-all duration-300 ease-out"
            style={{ width: logoSize, height: logoSize }}
          >
            <BrandLockup size={logoSize} />
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_8px_24px_-12px_rgba(16,185,129,0.6)] transition-all"
            aria-label={`Contacter sur WhatsApp pour ${FREE_TRIAL_MONTHS} mois gratuits`}
          >
            <WhatsAppIcon className="size-4" />
            <span>{FREE_TRIAL_MONTHS} mois gratuits</span>
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="sm:hidden inline-flex items-center justify-center size-9 rounded-lg bg-emerald-500 text-white"
            aria-label="WhatsApp"
          >
            <WhatsAppIcon className="size-4" />
          </a>
          <Link
            href="/sign-in"
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground/80 border border-foreground/15 hover:bg-white hover:border-foreground/25 hover:text-foreground transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
