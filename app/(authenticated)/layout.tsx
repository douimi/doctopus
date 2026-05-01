import { requireSession } from '@/lib/auth/session';
import { AppShell } from '@/components/app-shell';

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <AppShell session={session}>{children}</AppShell>;
}
