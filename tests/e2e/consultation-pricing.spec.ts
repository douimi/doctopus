import { test, expect } from '@playwright/test';
import { onboardDoctor, closeDb } from './helpers/invite';

test.afterAll(async () => {
  await closeDb();
});

test('doctor finalize with price → /today shows awaiting → /stats reflects amount', async ({ page }) => {
  // 1. Onboard doctor (existing helper).
  await onboardDoctor(page);

  // 2. Create a patient.
  await page.goto('/patients/new');
  await page.getByLabel('Nom', { exact: true }).fill('Berrada');
  await page.getByLabel('Prénom').fill('Yasmine');
  await page.getByLabel('Sexe').click();
  await page.getByRole('option', { name: 'Femme' }).click();
  await page.getByLabel('Date de naissance').fill('1992-04-10');
  await page.getByLabel('Téléphone').fill('+212611113333');
  await page.getByRole('button', { name: /Créer le patient/ }).click();
  await expect(page).toHaveURL(/\/patients\/[0-9a-f-]{36}/);

  // 3. Walk-in (search-based form).
  await page.goto('/today/walk-in');
  await page.getByLabel(/Recherche patient/).fill('Berrada');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: /salle d.attente/i }).click();
  await expect(page).toHaveURL(/\/today/);

  // 4. Start the consultation.
  await page.getByRole('button', { name: 'Commencer' }).first().click();
  await expect(page).toHaveURL(/\/consultations\/[0-9a-f-]{36}/);

  // 5. Fill a minimal motif so the row has content; wait for autosave.
  await page.locator('textarea[name="motif"]').fill('Suivi rapide');
  await expect(page.getByText('Enregistré').first()).toBeVisible({ timeout: 8000 });

  // 6. Open the finalize/pricing dialog.
  // The trigger is the button labeled "Terminer la consultation" on the page.
  await page.getByRole('button', { name: 'Terminer la consultation' }).click();

  // 7. Enter the price and submit. The dialog has a second button with the
  //    same label (the submit). Use .last() to target the submit.
  await page.getByLabel('Prix (MAD)').fill('250');
  await page.getByRole('button', { name: 'Terminer la consultation' }).last().click();
  await page.waitForURL(/\/today/);

  // 8. The awaiting payment row should appear in /today's Paiements section.
  await expect(page.getByText('Berrada Yasmine')).toBeVisible();
  await expect(page.getByText(/250,00\s*MAD/)).toBeVisible();

  // 9. The doctor (read-only role for payments) should NOT see Encaisser.
  await expect(page.getByRole('button', { name: 'Encaisser' })).toHaveCount(0);

  // 10. /stats should reflect the awaiting amount.
  await page.goto('/stats?range=today');
  await expect(page.getByText('Recettes')).toBeVisible();
  await expect(page.getByText('En attente')).toBeVisible();
  await expect(page.getByText(/250,00\s*MAD\s*à encaisser/)).toBeVisible();
});
