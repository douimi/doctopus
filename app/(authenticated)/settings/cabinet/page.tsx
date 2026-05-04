import { eq } from 'drizzle-orm';
import { requireDoctor } from '@/lib/auth/guards';
import { dbAdmin } from '@/db/client';
import { tenants } from '@/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shell/page-header';
import { CabinetForms } from './forms';

export default async function CabinetSettingsPage() {
  const session = await requireDoctor();
  const [tenant] = await dbAdmin().select().from(tenants).where(eq(tenants.id, session.tenantId));
  if (!tenant) return null;

  return (
    <>
      <PageHeader title="Cabinet" />
      <div className="px-6 py-6 max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Paramètres du cabinet</CardTitle>
          </CardHeader>
          <CardContent>
            <CabinetForms
              initial={{
                rpmNumber: tenant.rpmNumber ?? '',
                cnomNumber: tenant.cnomNumber ?? '',
                prescriptionHeaderHtml: tenant.prescriptionHeaderHtml ?? '',
                signatureUrl: tenant.signatureUrl ?? null,
                stampUrl: tenant.stampUrl ?? null,
                logoUrl: tenant.logoUrl ?? null,
                chatbotEnabled: tenant.chatbotEnabled,
                chatbotCreditsBalance: tenant.chatbotCreditsBalance,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
