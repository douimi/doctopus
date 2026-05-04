import Link from 'next/link';
import { requireSession } from '@/lib/auth/session';
import { searchPatients } from '@/lib/patients/queries';
import { ageFromDob } from '@/lib/patients/age';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shell/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';

type Props = {
  searchParams: Promise<{ q?: string; archived?: string }>;
};

export default async function PatientsPage({ searchParams }: Props) {
  const session = await requireSession();
  const { q = '', archived } = await searchParams;
  const includeArchived = archived === '1';
  const rows = await searchPatients(session.tenantId, q, { includeArchived });

  return (
    <>
      <PageHeader
        title="Patients"
        actions={
          <Link href="/patients/new" className={buttonVariants()}>
            Nouveau patient
          </Link>
        }
      />

      <div className="px-6 py-6 space-y-4">
        <form className="flex items-center gap-2" action="/patients">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Recherche : nom, prénom, téléphone, CIN"
            className="max-w-md"
          />
          {includeArchived ? <input type="hidden" name="archived" value="1" /> : null}
          <Button type="submit" variant="secondary">
            Rechercher
          </Button>
          <Link
            href={
              includeArchived
                ? `/patients?q=${encodeURIComponent(q)}`
                : `/patients?q=${encodeURIComponent(q)}&archived=1`
            }
            className="text-sm underline"
          >
            {includeArchived ? 'Masquer archivés' : 'Voir archivés'}
          </Link>
        </form>

        <div className="border border-border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Âge</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>CIN</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={6}>
                  <EmptyState icon={Users} title="Aucun patient." />
                </TableEmpty>
              ) : (
                rows.map((p) => (
                  <TableRow key={p.id} className={p.isArchived ? 'opacity-60' : ''}>
                    <TableCell>{p.lastName}</TableCell>
                    <TableCell>{p.firstName}</TableCell>
                    <TableCell>{ageFromDob(p.dateOfBirth)} ans</TableCell>
                    <TableCell>{p.phone ?? '—'}</TableCell>
                    <TableCell>{p.cin ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/patients/${p.id}`} className="underline">
                        Ouvrir
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
