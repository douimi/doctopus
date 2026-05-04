import { requireAdmin } from '@/lib/auth/admin';
import { AdminShell } from '@/components/shell/admin-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return <AdminShell session={session}>{children}</AdminShell>;
}
