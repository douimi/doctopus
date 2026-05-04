import { test, expect } from '@playwright/test';
import { closeDb } from './helpers/invite';
import { dbAdmin } from '@/db/client';
import { tenants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import { grantCredits } from '@/lib/chatbot/credits';
import { seedTenant } from '../fixtures/tenants';

test.afterAll(async () => {
  await closeDb();
});

test('admin can log in, see dashboard, grant credits, and revoke an invite', async ({ page }) => {
  // 1. Create a super admin user in auth.users.
  const adminEmail = `admin-${crypto.randomUUID()}@e2e.local`;
  const adminPassword = 'AdminTestPass-1234';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE!;
  const supa = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await supa.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });

  // Make sure SUPER_ADMIN_EMAILS includes our generated admin email at the dev server level.
  // Since the dev server was started before this test, we can't inject env. The test relies on
  // the developer setting SUPER_ADMIN_EMAILS in .env.local to include @e2e.local fixed-emails
  // or a known email. If unset, skip with a clear message.

  const allowList = (process.env.SUPER_ADMIN_EMAILS ?? '').toLowerCase().split(',').map((s) => s.trim());
  if (!allowList.includes(adminEmail.toLowerCase()) && !allowList.some((a) => a === '*' || a === '*@e2e.local')) {
    test.skip(
      true,
      `Set SUPER_ADMIN_EMAILS in .env.local to include "${adminEmail}" or extend isAdminEmail to support a wildcard.`,
    );
  }

  // 3. Seed a tenant so the admin has something to manage.
  const t = await seedTenant('admin-e2e');
  await grantCredits(t.tenantId, 5, 'cli:e2e-seed');

  // 4. Sign in as admin.
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Mot de passe').fill(adminPassword);
  await page.getByRole('button', { name: /Se connecter/ }).click();
  await page.waitForURL('**/admin');

  // 5. Dashboard renders.
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
  await expect(page.getByText(/Cabinets actifs/)).toBeVisible();

  // 6. Tenants list shows our seeded tenant.
  await page.getByRole('link', { name: 'Cabinets' }).click();
  await page.waitForURL('**/admin/tenants');
  await page.getByPlaceholder(/Recherche/).fill('admin-e2e');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await expect(page.getByText('Cabinet admin-e2e').first()).toBeVisible();

  // 7. Open the specific seeded tenant detail and grant 10 credits.
  await page.goto(`/admin/tenants/${t.tenantId}`);
  await page.getByLabel('Nombre de consultations').fill('10');
  await page.getByRole('button', { name: 'Accorder' }).click();
  await expect(page.getByText('Crédits accordés.')).toBeVisible({ timeout: 5000 });

  // 8. Verify the balance increased to 15 in the DB.
  const [tenant] = await dbAdmin().select().from(tenants).where(eq(tenants.id, t.tenantId));
  expect(tenant.chatbotCreditsBalance).toBe(15);

  // 9. Create + revoke an invite.
  await page.getByRole('link', { name: 'Invitations' }).click();
  await page.waitForURL('**/admin/invites');
  await page.getByLabel('Email', { exact: true }).fill(`new-doctor-${crypto.randomUUID()}@e2e.local`);
  await page.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByText(/Invitation créée/)).toBeVisible({ timeout: 5000 });

  // The newly-created invite appears in the table with status "En attente".
  await page.reload();
  const pendingRow = page.locator('tr').filter({ hasText: 'En attente' }).first();
  await expect(pendingRow).toBeVisible();
  await pendingRow.getByRole('button', { name: 'Révoquer' }).click();
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Révoquée').first()).toBeVisible({ timeout: 10000 });
});
