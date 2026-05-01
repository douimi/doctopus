import crypto from 'node:crypto';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env.local' });
loadDotenv({ path: '.env' });

import { dbAdmin, __closeDbForTests } from '@/db/client';
import { tenantInvites } from '@/db/schema';
import { generateInviteToken, hashInviteToken } from '@/lib/invites/tokens';
import type { Page } from '@playwright/test';

export async function mintOwnerInvite(email: string): Promise<string> {
  const token = generateInviteToken();
  await dbAdmin().insert(tenantInvites).values({
    tokenHash: hashInviteToken(token),
    kind: 'tenant_owner',
    emailHint: email,
    expiresAt: new Date(Date.now() + 86_400_000),
  });
  return token;
}

export async function closeDb() {
  await __closeDbForTests();
}

export type OnboardedSession = { email: string; password: string };

export async function onboardDoctor(
  page: Page,
  opts: { fullName?: string; cabinetName?: string } = {},
): Promise<OnboardedSession> {
  const email = `dr-${crypto.randomUUID()}@e2e.local`;
  const password = 'Doctopus-Test-1234';
  const token = await mintOwnerInvite(email);
  await page.goto(`/invite/${token}`);
  await page.getByLabel('Nom complet du médecin').fill(opts.fullName ?? 'Dr E2E');
  await page.getByLabel('Nom du cabinet').fill(opts.cabinetName ?? 'Cabinet E2E');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/Mot de passe/).fill(password);
  await page.getByRole('button', { name: /Créer mon cabinet/ }).click();
  await page.waitForURL('**/today');
  return { email, password };
}
