import Link from 'next/link';
import type { Session } from '@/lib/auth/session';

export function AppShell({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-4 py-3 flex items-center gap-4">
        <Link href="/today" className="font-semibold">
          Doctopus
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/today">Aujourd&apos;hui</Link>
          <Link href="/patients">Patients</Link>
          {session.role === 'doctor' ? <Link href="/settings/team">Équipe</Link> : null}
          {session.role === 'doctor' ? <Link href="/settings/cabinet">Cabinet</Link> : null}
          {session.role === 'doctor' ? <Link href="/settings/audit">Journal</Link> : null}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span>
            {session.fullName} ({session.role === 'doctor' ? 'Médecin' : 'Assistant(e)'})
          </span>
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
