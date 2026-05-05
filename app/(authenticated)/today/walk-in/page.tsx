import Link from 'next/link';
import { ArrowLeft, Plus, UserSearch } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { searchPatients } from '@/lib/patients/queries';
import { ageFromDob } from '@/lib/patients/age';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LiveSearchInput } from '@/components/ui/live-search-input';
import { PageHeader } from '@/components/shell/page-header';
import { WalkInForm } from './form';

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function WalkInPage({ searchParams }: Props) {
  const session = await requireSession();
  const { q = '' } = await searchParams;
  const trimmed = q.trim();
  const results = await searchPatients(session.tenantId, trimmed, { limit: 60 });

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href="/today"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            style={{ transitionDuration: 'var(--duration-fast)' }}
          >
            <ArrowLeft className="size-3" aria-hidden />
            Aujourd&apos;hui
          </Link>
        }
        title="Walk-in"
        description="Mettez un patient en salle d'attente sans rendez-vous préalable."
      />

      <div className="px-6 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <LiveSearchInput
            defaultQuery={q}
            placeholder="Rechercher : nom, prénom, téléphone, CIN"
          />
          <Link
            href={`/patients/new?next=${encodeURIComponent('/today/walk-in')}`}
            className={buttonVariants()}
          >
            <Plus aria-hidden />
            Nouveau patient
          </Link>
          <span className="text-small text-muted-foreground ml-auto tabular-nums">
            {results.length} patient{results.length === 1 ? '' : 's'}
            {trimmed ? ' trouvés' : ' affichés'}
          </span>
        </div>

        {results.length === 0 ? (
          <div className="rounded-xl border border-border bg-card shadow-card">
            <EmptyState
              icon={UserSearch}
              title={trimmed ? 'Aucun résultat' : 'Aucun patient enregistré'}
              description={
                trimmed
                  ? `Aucun patient ne correspond à « ${trimmed} ».`
                  : 'Créez un patient pour commencer.'
              }
            />
          </div>
        ) : (
          <WalkInForm
            results={results.map((r) => ({
              id: r.id,
              firstName: r.firstName,
              lastName: r.lastName,
              age: ageFromDob(r.dateOfBirth),
              phone: r.phone,
              cin: r.cin,
            }))}
          />
        )}
      </div>
    </>
  );
}
