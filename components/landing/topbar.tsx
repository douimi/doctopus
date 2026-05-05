import Link from 'next/link';
import { BrandLockup } from '@/components/ui/brand';

const MAILTO = 'mailto:douimiotmane@gmail.com?subject=Doctopus%20%E2%80%94%20demande%20d%27acc%C3%A8s';

export function Topbar() {
  return (
    <div className="sticky top-0 z-50 bg-black/85 backdrop-blur-md border-b border-white/5">
      <div className="max-w-[1200px] mx-auto px-8 py-2 flex items-center justify-between">
        <Link href="/" aria-label="Accueil" className="flex items-center">
          <BrandLockup size={128} />
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={MAILTO}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white border border-white/20 hover:bg-white/5 transition-colors"
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
