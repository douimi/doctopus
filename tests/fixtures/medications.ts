import { dbAdmin } from '@/db/client';
import { medications } from '@/db/schema';

export async function seedMedication(overrides: Partial<typeof medications.$inferInsert> = {}) {
  const [row] = await dbAdmin()
    .insert(medications)
    .values({
      nomCommercial:
        overrides.nomCommercial ?? `Doliprane-${Math.random().toString(36).slice(2, 6)}`,
      dci: overrides.dci ?? 'Paracétamol',
      dosage: overrides.dosage ?? '1000 mg',
      forme: overrides.forme ?? 'comprimé',
      laboratoire: overrides.laboratoire ?? 'Sanofi',
      ...overrides,
    })
    .returning();
  return row;
}
