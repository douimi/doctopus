import { AlertTriangle, Mail, Stethoscope, UserMinus, UserPlus, UserRoundCog, X } from 'lucide-react';
import { requireDoctor } from '@/lib/auth/guards';
import { listPendingAssistantInvites, listTeamMembers } from '@/lib/team/queries';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import { PageHeader } from '@/components/shell/page-header';
import { InviteForm } from './invite-form';
import { revokeInviteAction, toggleMemberActiveAction } from './actions';

function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function relativeExpiry(expiresAt: Date, isExpired: boolean): string {
  if (isExpired) return 'expirée';
  const ms = expiresAt.getTime() - Date.now();
  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  if (days < 1) return 'expire aujourd’hui';
  if (days === 1) return 'expire demain';
  return `expire dans ${days} j`;
}

export default async function TeamSettingsPage() {
  const session = await requireDoctor();
  const [members, invites] = await Promise.all([
    listTeamMembers(session.tenantId),
    listPendingAssistantInvites(session.tenantId),
  ]);
  const assistantCount = members.filter((m) => m.role === 'assistant').length;

  return (
    <>
      <PageHeader
        title="Équipe"
        description="Membres du cabinet, invitations en attente et statut des comptes."
      />
      <div className="px-6 py-6 space-y-6">
        <Section icon={UserRoundCog} title="Membres" count={members.length}>
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Ajouté</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={m.fullName}
                          size="sm"
                          tone={m.role === 'doctor' ? 'primary' : 'muted'}
                        />
                        <span className="font-medium">{m.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-small text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      {m.role === 'doctor' ? (
                        <StatusBadge variant="info" icon={Stethoscope}>
                          Médecin
                        </StatusBadge>
                      ) : (
                        <StatusBadge variant="neutral">Assistant(e)</StatusBadge>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.isActive ? (
                        <StatusBadge variant="success">Actif</StatusBadge>
                      ) : (
                        <StatusBadge variant="warning">Désactivé</StatusBadge>
                      )}
                    </TableCell>
                    <TableCell className="text-small text-muted-foreground tabular-nums">
                      {formatDate(m.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {m.role === 'assistant' ? (
                        <form action={toggleMemberActiveAction} className="inline-flex">
                          <input type="hidden" name="userId" value={m.id} />
                          <input
                            type="hidden"
                            name="active"
                            value={m.isActive ? 'false' : 'true'}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant={m.isActive ? 'destructive' : 'secondary'}
                          >
                            {m.isActive ? (
                              <>
                                <UserMinus aria-hidden />
                                Désactiver
                              </>
                            ) : (
                              <>
                                <UserPlus aria-hidden />
                                Réactiver
                              </>
                            )}
                          </Button>
                        </form>
                      ) : (
                        <span className="text-small text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {assistantCount === 0 ? (
            <p className="text-small text-muted-foreground mt-2">
              Aucun(e) assistant(e) pour le moment. Invitez-en un(e) ci-dessous pour partager
              la salle d&apos;attente et l&apos;encaissement.
            </p>
          ) : null}
        </Section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" aria-hidden />
                Inviter un(e) assistant(e)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InviteForm />
            </CardContent>
          </Card>

          <Section icon={Mail} title="Invitations en attente" count={invites.length}>
            {invites.length === 0 ? (
              <div className="rounded-xl border border-border bg-card shadow-card">
                <EmptyState
                  icon={Mail}
                  title="Aucune invitation en attente"
                  description="Les invitations envoyées et non encore acceptées apparaîtront ici."
                />
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Envoyée</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.length === 0 ? (
                      <TableEmpty colSpan={4}>
                        <EmptyState icon={Mail} title="Aucune invitation" />
                      </TableEmpty>
                    ) : (
                      invites.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">
                            {inv.emailHint ?? '—'}
                          </TableCell>
                          <TableCell className="text-small text-muted-foreground tabular-nums">
                            {formatDate(inv.createdAt)}
                          </TableCell>
                          <TableCell>
                            {inv.isExpired ? (
                              <StatusBadge variant="danger" icon={AlertTriangle}>
                                Expirée
                              </StatusBadge>
                            ) : (
                              <StatusBadge variant="warning">
                                {relativeExpiry(inv.expiresAt, inv.isExpired)}
                              </StatusBadge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <form action={revokeInviteAction} className="inline-flex">
                              <input type="hidden" name="inviteId" value={inv.id} />
                              <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                aria-label={`Révoquer l'invitation pour ${inv.emailHint ?? ''}`}
                                className="text-muted-foreground hover:text-danger"
                              >
                                <X aria-hidden />
                                Révoquer
                              </Button>
                            </form>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
