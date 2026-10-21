import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMad } from '@/lib/medications/format';
import { changeRatio } from '@/lib/stats/compare';
import type { MonthlyStatsRow } from '@/lib/stats/queries';
import { cn } from '@/lib/utils';

function Delta({ cur, prev }: { cur: number; prev: number }) {
  const r = changeRatio(cur, prev);
  if (r === null) return <span className="text-muted-foreground">—</span>;
  const pct = Math.round(r * 100);
  return (
    <span
      className={cn(
        'tabular-nums',
        pct > 0 ? 'text-success' : pct < 0 ? 'text-danger' : 'text-muted-foreground',
      )}
    >
      {pct > 0 ? '+' : pct < 0 ? '−' : ''}
      {Math.abs(pct)} %
    </span>
  );
}

/**
 * Month-by-month figures, most recent first, each compared with the
 * month just before it. The month name opens that month in the stats view.
 */
export function MonthlyTable({
  rows,
  labels,
  selected,
  runningMonth,
}: {
  /** Chronological (oldest first), as returned by getMonthlySeries. */
  rows: MonthlyStatsRow[];
  labels: Record<string, string>;
  selected: string | null;
  /** The in-progress month, flagged so its lower totals read as partial. */
  runningMonth: string;
}) {
  const ordered = rows.map((r, i) => ({ r, prev: rows[i - 1] ?? null })).reverse();
  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mois</TableHead>
            <TableHead className="text-right">Recettes</TableHead>
            <TableHead className="text-right">Évol.</TableHead>
            <TableHead className="text-right">Consultations</TableHead>
            <TableHead className="text-right">Évol.</TableHead>
            <TableHead className="text-right">Patients vus</TableHead>
            <TableHead className="text-right">Prix moyen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordered.map(({ r, prev }) => (
            <TableRow key={r.month} className={cn(r.month === selected && 'bg-primary-tint/50')}>
              <TableCell className="font-medium">
                <Link href={`/stats?month=${r.month}`} className="capitalize hover:underline">
                  {labels[r.month] ?? r.month}
                </Link>
                {r.month === runningMonth ? (
                  <span className="ml-1.5 text-small font-normal text-muted-foreground">(en cours)</span>
                ) : null}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatMad(r.revenue)}</TableCell>
              <TableCell className="text-right text-small">
                {prev ? <Delta cur={Number(r.revenue)} prev={Number(prev.revenue)} /> : '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">{r.totalCount}</TableCell>
              <TableCell className="text-right text-small">
                {prev ? <Delta cur={r.totalCount} prev={prev.totalCount} /> : '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">{r.patientCount}</TableCell>
              <TableCell className="text-right tabular-nums">
                {r.avgPrice ? formatMad(r.avgPrice) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
