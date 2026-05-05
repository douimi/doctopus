import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  Stethoscope,
  UserMinus,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react';
import { requireDoctor } from '@/lib/auth/guards';
import { listPendingAssistantInvites, listTeamMembers, type TeamMember } from '@/lib/team/queries';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Section } from '@/components/ui/section';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { PageHeader } from '@/components/shell/page-header';
import { InviteDialog } from './invite-dialog';
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

function DoctorCard({ doctor }: { doctor: TeamMember }) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary-tint/40 shadow-card p-5 flex items-center gap-4">
      <Avatar name={doctor.fullName} size="lg" tone="primary" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-title font-semibold leading-tight truncate">
            {doctor.fullName}
          </span>
          <StatusBadge variant="info" icon={Stethoscope}>
            Médecin · Propriétaire
          </StatusBadge>
        </div>
        <div className="text-body text-muted-foreground tabular-nums truncate">
          {doctor.email}
        </div>
        <div className="text-small text-muted-foreground tabular-nums mt-1">
          Membre depuis le {formatDate(doctor.createdAt)}
        </div>
      </div>
    </div>
  );
}

function AssistantRow({ member }: { member: TeamMember }) {
  return (
    <li className="group/row flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
      <Avatar
        name={member.fullName}
        size="md"
        tone={member.isActive ? 'admin' : 'muted'}
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-body font-medium truncate">{member.fullName}</span>
          {member.isActive ? (
            <StatusBadge variant="success">Actif</StatusBadge>
          ) : (
            <StatusBadge variant="warning">Désactivé</StatusBadge>
          )}
        </div>
        <div className="text-small text-muted-foreground truncate tabular-nums">
          {member.email} · ajouté(e) le {formatDate(member.createdAt)}
        </div>
      </div>
      <form action={toggleMemberActiveAction} className="shrink-0">
        <input type="hidden" name="userId" value={member.id} />
        <input type="hidden" name="active" value={member.isActive ? 'false' : 'true'} />
        <Button
          type="submit"
          size="sm"
          variant={member.isActive ? 'destructive' : 'secondary'}
        >
          {member.isActive ? (
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
    </li>
  );
}

export default async function TeamSettingsPage() {
  const session = await requireDoctor();
  const [members, invites] = await Promise.all([
    listTeamMembers(session.tenantId),
    listPendingAssistantInvites(session.tenantId),
  ]);

  const doctor = members.find((m) => m.role === 'doctor') ?? null;
  const assistants = members.filter((m) => m.role === 'assistant');
  const activeAssistants = assistants.filter((a) => a.isActive).length;
  const inactiveAssistants = assistants.length - activeAssistants;

  return (
    <>
      <PageHeader
        title="Équipe"
        description="Membres du cabinet, invitations en attente et statut des comptes."
        actions={<InviteDialog />}
      />
      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            icon={Users}
            tone="success"
            label="Assistant(e)s actif(ve)s"
            value={String(activeAssistants)}
            hint={
              activeAssistants === 0
                ? 'aucun(e) actif(ve)'
                : activeAssistants === 1
                  ? 'partage la salle d’attente'
                  : 'partagent la salle d’attente'
            }
          />
          <StatCard
            icon={UserX}
            tone="warning"
            label="Désactivé(e)s"
            value={String(inactiveAssistants)}
            hint={
              inactiveAssistants === 0
                ? 'aucun compte désactivé'
                : 'compte sans accès au cabinet'
            }
          />
          <StatCard
            icon={Mail}
            tone="primary"
            label="Invitations en attente"
            value={String(invites.length)}
            hint={
              invites.length === 0
                ? 'aucune invitation envoyée'
                : 'lien envoyé, non encore accepté'
            }
          />
        </div>

        {doctor ? <DoctorCard doctor={doctor} /> : null}

        <Section icon={Users} title="Assistant(e)s" count={assistants.length}>
          {assistants.length === 0 ? (
            <div className="rounded-xl border border-border bg-card shadow-card">
              <EmptyState
                icon={Users}
                title="Aucun(e) assistant(e)"
                description="Invitez un(e) assistant(e) pour partager la salle d’attente et l’encaissement des paiements."
                action={<InviteDialog />}
              />
            </div>
          ) : (
            <ul
              role="list"
              className="divide-y divide-border rounded-xl border border-border bg-card shadow-card overflow-hidden"
            >
              {assistants.map((m) => (
                <AssistantRow key={m.id} member={m} />
              ))}
            </ul>
          )}
        </Section>

        <Section icon={Mail} title="Invitations en attente" count={invites.length}>
          {invites.length === 0 ? (
            <div className="rounded-xl border border-border bg-card shadow-card">
              <EmptyState
                icon={CheckCircle2}
                title="Aucune invitation en attente"
                description="Les invitations envoyées et non encore acceptées apparaîtront ici."
              />
            </div>
          ) : (
            <ul
              role="list"
              className="divide-y divide-border rounded-xl border border-border bg-card shadow-card overflow-hidden"
            >
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="group/row flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div
                    aria-hidden
                    className="flex items-center justify-center size-9 rounded-lg bg-muted text-muted-foreground shrink-0"
                  >
                    <Mail className="size-4" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-body font-medium truncate">
                      {inv.emailHint ?? '—'}
                    </div>
                    <div className="text-small text-muted-foreground tabular-nums">
                      Envoyée le {formatDate(inv.createdAt)}
                    </div>
                  </div>
                  {inv.isExpired ? (
                    <StatusBadge variant="danger" icon={AlertTriangle}>
                      Expirée
                    </StatusBadge>
                  ) : (
                    <StatusBadge variant="warning">
                      {relativeExpiry(inv.expiresAt, inv.isExpired)}
                    </StatusBadge>
                  )}
                  <form action={revokeInviteAction} className="shrink-0">
                    <input type="hidden" name="inviteId" value={inv.id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      aria-label={`Révoquer l'invitation pour ${inv.emailHint ?? ''}`}
                      className="text-muted-foreground hover:text-danger"
                    >
                      Révoquer
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
