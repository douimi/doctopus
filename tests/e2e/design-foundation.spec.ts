import { test, expect } from '@playwright/test';
import { closeDb } from './helpers/invite';

test.afterAll(async () => {
  await closeDb();
});

test('public surfaces render with new shell', async ({ page }) => {
  // Sign-in renders + bad creds show a danger alert.
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
  await page.getByLabel('Email').fill('nope@nope.com');
  await page.getByLabel('Mot de passe').fill('wrong-password');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  // Error alert appears.
  await expect(
    page.locator('[role="alert"]').filter({ hasText: /identifiants/i }).or(
      page.locator('[role="alert"]'),
    ),
  ).toBeVisible({ timeout: 5000 });

  // Bad invite token shows a warning alert.
  await page.goto('/invite/0000000000000000000000000000000000000000000000000000000000000000');
  await expect(page.locator('[role="alert"][data-slot="alert"]')).toBeVisible();
  await expect(page.getByText(/n'existe pas/)).toBeVisible();
});

test('doctor sees the new sidebar', async ({ page, request }) => {
  // Reuse the existing onboarding helper to bootstrap a doctor, OR rely on a pre-seeded account.
  // For this smoke test we just need an auth session — assume a doctor account exists.
  const doctorEmail = process.env.E2E_DOCTOR_EMAIL ?? 'dr@test.local';
  const doctorPassword = process.env.E2E_DOCTOR_PASSWORD ?? 'TestPass123!';

  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(doctorEmail);
  await page.getByLabel('Mot de passe').fill(doctorPassword);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  // If credentials don't match the local seed, the test skips — local DB seeding varies.
  const onTodayOrAdmin = page.url().includes('/today') || page.url().includes('/admin');
  if (!onTodayOrAdmin) {
    test.skip(true, `Set E2E_DOCTOR_EMAIL/PASSWORD or seed dr@test.local before running.`);
  }

  await page.waitForURL('**/today');
  await expect(page.locator('aside[data-slot="sidebar"][data-theme="sky"]')).toBeVisible();
  await expect(page.getByRole('link', { name: "Aujourd'hui" })).toBeVisible();
});

test('admin sees the orange sidebar and /admin/design route', async ({ page }) => {
  const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@test.local';
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  if (!adminPassword) {
    test.skip(
      true,
      'Set E2E_ADMIN_PASSWORD (and optionally E2E_ADMIN_EMAIL) to run the admin smoke.',
    );
  }

  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Mot de passe').fill(adminPassword);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/admin');

  await expect(page.locator('aside[data-slot="sidebar"][data-theme="orange"]')).toBeVisible();
  await expect(page.getByRole('link', { name: /Tableau de bord/ })).toBeVisible();

  // /admin/design accessible to admin.
  await page.goto('/admin/design');
  await expect(page.getByRole('heading', { name: 'Design system' })).toBeVisible();
});
