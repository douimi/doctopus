import { requireAdmin } from '@/lib/auth/admin';
import { AdminShell } from '@/components/shell/admin-shell';
import { Toaster } from '@/components/ui/toast';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <>
      <AdminShell session={session}>{children}</AdminShell>
      {/* Mutation feedback toasts. Mounted here because AdminShell has none. */}
      <Toaster />
    </>
  );
}
