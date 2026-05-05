import Link from 'next/link';
import { ArrowRight, Plus, Users } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { searchPatients } from '@/lib/patients/queries';
import { ageFromDob } from '@/lib/patients/age';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { LiveSearchInput } from '@/components/ui/live-search-input';
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
        description="Recherchez un dossier ou créez un nouveau patient."
        actions={
          <Link href="/patients/new" className={buttonVariants()}>
            <Plus aria-hidden />
            Nouveau patient
          </Link>
        }
      />

      <div className="px-6 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <LiveSearchInput
            defaultQuery={q}
            placeholder="Recherche : nom, prénom, téléphone, CIN"
          />
          <Link
            href={
              includeArchived
                ? `/patients?q=${encodeURIComponent(q)}`
                : `/patients?q=${encodeURIComponent(q)}&archived=1`
            }
            className={buttonVariants({ variant: 'ghost', size: 'default' })}
          >
            {includeArchived ? 'Masquer archivés' : 'Voir archivés'}
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Âge</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>CIN</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5}>
                  <EmptyState
                    icon={Users}
                    title="Aucun patient"
                    description={
                      q
                        ? `Aucun résultat pour « ${q} ».`
                        : 'Créez votre premier patient pour commencer.'
                    }
                  />
                </TableEmpty>
              ) : (
                rows.map((p) => {
                  const fullName = `${p.lastName} ${p.firstName}`;
                  return (
                    <TableRow
                      key={p.id}
                      className={
                        p.isArchived
                          ? 'opacity-60 group/row'
                          : 'group/row cursor-pointer'
                      }
                    >
                      <TableCell className="py-2">
                        <Link
                          href={`/patients/${p.id}`}
                          className="flex items-center gap-3 -mx-3 -my-2 px-3 py-2 focus-visible:outline-none focus-visible:bg-muted/60"
                          aria-label={`Ouvrir le dossier de ${fullName}`}
                        >
                          <Avatar name={fullName} size="md" />
                          <span className="font-medium text-foreground">
                            {fullName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {ageFromDob(p.dateOfBirth)} ans
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {p.phone ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {p.cin ?? '—'}
                      </TableCell>
                      <TableCell className="text-right pr-3">
                        <Link
                          href={`/patients/${p.id}`}
                          className="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                          style={{ transitionDuration: 'var(--duration-fast)' }}
                          aria-label={`Ouvrir ${fullName}`}
                        >
                          <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
