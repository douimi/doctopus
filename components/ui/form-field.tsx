import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type FormFieldProps = {
  label: string;
  /** Hint shown under the control. */
  description?: ReactNode;
  /** Alias of `description` (spec naming). `description` wins when both are set. */
  hint?: ReactNode;
  /** Shows a quiet "Optionnel" marker next to the label — don't put "(optionnel)" in the label text. */
  optional?: boolean;
  error?: string | null;
  className?: string;
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
};

export function FormField({
  label,
  description,
  hint,
  optional,
  error,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const childId = isValidElement(children) ? (children.props as { id?: string }).id : undefined;
  const id = childId ?? generatedId;
  const help = description ?? hint;
  const descriptionId = help ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  const child = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })
    : children;

  return (
    <div className={cn('grid gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {optional ? (
          <span className="text-small text-subtle-foreground">Optionnel</span>
        ) : null}
      </div>
      {child}
      {help ? (
        <p id={descriptionId} className="text-small text-muted-foreground">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-center gap-1 text-small text-danger-ink">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
