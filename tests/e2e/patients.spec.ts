import { test, expect } from '@playwright/test';
import { onboardDoctor, closeDb } from './helpers/invite';

test.afterAll(async () => {
  await closeDb();
});

test('doctor can create, search, edit, archive a patient', async ({ page }) => {
  await onboardDoctor(page);

  // Create
  await page.goto('/patients/new');
  await page.getByLabel('Nom', { exact: true }).fill('Bennani');
  await page.getByLabel('Prénom').fill('Ahmed');
  await page.getByLabel('Sexe').click();
  await page.getByRole('option', { name: 'Homme' }).click();
  await page.getByLabel('Date de naissance').fill('1985-03-12');
  await page.getByLabel('Téléphone').fill('+212600000001');
  await page.getByRole('button', { name: /Créer le patient/ }).click();
  await expect(page).toHaveURL(/\/patients\/[0-9a-f-]{36}/);
  await expect(page.getByText('Bennani Ahmed')).toBeVisible();

  // Add an allergy
  await page.locator('input[placeholder*="Pénicilline"]').fill('Pénicilline');
  await page
    .locator('form')
    .filter({ has: page.locator('input[placeholder*="Pénicilline"]') })
    .getByRole('button', { name: '+' })
    .click();
  await expect(page.getByText('⚠ Allergie : Pénicilline')).toBeVisible();

  // Add a chronic condition
  await page.locator('input[placeholder*="HTA"]').fill('Diabète type 2');
  await page
    .locator('form')
    .filter({ has: page.locator('input[placeholder*="HTA"]') })
    .getByRole('button', { name: '+' })
    .click();
  await expect(page.getByText('Diabète type 2').first()).toBeVisible();

  // Edit
  await page.getByRole('link', { name: /Modifier/ }).click();
  await page.getByLabel('Téléphone').fill('+212611111111');
  await page.getByRole('button', { name: /Enregistrer/ }).click();
  await expect(page.getByText('+212611111111')).toBeVisible();

  // Search
  await page.goto('/patients');
  await page.getByPlaceholder(/Recherche/).fill('Bennani');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await expect(page.getByText('Bennani')).toBeVisible();

  // Archive
  await page.getByRole('link', { name: 'Ouvrir' }).click();
  await page.getByRole('button', { name: 'Archiver' }).click();
  await expect(page).toHaveURL(/\/patients(\?|$)/);
});
