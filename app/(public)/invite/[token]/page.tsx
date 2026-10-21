import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { AuthCard } from '@/components/auth/auth-card';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { dbAdmin } from '@/db/client';
import { tenants } from '@/db/schema';
import { lookupInvite } from '@/lib/invites/lookup';
import { cn } from '@/lib/utils';
import { OwnerInviteForm } from './owner-form';
import { AssistantInviteForm } from './assistant-form';

const INVALID = {
  not_found: {
    title: "Cette invitation n'existe pas.",
    help: "Vérifiez que vous avez copié le lien en entier. Sinon, demandez une nouvelle invitation à la personne qui vous l'a envoyée.",
  },
  expired: {
    title: 'Cette invitation a expiré.',
    help: "Les liens d'invitation sont valables quelques jours. Demandez-en un nouveau à la personne qui vous l'a envoyé.",
  },
  consumed: {
    title: 'Cette invitation a déjà été utilisée ou a été révoquée.',
    help: 'Si vous avez déjà créé votre compte, connectez-vous simplement.',
  },
} as const;

function fmtExpiry(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lookup = await lookupInvite(token);

  if (!lookup.ok) {
    const copy = INVALID[lookup.reason];
    return (
      <AuthCard title="Invitation invalide">
        <div className="space-y-4">
          <Alert variant="warning" title={copy.title}>
            {copy.help}
          </Alert>
          <Link href="/sign-in" className={cn(buttonVariants({ variant: 'secondary' }), 'w-full')}>
            Aller à la connexion
          </Link>
        </div>
      </AuthCard>
    );
  }

  const { invite } = lookup;
  const isOwner = invite.kind === 'tenant_owner';
  const emailHint = invite.emailHint ?? '';

  let tenantName: string | null = null;
  if (!isOwner && invite.tenantId) {
    const tenant = await dbAdmin().query.tenants.findFirst({
      where: eq(tenants.id, invite.tenantId),
      columns: { name: true },
    });
    tenantName = tenant?.name ?? null;
  }

  const expiry = `Invitation valable jusqu'au ${fmtExpiry(invite.expiresAt)}.`;

  return (
    <AuthCard
      width={isOwner ? 'md' : 'sm'}
      eyebrow={isOwner ? 'Invitation médecin' : 'Invitation assistant(e)'}
      title={
        isOwner
          ? 'Créez votre cabinet sur Doctopus'
          : tenantName
            ? `Rejoindre ${tenantName}`
            : 'Rejoindre votre cabinet'
      }
      subtitle={
        isOwner
          ? 'Votre compte médecin et votre cabinet sont créés en une étape.'
          : 'Créez votre compte pour accéder à l’agenda et à la salle d’attente du cabinet.'
      }
      footer={
        <>
          {expiry} Déjà un compte ?{' '}
          <Link
            href="/sign-in"
            className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Se connecter
          </Link>
        </>
      }
    >
      {isOwner ? (
        <OwnerInviteForm token={token} emailHint={emailHint} />
      ) : (
        <AssistantInviteForm token={token} emailHint={emailHint} />
      )}
    </AuthCard>
  );
}
