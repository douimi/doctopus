'use client';

import { useEffect, useState } from 'react';
import { useScrollProgress } from './animations';

/**
 * Animated octopus tentacles weaving through the landing page.
 * Each tentacle is an SVG cubic-bezier path with a soft glow + bright
 * core. They appear/disappear within a scroll range (so they "hand off"
 * between sections) and parallax-shift with scroll for depth.
 *
 * The whole layer is `pointer-events-none` and lives at z-0 — content
 * sections sit at z-10 and stay clickable.
 */

type Tentacle = {
  id: string;
  d: string;
  /** Scroll progress range [start, end] in 0..1 where the tentacle is fully visible. */
  range: [number, number];
  /** Pixels per progress unit. Sign controls direction; bigger ⇒ faster parallax. */
  parallax: number;
  /** Which gradient to use. */
  color: 'sky' | 'indigo';
  /** Stroke widths for halo + core. */
  haloWidth: number;
  coreWidth: number;
};

const TENTACLES: Tentacle[] = [
  // From the top-left of the hero, sweeping right past the consultation mockup
  {
    id: 't1',
    d: 'M -120 220 C 200 80 380 380 600 280 S 1000 460 1620 320',
    range: [0.0, 0.22],
    parallax: 90,
    color: 'sky',
    haloWidth: 16,
    coreWidth: 2.5,
  },
  // Right-side curl, ordonnance into pricing
  {
    id: 't2',
    d: 'M 1620 460 C 1180 360 880 600 600 480 S 200 720 -120 580',
    range: [0.16, 0.42],
    parallax: -70,
    color: 'indigo',
    haloWidth: 14,
    coreWidth: 2,
  },
  // Mid-page sweep from the left, stats area
  {
    id: 't3',
    d: 'M -150 580 C 200 460 380 720 600 620 S 980 800 1620 660',
    range: [0.36, 0.62],
    parallax: 80,
    color: 'sky',
    haloWidth: 18,
    coreWidth: 2.8,
  },
  // AI section to migration, right side
  {
    id: 't4',
    d: 'M 1620 700 C 1140 600 870 850 600 760 S 220 920 -150 820',
    range: [0.56, 0.82],
    parallax: -60,
    color: 'indigo',
    haloWidth: 14,
    coreWidth: 2.2,
  },
  // Final long swirl into the CTA
  {
    id: 't5',
    d: 'M -120 380 C 280 240 480 540 740 420 S 1140 600 1620 480',
    range: [0.78, 1.02],
    parallax: 100,
    color: 'sky',
    haloWidth: 16,
    coreWidth: 2.6,
  },
];

const FADE = 0.06;

/** Smooth opacity envelope around `range`, fading in/out over `FADE` units. */
function envelopeOpacity(progress: number, range: [number, number]): number {
  const [start, end] = range;
  if (progress < start - FADE) return 0;
  if (progress < start) return (progress - (start - FADE)) / FADE;
  if (progress < end) return 1;
  if (progress < end + FADE) return 1 - (progress - end) / FADE;
  return 0;
}

export function Tentacles() {
  const progress = useScrollProgress();
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
    >
      <svg
        viewBox="0 0 1500 1000"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="tentacle-grad-sky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="tentacle-grad-indigo" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.45" />
          </linearGradient>
          <filter id="tentacle-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>

          {/* CSS sway keyframes — applied to the inner <g> via class. */}
          <style>
            {`
              @keyframes tentacle-sway-a {
                0%, 100% { transform: translate3d(0, 0, 0); }
                50% { transform: translate3d(0, -8px, 0); }
              }
              @keyframes tentacle-sway-b {
                0%, 100% { transform: translate3d(0, 0, 0); }
                50% { transform: translate3d(0, 10px, 0); }
              }
              .tentacle-sway-a { animation: tentacle-sway-a 8s ease-in-out infinite; }
              .tentacle-sway-b { animation: tentacle-sway-b 11s ease-in-out infinite; }
              @media (prefers-reduced-motion: reduce) {
                .tentacle-sway-a, .tentacle-sway-b { animation: none; }
              }
            `}
          </style>
        </defs>

        {TENTACLES.map((t, idx) => {
          const opacity = envelopeOpacity(progress, t.range);
          if (opacity <= 0.001) return null;
          const midpoint = (t.range[0] + t.range[1]) / 2;
          const offset = reduce ? 0 : (progress - midpoint) * t.parallax;
          const swayClass = idx % 2 === 0 ? 'tentacle-sway-a' : 'tentacle-sway-b';
          const grad = `url(#tentacle-grad-${t.color})`;

          return (
            <g
              key={t.id}
              style={{
                opacity,
                transform: `translate3d(0, ${offset.toFixed(1)}px, 0)`,
                willChange: 'transform, opacity',
              }}
            >
              <g className={swayClass} style={{ transformOrigin: 'center' }}>
                {/* Soft glow halo */}
                <path
                  d={t.d}
                  stroke={grad}
                  strokeWidth={t.haloWidth}
                  fill="none"
                  strokeLinecap="round"
                  filter="url(#tentacle-glow)"
                  opacity="0.5"
                />
                {/* Bright core */}
                <path
                  d={t.d}
                  stroke={grad}
                  strokeWidth={t.coreWidth}
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
