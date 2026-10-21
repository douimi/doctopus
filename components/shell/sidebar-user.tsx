import { LogOut } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function SidebarUser({
  name,
  detail,
}: {
  name: string;
  /** Second line, e.g. "Médecin · Cabinet X". */
  detail: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md p-2">
      <Avatar name={name} size="md" tone="muted" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-body font-medium text-foreground">{name}</div>
        <div className="truncate text-small text-muted-foreground" title={detail}>
          {detail}
        </div>
      </div>
      <form action="/sign-out" method="post">
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          aria-label="Déconnexion"
          title="Déconnexion"
        >
          <LogOut aria-hidden />
        </Button>
      </form>
    </div>
  );
}
