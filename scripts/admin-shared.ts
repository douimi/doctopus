import { eq, ilike } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { tenants } from '@/db/schema';

export async function findTenant(query: string) {
  if (/^[0-9a-f-]{36}$/i.test(query)) {
    const [t] = await dbAdmin().select().from(tenants).where(eq(tenants.id, query));
    return t ?? null;
  }
  const [t] = await dbAdmin().select().from(tenants).where(ilike(tenants.name, query));
  return t ?? null;
}

export function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = '1';
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}
