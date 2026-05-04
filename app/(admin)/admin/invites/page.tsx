import { listInvitesForAdmin } from '@/lib/admin/queries';
import { CreateInviteForm } from './create-form';
import { adminRevokeInviteAction } from './actions';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  consumed: 'Acceptée',
  expired: 'Expirée',
  revoked: 'Révoquée',
};

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-800',
  consumed: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-700',
  revoked: 'bg-red-100 text-red-800',
};

export default async function AdminInvitesPage() {
  const rows = await listInvitesForAdmin({ limit: 100 });
  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-xl font-semibold">Invitations</h1>
      <CreateInviteForm />

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Statut</th>
              <th className="text-left p-2">Cabinet</th>
              <th className="text-left p-2">Créée</th>
              <th className="text-left p-2">Expire</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-3 text-center text-gray-500">
                  Aucune invitation.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2 text-xs">{r.emailHint ?? '—'}</td>
                  <td className="p-2 text-xs">{r.kind}</td>
                  <td className="p-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${STATUS_CLASS[r.status]}`}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="p-2 text-xs">{r.tenantName ?? '—'}</td>
                  <td className="p-2 text-xs">
                    {new Date(r.createdAt).toLocaleString('fr-FR')}
                  </td>
                  <td className="p-2 text-xs">
                    {new Date(r.expiresAt).toLocaleString('fr-FR')}
                  </td>
                  <td className="p-2">
                    {r.status === 'pending' ? (
                      <form action={adminRevokeInviteAction}>
                        <input type="hidden" name="inviteId" value={r.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-600 underline"
                        >
                          Révoquer
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
