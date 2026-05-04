import { cloneElement, isValidElement, useId, type ReactElement } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type FormFieldProps = {
  label: string;
  description?: string;
  error?: string | null;
  className?: string;
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
};

export function FormField({
  label,
  description,
  error,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const childId = isValidElement(children) ? (children.props as { id?: string }).id : undefined;
  const id = childId ?? generatedId;
  const descriptionId = description ? `${id}-description` : undefined;
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
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={id} className="text-small font-medium">
        {label}
      </Label>
      {description ? (
        <p id={descriptionId} className="text-small text-muted-foreground">
          {description}
        </p>
      ) : null}
      {child}
      {error ? (
        <p id={errorId} className="text-small text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
