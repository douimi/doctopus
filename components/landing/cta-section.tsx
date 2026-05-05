import Link from 'next/link';

const MAILTO = 'mailto:douimiotmane@gmail.com?subject=Doctopus%20%E2%80%94%20demande%20d%27acc%C3%A8s';

export function CTASection() {
  return (
    <section
      className="px-8 py-32 flex flex-col items-center justify-center text-center relative min-h-[70vh]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at center, rgba(129,140,248,0.15) 0%, transparent 60%)',
      }}
    >
      <h2 className="text-5xl md:text-7xl font-semibold tracking-tight leading-tight max-w-3xl">
        Prêt à essayer{' '}
        <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
          Doctopus
        </span>
        ?
      </h2>
      <p className="text-xl text-white/70 max-w-xl mt-6">
        Sur invitation uniquement pendant la phase pilote. Contactez-nous pour évaluer si Doctopus convient à votre cabinet.
      </p>
      <div className="flex gap-3 mt-10">
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
    </section>
  );
}
