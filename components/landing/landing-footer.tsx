import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="px-8 py-8 border-t border-white/5 text-center text-sm text-white/40">
      © 2026 Doctopus ·{' '}
      <Link href="/static/sous-traitants" className="text-white/60 hover:text-white/80 transition-colors">
        Sous-traitants
      </Link>{' '}
      ·{' '}
      <a href="mailto:douimiotmane@gmail.com" className="text-white/60 hover:text-white/80 transition-colors">
        douimiotmane@gmail.com
      </a>
    </footer>
  );
}
