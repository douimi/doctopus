import { ChevronRight } from 'lucide-react';

export function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <details
      className="group/section rounded-xl border border-border bg-card shadow-card overflow-hidden"
      open
    >
      <summary className="cursor-pointer list-none px-4 py-3 font-medium text-heading border-b border-border bg-muted/30 flex items-center justify-between gap-2 transition-colors hover:bg-muted/50">
        <span className="flex items-center gap-2">
          <ChevronRight
            className="size-4 text-muted-foreground transition-transform group-open/section:rotate-90"
            aria-hidden
          />
          {title}
        </span>
        {hint ? (
          <span className="text-small text-muted-foreground">{hint}</span>
        ) : null}
      </summary>
      <div className="p-4">{children}</div>
    </details>
  );
}
