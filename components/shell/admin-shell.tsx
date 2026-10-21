import { BarChart3, Building2, Mail } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AdminSession } from '@/lib/auth/admin';
import { BrandLockup } from '@/components/ui/brand';
import { MobileShell } from './mobile-shell';
import { Sidebar } from './sidebar';
import { SidebarNavGroup, SidebarNavItem } from './sidebar-nav';
import { SidebarUser } from './sidebar-user';

function AdminTag() {
  return (
    <span className="inline-flex h-5 items-center rounded-md bg-admin px-1.5 text-micro font-semibold tracking-wide text-admin-foreground">
      ADMIN
    </span>
  );
}

export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: ReactNode;
}) {
  // Same cropped lockup as the doctor shell, with the orange ADMIN tag so
  // super-admins always know which side they're on.
  const desktopBrand = (
    <>
      <BrandLockup size={96} className="-my-4 -ml-2" />
      <div className="ml-auto">
        <AdminTag />
      </div>
    </>
  );

  const mobileTopBarBrand = (
    <div className="flex min-w-0 items-center gap-2">
      <BrandLockup size={72} className="-my-3" />
      <AdminTag />
    </div>
  );

  const navItems = (
    <SidebarNavGroup>
      <SidebarNavItem href="/admin" exact icon={<BarChart3 className="size-4" aria-hidden />}>
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
    <div className="min-h-dvh bg-app-surface md:flex">
      <Sidebar theme="orange" brand={desktopBrand} footer={footerNode}>
        {navItems}
      </Sidebar>
      <MobileShell
        theme="orange"
        topBarBrand={mobileTopBarBrand}
        nav={navItems}
        footer={footerNode}
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
