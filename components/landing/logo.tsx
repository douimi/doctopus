import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * DOCTOPUS lockup for the landing. Unlike components/ui/brand.tsx (which
 * ships the 6250 px / 470 KB PNG `unoptimized`), this goes through the
 * Next image optimizer so visitors download a few-KB, correctly sized
 * WebP/AVIF. `sizes` matches the rendered box.
 */
export function LandingLogo({
  size,
  priority = false,
  className,
}: {
  size: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/brand-logo.png"
      alt="Doctopus"
      width={size}
      height={size}
      sizes={`${size}px`}
      priority={priority}
      className={cn('object-contain', className)}
      style={{ width: size, height: size }}
    />
  );
}
