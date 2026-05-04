import Link from 'next/link';
import { listTenantsForAdmin } from '@/lib/admin/queries';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';

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
            className={`px-2 py-1 border rounded ${!statusFilter ? 'bg-gray-100' : ''}`}
          >
            Tous
          </Link>
          <Link
            href={`/admin/tenants?${q ? `q=${encodeURIComponent(q)}&` : ''}status=active`}
            className={`px-2 py-1 border rounded ${statusFilter === 'active' ? 'bg-gray-100' : ''}`}
          >
            Actifs
          </Link>
          <Link
            href={`/admin/tenants?${q ? `q=${encodeURIComponent(q)}&` : ''}status=suspended`}
            className={`px-2 py-1 border rounded ${statusFilter === 'suspended' ? 'bg-gray-100' : ''}`}
          >
            Suspendus
          </Link>
        </div>
      </form>

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-2">Cabinet</th>
              <th className="text-left p-2">Statut</th>
              <th className="text-left p-2">Médecin</th>
              <th className="text-left p-2">Assistant IA</th>
              <th className="text-left p-2">Modèle</th>
              <th className="text-left p-2">Crédits</th>
              <th className="text-left p-2">Dernière IA</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">
                  Aucun cabinet.{' '}
                  <Link href="/admin/invites" className="underline">
                    Créez une invitation médecin pour commencer.
                  </Link>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2 font-medium">{r.name}</td>
                  <td className="p-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${r.status === 'active' ? 'text-green-700' : 'text-red-700'}`}
                    >
                      ● {r.status === 'active' ? 'actif' : 'suspendu'}
                    </span>
                  </td>
                  <td className="p-2 text-xs">{r.doctorEmail ?? '—'}</td>
                  <td className="p-2 text-xs">{r.chatbotEnabled ? '✓ activé' : '✗'}</td>
                  <td className="p-2 text-xs">{r.chatbotModel ?? '—'}</td>
                  <td className="p-2">~{r.chatbotCreditsBalance}</td>
                  <td className="p-2 text-xs text-gray-600">{fmtRelative(r.lastAiUse)}</td>
                  <td className="p-2 text-right">
                    <Link href={`/admin/tenants/${r.id}`} className="text-xs underline">
                      Ouvrir
                    </Link>
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
