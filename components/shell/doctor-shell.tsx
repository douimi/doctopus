import {
  CalendarDays,
  History,
  Settings,
  Users,
  Users2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { Session } from '@/lib/auth/session';
import { Sidebar } from './sidebar';
import { SidebarNavGroup, SidebarNavItem } from './sidebar-nav';
import { SidebarUser } from './sidebar-user';

export function DoctorShell({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const isDoctor = session.role === 'doctor';
  return (
    <div className="min-h-screen flex">
      <Sidebar
        theme="sky"
        brand={
          <div className="space-y-0.5">
            <div className="font-semibold text-heading">Doctopus</div>
            <div className="text-small text-muted-foreground">{session.tenantName}</div>
          </div>
        }
        footer={
          <SidebarUser
            name={session.fullName}
            detail={isDoctor ? 'Médecin' : 'Assistant(e)'}
          />
        }
      >
        <SidebarNavGroup label="Cabinet">
          <SidebarNavItem href="/today" icon={<CalendarDays className="size-4" aria-hidden />}>
            Aujourd&apos;hui
          </SidebarNavItem>
          <SidebarNavItem href="/patients" icon={<Users className="size-4" aria-hidden />}>
            Patients
          </SidebarNavItem>
        </SidebarNavGroup>
        {isDoctor ? (
          <SidebarNavGroup label="Compte">
            <SidebarNavItem href="/settings/team" icon={<Users2 className="size-4" aria-hidden />}>
              Équipe
            </SidebarNavItem>
            <SidebarNavItem href="/settings/cabinet" icon={<Settings className="size-4" aria-hidden />}>
              Cabinet
            </SidebarNavItem>
            <SidebarNavItem href="/settings/audit" icon={<History className="size-4" aria-hidden />}>
              Journal
            </SidebarNavItem>
          </SidebarNavGroup>
        ) : null}
      </Sidebar>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
