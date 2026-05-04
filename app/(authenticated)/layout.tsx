import { requireSession } from '@/lib/auth/session';
import { DoctorShell } from '@/components/shell/doctor-shell';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  return <DoctorShell session={session}>{children}</DoctorShell>;
}
