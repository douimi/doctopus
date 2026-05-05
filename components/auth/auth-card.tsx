import type { ReactNode } from 'react';
import { BrandLockup } from '@/components/ui/brand';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function AuthCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-muted/40"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at top, var(--primary-tint) 0%, transparent 60%)',
      }}
    >
      <div className="w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center text-center">
          <BrandLockup size={220} />
        </div>
        <Card className={cn('w-full', className)}>
          <CardContent className="space-y-5 py-6">
            <div className="space-y-1 text-center">
              <h1 className="text-title font-semibold tracking-tight">{title}</h1>
              {subtitle ? (
                <p className="text-small text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
