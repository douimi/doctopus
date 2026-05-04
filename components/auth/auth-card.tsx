import type { ReactNode } from 'react';
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted">
      <Card className={cn('w-full max-w-sm', className)}>
        <CardContent className="space-y-4 py-6">
          <div className="space-y-1 text-center">
            <div className="text-display font-semibold text-primary">Doctopus</div>
            <h1 className="text-title font-medium">{title}</h1>
            {subtitle ? (
              <p className="text-small text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
