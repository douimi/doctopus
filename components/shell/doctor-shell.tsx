import {
  BarChart3,
  CalendarDays,
  History,
  Settings,
  Users,
  Users2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { Session } from '@/lib/auth/session';
import { BrandLockup } from '@/components/ui/brand';
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
          <div className="space-y-2 min-w-0">
            <BrandLockup size={120} className="mx-auto" />
            <div className="text-small text-muted-foreground truncate text-center">
              {session.tenantName}
            </div>
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
            <SidebarNavItem href="/stats" icon={<BarChart3 className="size-4" aria-hidden />}>
              Statistiques
            </SidebarNavItem>
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
      <main className="flex-1 min-w-0 bg-app-surface">{children}</main>
    </div>
  );
}
