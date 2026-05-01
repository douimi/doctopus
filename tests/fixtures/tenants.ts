import { randomUUID } from 'node:crypto';
import { dbAdmin } from '@/db/client';
import { tenants, userProfiles } from '@/db/schema';

export type SeededTenant = {
  tenantId: string;
  doctorId: string;
  assistantId: string;
};

export async function seedTenant(label: string): Promise<SeededTenant> {
  const admin = dbAdmin();
  const [tenant] = await admin.insert(tenants).values({ name: `Cabinet ${label}` }).returning();
  const doctorId = randomUUID();
  const assistantId = randomUUID();
  await admin.insert(userProfiles).values([
    {
      id: doctorId,
      tenantId: tenant.id,
      role: 'doctor',
      fullName: `Dr ${label}`,
      email: `dr-${label}-${randomUUID()}@test.local`,
    },
    {
      id: assistantId,
      tenantId: tenant.id,
      role: 'assistant',
      fullName: `Asst ${label}`,
      email: `asst-${label}-${randomUUID()}@test.local`,
    },
  ]);
  return { tenantId: tenant.id, doctorId, assistantId };
}
