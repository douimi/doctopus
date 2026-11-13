import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { getTenantDetail } from '@/lib/admin/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { cn } from '@/lib/utils';
import { ApiKeyCard } from './api-key-card';
import { GrantCreditsCard } from './grant-credits-card';
import { ImportPatientsCard } from './import-patients-card';
import { SetModelCard } from './set-model-card';
import { ToggleChatbotCard } from './toggle-chatbot-card';
import { ToggleSuspensionCard } from './toggle-suspension-card';

export const dynamic = 'force-dynamic';

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const LEDGER_REASON: Record<string, string> = {
  debit: 'Consultation IA',
  grant: 'Pack accordé',
  admin_adjustment: 'Correction du solde',
  refund: 'Remboursement',
};

/** "admin.tenant.set_credits" → readable French label; unknown actions pass through. */
const AUDIT_LABEL: Record<string, string> = {
  'admin.tenant.grant_credits': 'Crédits accordés',
  'admin.tenant.set_credits': 'Solde corrigé',
  'admin.tenant.set_model': 'Modèle IA modifié',
  'admin.tenant.enable_chatbot': 'Assistant IA activé',
  'admin.tenant.disable_chatbot': 'Assistant IA désactivé',
  'admin.tenant.suspend': 'Cabinet suspendu',
  'admin.tenant.reactivate': 'Cabinet réactivé',
  'admin.tenant.api_key_set': 'Clé API enregistrée',
  'admin.tenant.api_key_cleared': 'Clé API supprimée',
  'admin.invite.revoke': 'Invitation révoquée',
};

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-small text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-body text-foreground">{children}</dd>
    </div>
  );
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
  const isActive = tenant.status === 'active';
  const hasApiKey = Boolean(tenant.chatbotApiKeyLast4);

  const meta = [
    tenant.address,
    tenant.phone ? `Tél. ${tenant.phone}` : null,
    tenant.inpeNumber ? `INPE ${tenant.inpeNumber}` : null,
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        back={{ href: '/admin/tenants', label: 'Cabinets' }}
        title={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{tenant.name}</span>
            <StatusBadge variant={isActive ? 'success' : 'danger'}>
              {isActive ? 'Actif' : 'Suspendu'}
            </StatusBadge>
          </span>
        }
        description={
          meta.length > 0 ? (
            <span className="flex flex-wrap gap-x-3 gap-y-1 tabular-nums">
              {meta.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </span>
          ) : undefined
        }
      />
      <PageBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          {/* 1 — overview (left column, first row). */}
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Aperçu</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <Fact label="Médecin">
                  {doctor ? (
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">{doctor.fullName}</span>
                      <span className="break-all text-small text-muted-foreground">
                        {doctor.email}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Aucun médecin rattaché</span>
                  )}
                </Fact>
                <Fact label="Assistant(e)s">
                  {assistants.length > 0 ? (
                    <ul className="space-y-0.5">
                      {assistants.map((a) => (
                        <li key={a.email} className="break-all text-small">
                          {a.email}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground">Aucun(e)</span>
                  )}
                </Fact>
                <Fact label="Crédits IA">
                  <span
                    className={cn(
                      'font-medium tabular-nums',
                      tenant.chatbotCreditsBalance <= 0 && 'text-warning-ink',
                    )}
                  >
                    {tenant.chatbotCreditsBalance}
                  </span>
                  <span className="text-small text-muted-foreground"> consultations restantes</span>
                </Fact>
                <Fact label="Assistant IA">
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusBadge variant={tenant.chatbotEnabled ? 'success' : 'neutral'}>
                      {tenant.chatbotEnabled ? 'Activé' : 'Désactivé'}
                    </StatusBadge>
                    <span className="text-small text-muted-foreground">
                      {tenant.chatbotProvider && tenant.chatbotModel
                        ? `${tenant.chatbotProvider} · ${tenant.chatbotModel}`
                        : 'Aucun modèle choisi'}
                    </span>
                  </span>
                </Fact>
              </dl>
            </CardContent>
          </Card>

          {/* 2 — management rail. Spans both rows on lg; sits between overview and history on mobile. */}
          <aside
            className="space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1"
            aria-label="Gestion du cabinet"
          >
            <GrantCreditsCard tenantId={tenant.id} currentBalance={tenant.chatbotCreditsBalance} />
            <ToggleChatbotCard
              tenantId={tenant.id}
              enabled={tenant.chatbotEnabled}
              hasApiKey={hasApiKey}
              credits={tenant.chatbotCreditsBalance}
            />
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
            <ImportPatientsCard tenantId={tenant.id} />
            <ToggleSuspensionCard
              tenantId={tenant.id}
              tenantName={tenant.name}
              status={tenant.status as 'active' | 'suspended'}
            />
          </aside>

          {/* 3 — history (left column, second row). */}
          <div className="min-w-0 space-y-6">
            <Section title="Historique des crédits" count={ledger.length}>
              <div className="panel overflow-hidden">
                <Table density="compact">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-44">Date</TableHead>
                      <TableHead className="text-right">Variation</TableHead>
                      <TableHead>Motif</TableHead>
                      <TableHead className="hidden md:table-cell">Par</TableHead>
                      <TableHead className="hidden sm:table-cell">Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.length === 0 ? (
                      <TableEmpty colSpan={5}>
                        <EmptyState
                          size="sm"
                          title="Aucun mouvement de crédits"
                          description="Accordez un premier pack depuis le panneau « Crédits IA »."
                        />
                      </TableEmpty>
                    ) : (
                      ledger.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                            {fmtDate(l.createdAt)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right font-medium tabular-nums',
                              l.change > 0 ? 'text-success-ink' : 'text-foreground',
                            )}
                          >
                            {l.change > 0 ? '+' : l.change < 0 ? '−' : ''}
                            {Math.abs(l.change)}
                          </TableCell>
                          <TableCell>{LEDGER_REASON[l.reason] ?? l.reason}</TableCell>
                          <TableCell className="hidden max-w-48 truncate text-small text-muted-foreground md:table-cell">
                            {l.grantedBy?.replace(/^admin:/, '') ?? '—'}
                          </TableCell>
                          <TableCell className="hidden text-small text-muted-foreground sm:table-cell">
                            {l.notes ?? ''}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Section>

            <Section title="Usage IA récent" count={recentUsage.length}>
              <div className="panel overflow-hidden">
                <Table density="compact">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-44">Date</TableHead>
                      <TableHead>Consultation</TableHead>
                      <TableHead className="hidden md:table-cell">Modèle</TableHead>
                      <TableHead className="text-right">Tokens (in / out)</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Coût (µ$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentUsage.length === 0 ? (
                      <TableEmpty colSpan={5}>
                        <EmptyState
                          size="sm"
                          title="Aucun usage"
                          description="Ce cabinet n'a encore utilisé l'assistant IA dans aucune consultation."
                        />
                      </TableEmpty>
                    ) : (
                      recentUsage.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                            {fmtDate(u.createdAt)}
                          </TableCell>
                          <TableCell className="font-mono text-small">
                            #{u.consultationId.slice(0, 8)}
                          </TableCell>
                          <TableCell className="hidden text-small text-muted-foreground md:table-cell">
                            {u.provider} · {u.model}
                          </TableCell>
                          <TableCell className="text-right text-small tabular-nums">
                            {u.inputTokens.toLocaleString('fr-FR')} /{' '}
                            {u.outputTokens.toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell className="hidden text-right text-small tabular-nums sm:table-cell">
                            {u.estimatedCostMicrousd?.toLocaleString('fr-FR') ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Section>

            <Section title="Journal des actions admin" count={adminAudit.length}>
              <div className="panel overflow-hidden">
                <Table density="compact">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-44">Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="hidden sm:table-cell">Détails</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminAudit.length === 0 ? (
                      <TableEmpty colSpan={3}>
                        <EmptyState
                          size="sm"
                          title="Aucune action admin"
                          description="Les actions super-admin sur ce cabinet apparaîtront ici."
                        />
                      </TableEmpty>
                    ) : (
                      adminAudit.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                            {fmtDate(a.at)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {AUDIT_LABEL[a.action] ?? a.action}
                          </TableCell>
                          <TableCell className="hidden text-small text-muted-foreground sm:table-cell">
                            {a.metadata ? (
                              <code className="break-all">{JSON.stringify(a.metadata)}</code>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Section>
          </div>
        </div>
      </PageBody>
    </>
  );
}
