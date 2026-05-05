import { LogOut } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';

export function SidebarUser({
  name,
  detail,
}: {
  name: string;
  detail: string;
}) {
  return (
    <div className="px-3 py-3 flex items-center gap-2.5">
      <Avatar name={name} size="md" tone="muted" />
      <div className="flex-1 min-w-0">
        <div className="text-body font-medium leading-tight truncate">{name}</div>
        <div className="text-small text-muted-foreground truncate">{detail}</div>
      </div>
      <form action="/sign-out" method="post">
        <button
          type="submit"
          aria-label="Déconnexion"
          title="Déconnexion"
          className="inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          style={{ transitionDuration: 'var(--duration-fast)' }}
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
