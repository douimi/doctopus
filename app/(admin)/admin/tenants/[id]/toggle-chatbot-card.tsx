import { Button } from '@/components/ui/button';
import { adminToggleChatbotAction } from './actions';

export function ToggleChatbotCard({
  tenantId,
  enabled,
}: {
  tenantId: string;
  enabled: boolean;
}) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="font-medium text-sm">Assistant IA</div>
      <p className="text-xs text-gray-600">
        Actuellement : {enabled ? 'activé' : 'désactivé'}.
      </p>
      <form action={adminToggleChatbotAction}>
        <input type="hidden" name="tenantId" value={tenantId} />
        <input type="hidden" name="desired" value={enabled ? 'disable' : 'enable'} />
        <Button type="submit" size="sm" variant="secondary">
          {enabled ? 'Désactiver' : 'Activer'}
        </Button>
      </form>
    </div>
  );
}
