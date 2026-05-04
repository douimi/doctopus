import { listInvitesForAdmin } from '@/lib/admin/queries';
import { CreateInviteForm } from './create-form';
import { adminRevokeInviteAction } from './actions';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Mail } from 'lucide-react';
import type { StatusBadgeProps } from '@/components/ui/status-badge';

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
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-xl font-semibold">Invitations</h1>
      <CreateInviteForm />

      <div className="border border-border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Cabinet</TableHead>
              <TableHead>Créée</TableHead>
              <TableHead>Expire</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={7}>
                <EmptyState icon={Mail} title="Aucune invitation." />
              </TableEmpty>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.emailHint ?? '—'}</TableCell>
                  <TableCell className="text-xs">{r.kind}</TableCell>
                  <TableCell>
                    <StatusBadge variant={STATUS_VARIANT[r.status]}>
                      {STATUS_LABEL[r.status]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-xs">{r.tenantName ?? '—'}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(r.createdAt).toLocaleString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(r.expiresAt).toLocaleString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    {r.status === 'pending' ? (
                      <form action={adminRevokeInviteAction}>
                        <input type="hidden" name="inviteId" value={r.id} />
                        <button
                          type="submit"
                          className="text-xs text-danger underline"
                        >
                          Révoquer
                        </button>
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
  );
}
