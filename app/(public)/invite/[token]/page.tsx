import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { lookupInvite } from '@/lib/invites/lookup';
import { OwnerInviteForm } from './owner-form';
import { AssistantInviteForm } from './assistant-form';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lookup = await lookupInvite(token);

  if (!lookup.ok) {
    const messages = {
      not_found: "Cette invitation n'existe pas.",
      expired: 'Cette invitation a expiré.',
      consumed: 'Cette invitation a déjà été utilisée ou a été révoquée.',
    } as const;
    return (
      <AuthCard title="Invitation invalide">
        <Alert variant="warning">{messages[lookup.reason]}</Alert>
        <Link href="/sign-in" className="block">
          <Button variant="link" className="w-full">
            Retour à la connexion
          </Button>
        </Link>
      </AuthCard>
    );
  }

  const isOwner = lookup.invite.kind === 'tenant_owner';

  return (
    <AuthCard
      title="Bienvenue sur Doctopus"
      subtitle={
        <span className="flex items-center justify-center gap-2">
          <StatusBadge variant="info">
            {isOwner ? 'Invitation médecin' : 'Invitation assistant'}
          </StatusBadge>
          {lookup.invite.emailHint ? (
            <span className="text-muted-foreground">{lookup.invite.emailHint}</span>
          ) : null}
        </span>
      }
    >
      {isOwner ? (
        <OwnerInviteForm token={token} emailHint={lookup.invite.emailHint ?? ''} />
      ) : (
        <AssistantInviteForm token={token} emailHint={lookup.invite.emailHint ?? ''} />
      )}
    </AuthCard>
  );
}
