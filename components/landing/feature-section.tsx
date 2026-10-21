'use client';

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReveal } from './animations';
import { MockupFrame } from './mockup-frame';
import { SectionEyebrow } from './section-eyebrow';
import { container, h2Class, leadClass } from './styles';

export type FeaturePoint = { title: string; body?: string };

/**
 * Two-column feature block: copy + checklist on one side, a product mockup
 * on the other (stacked on phones, copy first). Content is always visible;
 * `revealed` only starts the mockup's one-shot micro-animation once it
 * scrolls into view. No parallax, no scroll-linked transforms.
 */
export function FeatureSection({
  id,
  eyebrow,
  title,
  lead,
  points,
  mockup,
  mockupLabel,
  mockupPath,
  reverse = false,
  muted = false,
  aside,
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  lead: ReactNode;
  points: FeaturePoint[];
  mockup: (revealed: boolean) => ReactNode;
  mockupLabel: string;
  mockupPath: string;
  reverse?: boolean;
  muted?: boolean;
  aside?: ReactNode;
}) {
  const { ref, revealed } = useReveal<HTMLDivElement>({ threshold: 0.35 });
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        'scroll-mt-20 py-16 sm:py-20 lg:py-28',
        muted && 'border-y border-slate-200 bg-slate-50',
      )}
    >
      <div
        className={cn(
          container,
          'grid items-center gap-10 lg:gap-16',
          reverse
            ? 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]'
            : 'lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]',
        )}
      >
        <div className={cn('min-w-0', reverse && 'lg:order-2')}>
          <SectionEyebrow>{eyebrow}</SectionEyebrow>
          <h2 id={headingId} className={h2Class}>
            {title}
          </h2>
          <p className={cn(leadClass, 'mt-5')}>{lead}</p>
          <ul className="mt-8 space-y-3.5">
            {points.map((p) => (
              <li key={p.title} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200"
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span className="text-[15px] leading-relaxed text-slate-700">
                  <span className="font-semibold text-slate-900">{p.title}</span>
                  {p.body ? <> {p.body}</> : null}
                </span>
              </li>
            ))}
          </ul>
          {aside ? <div className="mt-8">{aside}</div> : null}
        </div>
        <div ref={ref} className={cn('min-w-0', reverse && 'lg:order-1')}>
          <MockupFrame label={mockupLabel} path={mockupPath}>
            {mockup(revealed)}
          </MockupFrame>
        </div>
      </div>
    </section>
  );
}
