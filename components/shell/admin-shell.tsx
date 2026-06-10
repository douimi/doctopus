import { BarChart3, Building2, Mail } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AdminSession } from '@/lib/auth/admin';
import { BrandLockup } from '@/components/ui/brand';
import { StatusBadge } from '@/components/ui/status-badge';
import { MobileShell } from './mobile-shell';
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
  const desktopBrand = (
    <div className="space-y-2 min-w-0 flex flex-col items-center">
      <BrandLockup size={120} />
      <StatusBadge
        variant="warning"
        className="bg-admin text-admin-foreground border-admin/40"
      >
        ADMIN
      </StatusBadge>
    </div>
  );

  const mobileTopBarBrand = (
    <div className="flex items-center gap-2 min-w-0">
      <BrandLockup size={88} />
      <StatusBadge
        variant="warning"
        className="bg-admin text-admin-foreground border-admin/40"
      >
        ADMIN
      </StatusBadge>
    </div>
  );

  const navItems = (
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
  );

  const footerNode = <SidebarUser name="Super admin" detail={session.email} />;

  return (
    <div className="min-h-screen md:flex">
      <Sidebar theme="orange" brand={desktopBrand} footer={footerNode}>
        {navItems}
      </Sidebar>
      <MobileShell
        topBarBrand={mobileTopBarBrand}
        nav={navItems}
        footer={footerNode}
      />
      <main className="flex-1 min-w-0 bg-app-surface">{children}</main>
    </div>
  );
}
