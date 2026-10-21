import { cn } from '@/lib/utils';

function initials(input: string): string {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export type AvatarProps = {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'primary' | 'admin' | 'muted';
  className?: string;
};

const SIZE: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'size-7 text-micro font-semibold',
  md: 'size-8 text-small font-semibold',
  lg: 'size-11 text-body font-semibold',
};

const TONE: Record<NonNullable<AvatarProps['tone']>, string> = {
  primary: 'bg-primary-tint text-primary-ink',
  admin: 'bg-admin-tint text-admin-ink',
  muted: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
};

export function Avatar({
  name,
  size = 'md',
  tone = 'primary',
  className,
}: AvatarProps) {
  return (
    <span
      aria-hidden
      data-slot="avatar"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-pill tabular-nums tracking-normal select-none',
        SIZE[size],
        TONE[tone],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
