import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  Stethoscope,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react';
import { requireDoctor } from '@/lib/auth/guards';
import { listPendingAssistantInvites, listTeamMembers, type TeamMember } from '@/lib/team/queries';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Section } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { SubmitButton } from '@/components/ui/submit-button';
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { SettingsTabs } from '../settings-tabs';
import { InviteDialog } from './invite-dialog';
import { toggleMemberActiveAction } from './actions';
import { DeactivateMemberButton, RevokeInviteButton } from './member-actions';

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
    <div className="panel flex items-center gap-4 p-5">
      <Avatar name={doctor.fullName} size="lg" tone="primary" />
      <div className="min-w-0 flex-1">
        <p className="eyebrow mb-1">Titulaire du cabinet</p>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="truncate text-title font-semibold">
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
    <li className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-2.5 transition-colors duration-(--duration-fast) hover:bg-muted/40 sm:flex-nowrap">
      <Avatar
        name={member.fullName}
        size="md"
        tone={member.isActive ? 'primary' : 'muted'}
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-body font-medium truncate">{member.fullName}</span>
          {member.isActive ? (
            <StatusBadge variant="success" dot>Actif</StatusBadge>
          ) : (
            <StatusBadge variant="neutral">Désactivé</StatusBadge>
          )}
        </div>
        <div className="text-small text-muted-foreground truncate tabular-nums">
          {member.email} · ajouté(e) le {formatDate(member.createdAt)}
        </div>
      </div>
      <div className="shrink-0">
        {member.isActive ? (
          <DeactivateMemberButton userId={member.id} name={member.fullName} />
        ) : (
          <form action={toggleMemberActiveAction}>
            <input type="hidden" name="userId" value={member.id} />
            <input type="hidden" name="active" value="true" />
            <SubmitButton size="sm" variant="secondary">
              <UserPlus aria-hidden />
              Réactiver
            </SubmitButton>
          </form>
        )}
      </div>
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
        eyebrow="Paramètres"
        title="Équipe"
        description="Membres du cabinet, invitations en attente et statut des comptes."
        actions={<InviteDialog />}
      >
        <SettingsTabs active="team" />
      </PageHeader>
      <PageBody>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon={Users}
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

        <Section title="Assistant(e)s" count={assistants.length}>
          {assistants.length === 0 ? (
            <div className="panel">
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
              className="panel divide-y divide-border overflow-hidden"
            >
              {assistants.map((m) => (
                <AssistantRow key={m.id} member={m} />
              ))}
            </ul>
          )}
        </Section>

        <Section title="Invitations en attente" count={invites.length}>
          {invites.length === 0 ? (
            <div className="panel">
              <EmptyState
                icon={CheckCircle2}
                title="Aucune invitation en attente"
                description="Les invitations envoyées et non encore acceptées apparaîtront ici."
              />
            </div>
          ) : (
            <ul
              role="list"
              className="panel divide-y divide-border overflow-hidden"
            >
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-2.5 transition-colors duration-(--duration-fast) hover:bg-muted/40 sm:flex-nowrap"
                >
                  <div
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-inset ring-border"
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
                  <div className="shrink-0">
                    <RevokeInviteButton inviteId={inv.id} label={inv.emailHint ?? 'cette adresse'} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </PageBody>
    </>
  );
}
