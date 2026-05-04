import { Button } from '@/components/ui/button';
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
    <div className="rounded-md border p-3 space-y-2">
      <div className="font-medium text-sm">Statut du cabinet</div>
      <p className="text-xs text-gray-600">
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
    </div>
  );
}
