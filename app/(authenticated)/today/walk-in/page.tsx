import Link from 'next/link';
import { requireSession } from '@/lib/auth/session';
import { searchPatients } from '@/lib/patients/queries';
import { ageFromDob } from '@/lib/patients/age';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <PageHeader title="Walk-in" />

      <div className="px-6 py-6">
        <div className="max-w-2xl space-y-4">
          <Link href="/today" className="text-sm underline">
            ← Aujourd&apos;hui
          </Link>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <form className="flex items-end gap-2" action="/today/walk-in">
                <div className="flex-1">
                  <FormField label="Recherche patient">
                    <Input id="q" name="q" defaultValue={q} placeholder="nom, prénom, téléphone, CIN" />
                  </FormField>
                </div>
                <Button type="submit" variant="secondary">
                  Rechercher
                </Button>
                <Link
                  href={`/patients/new?next=${encodeURIComponent('/today/walk-in')}`}
                  className={buttonVariants()}
                >
                  + Nouveau patient
                </Link>
              </form>

              {q.trim() ? (
                results.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun résultat.</p>
                ) : (
                  <WalkInForm
                    results={results.map((r) => ({
                      id: r.id,
                      label: `${r.lastName} ${r.firstName} · ${ageFromDob(r.dateOfBirth)} ans${
                        r.phone ? ` · ${r.phone}` : ''
                      }`,
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
