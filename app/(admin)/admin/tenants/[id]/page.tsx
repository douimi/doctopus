import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantDetail } from '@/lib/admin/queries';
import { GrantCreditsCard } from './grant-credits-card';
import { SetModelCard } from './set-model-card';
import { ToggleChatbotCard } from './toggle-chatbot-card';
import { ToggleSuspensionCard } from './toggle-suspension-card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { History, BarChart3 } from 'lucide-react';

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
          <section className="rounded-md border border-border p-4 space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{tenant.name}</h1>
              <StatusBadge variant={tenant.status === 'active' ? 'success' : 'danger'}>
                {tenant.status === 'active' ? 'actif' : 'suspendu'}
              </StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground">{tenant.address ?? ''}</p>
            <p className="text-sm text-muted-foreground">
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
                <span className="text-muted-foreground">aucun</span>
              )}
            </p>
            {assistants.length > 0 ? (
              <p className="text-sm">
                Assistant(e)s : {assistants.map((a) => a.email).join(', ')}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Crédits IA: ~{tenant.chatbotCreditsBalance} · Modèle :{' '}
              {tenant.chatbotProvider ?? '—'} / {tenant.chatbotModel ?? '—'} ·{' '}
              {tenant.chatbotEnabled ? 'Assistant activé' : 'Assistant désactivé'}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-medium">Historique crédits (50 dernières lignes)</h2>
            <div className="border border-border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">Date</TableHead>
                    <TableHead>Δ</TableHead>
                    <TableHead>Raison</TableHead>
                    <TableHead>Par</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.length === 0 ? (
                    <TableEmpty colSpan={5}>
                      <EmptyState icon={History} title="Aucun crédit." />
                    </TableEmpty>
                  ) : (
                    ledger.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs font-mono">{fmtDate(l.createdAt)}</TableCell>
                        <TableCell className={l.change > 0 ? 'text-success' : 'text-danger'}>
                          {l.change > 0 ? '+' : ''}
                          {l.change}
                        </TableCell>
                        <TableCell className="text-xs">{l.reason}</TableCell>
                        <TableCell className="text-xs">{l.grantedBy ?? '—'}</TableCell>
                        <TableCell className="text-xs">{l.notes ?? ''}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-medium">Usage IA récent</h2>
            <div className="border border-border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">Date</TableHead>
                    <TableHead>Consultation</TableHead>
                    <TableHead>Modèle</TableHead>
                    <TableHead>Tokens (in/out)</TableHead>
                    <TableHead>Coût µ$</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUsage.length === 0 ? (
                    <TableEmpty colSpan={5}>
                      <EmptyState icon={BarChart3} title="Aucun usage." />
                    </TableEmpty>
                  ) : (
                    recentUsage.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-xs font-mono">{fmtDate(u.createdAt)}</TableCell>
                        <TableCell className="text-xs">#{u.consultationId.slice(0, 8)}</TableCell>
                        <TableCell className="text-xs">
                          {u.provider}/{u.model}
                        </TableCell>
                        <TableCell className="text-xs">
                          {u.inputTokens} / {u.outputTokens}
                        </TableCell>
                        <TableCell className="text-xs">{u.estimatedCostMicrousd ?? '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-medium">Actions admin (audit)</h2>
            <div className="border border-border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminAudit.length === 0 ? (
                    <TableEmpty colSpan={3}>
                      <EmptyState icon={History} title="Aucune action admin." />
                    </TableEmpty>
                  ) : (
                    adminAudit.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs font-mono">{fmtDate(a.at)}</TableCell>
                        <TableCell className="text-xs">{a.action}</TableCell>
                        <TableCell className="text-xs">
                          <code>{a.metadata ? JSON.stringify(a.metadata) : ''}</code>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
