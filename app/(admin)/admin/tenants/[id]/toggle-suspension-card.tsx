import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminToggleSuspensionAction } from './actions';

export function ToggleSuspensionCard({
  tenantId,
  status,
}: {
  tenantId: string;
  status: 'active' | 'suspended';
}) {
  const isSuspended = status === 'suspended';
  return (
    <Card>
      <CardHeader>
        <CardTitle>Statut du cabinet</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-2">
          Actuellement : {isSuspended ? 'suspendu' : 'actif'}.
        </p>
        <form action={adminToggleSuspensionAction}>
          <input type="hidden" name="tenantId" value={tenantId} />
          <input
            type="hidden"
            name="desired"
            value={isSuspended ? 'reactivate' : 'suspend'}
          />
          <Button
            type="submit"
            size="sm"
            variant={isSuspended ? 'secondary' : 'destructive'}
          >
            {isSuspended ? 'Réactiver' : 'Suspendre'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
