import { Mail } from 'lucide-react';
import { listInvitesForAdmin } from '@/lib/admin/queries';
import { EmptyState } from '@/components/ui/empty-state';
import { Section } from '@/components/ui/section';
import { StatusBadge } from '@/components/ui/status-badge';
import type { StatusBadgeProps } from '@/components/ui/status-badge';
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
import { CreateInviteForm } from './create-form';
import { RevokeInviteButton } from './revoke-button';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  consumed: 'Acceptée',
  expired: 'Expirée',
  revoked: 'Révoquée',
};

const STATUS_VARIANT: Record<string, StatusBadgeProps['variant']> = {
  pending: 'warning',
  consumed: 'success',
  expired: 'neutral',
  revoked: 'neutral',
};

const KIND_LABEL: Record<string, string> = {
  tenant_owner: 'Médecin',
  assistant: 'Assistant(e)',
};

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminInvitesPage() {
  const rows = await listInvitesForAdmin({ limit: 100 });
  const pending = rows.filter((r) => r.status === 'pending').length;
  return (
    <>
      <PageHeader
        title="Invitations"
        description="Invitez un médecin à créer son cabinet, et suivez les invitations envoyées."
      />
      <PageBody>
        <CreateInviteForm />

        <Section
          title="Invitations envoyées"
          count={rows.length}
          description={
            rows.length > 0
              ? `${pending} en attente · 100 plus récentes`
              : undefined
          }
        >
          <div className="panel overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden md:table-cell">Cabinet</TableHead>
                  <TableHead className="hidden lg:table-cell">Créée</TableHead>
                  <TableHead className="hidden md:table-cell">Expire</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableEmpty colSpan={7}>
                    <EmptyState
                      icon={Mail}
                      title="Aucune invitation"
                      description="Créez une première invitation ci-dessus : le lien s'affichera ici pour être copié."
                    />
                  </TableEmpty>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-64">
                        <div className="truncate font-medium text-foreground">
                          {r.emailHint ?? '—'}
                        </div>
                        <div className="text-small text-muted-foreground sm:hidden">
                          {KIND_LABEL[r.kind] ?? r.kind}
                          {r.tenantName ? ` · ${r.tenantName}` : ''}
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {KIND_LABEL[r.kind] ?? r.kind}
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={STATUS_VARIANT[r.status]}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {r.tenantName ?? '—'}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground tabular-nums lg:table-cell">
                        {fmtDate(r.createdAt)}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground tabular-nums md:table-cell">
                        {fmtDate(r.expiresAt)}
                      </TableCell>
                      <TableCell className="pr-3 text-right">
                        {r.status === 'pending' ? (
                          <RevokeInviteButton inviteId={r.id} email={r.emailHint ?? null} />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Section>
      </PageBody>
    </>
  );
}
