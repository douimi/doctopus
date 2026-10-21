import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SUPPORT_EMAIL, SUPPORT_MAILTO, WHATSAPP_NUMBER_DISPLAY, WHATSAPP_URL } from './contact';
import { LandingLogo } from './logo';
import { container, focusRing } from './styles';

const linkClass = cn('rounded-sm text-slate-600 transition-colors hover:text-slate-900', focusRing);

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className={cn(container, 'grid gap-8 py-10 sm:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]')}>
        <div className="min-w-0">
          <LandingLogo size={56} />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-600">
            Logiciel de cabinet médical conçu pour les médecins au Maroc.
          </p>
        </div>
        <nav aria-labelledby="footer-produit">
          <h2 id="footer-produit" className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Produit
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="#fonctionnalites" className={linkClass}>Fonctionnalités</a></li>
            <li><a href="#offre" className={linkClass}>Offre de lancement</a></li>
            <li><a href="#faq" className={linkClass}>Questions fréquentes</a></li>
            <li><Link href="/static/sous-traitants" className={linkClass}>Sous-traitants (IA)</Link></li>
            <li><Link href="/sign-in" className={linkClass}>Se connecter</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">Contact</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={cn(linkClass, 'tabular-nums')}>
                WhatsApp · {WHATSAPP_NUMBER_DISPLAY}
                <span className="sr-only"> (ouvre WhatsApp dans un nouvel onglet)</span>
              </a>
            </li>
            <li>
              <a href={SUPPORT_MAILTO} className={cn(linkClass, 'break-all')}>
                {SUPPORT_EMAIL}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <p className={cn(container, 'py-5 text-sm text-slate-600')}>© {new Date().getFullYear()} Doctopus</p>
      </div>
    </footer>
  );
}
