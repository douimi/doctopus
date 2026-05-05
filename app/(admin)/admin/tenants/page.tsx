import Link from 'next/link';
import { ArrowRight, Building2, Mail, Search, Sparkles } from 'lucide-react';
import { listTenantsForAdmin } from '@/lib/admin/queries';
import { Avatar } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterPill } from '@/components/ui/filter-pill';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/shell/page-header';

export const dynamic = 'force-dynamic';

function fmtRelative(d: Date | null): string {
  if (!d) return 'jamais';
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "à l'instant";
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
    <>
      <PageHeader
        title="Cabinets"
        description="Gérez tous les cabinets de la plateforme."
        actions={
          <Link href="/admin/invites" className={buttonVariants()}>
            <Mail aria-hidden />
            Créer une invitation
          </Link>
        }
      />
      <div className="px-6 py-6 space-y-4">
        <form
          className="flex flex-wrap items-center gap-2"
          action="/admin/tenants"
        >
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Recherche : nom du cabinet, email du médecin"
              className="pl-8"
              aria-label="Rechercher un cabinet"
            />
          </div>
          {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
          <Button type="submit" variant="secondary">
            Rechercher
          </Button>
          <div className="flex items-center gap-1 ml-1">
            <FilterPill
              href={`/admin/tenants${q ? `?q=${encodeURIComponent(q)}` : ''}`}
              active={!statusFilter}
            >
              Tous
            </FilterPill>
            <FilterPill
              href={`/admin/tenants?${q ? `q=${encodeURIComponent(q)}&` : ''}status=active`}
              active={statusFilter === 'active'}
            >
              Actifs
            </FilterPill>
            <FilterPill
              href={`/admin/tenants?${q ? `q=${encodeURIComponent(q)}&` : ''}status=suspended`}
              active={statusFilter === 'suspended'}
            >
              Suspendus
            </FilterPill>
          </div>
        </form>

        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
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
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={8}>
                  <EmptyState
                    icon={Building2}
                    title="Aucun cabinet"
                    description={
                      q ? `Aucun résultat pour « ${q} ».` : 'Aucun cabinet enregistré.'
                    }
                  />
                </TableEmpty>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.name} size="sm" tone="admin" />
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={r.status === 'active' ? 'success' : 'danger'}>
                        {r.status === 'active' ? 'Actif' : 'Suspendu'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-small text-muted-foreground">
                      {r.doctorEmail ?? '—'}
                    </TableCell>
                    <TableCell>
                      {r.chatbotEnabled ? (
                        <StatusBadge variant="info" icon={Sparkles}>
                          Activé
                        </StatusBadge>
                      ) : (
                        <StatusBadge variant="neutral">Désactivé</StatusBadge>
                      )}
                    </TableCell>
                    <TableCell className="text-small text-muted-foreground tabular-nums">
                      {r.chatbotModel ?? '—'}
                    </TableCell>
                    <TableCell className="tabular-nums">~{r.chatbotCreditsBalance}</TableCell>
                    <TableCell className="text-small text-muted-foreground tabular-nums">
                      {fmtRelative(r.lastAiUse)}
                    </TableCell>
                    <TableCell className="text-right pr-3">
                      <Link
                        href={`/admin/tenants/${r.id}`}
                        className="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-admin hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        style={{ transitionDuration: 'var(--duration-fast)' }}
                        aria-label={`Ouvrir ${r.name}`}
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
      </div>
    </>
  );
}
