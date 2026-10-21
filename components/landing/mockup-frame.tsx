import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Light "browser window" around every product mockup. Mirrors the app's
 * Quiet-clinical surfaces: slate-50 canvas, white panels, slate-200
 * hairlines. The whole mockup is exposed to assistive tech as ONE image
 * with a descriptive label; its fake content is aria-hidden so screen
 * readers don't read invented patient data as page content.
 */
export function MockupFrame({
  children,
  label,
  path,
  className,
}: {
  children: ReactNode;
  /** Accessible description of what the mockup shows. */
  label: string;
  /** Fake address-bar path, e.g. "consultations". */
  path: string;
  className?: string;
}) {
  return (
    <figure
      role="img"
      aria-label={label}
      className={cn(
        'w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white',
        'shadow-[0_1px_2px_rgb(15_23_42/0.04),0_24px_48px_-24px_rgb(15_23_42/0.18)]',
        className,
      )}
    >
      <div aria-hidden className="select-none">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
          <span className="flex gap-1">
            <span className="size-2 rounded-full bg-slate-200" />
            <span className="size-2 rounded-full bg-slate-200" />
            <span className="size-2 rounded-full bg-slate-200" />
          </span>
          <span className="mx-auto min-w-0 truncate rounded-md bg-slate-100 px-3 py-0.5 text-[11px] text-slate-500 tabular-nums">
            mydoctopus.tech/{path}
          </span>
          <span className="w-8" />
        </div>
        <div className="bg-slate-50 text-slate-900">{children}</div>
      </div>
    </figure>
  );
}
