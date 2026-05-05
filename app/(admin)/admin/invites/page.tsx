import { Mail, Trash2 } from 'lucide-react';
import { listInvitesForAdmin } from '@/lib/admin/queries';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
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
import { PageHeader } from '@/components/shell/page-header';
import { adminRevokeInviteAction } from './actions';
import { CreateInviteForm } from './create-form';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  consumed: 'Acceptée',
  expired: 'Expirée',
  revoked: 'Révoquée',
};

const STATUS_VARIANT: Record<string, StatusBadgeProps['variant']> = {
  pending: 'info',
  consumed: 'success',
  expired: 'neutral',
  revoked: 'danger',
};

export default async function AdminInvitesPage() {
  const rows = await listInvitesForAdmin({ limit: 100 });
  return (
    <>
      <PageHeader
        title="Invitations"
        description="Créez et gérez les invitations médecin pour la plateforme."
      />
      <div className="px-6 py-6 space-y-4">
        <CreateInviteForm />

        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Cabinet</TableHead>
                <TableHead>Créée</TableHead>
                <TableHead>Expire</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={7}>
                  <EmptyState
                    icon={Mail}
                    title="Aucune invitation"
                    description="Créez une invitation pour commencer."
                  />
                </TableEmpty>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium tabular-nums">
                      {r.emailHint ?? '—'}
                    </TableCell>
                    <TableCell className="text-small text-muted-foreground capitalize">
                      {r.kind}
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={STATUS_VARIANT[r.status]}>
                        {STATUS_LABEL[r.status]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-small text-muted-foreground">
                      {r.tenantName ?? '—'}
                    </TableCell>
                    <TableCell className="text-small text-muted-foreground tabular-nums">
                      {new Date(r.createdAt).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-small text-muted-foreground tabular-nums">
                      {new Date(r.expiresAt).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-right pr-3">
                      {r.status === 'pending' ? (
                        <form action={adminRevokeInviteAction}>
                          <input type="hidden" name="inviteId" value={r.id} />
                          <Button
                            type="submit"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Révoquer l'invitation ${r.emailHint ?? ''}`}
                            title="Révoquer"
                            className="text-muted-foreground hover:text-danger"
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </form>
                      ) : null}
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
