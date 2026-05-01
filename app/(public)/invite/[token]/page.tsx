import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      consumed: 'Cette invitation a déjà été utilisée.',
    } as const;
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invitation invalide</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{messages[lookup.reason]}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bienvenue sur Doctopus</CardTitle>
        </CardHeader>
        <CardContent>
          {lookup.invite.kind === 'tenant_owner' ? (
            <OwnerInviteForm token={token} emailHint={lookup.invite.emailHint ?? ''} />
          ) : (
            <AssistantInviteForm token={token} emailHint={lookup.invite.emailHint ?? ''} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
