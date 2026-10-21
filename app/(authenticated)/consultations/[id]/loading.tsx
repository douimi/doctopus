import { Skeleton } from '@/components/ui/skeleton';

/** Shown while the cockpit's server data loads (navigating from /today). */
export default function ConsultationLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement de la consultation">
      <div className="border-b border-border bg-card px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="mt-2 h-6 w-48" />
      </div>
      <div className="lg:grid lg:grid-cols-[18.75rem_minmax(0,1fr)]">
        <div className="hidden space-y-3 py-4 pl-8 lg:block">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="space-y-3 px-4 py-4 md:px-8">
          <div className="mx-auto max-w-4xl space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
