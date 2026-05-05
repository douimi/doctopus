import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BarChart3, History, ShieldCheck } from 'lucide-react';
import { getTenantDetail } from '@/lib/admin/queries';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Section } from '@/components/ui/section';
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
import { cn } from '@/lib/utils';
import { ApiKeyCard } from './api-key-card';
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
    <>
      <PageHeader
        eyebrow={
          <Link
            href="/admin/tenants"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            style={{ transitionDuration: 'var(--duration-fast)' }}
          >
            <ArrowLeft className="size-3" aria-hidden />
            Cabinets
          </Link>
        }
        title={
          <span className="inline-flex items-center gap-3">
            <span>{tenant.name}</span>
            <StatusBadge variant={tenant.status === 'active' ? 'success' : 'danger'}>
              {tenant.status === 'active' ? 'Actif' : 'Suspendu'}
            </StatusBadge>
          </span>
        }
      />
      <div className="px-6 py-6">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
          <div className="space-y-4 min-w-0">
            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar name={tenant.name} size="lg" tone="admin" />
                  <div className="min-w-0 space-y-1">
                    <div className="text-title font-semibold leading-tight">{tenant.name}</div>
                    {tenant.address ? (
                      <p className="text-small text-muted-foreground">{tenant.address}</p>
                    ) : null}
                    {tenant.phone || tenant.inpeNumber ? (
                      <p className="text-small text-muted-foreground tabular-nums">
                        {tenant.phone ? `Tél: ${tenant.phone}` : ''}
                        {tenant.inpeNumber ? ` · INPE: ${tenant.inpeNumber}` : ''}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="border-t border-border pt-3 space-y-2 text-body">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-small text-muted-foreground min-w-24">
                      Médecin
                    </span>
                    {doctor ? (
                      <span>
                        <span className="font-medium">{doctor.fullName}</span>{' '}
                        <code className="text-small text-muted-foreground">
                          {doctor.email}
                        </code>
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">Aucun</span>
                    )}
                  </div>
                  {assistants.length > 0 ? (
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-small text-muted-foreground min-w-24">
                        Assistant(e)s
                      </span>
                      <span className="text-small">
                        {assistants.map((a) => a.email).join(', ')}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-small text-muted-foreground min-w-24">
                      Crédits IA
                    </span>
                    <span className="font-medium tabular-nums">
                      ~{tenant.chatbotCreditsBalance}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-small text-muted-foreground min-w-24">Modèle</span>
                    <span className="text-small tabular-nums">
                      {tenant.chatbotProvider ?? '—'} / {tenant.chatbotModel ?? '—'}
                    </span>
                    <StatusBadge
                      variant={tenant.chatbotEnabled ? 'success' : 'neutral'}
                      icon={tenant.chatbotEnabled ? ShieldCheck : undefined}
                    >
                      {tenant.chatbotEnabled ? 'Activé' : 'Désactivé'}
                    </StatusBadge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Section icon={History} title="Historique crédits" count={ledger.length}>
              <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
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
                        <EmptyState
                          icon={History}
                          title="Aucun crédit"
                          description="Aucun crédit IA n'a encore été accordé à ce cabinet."
                        />
                      </TableEmpty>
                    ) : (
                      ledger.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="font-mono text-small text-muted-foreground tabular-nums">
                            {fmtDate(l.createdAt)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'font-medium tabular-nums',
                              l.change > 0 ? 'text-success' : 'text-danger',
                            )}
                          >
                            {l.change > 0 ? '+' : ''}
                            {l.change}
                          </TableCell>
                          <TableCell className="text-small">{l.reason}</TableCell>
                          <TableCell className="text-small text-muted-foreground tabular-nums">
                            {l.grantedBy ?? '—'}
                          </TableCell>
                          <TableCell className="text-small text-muted-foreground">
                            {l.notes ?? ''}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Section>

            <Section icon={BarChart3} title="Usage IA récent" count={recentUsage.length}>
              <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
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
                        <EmptyState
                          icon={BarChart3}
                          title="Aucun usage"
                          description="Ce cabinet n'a appelé l'assistant IA pour aucune consultation."
                        />
                      </TableEmpty>
                    ) : (
                      recentUsage.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-mono text-small text-muted-foreground tabular-nums">
                            {fmtDate(u.createdAt)}
                          </TableCell>
                          <TableCell className="text-small font-mono">
                            #{u.consultationId.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-small text-muted-foreground tabular-nums">
                            {u.provider}/{u.model}
                          </TableCell>
                          <TableCell className="text-small tabular-nums">
                            {u.inputTokens} / {u.outputTokens}
                          </TableCell>
                          <TableCell className="text-small tabular-nums">
                            {u.estimatedCostMicrousd ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Section>

            <Section icon={History} title="Actions admin (audit)" count={adminAudit.length}>
              <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
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
                        <EmptyState
                          icon={History}
                          title="Aucune action admin"
                          description="Aucune action super-admin enregistrée pour ce cabinet."
                        />
                      </TableEmpty>
                    ) : (
                      adminAudit.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono text-small text-muted-foreground tabular-nums">
                            {fmtDate(a.at)}
                          </TableCell>
                          <TableCell className="text-small font-medium">{a.action}</TableCell>
                          <TableCell className="text-small text-muted-foreground">
                            <code className="break-all">
                              {a.metadata ? JSON.stringify(a.metadata) : ''}
                            </code>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Section>
          </div>

          <aside className="space-y-4">
            <SetModelCard
              tenantId={tenant.id}
              initialProvider={tenant.chatbotProvider}
              initialModel={tenant.chatbotModel}
            />
            <ApiKeyCard
              tenantId={tenant.id}
              provider={tenant.chatbotProvider}
              last4={tenant.chatbotApiKeyLast4 ?? null}
            />
            <GrantCreditsCard tenantId={tenant.id} />
            <ToggleChatbotCard tenantId={tenant.id} enabled={tenant.chatbotEnabled} />
            <ToggleSuspensionCard
              tenantId={tenant.id}
              status={tenant.status as 'active' | 'suspended'}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
