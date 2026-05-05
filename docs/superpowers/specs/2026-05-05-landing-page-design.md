# Doctopus landing page (storytelling premium)

> **Why now**: post-launch credibility surface. The current `app/page.tsx` is a 5-line redirect to `/today` (which itself bounces unauthenticated visitors to `/sign-in`). A curious doctor who hears about Doctopus by word-of-mouth lands on the sign-in page with zero context. This spec replaces the redirect with a proper landing page that sells the product without taking itself too seriously.

**Goal**: A dark, Apple-style storytelling landing page that walks the visitor through Doctopus's main features one full-screen scroll at a time, with cinematic reveals on the consultation editor and AI assistant sections that demonstrate real product behavior in motion. Existing users get an obvious "Se connecter" CTA; curious doctors get a clear "Demander un accès" path via mailto.

**Architecture**: Server-rendered top-level page (`app/page.tsx`) composes a series of self-contained section components from `components/landing/`. Animation logic lives in three small custom hooks — `useReveal` (IntersectionObserver-based scroll reveal), `useTypewriter` (character-by-character text animation), `useCountUp` (numeric ramp animation). Each section that needs animation is a `'use client'` island; the page shell, footer, and static sections (Pricing, CTA) stay server components. No new dependency — `tw-animate-css` (already in `package.json`) supplies utility animation classes; `IntersectionObserver` is the native browser API.

**Tech Stack**: Next.js 16 App Router (server + client islands), Tailwind v4 (with `tw-animate-css`), `lucide-react` for icons, the existing `BrandLockup` for the wordmark + mark, `formatMad` from `lib/medications/format.ts` for currency display in the mockups. **No new dependency. No schema change. No API change. No DB query.**

**Prerequisites**: prescription autocomplete spec (commit `0cc531a` and downstream).

---

## What this spec does NOT do

- **No marketing copy beyond the headlines and section taglines defined here.** Body paragraphs are short and embedded in this spec; no separate marketing brief.
- **No screenshots or videos.** The mockups are styled JSX (Tailwind-only) — they replicate the actual app UI, not import images.
- **No `/contact` form.** "Demander un accès" is a `mailto:douimiotmane@gmail.com` link. A dedicated form is a future spec when volume warrants it.
- **No translation infrastructure.** Page is French-only (matching the rest of the app).
- **No analytics, no tracking pixel, no cookie banner.** Out of scope; address before scaling distribution.
- **No SEO optimization beyond `<title>` and `<meta name="description">`.** No structured data, no Open Graph image, no sitemap.
- **No A/B testing or variants.** One landing page; iterate post-launch based on observed behavior.
- **No mobile-first reimagining of the layout.** The page is responsive (the existing Tailwind tokens handle small screens) but the design target is desktop. Mobile is a graceful degradation, not a separate composition.
- **No animation library.** No Framer Motion, no GSAP, no Lottie. Pure CSS + native IntersectionObserver + small hand-rolled hooks.
- **No reduced-motion respect via custom JS.** The page CSS uses `@media (prefers-reduced-motion: reduce)` to disable transitions, but the typewriter and count-up hooks do not branch on this — they just complete instantly when reduced motion is preferred (acceptable for v1; revisit if it confuses real users).
- **No back-end changes whatsoever.** Page is fully static; no server actions; no DB queries.

---

## File structure

**Created**

```
app/
  page.tsx                                   # MODIFIED — was 5-line redirect; becomes the landing page composition

components/
  landing/
    topbar.tsx                               # logo + 2 CTAs at top, sticky with backdrop-blur
    hero.tsx                                 # 'use client' — first full-screen section, fade-up on mount
    section-frame.tsx                        # 'use client' — generic full-screen section with reveal-on-scroll
    consultation-section.tsx                 # composes section-frame + ConsultationMockup (cinematic)
    consultation-mockup.tsx                  # 'use client' — patient card + 2 typewriter fields + Enregistré pulse
    ordonnance-section.tsx                   # composes section-frame + OrdonnanceMockup (cinematic)
    ordonnance-mockup.tsx                    # 'use client' — search input typewriter + dropdown reveal + highlight pulse
    pricing-section.tsx                      # static mockup of finalize dialog + payments panel side-by-side
    stats-section.tsx                        # composes section-frame + StatsMockup (count-up)
    stats-mockup.tsx                         # 'use client' — 4 KPI tiles with count-up + bar chart that grows
    ai-section.tsx                           # composes section-frame + AIMockup (cinematic)
    ai-mockup.tsx                            # 'use client' — chat with typewriter response
    cta-section.tsx                          # server — final closing pitch + 2 CTAs
    landing-footer.tsx                       # server — copyright + sous-traitants link + contact email
    animations.tsx                           # 'use client' — exports useReveal, useTypewriter, useCountUp hooks
```

**Modified**

```
app/page.tsx                                 # 5-line redirect → composition of <Topbar> + 7 sections + <Footer>
```

**Untouched**

- `app/(authenticated)/**` — every authenticated page. Sign-in flow unchanged.
- `app/(public)/sign-in/**`, `app/(public)/invite/**` — unchanged.
- `components/ui/**` — primitives unchanged.
- `lib/**` — no business logic touched.
- `db/**`, `supabase/migrations/**` — no schema change.
- `package.json` — no new dependency.

---

## Page composition — `app/page.tsx`

```tsx
import type { Metadata } from 'next';
import { Topbar } from '@/components/landing/topbar';
import { Hero } from '@/components/landing/hero';
import { ConsultationSection } from '@/components/landing/consultation-section';
import { OrdonnanceSection } from '@/components/landing/ordonnance-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { StatsSection } from '@/components/landing/stats-section';
import { AISection } from '@/components/landing/ai-section';
import { CTASection } from '@/components/landing/cta-section';
import { LandingFooter } from '@/components/landing/landing-footer';

export const metadata: Metadata = {
  title: 'Doctopus — Logiciel de cabinet médical pour le Maroc',
  description:
    'Consultations, ordonnances, paiements et statistiques dans une seule interface conçue pour les médecins du Maroc. Sur invitation pendant la phase pilote.',
};

export default function HomePage() {
  return (
    <div className="bg-black text-white selection:bg-sky-500/30">
      <Topbar />
      <Hero />
      <ConsultationSection />
      <OrdonnanceSection />
      <PricingSection />
      <StatsSection />
      <AISection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
```

The `<html lang="fr">` is already set in the root `app/layout.tsx`, so the page inherits French. The `bg-black` here overrides the default body background for the entire homepage tree.

**Note**: this REPLACES the existing `redirect('/today')`. Existing users hitting `/` see the landing page; they click "Se connecter" to reach `/sign-in`. The middleware at `/today` continues to redirect unauthenticated requests as today.

---

## Section-by-section spec

### Topbar (sticky, all pages)

`components/landing/topbar.tsx` — server component.

- Sticky position, `bg-black/85` with `backdrop-blur-md`, bottom border `border-white/5`.
- Left: `<BrandLockup size={28} />` + the word "Doctopus" in `font-semibold`.
- Right: two buttons — "Demander un accès" (ghost, white border) and "Se connecter" (white bg, black text).
- "Demander un accès" → `mailto:douimiotmane@gmail.com?subject=Doctopus — demande d'accès` — anchor element styled as a button.
- "Se connecter" → `<Link href="/sign-in">`.

### Section 1 — Hero (`components/landing/hero.tsx`, `'use client'`)

Full-screen, centered content.

- Background: `bg-black` with two radial gradients via inline `style` (Tailwind v4 doesn't have radial-gradient utilities by default):
  - `radial-gradient(ellipse at 30% 20%, rgba(56,189,248,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(129,140,248,0.10) 0%, transparent 50%)`.
- Content (centered):
  - **Eyebrow**: `Logiciel de cabinet médical · Maroc` (`text-sky-400`, uppercase, tracking-wide, ~13px).
  - **Headline**: `Le cabinet, repensé.` — `text-6xl md:text-8xl font-semibold tracking-tight`. The word "repensé." renders with `bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent`.
  - **Lead paragraph**: `Doctopus rassemble consultations, ordonnances, paiements et statistiques dans une interface conçue pour les médecins du Maroc.` — `text-xl text-white/70 max-w-xl mt-6`.
  - **CTAs**: same two buttons as topbar but bigger (`px-7 py-3.5 text-base`), `mt-10`.
  - **Scroll hint**: `↓ découvrir` at bottom, `text-white/30 text-sm`, with a gentle bob animation (`animate-bounce` from tw-animate-css, slowed via `[animation-duration:2s]`).
- **Animation on mount**: stagger fade-up. Eyebrow first (delay 0), headline (delay 100ms), lead (delay 200ms), CTAs (delay 300ms), scroll hint (delay 600ms). Implemented via `tw-animate-css` `animate-in fade-in-0 slide-in-from-bottom-4` with per-element `[animation-delay:...]` arbitrary values. No JS required for this — pure CSS animation on mount.

### Section 2 — Consultation (cinematic)

`components/landing/consultation-section.tsx` (server) wraps `consultation-mockup.tsx` (`'use client'`) inside `<SectionFrame>`.

- Eyebrow: `01 — Consultation`.
- Headline: `Une consultation complète.` `Sans paperasse.` (the second sentence in gradient).
- Lead: `Motif, antécédents, examen, diagnostic, suivi, ordonnance — tout dans une seule fenêtre. L'autosave veille pour vous.`.
- Mockup: `<ConsultationMockup>` showing:
  - Patient header card: avatar `BY` (sky-500 bg), name `Berrada Yasmine`, meta `F · 34 ans · CIN BK123456`, and a status badge `Brouillon` → `● Enregistré` (green) that pulses once after the typing finishes.
  - Two "field" rows: `Motif` and `Diagnostic`.
- **Cinematic animation** (triggered when section enters viewport, via `useReveal`):
  1. Patient card fades in.
  2. Motif field types `Toux persistante depuis 5 jours` at ~30ms/character (~155 chars total, ~4.5s).
  3. Diagnostic field types `Bronchite aiguë, probable origine virale` at ~30ms/character (~40 chars, ~1.2s).
  4. The "Brouillon" badge swaps to "● Enregistré" with a green pulse (1 cycle of `animate-pulse` for ~1s).
- The mockup's typing only fires ONCE per page visit (uses a `useState` flag). If the user scrolls back up, the field stays populated.

### Section 3 — Ordonnance & PPV (cinematic)

`components/landing/ordonnance-section.tsx` (server) + `ordonnance-mockup.tsx` (`'use client'`).

- Eyebrow: `02 — Ordonnance intelligente`.
- Headline: `3000+ médicaments du registre AMMPS.` `Avec leur prix.` (gradient).
- Lead: `Recherche en temps réel dans le registre officiel marocain. Le PPV s'affiche directement, l'autocomplétion mémorise vos posologies habituelles.`.
- Mockup:
  - Search input (mock, not interactive).
  - Dropdown with 4 medication rows. Each row: bold med name + DCI + lab in muted, right-aligned PPV in `tabular-nums`.
  - Highlighted row uses `bg-sky-50` (the highlighted state from the real `MedicationSearchInput`).
  - The 4 medications (real-looking, from the AMMPS registry):
    - `Doliprane 1000mg · comprimé — Paracétamol (Sanofi)` · `12,50 MAD`
    - `Doliprane 500mg · comprimé — Paracétamol (Sanofi)` · `8,20 MAD`
    - `DOLICOX 120 mg · comprimé pelliculé — BOTTU` · `81,70 MAD`
    - `Doliprane Codéine — Paracétamol/Codéine` · `18,40 MAD`
- **Cinematic animation** (on reveal):
  1. Search input types `doli` at ~80ms/character (~320ms).
  2. Dropdown drops down (`animate-in slide-in-from-top-2 fade-in` ~250ms).
  3. The highlighted row pulses (1 cycle of a custom keyframe that briefly intensifies `bg-sky-100`, ~600ms).
  4. The animation stops there — no closing of the dropdown, no input clear. The frozen state IS the demo.

### Section 4 — Tarification & paiements (static)

`components/landing/pricing-section.tsx` — server component (no animation beyond the section-frame reveal).

- Eyebrow: `03 — Tarification & paiements`.
- Headline: `Du diagnostic au paiement.` `Sans friction.` (gradient).
- Lead: `Le médecin clôture, l'assistant encaisse — chacun voit ce qu'il doit voir. Espèces, carte, chèque, virement.`.
- Mockup: side-by-side, two cards in a `grid grid-cols-2 gap-5`:
  - **Left card** — labeled `Médecin · Clôture`. Contains a static replica of the `<FinalizePricingDialog>` body: title `Tarification et clôture`, label `Prix (MAD)`, input field showing `250` (read-only), "Gratuit" checkbox unchecked, dark "Terminer la consultation" button.
  - **Right card** — labeled `Assistant · Paiements`. Contains 2 payment rows: Berrada Yasmine · 2 min ago · 250,00 MAD · Encaisser button. Alami Ali · hier 18:30 · 300,00 MAD · Encaisser button. Each row uses the avatar + payment row styling from the real `<PaymentsPanel>`.
- **Hover hot-spots**: hovering the price input shows a tooltip `Préfilé depuis le tarif par défaut du cabinet`. Hovering the Encaisser button shows `Espèces, carte, chèque, virement, ou autre`. Tooltips implemented via Tailwind `group/spot` + `group-hover/spot:opacity-100` on a positioned `<div>`.

### Section 5 — Statistiques cabinet (count-up)

`components/landing/stats-section.tsx` (server) + `stats-mockup.tsx` (`'use client'`).

- Eyebrow: `04 — Statistiques`.
- Headline: `Votre cabinet,` `en chiffres.` (gradient).
- Lead: `Recettes du jour, du mois, de l'année. Méthodes de paiement, paiements en attente, top patients. Tout ce qu'il faut pour piloter.`.
- Mockup:
  - 4 KPI tiles in `grid grid-cols-4 gap-3`:
    - `Recettes` — `42 350,00 MAD` (success tone, money icon, hint `137 consultations`).
    - `Consultations` — `142` (primary tone, users icon, hint `137 payés · 5 en attente`).
    - `Prix moyen` — `309,12 MAD` (admin/orange tone, trending icon, hint `MAD/consultation`).
    - `En attente` — `5` (warning tone, hourglass icon, hint `1 250,00 MAD à encaisser`).
  - Below: a 7-bar bar chart in a card. Heights: 30%, 55%, 45%, 80%, 65%, 90%, 70%. Bars are `bg-gradient-to-t from-sky-500 to-sky-400`, `rounded-t-md`.
- **Animation on reveal**:
  1. Each KPI value counts up from 0 to its target value over 1.2s, ease-out cubic, staggered ~120ms apart. Currency formatting via `Intl.NumberFormat('fr-FR')` matched to `formatMad` output style.
  2. The bar chart bars grow from height 0 to their target heights, staggered ~80ms apart, ~700ms each.

### Section 6 — Assistant IA (cinematic)

`components/landing/ai-section.tsx` (server) + `ai-mockup.tsx` (`'use client'`).

- Eyebrow: `05 — Assistant clinique IA`.
- Headline: `Un coup de main,` `quand vous en avez besoin.` (gradient).
- Lead: `Posez une question — l'assistant connaît le motif, les allergies, les antécédents du patient. Sans jamais transmettre son identité.`.
- Mockup (narrower than other mockups, `max-w-xl`):
  - Chat panel header: `🤖 Assistant clinique`.
  - User message bubble (right-aligned, neutral bg): `Quelles sont les contre-indications de l'ibuprofène pour cette patiente?`.
  - Bot message bubble (left-aligned, sky-50 bg): the response, typed character-by-character.
  - Bottom: a faux input `Posez une question…` (muted).
- **Bot response text** (the typewriter target):
  > Compte tenu du contexte clinique (toux persistante, pas d'antécédents notables), l'ibuprofène est en principe utilisable. Cependant, surveillez :
  >
  > • allergie aux AINS (non documentée chez cette patiente — à confirmer)
  > • troubles digestifs récents
  > • prise concomitante d'anticoagulants
  >
  > Le paracétamol reste le choix de première intention pour cette indication virale.
- **Cinematic animation** (on reveal):
  1. User bubble fades in.
  2. After 400ms, bot bubble appears with a "thinking" indicator (3 bouncing dots, `animate-bounce` staggered).
  3. After 800ms more, the thinking dots are replaced and the response types out at ~25ms/character (~330 characters, ~8s). Multi-paragraph: the typewriter respects newlines.
  4. The blinking cursor at the end stays after typing finishes (no further interaction).
- Footnote below the mockup: `Anthropic · OpenAI · Mistral, au choix. Données patient anonymisées avant transmission.` — `text-sm text-white/50 mt-6 text-center`.

### Section 7 — CTA (static)

`components/landing/cta-section.tsx` — server component, ~70vh tall (not full screen, intentionally short).

- Background: radial gradient at center `rgba(129,140,248,0.15)` fading to transparent.
- Headline: `Prêt à essayer Doctopus?` (the word "Doctopus" in gradient). Slightly smaller than the section headlines (~`text-5xl md:text-7xl`).
- Lead: `Sur invitation uniquement pendant la phase pilote. Contactez-nous pour évaluer si Doctopus convient à votre cabinet.`.
- CTAs: same two buttons as the hero — "Se connecter" (white/black) and "Demander un accès" (mailto, ghost).

### Footer

`components/landing/landing-footer.tsx` — server component, plain.

- One centered line at `text-white/40 text-sm`:
  > © 2026 Doctopus · [Sous-traitants](/static/sous-traitants) · [douimiotmane@gmail.com](mailto:douimiotmane@gmail.com)
- The "Sous-traitants" link points at the existing `/static/sous-traitants` page (already in the codebase).
- Border-top `border-white/5`.

---

## Animation hooks — `components/landing/animations.tsx`

`'use client'`. Three small hooks, ~80 LOC total.

### `useReveal`

```ts
export function useReveal<T extends HTMLElement>(
  options: { threshold?: number; rootMargin?: string } = {},
): { ref: React.RefObject<T | null>; revealed: boolean };
```

- Returns a ref to attach to the target element + a `revealed` boolean.
- Internally: creates an `IntersectionObserver` with `threshold: 0.2, rootMargin: '0px 0px -10% 0px'` defaults. When the target's intersectionRatio crosses the threshold, sets `revealed = true` and disconnects the observer (one-shot).
- Server-side render returns `revealed: false` initially; the effect sets it true on mount-and-intersect.

Usage:
```tsx
const { ref, revealed } = useReveal<HTMLDivElement>();
return <div ref={ref} className={revealed ? 'animate-in fade-in-0 slide-in-from-bottom-4 duration-700' : 'opacity-0'}>...</div>;
```

### `useTypewriter`

```ts
export function useTypewriter(
  fullText: string,
  opts: { startWhen: boolean; charDelayMs?: number; startDelayMs?: number },
): string;
```

- Returns the substring of `fullText` typed so far.
- Starts an interval when `startWhen` becomes `true` (typically `revealed` from `useReveal`); after `startDelayMs` (default 0), advances by 1 character every `charDelayMs` (default 30) until the full text is typed. Then clears the interval.
- One-shot: once `startWhen` is true, the typing runs to completion and never resets even if `startWhen` flickers.

### `useCountUp`

```ts
export function useCountUp(
  target: number,
  opts: { startWhen: boolean; durationMs?: number; startDelayMs?: number },
): number;
```

- Returns the current numeric value (starts at 0, animates to `target`).
- `requestAnimationFrame`-based; no setInterval. Ease-out cubic by default (`1 - Math.pow(1 - t, 3)`).
- One-shot like `useTypewriter`.

---

## Visual specifics

- **Color palette**:
  - Background: `bg-black` (true black, `#000000`) for max contrast with the gradient accents.
  - Foreground: `text-white` (≈`#ffffff`), `text-white/70` for body, `text-white/40` for footer.
  - Accent: `from-sky-400 to-indigo-400` gradient on the bracket words ("repensé", "Sans paperasse", "Avec leur prix", etc.) and on a few hot-spot indicators.
  - Mockup bodies: `bg-[#f5f5f5]` (off-white, NOT pure white — softer against the black page) with `text-slate-900`.
  - Mockup chrome: `bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d]` with `border-white/10`.
- **Typography**:
  - Headlines use the existing `Inter` font (already loaded via `app/fonts.ts`), with `font-semibold` weight and `tracking-tight` (-0.02em–-0.03em).
  - Body text uses `Inter` regular at `text-xl` (20px) for leads and `text-sm` (14px) for tooltips and footnotes.
  - The `tabular-nums` class is used on every numeric value (prices, KPI numbers, dates).
- **Spacing**:
  - Each section is `min-h-screen` with `py-32` (large vertical padding) and a `max-w-[1200px] mx-auto` content container.
  - Mockups are `max-w-[900px]` (the AI mockup is `max-w-xl` deliberately).
  - Vertical rhythm uses Tailwind's default `space-y-*` and `mt-*` utilities — no custom spacing tokens.
- **Mockup chrome**: each mockup has a "macOS-style" titlebar with three small grey dots (`bg-white/10`, `12px` circles). It's purely decorative — frames the content as "this is software, not a screenshot."

---

## Acceptance criteria

1. Visiting `/` (logged out) shows the landing page; nothing redirects.
2. Visiting `/` (logged in) **also** shows the landing page (current redirect to `/today` is gone). The user can still click "Se connecter" → it routes them to `/sign-in` which detects their session and forwards to `/today` (existing behavior in the sign-in page). No regression for authenticated users.
3. The page renders all 7 sections + topbar + footer in the order Hero → Consultation → Ordonnance → Pricing → Stats → AI → CTA → Footer.
4. The hero animates in on initial paint (eyebrow → headline → lead → CTAs → scroll hint, staggered).
5. Each feature section fades + slides up when it enters the viewport (one-shot per visit).
6. The Consultation section's Motif and Diagnostic fields type their content character-by-character once the section is revealed.
7. The Ordonnance section's search input types `doli`, the dropdown drops down, the first row pulses.
8. The Stats section's 4 KPI numbers count up from 0 to their target values; the bar chart bars grow from 0 to their target heights.
9. The AI section types out the bot response character-by-character, with the user bubble appearing first and a brief "thinking dots" indicator before the response.
10. "Se connecter" buttons (3 instances: topbar, hero, CTA) all link to `/sign-in`.
11. "Demander un accès" buttons (3 instances) all open `mailto:douimiotmane@gmail.com?subject=Doctopus%20%E2%80%94%20demande%20d%27acc%C3%A8s`.
12. The "Sous-traitants" footer link routes to the existing `/static/sous-traitants` page.
13. tsc clean. Existing tests still pass (no new unit/RLS/e2e tests added; UI-only).
14. No new dependency in `package.json`. No schema change. No new server action. No DB query.
15. Lighthouse Performance score ≥ 80 on a desktop run (the page is mostly server-rendered HTML; client islands hydrate the animation hooks). LCP from the hero headline.
16. The page works (renders + animates) in current Chrome, Edge, Firefox, and Safari. Mobile is responsive but not optimized (acceptable per the "out of scope" list).
17. `prefers-reduced-motion: reduce` disables the `animate-in` reveal classes via the `tw-animate-css` built-in handling. The typewriter and count-up still animate (acceptable for v1).

---

## Risks and assumptions

- **Tailwind v4 + `tw-animate-css` compatibility.** The project already uses both successfully (`components/ui/select.tsx`, etc.) — risk is low.
- **`IntersectionObserver` polyfill.** All target browsers (Chrome, Edge, Firefox, Safari current versions) ship it natively. No polyfill needed.
- **Server / client island boundary cost.** Each `'use client'` mockup ships its own JS chunk. Total estimated added JS: ~6KB gzipped (3 hooks + 4 mockup components, mostly text + JSX). Negligible.
- **Gradient text rendering.** `bg-clip-text text-transparent` is widely supported but renders sub-pixel artifacts on some screens. Acceptable for headline accents; not used for body copy.
- **Page weight.** No image assets beyond the existing `public/brand-logo.png` (~5KB). The Inter font is already loaded by `app/layout.tsx`. Total page weight target: < 100KB transferred (HTML + CSS + JS).
- **Logged-in user landing on `/`.** Current redirect to `/today` is removed. A logged-in user who visits `/` directly (e.g., from a bookmark) will see the landing page instead of being shunted to `/today`. They have to click "Se connecter" to reach the app. **Decision: this is acceptable.** Power users who want to skip the landing page can bookmark `/today` directly; the marketing surface should be available even to authenticated users (e.g., for the doctor sharing the page with a colleague during a sign-up demo).
- **Mailto link UX on machines without a default mail client.** Some users will see an "open with…" dialog or nothing. Acceptable for a low-volume invite-only product; revisit when traction warrants a `/contact` form.
- **Cinematic animations on slow devices.** The typewriter at ~30ms/character renders smoothly even on low-end hardware (no expensive reflows). The count-up uses requestAnimationFrame and degrades gracefully.
