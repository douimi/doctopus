'use client';

import { useEffect, useMemo, useState } from 'react';
import { useScrollProgress } from './animations';

/**
 * Octopus tentacles weaving through the landing page.
 *
 * Each tentacle is a properly tapered filled SVG path: we walk the
 * centreline (a cubic bezier) at uniform `t` steps, compute the unit
 * normal at each step, push two side points offset by a per-t width
 * (linear taper from `baseW` → `tipW`), and close the polygon. Suckers
 * are small <circle>s placed along the underside (one normal direction).
 *
 * As the user scrolls each tentacle fades in/out around its scroll
 * range and parallax-shifts vertically. Idle CSS sway keeps them moving
 * when stationary. Honours prefers-reduced-motion.
 */

type Pt = [number, number];

type TentacleSpec = {
  id: string;
  /** Cubic bezier centreline: P0 → P1 → P2 → P3. */
  p0: Pt;
  p1: Pt;
  p2: Pt;
  p3: Pt;
  /** Base thickness (at P0). */
  baseW: number;
  /** Tip thickness (at P3). */
  tipW: number;
  /** Number of suckers along the underside. */
  suckers: number;
  /** Scroll progress range [start, end] where the tentacle is fully visible. */
  range: [number, number];
  /** Pixels per progress unit, sign controls direction. */
  parallax: number;
  /** Which gradient. */
  color: 'sky' | 'indigo';
  /** Sway phase (in seconds) so adjacent tentacles don't move in lock-step. */
  swayDelay: number;
};

const TENTACLES: TentacleSpec[] = [
  // Hero → consultation: sweeping right
  {
    id: 't1',
    p0: [-150, 240],
    p1: [180, 60],
    p2: [420, 420],
    p3: [820, 320],
    baseW: 60,
    tipW: 4,
    suckers: 9,
    range: [0.0, 0.22],
    parallax: 90,
    color: 'sky',
    swayDelay: 0,
  },
  // Ordonnance → pricing: right side curling left
  {
    id: 't2',
    p0: [1620, 460],
    p1: [1280, 320],
    p2: [820, 640],
    p3: [380, 480],
    baseW: 54,
    tipW: 3,
    suckers: 8,
    range: [0.16, 0.42],
    parallax: -70,
    color: 'indigo',
    swayDelay: 1.5,
  },
  // Stats area: from the left, taking a wider arc
  {
    id: 't3',
    p0: [-160, 600],
    p1: [220, 480],
    p2: [460, 760],
    p3: [880, 620],
    baseW: 64,
    tipW: 5,
    suckers: 10,
    range: [0.36, 0.62],
    parallax: 80,
    color: 'sky',
    swayDelay: 0.6,
  },
  // AI → migration: right side coming back in
  {
    id: 't4',
    p0: [1620, 720],
    p1: [1240, 580],
    p2: [820, 880],
    p3: [340, 760],
    baseW: 50,
    tipW: 3,
    suckers: 8,
    range: [0.56, 0.82],
    parallax: -60,
    color: 'indigo',
    swayDelay: 2.2,
  },
  // CTA: long final swirl from the left
  {
    id: 't5',
    p0: [-180, 380],
    p1: [260, 220],
    p2: [560, 520],
    p3: [980, 400],
    baseW: 58,
    tipW: 4,
    suckers: 9,
    range: [0.78, 1.02],
    parallax: 100,
    color: 'sky',
    swayDelay: 3.1,
  },
];

const FADE = 0.06;
const SEGMENTS = 28;

function bezierAt(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const u2 = u * u;
  const u3 = u2 * u;
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    u3 * p0[0] + 3 * u2 * t * p1[0] + 3 * u * t2 * p2[0] + t3 * p3[0],
    u3 * p0[1] + 3 * u2 * t * p1[1] + 3 * u * t2 * p2[1] + t3 * p3[1],
  ];
}

function bezierTangent(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    3 * u * u * (p1[0] - p0[0]) +
      6 * u * t * (p2[0] - p1[0]) +
      3 * t * t * (p3[0] - p2[0]),
    3 * u * u * (p1[1] - p0[1]) +
      6 * u * t * (p2[1] - p1[1]) +
      3 * t * t * (p3[1] - p2[1]),
  ];
}

/** Quadratic ease-out for the taper so the tip narrows aggressively, like a real tentacle. */
function widthAt(baseW: number, tipW: number, t: number): number {
  const k = 1 - (1 - t) * (1 - t);
  return baseW + (tipW - baseW) * k;
}

type Built = {
  spec: TentacleSpec;
  outline: string;
  suckers: { cx: number; cy: number; r: number }[];
};

function buildTentacle(spec: TentacleSpec): Built {
  const { p0, p1, p2, p3, baseW, tipW } = spec;
  const top: Pt[] = [];
  const bot: Pt[] = [];

  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const [x, y] = bezierAt(p0, p1, p2, p3, t);
    const [tx, ty] = bezierTangent(p0, p1, p2, p3, t);
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const halfW = widthAt(baseW, tipW, t) / 2;
    top.push([x + nx * halfW, y + ny * halfW]);
    bot.push([x - nx * halfW, y - ny * halfW]);
  }

  const fmt = (n: number) => n.toFixed(1);
  const parts: string[] = [];
  parts.push(`M ${fmt(top[0][0])} ${fmt(top[0][1])}`);
  for (let i = 1; i < top.length; i++) {
    parts.push(`L ${fmt(top[i][0])} ${fmt(top[i][1])}`);
  }
  for (let i = bot.length - 1; i >= 0; i--) {
    parts.push(`L ${fmt(bot[i][0])} ${fmt(bot[i][1])}`);
  }
  parts.push('Z');

  // Suckers: place along the underside. We pick which side has the
  // larger Y on average and put them on that side so they read as
  // "below" the tentacle.
  const suckers: { cx: number; cy: number; r: number }[] = [];
  // Determine which normal direction (top vs bot) is "below" overall.
  const topY = top.reduce((s, p) => s + p[1], 0) / top.length;
  const botY = bot.reduce((s, p) => s + p[1], 0) / bot.length;
  const useTop = topY > botY;

  for (let i = 0; i < spec.suckers; i++) {
    const t = (i + 0.5) / spec.suckers;
    const [x, y] = bezierAt(p0, p1, p2, p3, t);
    const [tx, ty] = bezierTangent(p0, p1, p2, p3, t);
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const halfW = widthAt(baseW, tipW, t) / 2;
    // Place suckers ~60% of the way out from centreline on the underside.
    const sign = useTop ? 1 : -1;
    suckers.push({
      cx: x + nx * halfW * 0.55 * sign,
      cy: y + ny * halfW * 0.55 * sign,
      r: Math.max(1.2, halfW * 0.32),
    });
  }

  return { spec, outline: parts.join(' '), suckers };
}

const FADE_RANGE = FADE;

function envelopeOpacity(progress: number, range: [number, number]): number {
  const [start, end] = range;
  if (progress < start - FADE_RANGE) return 0;
  if (progress < start) return (progress - (start - FADE_RANGE)) / FADE_RANGE;
  if (progress < end) return 1;
  if (progress < end + FADE_RANGE) return 1 - (progress - end) / FADE_RANGE;
  return 0;
}

export function Tentacles() {
  const progress = useScrollProgress();
  const [reduce, setReduce] = useState(false);
  const built = useMemo(() => TENTACLES.map(buildTentacle), []);

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
          <linearGradient id="tentacle-fill-sky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#22d3ee" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient
            id="tentacle-fill-indigo"
            x1="100%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#818cf8" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="sucker-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0c1119" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#0c1119" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0c1119" stopOpacity="0" />
          </radialGradient>
          <filter id="tentacle-glow" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="8" />
          </filter>

          <style>
            {`
              @keyframes tentacle-sway-a {
                0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
                50% { transform: translate3d(0, -10px, 0) rotate(0.4deg); }
              }
              @keyframes tentacle-sway-b {
                0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
                50% { transform: translate3d(0, 12px, 0) rotate(-0.4deg); }
              }
              .tentacle-sway-a { animation: tentacle-sway-a 9s ease-in-out infinite; }
              .tentacle-sway-b { animation: tentacle-sway-b 12s ease-in-out infinite; }
              @media (prefers-reduced-motion: reduce) {
                .tentacle-sway-a, .tentacle-sway-b { animation: none; }
              }
            `}
          </style>
        </defs>

        {built.map(({ spec, outline, suckers }, idx) => {
          const opacity = envelopeOpacity(progress, spec.range);
          if (opacity <= 0.001) return null;
          const midpoint = (spec.range[0] + spec.range[1]) / 2;
          const offset = reduce ? 0 : (progress - midpoint) * spec.parallax;
          const swayClass = idx % 2 === 0 ? 'tentacle-sway-a' : 'tentacle-sway-b';
          const fill = `url(#tentacle-fill-${spec.color})`;

          return (
            <g
              key={spec.id}
              style={{
                opacity,
                transform: `translate3d(0, ${offset.toFixed(1)}px, 0)`,
                willChange: 'transform, opacity',
              }}
            >
              <g
                className={swayClass}
                style={{
                  transformOrigin: `${spec.p0[0]}px ${spec.p0[1]}px`,
                  animationDelay: `-${spec.swayDelay}s`,
                }}
              >
                {/* Soft outer halo */}
                <path
                  d={outline}
                  fill={fill}
                  filter="url(#tentacle-glow)"
                  opacity="0.55"
                />
                {/* Solid body */}
                <path
                  d={outline}
                  fill={fill}
                  opacity="0.85"
                />
                {/* Inner highlight stroke for the upper edge */}
                <path
                  d={outline}
                  fill="none"
                  stroke="#e0f2fe"
                  strokeOpacity="0.18"
                  strokeWidth="0.6"
                />
                {/* Suckers along the underside */}
                {suckers.map((s, i) => (
                  <g key={i}>
                    <circle
                      cx={s.cx}
                      cy={s.cy}
                      r={s.r}
                      fill="url(#sucker-grad)"
                    />
                    <circle
                      cx={s.cx}
                      cy={s.cy}
                      r={s.r * 0.45}
                      fill="#0c1119"
                      fillOpacity="0.85"
                    />
                  </g>
                ))}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
