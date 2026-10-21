'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useIsScrolled } from './animations';
import { LandingLogo } from './logo';
import { WhatsAppLink } from './whatsapp-link';
import { container, focusRing } from './styles';

const NAV = [
  { href: '#fonctionnalites', label: 'Fonctionnalités' },
  { href: '#statistiques', label: 'Statistiques' },
  { href: '#offre', label: 'Offre' },
  { href: '#faq', label: 'Questions' },
];

/**
 * Fixed-height sticky header (no logo resize on scroll: that reflowed the
 * whole bar on every threshold crossing). Only the border/shadow appear
 * once the page is scrolled. No backdrop-blur: it is expensive on mobile
 * GPUs, a near-opaque white does the job.
 */
export function Topbar() {
  const scrolled = useIsScrolled(8);
  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b bg-white/95 transition-[border-color,box-shadow] duration-150',
        scrolled
          ? 'border-slate-200 shadow-[0_1px_2px_rgb(15_23_42/0.05)]'
          : 'border-transparent',
      )}
    >
      <div className={cn(container, 'flex h-16 items-center justify-between gap-3')}>
        <Link href="/" aria-label="Doctopus, accueil" className={cn('-ml-1 rounded-md', focusRing)}>
          <LandingLogo size={80} priority className="!size-16 sm:!size-20 sm:-my-2" />
        </Link>

        <nav aria-label="Sections" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900',
                    focusRing,
                  )}
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/sign-in"
            className={cn(
              'inline-flex h-10 items-center rounded-lg px-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:px-3',
              focusRing,
            )}
          >
            <span className="sm:hidden">Connexion</span>
            <span className="hidden sm:inline">Se connecter</span>
          </Link>
          <WhatsAppLink
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 sm:px-4',
              focusRing,
            )}
          >
            <span className="sm:hidden">Essai gratuit</span>
            <span className="hidden sm:inline">Essayer gratuitement</span>
          </WhatsAppLink>
        </div>
      </div>
    </header>
  );
}
