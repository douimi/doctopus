import { test, expect } from '@playwright/test';
import { onboardDoctor, closeDb } from './helpers/invite';
import { dbAdmin } from '@/db/client';
import { medications } from '@/db/schema';

test.beforeAll(async () => {
  await dbAdmin()
    .insert(medications)
    .values([
      {
        nomCommercial: 'Doliprane-E2E',
        dci: 'Paracétamol',
        dosage: '1000 mg',
        forme: 'comprimé',
        laboratoire: 'Sanofi-E2E',
      },
      {
        nomCommercial: 'Brufen-E2E',
        dci: 'Ibuprofène',
        dosage: '400 mg',
        forme: 'comprimé',
        laboratoire: 'Abbott-E2E',
      },
    ])
    .onConflictDoNothing();
});

test.afterAll(async () => {
  await closeDb();
});

test('doctor adds a prescription item and downloads the PDF', async ({ page }) => {
  await onboardDoctor(page);

  await page.goto('/patients/new');
  await page.getByLabel('Nom', { exact: true }).fill('Berrada');
  await page.getByLabel('Prénom').fill('Yasmine');
  await page.getByLabel('Sexe').click();
  await page.getByRole('option', { name: 'Femme' }).click();
  await page.getByLabel('Date de naissance').fill('1992-04-10');
  await page.getByLabel('Téléphone').fill('+212611333444');
  await page.getByRole('button', { name: /Créer le patient/ }).click();
  await expect(page).toHaveURL(/\/patients\/[0-9a-f-]{36}/);

  await page.goto('/today/walk-in');
  await page.getByLabel(/Recherche patient/).fill('Berrada');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: /salle d.attente/i }).click();
  await page.getByRole('button', { name: 'Commencer' }).first().click();
  await expect(page).toHaveURL(/\/consultations\/[0-9a-f-]{36}/);

  // Search for medication
  await page.getByPlaceholder(/Rechercher un médicament/).fill('Doliprane-E2E');
  await page.getByRole('button', { name: /Doliprane-E2E/ }).first().click();

  // Fill posologie + add
  await page.getByLabel('Posologie').fill('1 cp matin et soir');
  await page.getByLabel('Durée').fill('5 jours');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();

  // Item appears
  await expect(page.getByText(/Doliprane-E2E.*1000 mg/)).toBeVisible();

  // PDF link is visible — fetch and verify response
  const pdfLink = page.getByRole('link', { name: /Imprimer l.ordonnance/ });
  await expect(pdfLink).toBeVisible();
  const href = await pdfLink.getAttribute('href');
  expect(href).toMatch(/\/api\/prescriptions\/[0-9a-f-]{36}\/pdf/);

  const response = await page.request.get(href!);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/application\/pdf/);
  const body = await response.body();
  expect(body.length).toBeGreaterThan(1000);
  expect(body.subarray(0, 4).toString()).toBe('%PDF');
});
