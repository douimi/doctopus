'use server';

import { eq } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { tenants } from '@/db/schema';
import { requireDoctor } from '@/lib/auth/guards';

export async function acknowledgeChatbotDisclaimerAction(): Promise<void> {
  const session = await requireDoctor();
  await dbAdmin()
    .update(tenants)
    .set({ chatbotDisclaimerAcknowledgedAt: new Date(), updatedAt: new Date() })
    .where(eq(tenants.id, session.tenantId));
}
