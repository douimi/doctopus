import Link from 'next/link';
import type { AdminSession } from '@/lib/auth/admin';

export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-orange-200 bg-orange-50 px-4 py-3 flex items-center gap-4">
        <Link href="/admin" className="font-semibold">
          Doctopus
        </Link>
        <span className="rounded bg-orange-600 text-white text-xs px-2 py-0.5 font-bold">
          ADMIN
        </span>
        <nav className="flex gap-4 text-sm">
          <Link href="/admin">Tableau de bord</Link>
          <Link href="/admin/tenants">Cabinets</Link>
          <Link href="/admin/invites">Invitations</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span>{session.email}</span>
          <form action="/sign-out" method="post">
            <button className="underline" type="submit">
              Déconnexion
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
