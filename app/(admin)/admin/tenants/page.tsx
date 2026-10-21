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
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function fmtRelative(d: Date | string | null): string {
  if (!d) return 'jamais';
  const dt = typeof d === 'string' ? new Date(d) : d;
  const diffMs = Date.now() - dt.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

function filterHref(q: string, status?: 'active' | 'suspended'): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  const qs = params.toString();
  return qs ? `/admin/tenants?${qs}` : '/admin/tenants';
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
  const filtered = Boolean(q || statusFilter);

  return (
    <>
      <PageHeader
        title="Cabinets"
        description="Tous les cabinets de la plateforme : statut, assistant IA et crédits."
        actions={
          <Link href="/admin/invites" className={buttonVariants()}>
            <Mail aria-hidden />
            Créer une invitation
          </Link>
        }
      />
      <PageBody>
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="flex w-full flex-1 items-center gap-2 sm:w-auto sm:min-w-72 sm:max-w-md"
            action="/admin/tenants"
            role="search"
          >
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground"
                aria-hidden
              />
              <Input
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Recherche : nom du cabinet, email du médecin"
                className="pl-9"
                aria-label="Rechercher un cabinet"
              />
            </div>
            {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
            <Button type="submit" variant="secondary">
              Rechercher
            </Button>
          </form>
          <div className="flex items-center gap-1.5" aria-label="Filtrer par statut" role="group">
            <FilterPill href={filterHref(q)} active={!statusFilter}>
              Tous
            </FilterPill>
            <FilterPill href={filterHref(q, 'active')} active={statusFilter === 'active'}>
              Actifs
            </FilterPill>
            <FilterPill href={filterHref(q, 'suspended')} active={statusFilter === 'suspended'}>
              Suspendus
            </FilterPill>
          </div>
          <span className="ml-auto text-small text-muted-foreground tabular-nums">
            {rows.length} cabinet{rows.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cabinet</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden lg:table-cell">Médecin</TableHead>
                <TableHead className="hidden md:table-cell">Assistant IA</TableHead>
                <TableHead className="hidden xl:table-cell">Modèle</TableHead>
                <TableHead className="text-right">Crédits</TableHead>
                <TableHead className="hidden md:table-cell">Dernière IA</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Ouvrir</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={8}>
                  <EmptyState
                    icon={Building2}
                    title={filtered ? 'Aucun cabinet trouvé' : 'Aucun cabinet'}
                    description={
                      q
                        ? `Aucun résultat pour « ${q} ». Vérifiez l'orthographe ou cherchez par email du médecin.`
                        : statusFilter
                          ? `Aucun cabinet ${statusFilter === 'active' ? 'actif' : 'suspendu'}.`
                          : "Les cabinets apparaissent ici dès qu'un médecin accepte son invitation."
                    }
                    action={
                      filtered ? (
                        <Link
                          href="/admin/tenants"
                          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                        >
                          Effacer les filtres
                        </Link>
                      ) : (
                        <Link
                          href="/admin/invites"
                          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                        >
                          Inviter un médecin
                        </Link>
                      )
                    }
                  />
                </TableEmpty>
              ) : (
                rows.map((r) => {
                  const lowCredits = r.chatbotEnabled && r.chatbotCreditsBalance <= 0;
                  return (
                    <TableRow key={r.id} className="group">
                      <TableCell className="max-w-72">
                        <Link
                          href={`/admin/tenants/${r.id}`}
                          className="flex min-w-0 items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <Avatar name={r.name} size="sm" tone="muted" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground group-hover:text-primary">
                              {r.name}
                            </span>
                            <span className="block truncate text-small text-muted-foreground lg:hidden">
                              {r.doctorEmail ?? 'Aucun médecin'}
                            </span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={r.status === 'active' ? 'success' : 'danger'}>
                          {r.status === 'active' ? 'Actif' : 'Suspendu'}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="hidden max-w-64 truncate text-muted-foreground lg:table-cell">
                        {r.doctorEmail ?? '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {r.chatbotEnabled ? (
                          <StatusBadge variant="info" icon={Sparkles}>
                            Activé
                          </StatusBadge>
                        ) : (
                          <StatusBadge variant="neutral">Désactivé</StatusBadge>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-small text-muted-foreground xl:table-cell">
                        {r.chatbotModel ?? '—'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums',
                          lowCredits ? 'font-medium text-warning-ink' : 'text-foreground',
                        )}
                        title={lowCredits ? 'Plus de crédits IA' : undefined}
                      >
                        {r.chatbotCreditsBalance}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground tabular-nums md:table-cell">
                        {fmtRelative(r.lastAiUse)}
                      </TableCell>
                      <TableCell className="pr-3 text-right">
                        <Link
                          href={`/admin/tenants/${r.id}`}
                          tabIndex={-1}
                          aria-hidden
                          className="inline-flex size-8 items-center justify-center rounded-md text-subtle-foreground transition-colors duration-(--duration-fast) hover:bg-muted group-hover:text-primary"
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
      </PageBody>
    </>
  );
}
