import { eq } from 'drizzle-orm';
import { requireDoctor } from '@/lib/auth/guards';
import { dbAdmin } from '@/db/client';
import { tenants } from '@/db/schema';
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { SettingsTabs } from '../settings-tabs';
import { CabinetForms } from './forms';

export default async function CabinetSettingsPage() {
  const session = await requireDoctor();
  const [tenant] = await dbAdmin().select().from(tenants).where(eq(tenants.id, session.tenantId));
  if (!tenant) return null;

  return (
    <>
      <PageHeader
        width="narrow"
        eyebrow="Paramètres"
        title="Cabinet"
        description="Identifiants professionnels, en-tête d'ordonnance et signature."
      >
        <SettingsTabs active="cabinet" />
      </PageHeader>
      <PageBody width="narrow">
        <CabinetForms
          initial={{
            inpeNumber: tenant.inpeNumber ?? '',
            prescriptionHeaderHtml: tenant.prescriptionHeaderHtml ?? '',
            signatureUrl: tenant.signatureUrl ?? null,
            stampUrl: tenant.stampUrl ?? null,
            logoUrl: tenant.logoUrl ?? null,
            chatbotEnabled: tenant.chatbotEnabled,
            chatbotCreditsBalance: tenant.chatbotCreditsBalance,
            defaultConsultationPriceMad: tenant.defaultConsultationPriceMad ?? '',
          }}
        />
      </PageBody>
    </>
  );
}
