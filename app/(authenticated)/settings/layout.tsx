import { requireDoctor } from '@/lib/auth/guards';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireDoctor();
  return <>{children}</>;
}
