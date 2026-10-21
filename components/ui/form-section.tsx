import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Grouped block of fields inside a form card ("Identité", "Coordonnées"…).
 * Sections after the first get a hairline separator.
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset
      className={cn(
        'grid min-w-0 gap-4 border-t border-border pt-5 first:border-t-0 first:pt-0',
        className,
      )}
    >
      <legend className="eyebrow float-left mb-1 w-full">{title}</legend>
      {description ? (
        <p className="-mt-2 text-small text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </fieldset>
  );
}
