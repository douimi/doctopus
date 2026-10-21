import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatMad } from '@/lib/medications/format';
import type { OutstandingRow } from '@/lib/stats/queries';

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function OutstandingTable({ rows }: { rows: OutstandingRow[] }) {
  return (
    <div className="panel overflow-hidden">
      <Table density="compact">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead className="text-right">Prix</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Ouvrir</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmpty colSpan={4}>
              <EmptyState
                icon={CheckCircle2}
                title="Aucun paiement en attente"
                description="Toutes les consultations finalisées ont été encaissées."
              />
            </TableEmpty>
          ) : (
            rows.map((r) => (
              <TableRow key={r.consultationId}>
                <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">{fmtDate(r.finalizedAt)}</TableCell>
                <TableCell className="font-medium text-foreground">{r.patientFullName}</TableCell>
                <TableCell className="text-right font-medium tabular-nums text-warning-ink">{formatMad(r.priceMad)}</TableCell>
                <TableCell className="text-right pr-3">
                  <Link
                    href={`/consultations/${r.consultationId}`}
                    className="inline-flex size-8 items-center justify-center rounded-md text-subtle-foreground transition-colors duration-(--duration-fast) hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Ouvrir la consultation de ${r.patientFullName}`}
                  >
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
