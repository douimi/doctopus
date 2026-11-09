import {
  BarChart3,
  CalendarDays,
  Settings,
  Stethoscope,
  Users,
  Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { Session } from '@/lib/auth/session';
import { BrandLockup } from '@/components/ui/brand';
import { Toaster } from '@/components/ui/toast';
import { MobileShell, type MobileTab } from './mobile-shell';
import { NotificationBell } from './notification-bell';
import { Sidebar } from './sidebar';
import { SidebarNavGroup, SidebarNavItem } from './sidebar-nav';
import { SidebarUser } from './sidebar-user';
import { TenantRealtimeProvider } from './tenant-realtime';
import { WaitingArrivalsListener } from './waiting-arrivals-listener';

/**
 * Role-aware app chrome. Assistants never see routes that are
 * doctor-only (consultations, suivis, stats, settings) — those used to
 * silently redirect them to /today.
 */
export function DoctorShell({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const isDoctor = session.role === 'doctor';

  // The PNG is square with ~60% transparent padding; -my-4 crops it
  // visually inside the 64px brand row until a tight wordmark asset exists.
  const desktopBrand = (
    <>
      <BrandLockup size={96} className="-my-4 -ml-2" />
      <div className="ml-auto">
        <NotificationBell />
      </div>
    </>
  );

  const mobileTopBarBrand = (
    <div className="flex min-w-0 items-center gap-2">
      <BrandLockup size={72} className="-my-3" />
      <span className="hidden truncate text-small text-muted-foreground sm:inline">
        {session.tenantName}
      </span>
    </div>
  );

  // Assistants get Encaissements in place of Consultations (UX brief §2).
  const PAYMENTS = '/today/payments';
  const navItems = (
    <>
      <SidebarNavGroup label="Cabinet">
        <SidebarNavItem
          href="/today"
          exclude={isDoctor ? undefined : [PAYMENTS]}
          icon={<CalendarDays className="size-4" aria-hidden />}
        >
          Aujourd&apos;hui
        </SidebarNavItem>
        <SidebarNavItem href="/patients" icon={<Users className="size-4" aria-hidden />}>
          Patients
        </SidebarNavItem>
        {!isDoctor ? (
          <SidebarNavItem href={PAYMENTS} icon={<Wallet className="size-4" aria-hidden />}>
            Encaissements
          </SidebarNavItem>
        ) : null}
        {isDoctor ? (
          <SidebarNavItem
            href="/consultations"
            match={['/suivis']}
            icon={<Stethoscope className="size-4" aria-hidden />}
          >
            Consultations
          </SidebarNavItem>
        ) : null}
      </SidebarNavGroup>
      {isDoctor ? (
        <>
          <SidebarNavGroup label="Pilotage">
            <SidebarNavItem href="/stats" icon={<BarChart3 className="size-4" aria-hidden />}>
              Statistiques
            </SidebarNavItem>
          </SidebarNavGroup>
          <SidebarNavGroup>
            <SidebarNavItem
              href="/settings/cabinet"
              match={['/settings']}
              icon={<Settings className="size-4" aria-hidden />}
            >
              Paramètres
            </SidebarNavItem>
          </SidebarNavGroup>
        </>
      ) : null}
    </>
  );

  const mobileTabs: MobileTab[] = [
    {
      href: '/today',
      label: "Aujourd'hui",
      icon: <CalendarDays aria-hidden />,
      exclude: isDoctor ? undefined : [PAYMENTS],
    },
    { href: '/patients', label: 'Patients', icon: <Users aria-hidden /> },
    ...(!isDoctor
      ? [{ href: PAYMENTS, label: 'Encaissements', icon: <Wallet aria-hidden /> }]
      : []),
    ...(isDoctor
      ? [
          {
            href: '/consultations',
            label: 'Consultations',
            icon: <Stethoscope aria-hidden />,
            match: ['/suivis'],
          },
        ]
      : []),
  ];

  const footerNode = (
    <SidebarUser
      name={session.fullName}
      detail={`${isDoctor ? 'Médecin' : 'Assistant(e)'} · ${session.tenantName}`}
    />
  );

  return (
    <TenantRealtimeProvider tenantId={session.tenantId} userId={session.userId}>
    <div className="min-h-dvh bg-app-surface md:flex">
      <Sidebar theme="sky" brand={desktopBrand} footer={footerNode}>
        {navItems}
      </Sidebar>
      <MobileShell
        topBarBrand={mobileTopBarBrand}
        drawerBrand={<BrandLockup size={72} className="-my-3" />}
        nav={navItems}
        footer={footerNode}
        topBarRight={<NotificationBell />}
        tabs={mobileTabs}
      />
      {/* Bottom padding clears the mobile tab bar (h-14 + safe area). */}
      <main className="min-w-0 flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
      <WaitingArrivalsListener />
      <Toaster />
    </div>
    </TenantRealtimeProvider>
  );
}
