import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

/**
 * Rendered when an authenticated page calls `notFound()` (e.g. a deleted
 * patient or consultation, or one from another cabinet).
 */
export default function AuthenticatedNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-16 text-center md:py-24">
      <div
        aria-hidden
        className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-inset ring-border"
      >
        <SearchX className="size-5" aria-hidden />
      </div>
      <h1 className="mt-4 text-title font-semibold text-foreground">Page introuvable</h1>
      <p className="mt-1 text-body text-muted-foreground">
        Cet élément n&apos;existe pas ou plus, ou n&apos;appartient pas à votre cabinet.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link href="/patients" className={buttonVariants({ variant: 'secondary' })}>
          Patients
        </Link>
        <Link href="/today" className={buttonVariants()}>
          Retour à Aujourd&apos;hui
        </Link>
      </div>
    </div>
  );
}
