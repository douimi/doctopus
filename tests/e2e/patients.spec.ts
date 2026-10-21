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
  await expect(page.getByRole('heading', { name: 'Bennani Ahmed' })).toBeVisible();

  // Add an allergy
  await page.getByRole('textbox', { name: 'Ajouter une allergie' }).fill('Pénicilline');
  await page.getByRole('button', { name: 'Ajouter une allergie' }).click();
  await expect(page.getByText('Allergie : Pénicilline')).toBeVisible();

  // Add a chronic condition
  await page.getByRole('textbox', { name: 'Ajouter une maladie chronique' }).fill('Diabète type 2');
  await page.getByRole('button', { name: 'Ajouter une maladie chronique' }).click();
  await expect(page.getByText('Diabète type 2').first()).toBeVisible();

  // Edit
  await page.getByRole('button', { name: "Plus d'actions sur le dossier" }).click();
  await page.getByRole('menuitem', { name: /Modifier le dossier/ }).click();
  await page.getByLabel('Téléphone').fill('+212611111111');
  await page.getByRole('button', { name: /Enregistrer/ }).click();
  await expect(page.getByText('+212611111111')).toBeVisible();

  // Search
  await page.goto('/patients');
  await page.getByPlaceholder(/Recherche/).fill('Bennani');
  await expect(page.getByRole('link', { name: /Bennani Ahmed/ })).toBeVisible();

  // Archive (overflow menu + confirmation)
  await page.getByRole('link', { name: /Bennani Ahmed/ }).click();
  await page.getByRole('button', { name: "Plus d'actions sur le dossier" }).click();
  await page.getByRole('menuitem', { name: /Archiver le patient/ }).click();
  await page.getByRole('button', { name: 'Archiver', exact: true }).click();
  await expect(page).toHaveURL(/\/patients(\?|$)/);
});
