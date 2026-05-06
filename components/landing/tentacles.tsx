'use client';

import { useEffect, useRef } from 'react';

/**
 * Octopus tentacle layer. The brand logo in the Topbar is the head;
 * tentacles emanate from it and reach to each landing section, each
 * tentacle anchored to a real DOM element (#section-* ids).
 *
 * On scroll/resize, an rAF-throttled loop measures every section's
 * bounding rect and rewrites the SVG path of its tentacle so the tip
 * physically follows the section as it moves through the viewport.
 *
 * Tentacles are filled tapered shapes (cubic bezier centreline + a
 * quadratic-eased width) with circular suckers along the underside.
 *
 * The whole layer is z-0, pointer-events-none, aria-hidden — content
 * sits at z-10 and stays interactive.
 */

type SectionAnchor = {
  /** DOM id rendered on the <section>. */
  id: string;
  /** Which side of the section the tentacle's tip should curl to. */
  side: 'left' | 'right';
  /** Horizontal offset from the side edge, in px. */
  inset: number;
  /** Vertical anchor as a fraction of section height (0 = top, 1 = bottom). */
  yFraction: number;
  /** Bend strength of the cubic curve. Higher = more dramatic curl. */
  bend: number;
  /** Color of the tentacle. */
  color: 'sky' | 'indigo';
  /** Number of suckers along the tentacle. */
  suckers: number;
  /** Base width at the head end. */
  baseW: number;
  /** Tip width. */
  tipW: number;
};

const SECTIONS: SectionAnchor[] = [
  { id: 'section-consultation', side: 'right', inset: 80,  yFraction: 0.55, bend: 1.2, color: 'sky',    suckers: 9,  baseW: 56, tipW: 5 },
  { id: 'section-ordonnance',   side: 'left',  inset: 90,  yFraction: 0.5,  bend: 1.0, color: 'indigo', suckers: 8,  baseW: 50, tipW: 4 },
  { id: 'section-pricing',      side: 'right', inset: 100, yFraction: 0.6,  bend: 1.4, color: 'sky',    suckers: 10, baseW: 58, tipW: 5 },
  { id: 'section-stats',        side: 'left',  inset: 80,  yFraction: 0.45, bend: 1.1, color: 'indigo', suckers: 9,  baseW: 52, tipW: 4 },
  { id: 'section-ai',           side: 'right', inset: 110, yFraction: 0.55, bend: 1.3, color: 'sky',    suckers: 10, baseW: 56, tipW: 5 },
  { id: 'section-migration',    side: 'left',  inset: 90,  yFraction: 0.5,  bend: 1.0, color: 'indigo', suckers: 8,  baseW: 48, tipW: 4 },
];

/** Octopus head (topbar logo) origin in viewport coordinates. */
function headOrigin(): { x: number; y: number; spread: number } {
  // Logo sits at left:32 (px-8 padding) inside max-w-1200 wrapper, but
  // the wrapper is centered. We compute roughly: left of the centered
  // 1200-wide wrapper, plus 32 padding, plus half logo size.
  if (typeof window === 'undefined') return { x: 100, y: 80, spread: 12 };
  const vw = window.innerWidth;
  const wrapperLeft = Math.max(0, (vw - 1200) / 2);
  const isScrolled = window.scrollY > 80;
  const logoSize = isScrolled ? 56 : 128;
  const x = wrapperLeft + 32 + logoSize / 2;
  const y = isScrolled ? 8 + logoSize / 2 : 8 + logoSize / 2;
  return { x, y, spread: logoSize * 0.18 };
}

const SEGMENTS = 28;

/** Quadratic ease-out: tip narrows aggressively, like a real tentacle. */
function widthAt(baseW: number, tipW: number, t: number): number {
  const k = 1 - (1 - t) * (1 - t);
  return baseW + (tipW - baseW) * k;
}

function bezierPoint(
  p0x: number, p0y: number,
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number,
  t: number,
): [number, number] {
  const u = 1 - t;
  const u2 = u * u;
  const u3 = u2 * u;
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    u3 * p0x + 3 * u2 * t * p1x + 3 * u * t2 * p2x + t3 * p3x,
    u3 * p0y + 3 * u2 * t * p1y + 3 * u * t2 * p2y + t3 * p3y,
  ];
}

function bezierTangent(
  p0x: number, p0y: number,
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number,
  t: number,
): [number, number] {
  const u = 1 - t;
  return [
    3 * u * u * (p1x - p0x) + 6 * u * t * (p2x - p1x) + 3 * t * t * (p3x - p2x),
    3 * u * u * (p1y - p0y) + 6 * u * t * (p2y - p1y) + 3 * t * t * (p3y - p2y),
  ];
}

/** Build a tapered tentacle outline + sucker positions. */
function buildTentacle(
  ox: number, oy: number,
  tx: number, ty: number,
  baseW: number, tipW: number,
  bend: number,
  side: 'left' | 'right',
  numSuckers: number,
): { d: string; suckers: { cx: number; cy: number; r: number }[] } {
  const dx = tx - ox;
  const dy = ty - oy;

  // Control points: pull the curve to the side. The "side" determines
  // which way the bend goes — we want the tentacle to curl AROUND the
  // section side, so left-side targets bend left, right-side bend right.
  const sideSign = side === 'right' ? 1 : -1;
  const bendAmount = bend * Math.min(120, Math.abs(dx) * 0.4);

  const c1x = ox + dx * 0.35 + sideSign * bendAmount;
  const c1y = oy + dy * 0.35;
  const c2x = ox + dx * 0.7 + sideSign * bendAmount * 0.5;
  const c2y = oy + dy * 0.75;

  const top: [number, number][] = [];
  const bot: [number, number][] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const [x, y] = bezierPoint(ox, oy, c1x, c1y, c2x, c2y, tx, ty, t);
    const [tax, tay] = bezierTangent(ox, oy, c1x, c1y, c2x, c2y, tx, ty, t);
    const len = Math.hypot(tax, tay) || 1;
    const nx = -tay / len;
    const ny = tax / len;
    const halfW = widthAt(baseW, tipW, t) / 2;
    top.push([x + nx * halfW, y + ny * halfW]);
    bot.push([x - nx * halfW, y - ny * halfW]);
  }

  const fmt = (n: number) => n.toFixed(1);
  const parts: string[] = [`M ${fmt(top[0][0])} ${fmt(top[0][1])}`];
  for (let i = 1; i < top.length; i++) {
    parts.push(`L ${fmt(top[i][0])} ${fmt(top[i][1])}`);
  }
  for (let i = bot.length - 1; i >= 0; i--) {
    parts.push(`L ${fmt(bot[i][0])} ${fmt(bot[i][1])}`);
  }
  parts.push('Z');

  // Suckers along the underside — pick whichever offset path is below
  // (higher Y on average) so they always read as "below".
  const useTop = (top.reduce((s, p) => s + p[1], 0) / top.length) >
                 (bot.reduce((s, p) => s + p[1], 0) / bot.length);
  const sideMul = useTop ? 1 : -1;
  const suckers: { cx: number; cy: number; r: number }[] = [];
  // Skip the very base and the tip — suckers in the middle 70% of the length.
  for (let i = 0; i < numSuckers; i++) {
    const t = 0.18 + (i + 0.5) / numSuckers * 0.7;
    const [x, y] = bezierPoint(ox, oy, c1x, c1y, c2x, c2y, tx, ty, t);
    const [tax, tay] = bezierTangent(ox, oy, c1x, c1y, c2x, c2y, tx, ty, t);
    const len = Math.hypot(tax, tay) || 1;
    const nx = -tay / len;
    const ny = tax / len;
    const halfW = widthAt(baseW, tipW, t) / 2;
    suckers.push({
      cx: x + nx * halfW * 0.55 * sideMul,
      cy: y + ny * halfW * 0.55 * sideMul,
      r: Math.max(1.4, halfW * 0.32),
    });
  }

  return { d: parts.join(' '), suckers };
}

type TentacleRefs = {
  group: SVGGElement | null;
  outline: SVGPathElement | null;
  halo: SVGPathElement | null;
  rim: SVGPathElement | null;
  suckersGroup: SVGGElement | null;
};

export function Tentacles() {
  const refs = useRef<TentacleRefs[]>(SECTIONS.map(() => ({
    group: null,
    outline: null,
    halo: null,
    rim: null,
    suckersGroup: null,
  })));
  const reduce = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    let raf: number | null = null;

    function update() {
      raf = null;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const { x: ox, y: oy } = headOrigin();

      SECTIONS.forEach((spec, i) => {
        const r = refs.current[i];
        if (!r.group || !r.outline || !r.halo || !r.rim || !r.suckersGroup) return;
        const el = document.getElementById(spec.id);
        if (!el) {
          r.group.setAttribute('opacity', '0');
          return;
        }
        const rect = el.getBoundingClientRect();

        // Cull: only render when section is in (or near) the viewport.
        if (rect.bottom < -300 || rect.top > vh + 300) {
          r.group.setAttribute('opacity', '0');
          return;
        }

        // Tip target on the section.
        const tx = spec.side === 'right' ? rect.right - spec.inset : rect.left + spec.inset;
        const ty = rect.top + rect.height * spec.yFraction;

        // Opacity is a soft envelope around section center crossing the viewport center.
        const sectionCenterY = rect.top + rect.height / 2;
        const distFromCenter = Math.abs(sectionCenterY - vh / 2);
        const fadeRange = vh * 0.85;
        const opacity = Math.max(0, Math.min(1, 1 - distFromCenter / fadeRange));
        if (opacity <= 0.001) {
          r.group.setAttribute('opacity', '0');
          return;
        }

        const { d, suckers } = buildTentacle(
          ox, oy, tx, ty,
          spec.baseW, spec.tipW, spec.bend, spec.side, spec.suckers,
        );

        r.group.setAttribute('opacity', String(opacity));
        r.outline.setAttribute('d', d);
        r.halo.setAttribute('d', d);
        r.rim.setAttribute('d', d);

        // Update sucker positions (we keep a fixed pool of <circle>s).
        const circles = r.suckersGroup.children;
        for (let s = 0; s < circles.length; s++) {
          const inner = circles[s] as SVGGElement;
          const outer = inner.firstElementChild as SVGCircleElement | null;
          const dot = outer?.nextElementSibling as SVGCircleElement | null;
          if (s < suckers.length) {
            inner.setAttribute('opacity', '1');
            outer?.setAttribute('cx', String(suckers[s].cx));
            outer?.setAttribute('cy', String(suckers[s].cy));
            outer?.setAttribute('r', String(suckers[s].r));
            dot?.setAttribute('cx', String(suckers[s].cx));
            dot?.setAttribute('cy', String(suckers[s].cy));
            dot?.setAttribute('r', String(suckers[s].r * 0.45));
          } else {
            inner.setAttribute('opacity', '0');
          }
        }
      });
    }

    function onScroll() {
      if (raf !== null) return;
      raf = requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
    >
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
        // Match viewport coordinate system 1:1 so getBoundingClientRect values plot directly.
        style={{ width: '100vw', height: '100vh' }}
      >
        <defs>
          <linearGradient id="tentacle-fill-sky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#22d3ee" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="tentacle-fill-indigo" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#818cf8" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="sucker-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0c1119" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#0c1119" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0c1119" stopOpacity="0" />
          </radialGradient>
          <filter id="tentacle-glow" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        {SECTIONS.map((spec, i) => (
          <g
            key={spec.id}
            ref={(el) => {
              refs.current[i].group = el;
            }}
            opacity="0"
          >
            {/* Glow halo */}
            <path
              ref={(el) => { refs.current[i].halo = el; }}
              fill={`url(#tentacle-fill-${spec.color})`}
              filter="url(#tentacle-glow)"
              opacity="0.55"
            />
            {/* Solid body */}
            <path
              ref={(el) => { refs.current[i].outline = el; }}
              fill={`url(#tentacle-fill-${spec.color})`}
              opacity="0.85"
            />
            {/* Rim highlight */}
            <path
              ref={(el) => { refs.current[i].rim = el; }}
              fill="none"
              stroke="#e0f2fe"
              strokeOpacity="0.18"
              strokeWidth="0.6"
            />
            {/* Suckers — pre-allocate max(suckers) circles; we toggle opacity */}
            <g ref={(el) => { refs.current[i].suckersGroup = el; }}>
              {Array.from({ length: spec.suckers }).map((_, s) => (
                <g key={s}>
                  <circle r="0" fill="url(#sucker-grad)" />
                  <circle r="0" fill="#0c1119" fillOpacity="0.85" />
                </g>
              ))}
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
