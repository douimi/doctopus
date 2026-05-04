import Link from 'next/link';
import { listTenantsForAdmin } from '@/lib/admin/queries';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

function fmtRelative(d: Date | null): string {
  if (!d) return '(jamais)';
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'à l\'instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export default async function AdminTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = '', status } = await searchParams;
  const statusFilter =
    status === 'active' || status === 'suspended' ? (status as 'active' | 'suspended') : undefined;
  const rows = await listTenantsForAdmin({ q, status: statusFilter });

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Cabinets</h1>
        <Link href="/admin/invites" className={buttonVariants()}>
          Créer une invitation
        </Link>
      </div>

      <form className="flex items-center gap-2" action="/admin/tenants">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Recherche : nom du cabinet, email du médecin"
          className="max-w-md"
        />
        {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
        <Button type="submit" variant="secondary">
          Rechercher
        </Button>
        <div className="flex gap-1 text-xs ml-2">
          <Link
            href={`/admin/tenants${q ? `?q=${encodeURIComponent(q)}` : ''}`}
            className={`px-2 py-1 border border-border rounded ${!statusFilter ? 'bg-muted' : ''}`}
          >
            Tous
          </Link>
          <Link
            href={`/admin/tenants?${q ? `q=${encodeURIComponent(q)}&` : ''}status=active`}
            className={`px-2 py-1 border border-border rounded ${statusFilter === 'active' ? 'bg-muted' : ''}`}
          >
            Actifs
          </Link>
          <Link
            href={`/admin/tenants?${q ? `q=${encodeURIComponent(q)}&` : ''}status=suspended`}
            className={`px-2 py-1 border border-border rounded ${statusFilter === 'suspended' ? 'bg-muted' : ''}`}
          >
            Suspendus
          </Link>
        </div>
      </form>

      <div className="border border-border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cabinet</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Médecin</TableHead>
              <TableHead>Assistant IA</TableHead>
              <TableHead>Modèle</TableHead>
              <TableHead>Crédits</TableHead>
              <TableHead>Dernière IA</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={8}>
                <EmptyState
                  icon={Building2}
                  title="Aucun cabinet."
                />
              </TableEmpty>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <StatusBadge variant={r.status === 'active' ? 'success' : 'danger'}>
                      {r.status === 'active' ? 'actif' : 'suspendu'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-xs">{r.doctorEmail ?? '—'}</TableCell>
                  <TableCell className="text-xs">{r.chatbotEnabled ? '✓ activé' : '✗'}</TableCell>
                  <TableCell className="text-xs">{r.chatbotModel ?? '—'}</TableCell>
                  <TableCell>~{r.chatbotCreditsBalance}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtRelative(r.lastAiUse)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/tenants/${r.id}`} className="text-xs underline">
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
  );
}
