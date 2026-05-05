import Link from 'next/link';
import { ArrowLeft, Plus, Search, UserSearch } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { searchPatients } from '@/lib/patients/queries';
import { ageFromDob } from '@/lib/patients/age';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shell/page-header';
import { WalkInForm } from './form';

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function WalkInPage({ searchParams }: Props) {
  const session = await requireSession();
  const { q = '' } = await searchParams;
  const results = q.trim() ? await searchPatients(session.tenantId, q, { limit: 10 }) : [];

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

      <div className="px-6 py-6">
        <div className="max-w-2xl space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <form className="flex flex-wrap items-end gap-2" action="/today/walk-in">
                <FormField label="Recherche patient" className="flex-1 min-w-[240px]">
                  <div className="relative">
                    <Search
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
                      aria-hidden
                    />
                    <Input
                      id="q"
                      name="q"
                      defaultValue={q}
                      placeholder="nom, prénom, téléphone, CIN"
                      className="pl-8"
                    />
                  </div>
                </FormField>
                <Button type="submit" variant="secondary">
                  Rechercher
                </Button>
                <Link
                  href={`/patients/new?next=${encodeURIComponent('/today/walk-in')}`}
                  className={buttonVariants()}
                >
                  <Plus aria-hidden />
                  Nouveau patient
                </Link>
              </form>

              {q.trim() ? (
                results.length === 0 ? (
                  <EmptyState
                    icon={UserSearch}
                    title="Aucun résultat"
                    description={`Aucun patient ne correspond à « ${q} ».`}
                  />
                ) : (
                  <WalkInForm
                    results={results.map((r) => ({
                      id: r.id,
                      name: `${r.lastName} ${r.firstName}`,
                      meta: `${ageFromDob(r.dateOfBirth)} ans${r.phone ? ` · ${r.phone}` : ''}`,
                    }))}
                  />
                )
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
