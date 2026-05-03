import { eq } from 'drizzle-orm';
import { requireDoctor } from '@/lib/auth/guards';
import { dbAdmin } from '@/db/client';
import { tenants } from '@/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CabinetForms } from './forms';

export default async function CabinetSettingsPage() {
  const session = await requireDoctor();
  const [tenant] = await dbAdmin().select().from(tenants).where(eq(tenants.id, session.tenantId));
  if (!tenant) return null;

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Cabinet — paramètres</CardTitle>
        </CardHeader>
        <CardContent>
          <CabinetForms
            initial={{
              rpmNumber: tenant.rpmNumber ?? '',
              cnomNumber: tenant.cnomNumber ?? '',
              prescriptionHeaderHtml: tenant.prescriptionHeaderHtml ?? '',
              signatureUrl: tenant.signatureUrl ?? null,
              stampUrl: tenant.stampUrl ?? null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
