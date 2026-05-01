import Link from 'next/link';
import { requireSession } from '@/lib/auth/session';
import { searchPatients } from '@/lib/patients/queries';
import { ageFromDob } from '@/lib/patients/age';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookForm } from './form';

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function BookPage({ searchParams }: Props) {
  const session = await requireSession();
  const { q = '' } = await searchParams;
  const results = q.trim() ? await searchPatients(session.tenantId, q, { limit: 10 }) : [];

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/today" className="text-sm underline">
        ← Aujourd&apos;hui
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Nouveau rendez-vous</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex items-end gap-2" action="/today/book">
            <div className="flex-1 space-y-1">
              <Label htmlFor="q">Recherche patient</Label>
              <Input id="q" name="q" defaultValue={q} placeholder="nom, prénom, téléphone, CIN" />
            </div>
            <Button type="submit" variant="secondary">
              Rechercher
            </Button>
            <Link
              href={`/patients/new?next=${encodeURIComponent('/today/book')}`}
              className={buttonVariants()}
            >
              + Nouveau patient
            </Link>
          </form>

          {q.trim() ? (
            results.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun résultat.</p>
            ) : (
              <BookForm
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
  );
}
