'use client';

import Link from 'next/link';
import { BrandLockup } from '@/components/ui/brand';
import { useIsScrolled } from './animations';

const MAILTO = 'mailto:douimiotmane@gmail.com?subject=Doctopus%20%E2%80%94%20demande%20d%27acc%C3%A8s';

export function Topbar() {
  const scrolled = useIsScrolled(80);
  const logoSize = scrolled ? 56 : 128;
  return (
    <div
      className={`sticky top-0 z-50 backdrop-blur-md transition-all duration-300 ease-out ${
        scrolled
          ? 'bg-black/90 border-b border-white/10 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]'
          : 'bg-black/85 border-b border-white/5'
      }`}
    >
      <div
        className={`max-w-[1200px] mx-auto px-8 flex items-center justify-between transition-[padding] duration-300 ease-out ${
          scrolled ? 'py-2' : 'py-2'
        }`}
      >
        <Link
          href="/"
          aria-label="Accueil"
          className="flex items-center transition-transform duration-300 ease-out"
          style={{ transform: scrolled ? 'scale(1)' : 'scale(1)' }}
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
            href={MAILTO}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white border border-white/20 hover:bg-white/5 hover:border-white/40 transition-colors"
          >
            Demander un accès
          </a>
          <Link
            href="/sign-in"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
