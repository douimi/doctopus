'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';

/**
 * Error boundary for every authenticated page. The shell (sidebar, nav)
 * stays mounted because it lives in the layout above this boundary.
 * Server errors arrive with a generic message in production, so we never
 * show `error.message` — only the digest, to quote to support.
 */
export default function AuthenticatedError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-16 text-center md:py-24">
      <div
        aria-hidden
        className="flex size-10 items-center justify-center rounded-lg bg-danger-tint text-danger-ink ring-1 ring-inset ring-danger/20"
      >
        <TriangleAlert className="size-5" aria-hidden />
      </div>
      <h1 className="mt-4 text-title font-semibold text-foreground">
        Une erreur est survenue
      </h1>
      <p className="mt-1 text-body text-muted-foreground">
        La page n&apos;a pas pu être chargée. Vos données enregistrées ne sont pas
        perdues. Réessayez ; si le problème persiste, contactez le support.
      </p>
      {error.digest ? (
        <p className="mt-2 text-small text-subtle-foreground tabular-nums">
          Référence : {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link href="/today" className={buttonVariants({ variant: 'secondary' })}>
          Retour à Aujourd&apos;hui
        </Link>
        <Button onClick={() => unstable_retry()}>
          <RotateCcw aria-hidden />
          Réessayer
        </Button>
      </div>
    </div>
  );
}
