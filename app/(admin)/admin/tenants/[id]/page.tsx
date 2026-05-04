import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantDetail } from '@/lib/admin/queries';
import { GrantCreditsCard } from './grant-credits-card';
import { SetModelCard } from './set-model-card';
import { ToggleChatbotCard } from './toggle-chatbot-card';
import { ToggleSuspensionCard } from './toggle-suspension-card';

export const dynamic = 'force-dynamic';

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleString('fr-FR');
}

export default async function AdminTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getTenantDetail(id);
  if (!detail) notFound();
  const { tenant, doctor, assistants, ledger, recentUsage, adminAudit } = detail;

  return (
    <div className="space-y-4 max-w-6xl">
      <Link href="/admin/tenants" className="text-sm underline">
        ← Cabinets
      </Link>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        {/* LEFT — state + history */}
        <div className="space-y-4 min-w-0">
          <section className="rounded-md border p-4 space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{tenant.name}</h1>
              <span
                className={`text-xs px-2 py-0.5 rounded ${tenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
              >
                {tenant.status === 'active' ? 'actif' : 'suspendu'}
              </span>
            </div>
            <p className="text-sm text-gray-600">{tenant.address ?? ''}</p>
            <p className="text-sm text-gray-600">
              {tenant.phone ? `Tél: ${tenant.phone}` : ''}
              {tenant.rpmNumber ? ` · RPM: ${tenant.rpmNumber}` : ''}
              {tenant.cnomNumber ? ` · CNOM: ${tenant.cnomNumber}` : ''}
            </p>
            <p className="text-sm">
              Médecin :{' '}
              {doctor ? (
                <>
                  {doctor.fullName} (<code className="text-xs">{doctor.email}</code>)
                </>
              ) : (
                <span className="text-gray-500">aucun</span>
              )}
            </p>
            {assistants.length > 0 ? (
              <p className="text-sm">
                Assistant(e)s : {assistants.map((a) => a.email).join(', ')}
              </p>
            ) : null}
            <p className="text-xs text-gray-500">
              Crédits IA: ~{tenant.chatbotCreditsBalance} · Modèle :{' '}
              {tenant.chatbotProvider ?? '—'} / {tenant.chatbotModel ?? '—'} ·{' '}
              {tenant.chatbotEnabled ? 'Assistant activé' : 'Assistant désactivé'}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-medium">Historique crédits (50 dernières lignes)</h2>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-2 w-44">Date</th>
                    <th className="text-left p-2">Δ</th>
                    <th className="text-left p-2">Raison</th>
                    <th className="text-left p-2">Par</th>
                    <th className="text-left p-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-gray-500">
                        Aucun crédit.
                      </td>
                    </tr>
                  ) : (
                    ledger.map((l) => (
                      <tr key={l.id} className="border-b">
                        <td className="p-2 text-xs font-mono">{fmtDate(l.createdAt)}</td>
                        <td className={`p-2 ${l.change > 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {l.change > 0 ? '+' : ''}
                          {l.change}
                        </td>
                        <td className="p-2 text-xs">{l.reason}</td>
                        <td className="p-2 text-xs">{l.grantedBy ?? '—'}</td>
                        <td className="p-2 text-xs">{l.notes ?? ''}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-medium">Usage IA récent</h2>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-2 w-44">Date</th>
                    <th className="text-left p-2">Consultation</th>
                    <th className="text-left p-2">Modèle</th>
                    <th className="text-left p-2">Tokens (in/out)</th>
                    <th className="text-left p-2">Coût µ$</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsage.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-gray-500">
                        Aucun usage.
                      </td>
                    </tr>
                  ) : (
                    recentUsage.map((u) => (
                      <tr key={u.id} className="border-b">
                        <td className="p-2 text-xs font-mono">{fmtDate(u.createdAt)}</td>
                        <td className="p-2 text-xs">#{u.consultationId.slice(0, 8)}</td>
                        <td className="p-2 text-xs">
                          {u.provider}/{u.model}
                        </td>
                        <td className="p-2 text-xs">
                          {u.inputTokens} / {u.outputTokens}
                        </td>
                        <td className="p-2 text-xs">{u.estimatedCostMicrousd ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-medium">Actions admin (audit)</h2>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-2 w-44">Date</th>
                    <th className="text-left p-2">Action</th>
                    <th className="text-left p-2">Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {adminAudit.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-3 text-center text-gray-500">
                        Aucune action admin.
                      </td>
                    </tr>
                  ) : (
                    adminAudit.map((a) => (
                      <tr key={a.id} className="border-b">
                        <td className="p-2 text-xs font-mono">{fmtDate(a.at)}</td>
                        <td className="p-2 text-xs">{a.action}</td>
                        <td className="p-2 text-xs">
                          <code>{a.metadata ? JSON.stringify(a.metadata) : ''}</code>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* RIGHT — actions */}
        <aside className="space-y-4">
          <GrantCreditsCard tenantId={tenant.id} />
          <SetModelCard
            tenantId={tenant.id}
            initialProvider={tenant.chatbotProvider}
            initialModel={tenant.chatbotModel}
          />
          <ToggleChatbotCard tenantId={tenant.id} enabled={tenant.chatbotEnabled} />
          <ToggleSuspensionCard tenantId={tenant.id} status={tenant.status as 'active' | 'suspended'} />
        </aside>
      </div>
    </div>
  );
}
