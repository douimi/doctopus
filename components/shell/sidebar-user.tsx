import { LogOut } from 'lucide-react';

export function SidebarUser({
  name,
  detail,
}: {
  name: string;
  detail: string;
}) {
  return (
    <div className="px-4 py-3 space-y-2">
      <div className="text-body font-medium leading-tight">{name}</div>
      <div className="text-small text-muted-foreground">{detail}</div>
      <form action="/sign-out" method="post">
        <button
          type="submit"
          className="inline-flex items-center gap-1 text-small text-muted-foreground hover:text-foreground transition-colors"
          style={{ transitionDuration: 'var(--duration-fast)' }}
        >
          <LogOut className="size-3" aria-hidden />
          Déconnexion
        </button>
      </form>
    </div>
  );
}
