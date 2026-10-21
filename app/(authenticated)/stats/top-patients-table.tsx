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
import type { TopPatientRow } from '@/lib/stats/queries';

export function TopPatientsTable({ rows }: { rows: TopPatientRow[] }) {
  return (
    <div className="panel overflow-hidden">
      <Table density="compact">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead className="text-right">Consultations</TableHead>
            <TableHead className="text-right">Total payé</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmpty colSpan={4}>
              <EmptyState size="sm" title="Pas de patients sur la période" />
            </TableEmpty>
          ) : (
            rows.map((r, i) => (
              <TableRow key={r.patientId}>
                <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                <TableCell className="font-medium text-foreground">{r.patientFullName}</TableCell>
                <TableCell className="text-right tabular-nums">{r.consultationCount}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMad(r.revenue)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
