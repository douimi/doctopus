import { test, expect } from '@playwright/test';
import { onboardDoctor, closeDb } from './helpers/invite';

test.afterAll(async () => {
  await closeDb();
});

test('doctor walks-in a patient, runs and finalizes a consultation', async ({ page }) => {
  await onboardDoctor(page);

  // 1. Create patient
  await page.goto('/patients/new');
  await page.getByLabel('Nom', { exact: true }).fill('Tazi');
  await page.getByLabel('Prénom').fill('Salma');
  await page.getByLabel('Sexe').click();
  await page.getByRole('option', { name: 'Femme' }).click();
  await page.getByLabel('Date de naissance').fill('1990-06-15');
  await page.getByLabel('Téléphone').fill('+212611112222');
  await page.getByRole('button', { name: /Créer le patient/ }).click();
  await expect(page).toHaveURL(/\/patients\/[0-9a-f-]{36}/);
  const patientUrl = page.url();

  // 2. Walk-in
  await page.goto('/today/walk-in');
  await page.getByLabel(/Recherche patient/).fill('Tazi');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: /salle d.attente/i }).click();
  await expect(page).toHaveURL(/\/today/);

  // 3. Start consultation
  await page.getByRole('button', { name: 'Commencer' }).first().click();
  await expect(page).toHaveURL(/\/consultations\/[0-9a-f-]{36}/);

  // 4. Fill in motif + diagnosis + a couple vitals
  await page.locator('textarea[name="motif"]').fill('Maux de tête depuis 3 jours');
  await page.getByLabel('Poids (kg)').fill('62');
  await page.getByLabel('TA syst.').fill('120');
  await page.getByLabel('TA diast.').fill('80');
  const diagnosticSection = page.locator('details', { hasText: 'Diagnostic' });
  await diagnosticSection.locator('textarea').fill('Céphalée de tension');

  // 5. Wait for auto-save (1.5s + grace)
  await expect(page.getByText('Enregistré').first()).toBeVisible({ timeout: 8000 });

  // 6. Finalize
  await page.getByRole('button', { name: /Terminer la consultation/ }).click();
  await expect(page).toHaveURL(/\/today/);

  // 7. Patient gone from waiting room
  const waiting = page.locator('section').filter({ hasText: /Salle d.attente/ });
  await expect(waiting.getByText('Tazi Salma')).toHaveCount(0);

  // 8. Past consultations show on patient detail
  await page.goto(patientUrl);
  await expect(page.getByText('Céphalée de tension')).toBeVisible();
  await expect(page.getByText('terminée').first()).toBeVisible();
});
