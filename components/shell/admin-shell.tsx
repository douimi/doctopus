import { BarChart3, Building2, Mail } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AdminSession } from '@/lib/auth/admin';
import { BrandLockup } from '@/components/ui/brand';
import { StatusBadge } from '@/components/ui/status-badge';
import { Sidebar } from './sidebar';
import { SidebarNavGroup, SidebarNavItem } from './sidebar-nav';
import { SidebarUser } from './sidebar-user';

export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <Sidebar
        theme="orange"
        brand={
          <div className="space-y-2 min-w-0 flex flex-col items-center">
            <BrandLockup size={120} />
            <StatusBadge
              variant="warning"
              className="bg-admin text-admin-foreground border-admin/40"
            >
              ADMIN
            </StatusBadge>
          </div>
        }
        footer={<SidebarUser name="Super admin" detail={session.email} />}
      >
        <SidebarNavGroup>
          <SidebarNavItem href="/admin" icon={<BarChart3 className="size-4" aria-hidden />}>
            Tableau de bord
          </SidebarNavItem>
          <SidebarNavItem href="/admin/tenants" icon={<Building2 className="size-4" aria-hidden />}>
            Cabinets
          </SidebarNavItem>
          <SidebarNavItem href="/admin/invites" icon={<Mail className="size-4" aria-hidden />}>
            Invitations
          </SidebarNavItem>
        </SidebarNavGroup>
      </Sidebar>
      <main className="flex-1 min-w-0 bg-app-surface">{children}</main>
    </div>
  );
}
