/**
 * Landing-scoped class recipes. The landing uses the raw Tailwind slate /
 * sky / emerald palette (the same values the app tokens are derived from,
 * see "Quiet clinical") so it does not depend on app/globals.css tokens
 * that are being re-tuned concurrently.
 *
 * Contrast (WCAG 2.x, on white): slate-900 17.9:1 · slate-600 7.6:1 ·
 * sky-700 5.9:1 · white on emerald-700 5.5:1 · white on sky-700 5.9:1.
 */

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150 ' +
  focusRing;

/** WhatsApp / trial CTA. White on emerald-700 = 5.5:1. */
export const btnPrimary = `${btnBase} h-11 px-5 text-sm bg-emerald-700 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_1px_2px_rgb(15_23_42/0.12)] hover:bg-emerald-800`;

export const btnPrimaryLg = `${btnBase} h-12 px-6 text-base bg-emerald-700 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_1px_2px_rgb(15_23_42/0.12)] hover:bg-emerald-800`;

export const btnSecondary = `${btnBase} h-11 px-5 text-sm border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 hover:border-slate-400`;

export const btnSecondaryLg = `${btnBase} h-12 px-6 text-base border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 hover:border-slate-400`;

/** Section heading scale: one step under the hero h1. */
export const h2Class =
  'text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-[-0.02em] leading-[1.1] text-slate-900 text-balance';

export const leadClass = 'text-base sm:text-lg leading-relaxed text-slate-600 text-pretty';

/** Max content width + phone gutter (16px) shared by every section. */
export const container = 'mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8';
