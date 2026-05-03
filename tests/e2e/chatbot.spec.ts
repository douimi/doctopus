import { test, expect } from '@playwright/test';
import { onboardDoctor, closeDb } from './helpers/invite';
import { dbAdmin } from '@/db/client';
import { tenants, userProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { grantCredits } from '@/lib/chatbot/credits';

test.afterAll(async () => {
  await closeDb();
});

test('admin grants credits, doctor sees panel in ready state, disclaimer can be acknowledged', async ({ page }) => {
  const { email } = await onboardDoctor(page);

  // Look up tenant via the doctor's unique email to avoid ambiguity when
  // multiple "Cabinet E2E" tenants exist from previous test runs.
  const [profile] = await dbAdmin()
    .select({ tenantId: userProfiles.tenantId })
    .from(userProfiles)
    .where(eq(userProfiles.email, email));
  if (!profile) throw new Error(`User profile not found for ${email}`);

  const [tenant] = await dbAdmin().select().from(tenants).where(eq(tenants.id, profile.tenantId));
  if (!tenant) throw new Error('Tenant not found after onboarding');

  await dbAdmin()
    .update(tenants)
    .set({
      chatbotProvider: 'anthropic',
      chatbotModel: 'claude-haiku-4-5-20251001',
      chatbotEnabled: true,
    })
    .where(eq(tenants.id, tenant.id));
  await grantCredits(tenant.id, 5, 'cli:e2e');

  // Create patient + walk-in + start consultation.
  await page.goto('/patients/new');
  await page.getByLabel('Nom', { exact: true }).fill('Bennani');
  await page.getByLabel('Prénom').fill('Test');
  await page.getByLabel('Sexe').click();
  await page.getByRole('option', { name: 'Femme' }).click();
  await page.getByLabel('Date de naissance').fill('1990-01-01');
  await page.getByLabel('Téléphone').fill('+212600000000');
  await page.getByRole('button', { name: /Créer le patient/ }).click();
  await expect(page).toHaveURL(/\/patients\/[0-9a-f-]{36}/);

  await page.goto('/today/walk-in');
  await page.getByLabel(/Recherche patient/).fill('Bennani');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: /salle d.attente/i }).click();
  await page.getByRole('button', { name: 'Commencer' }).first().click();
  await expect(page).toHaveURL(/\/consultations\/[0-9a-f-]{36}/);

  // Disclaimer modal appears; acknowledge.
  await page.getByRole('button', { name: /J'ai compris/ }).click();
  await expect(page.getByRole('heading', { name: /Assistant IA — note importante/ })).toHaveCount(0);

  // Panel shows "~5 consultations restantes".
  await expect(page.getByText(/~5 consultations restantes/)).toBeVisible();

  // Suggested prompts are visible (state = ready, no messages yet).
  await expect(page.getByText(/Posez une question clinique/)).toBeVisible();

  // Input field + Send button present and enabled.
  const input = page.getByPlaceholder(/Votre question/);
  await expect(input).toBeVisible();
  await expect(input).toBeEnabled();
  const sendBtn = page.getByRole('button', { name: 'Envoyer' });
  await expect(sendBtn).toBeVisible();
});
