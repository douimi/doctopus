import { test, expect } from '@playwright/test';
import { mintOwnerInvite, closeDb } from './helpers/invite';
import { randomUUID } from 'node:crypto';

test.afterAll(async () => {
  await closeDb();
});

test('doctor signs up, invites assistant, both sign in', async ({ browser }) => {
  const drEmail = `dr-${randomUUID()}@e2e.local`;
  const asstEmail = `asst-${randomUUID()}@e2e.local`;
  const password = 'Doctopus-Test-1234';

  // 1. Mint an owner invite for the doctor.
  const token = await mintOwnerInvite(drEmail);

  // 2. Doctor accepts.
  const doctorContext = await browser.newContext();
  const drPage = await doctorContext.newPage();
  await drPage.goto(`/invite/${token}`);
  await drPage.getByLabel('Nom complet du médecin').fill('Dr. Test');
  await drPage.getByLabel('Nom du cabinet').fill('Cabinet E2E');
  await drPage.getByLabel('Email').fill(drEmail);
  await drPage.getByLabel(/Mot de passe/).fill(password);
  await drPage.getByRole('button', { name: /Créer mon cabinet/ }).click();
  await drPage.waitForURL('**/today');
  await expect(drPage.getByRole('heading', { level: 1 })).toContainText('Bonjour Dr. Test');

  // 3. Doctor invites assistant.
  await drPage.goto('/settings/team');
  await drPage.getByLabel('Email').fill(asstEmail);
  await drPage.getByRole('button', { name: /Inviter/ }).click();
  const link = await drPage.locator('code').first().innerText();
  expect(link).toMatch(/\/invite\/[0-9a-f]{64}$/);

  // 4. Assistant accepts in a separate context.
  const asstContext = await browser.newContext();
  const asstPage = await asstContext.newPage();
  await asstPage.goto(link);
  await asstPage.getByLabel('Votre nom complet').fill('Asst Test');
  await asstPage.getByLabel('Email').fill(asstEmail);
  await asstPage.getByLabel(/Mot de passe/).fill(password);
  await asstPage.getByRole('button', { name: /Rejoindre/ }).click();
  await asstPage.waitForURL('**/today');
  await expect(asstPage.getByRole('heading', { level: 1 })).toContainText('Bonjour Asst Test');

  // 5. Assistant cannot reach /settings/team.
  await asstPage.goto('/settings/team');
  await asstPage.waitForURL('**/today');

  // 6. Doctor can sign out and back in.
  await drPage.locator('button:has-text("Déconnexion")').click();
  await drPage.waitForURL('**/sign-in');
  await drPage.getByLabel('Email').fill(drEmail);
  await drPage.getByLabel('Mot de passe').fill(password);
  await drPage.getByRole('button', { name: /Se connecter/ }).click();
  await drPage.waitForURL('**/today');
});
