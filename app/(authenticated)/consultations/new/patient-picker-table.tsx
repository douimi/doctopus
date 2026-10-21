import Link from 'next/link';
import { ArrowRight, UserSearch } from 'lucide-react';
import { formatAge } from '@/lib/patients/age';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type PickerRow = {
  id: string;
  lastName: string;
  firstName: string;
  dateOfBirth: string | null;
  phone: string | null;
  cin: string | null;
};

/**
 * Patient-selection table shared by /consultations/new and /suivis/new.
 * Clicking the name or "Choisir" selects the patient (never navigates to
 * the patient file), so both pickers behave the same way.
 */
export function PatientPickerTable({
  rows,
  query,
  hrefFor,
  actionLabel,
}: {
  rows: readonly PickerRow[];
  query: string;
  hrefFor: (patientId: string) => string;
  /** Accessible label for the selection link, e.g. "Créer un suivi pour". */
  actionLabel: string;
}) {
  return (
    <div className="panel overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Âge</TableHead>
            <TableHead className="hidden sm:table-cell">Téléphone</TableHead>
            <TableHead className="hidden md:table-cell">CIN</TableHead>
            <TableHead className="w-28">
              <span className="sr-only">Action</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmpty colSpan={5}>
              <EmptyState
                icon={UserSearch}
                title={query ? 'Aucun résultat' : 'Aucun patient enregistré'}
                description={
                  query
                    ? `Aucun patient ne correspond à « ${query} ».`
                    : 'Créez un patient pour commencer.'
                }
              />
            </TableEmpty>
          ) : (
            rows.map((p) => {
              const fullName = `${p.lastName} ${p.firstName}`;
              const href = hrefFor(p.id);
              return (
                <TableRow key={p.id} className="group/row">
                  <TableCell className="py-2">
                    <Link
                      href={href}
                      className="-mx-4 -my-2 flex items-center gap-3 px-4 py-2 focus-visible:bg-muted/60 focus-visible:outline-none"
                      aria-label={`${actionLabel} ${fullName}`}
                    >
                      <Avatar name={fullName} size="sm" />
                      <span className="font-medium text-foreground transition-colors duration-(--duration-fast) group-hover/row:text-primary">
                        {fullName}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatAge(p.dateOfBirth)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                    {p.phone ?? '—'}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                    {p.cin ?? '—'}
                  </TableCell>
                  <TableCell className="pr-3 text-right">
                    <Link
                      href={href}
                      tabIndex={-1}
                      aria-hidden
                      className={buttonVariants({ size: 'sm', variant: 'secondary' })}
                    >
                      Choisir
                      <ArrowRight aria-hidden />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
