import { PageBody } from '@/components/shell/page-body';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Generic skeleton for any authenticated page while its server data
 * streams in: title block, a KPI row and a list panel. Deliberately
 * shape-agnostic so it fits Today, lists and detail pages alike.
 */
export default function AuthenticatedLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Chargement…</span>
      <div className="mx-auto w-full max-w-7xl space-y-2 px-4 pt-6 pb-2 md:px-8 md:pt-8" aria-hidden>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <PageBody>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="panel space-y-3 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24" />
            </div>
          ))}
        </div>
        <div className="panel overflow-hidden" aria-hidden>
          <div className="flex h-10 items-center gap-4 border-b border-border bg-canvas px-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
          <ul className="divide-y divide-border">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-7 rounded-full" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="hidden h-4 w-24 sm:block" />
                <Skeleton className="ml-auto h-6 w-20" />
              </li>
            ))}
          </ul>
        </div>
      </PageBody>
    </div>
  );
}
