import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Doctopus brand lockup — renders `public/logo.png` as-is, with no cropping.
 * The source PNG is ~square (mark + wordmark + tagline), so the rendered
 * box is square and the image fills it via object-contain.
 */
export function BrandLockup({
  size = 64,
  className,
  priority = true,
  alt = 'Doctopus',
}: {
  size?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  return (
    <Image
      src="/brand-logo.png"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      unoptimized
      className={cn('object-contain', className)}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Compact square mark for tight spaces. Same source PNG, smaller box.
 * Kept as an alias for callers that imported the previous icon-only API.
 */
export function BrandMark({
  size = 'md',
  className,
  alt = 'Doctopus',
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
}) {
  const px = size === 'sm' ? 28 : size === 'md' ? 36 : size === 'lg' ? 48 : 64;
  return <BrandLockup size={px} className={className} alt={alt} />;
}
