import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead className="text-right">Prix</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmpty colSpan={4}>
              <EmptyState title="Aucun paiement en attente" />
            </TableEmpty>
          ) : (
            rows.map((r) => (
              <TableRow key={r.consultationId}>
                <TableCell className="text-small text-muted-foreground tabular-nums">{fmtDate(r.finalizedAt)}</TableCell>
                <TableCell className="font-medium">{r.patientFullName}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMad(r.priceMad)}</TableCell>
                <TableCell className="text-right pr-3">
                  <Link
                    href={`/consultations/${r.consultationId}`}
                    className="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Ouvrir la consultation"
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
