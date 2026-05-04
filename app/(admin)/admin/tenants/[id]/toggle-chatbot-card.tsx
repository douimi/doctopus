import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminToggleChatbotAction } from './actions';

export function ToggleChatbotCard({
  tenantId,
  enabled,
}: {
  tenantId: string;
  enabled: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assistant IA</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-2">
          Actuellement : {enabled ? 'activé' : 'désactivé'}.
        </p>
        <form action={adminToggleChatbotAction}>
          <input type="hidden" name="tenantId" value={tenantId} />
          <input type="hidden" name="desired" value={enabled ? 'disable' : 'enable'} />
          <Button type="submit" size="sm" variant="secondary">
            {enabled ? 'Désactiver' : 'Activer'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
