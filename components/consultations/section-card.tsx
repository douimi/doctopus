import { ChevronRight } from 'lucide-react';

export function SectionCard({
  title,
  hint,
  defaultOpen = true,
  children,
}: {
  title: string;
  hint?: React.ReactNode;
  /** Collapsed sections still keep their content mounted (native <details>). */
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group/section panel overflow-hidden" open={defaultOpen}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 text-heading font-semibold transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring group-open/section:border-b group-open/section:border-border [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <ChevronRight
            className="size-4 text-subtle-foreground transition-transform group-open/section:rotate-90"
            aria-hidden
          />
          {title}
        </span>
        {hint ? (
          <span className="min-w-0 truncate text-small font-normal text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </summary>
      <div className="p-4">{children}</div>
    </details>
  );
}
