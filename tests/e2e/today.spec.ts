import { test, expect } from '@playwright/test';
import { onboardDoctor, closeDb } from './helpers/invite';

test.afterAll(async () => {
  await closeDb();
});

async function createPatient(
  page: import('@playwright/test').Page,
  patient: { lastName: string; firstName: string; gender: 'Homme' | 'Femme'; dob: string; phone: string },
) {
  await page.goto('/patients/new');
  await page.getByLabel('Nom', { exact: true }).fill(patient.lastName);
  await page.getByLabel('Prénom').fill(patient.firstName);
  await page.getByLabel('Sexe').click();
  await page.getByRole('option', { name: patient.gender }).click();
  await page.getByLabel('Date de naissance').fill(patient.dob);
  await page.getByLabel('Téléphone').fill(patient.phone);
  await page.getByRole('button', { name: /Créer le patient/ }).click();
  await expect(page).toHaveURL(/\/patients\/[0-9a-f-]{36}/);
}

test('day view: book scheduled, then walk-in, then mark arrived', async ({ page }) => {
  await onboardDoctor(page);

  await createPatient(page, {
    lastName: 'Tazi',
    firstName: 'Salma',
    gender: 'Femme',
    dob: '1990-06-15',
    phone: '+212611112222',
  });

  // Book a scheduled appointment for today
  await page.goto('/today/book');
  await page.getByLabel(/Recherche patient/).fill('Tazi');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await page.getByRole('radio').first().check();
  await page.getByLabel('Heure').fill('10:30');
  await page.getByRole('button', { name: /Enregistrer/ }).click();
  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByText('Tazi Salma')).toBeVisible();

  // Mark them arrived
  await page.getByRole('button', { name: 'arrivé' }).first().click();
  await expect(
    page.locator('section').filter({ hasText: /Salle d.attente/ }).getByText('Tazi Salma'),
  ).toBeVisible();

  // Create another patient and walk in
  await createPatient(page, {
    lastName: 'Alaoui',
    firstName: 'Karim',
    gender: 'Homme',
    dob: '1972-09-01',
    phone: '+212622223333',
  });

  await page.goto('/today/walk-in');
  await page.getByLabel(/Recherche patient/).fill('Alaoui');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: /salle d.attente/i }).click();
  await expect(page).toHaveURL(/\/today/);
  await expect(
    page.locator('section').filter({ hasText: /Salle d.attente/ }).getByText('Alaoui Karim'),
  ).toBeVisible();
});
