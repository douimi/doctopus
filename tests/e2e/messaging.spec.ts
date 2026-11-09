import { test, expect, type Page } from '@playwright/test';
import { closeDb } from './helpers/invite';
import { seedAuthedTenant, type AuthedUser } from '../fixtures/auth-users';
import { seedPatient } from '../fixtures/patients';
import { seedAppointment } from '../fixtures/appointments';

test.afterAll(async () => {
  await closeDb();
});

/** Resolves once the tenant channel has joined and tracked presence. */
function realtimeReady(page: Page): Promise<void> {
  return new Promise((resolve) => {
    page.on('websocket', (ws) => {
      ws.on('framereceived', (f) => {
        if (String(f.payload).includes('presence_diff')) resolve();
      });
    });
  });
}

async function signInAs(page: Page, user: AuthedUser) {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Mot de passe').fill('Realtime-test-password-42!');
  await page.getByRole('button', { name: /Se connecter/ }).click();
  await page.waitForURL('**/today');
}

test('doctor and assistant chat in real time; arrivals reach the doctor live', async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const t = await seedAuthedTenant(`e2e-msg-${Date.now()}`);

  const doctorCtx = await browser.newContext();
  const assistantCtx = await browser.newContext();
  const doctor = await doctorCtx.newPage();
  const assistant = await assistantCtx.newPage();
  await signInAs(doctor, t.doctor);
  await signInAs(assistant, t.assistant);

  // Doctor works elsewhere (patients list) — the shell keeps listening.
  const ready = realtimeReady(doctor);
  await doctor.goto('/patients');
  await ready;
  const launcher = doctor.getByRole('button', { name: /^Messagerie/ }).first();
  await expect(launcher).toBeVisible();

  // Phase 0: a waiting-room arrival toasts on the doctor's screen live.
  const patient = await seedPatient(t.tenantId);
  await seedAppointment(t.tenantId, patient.id, t.assistant.id, {
    status: 'waiting',
    kind: 'walkin',
    scheduledAt: null,
  });
  await expect(doctor.getByText('Nouveau patient en salle d’attente')).toBeVisible({
    timeout: 15_000,
  });

  // Assistant writes in the cabinet thread from the full page.
  await assistant.goto('/messages');
  await expect(assistant.getByRole('heading', { name: 'Messagerie' })).toBeVisible();
  const box = assistant.getByLabel('Votre message');
  await box.fill('Docteur, Mme Alaoui est arrivée');
  await box.press('Enter');
  await expect(assistant.getByRole('region', { name: 'Conversation', exact: true }).getByText('Docteur, Mme Alaoui est arrivée')).toBeVisible();

  // Doctor: unread badge + toast, then opens the dock on the thread.
  await expect(doctor.getByRole('button', { name: /Messagerie — 1 message non lu/ }).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(doctor.getByRole('status').filter({ hasText: 'Mme Alaoui' })).toBeVisible();
  await launcher.click();
  const dock = doctor.getByRole('dialog', { name: 'Messagerie du cabinet' });
  await expect(dock).toBeVisible();
  await dock.getByRole('button', { name: /^Cabinet/ }).click();
  await expect(dock.getByText('Docteur, Mme Alaoui est arrivée')).toBeVisible();

  // Typing indicator reaches the assistant, then the reply.
  const reply = dock.getByLabel('Votre message');
  await reply.pressSequentially('Faites-la entrer', { delay: 30 });
  const typingLine = assistant.getByTestId('typing-line');
  await expect(typingLine).toHaveText(/^Dr e2e-msg-\d+ écrit…$/, { timeout: 10_000 });
  await reply.press('Enter');
  await expect(assistant.getByRole('region', { name: 'Conversation', exact: true }).getByText('Faites-la entrer')).toBeVisible({ timeout: 10_000 });
  // Regression: the indicator must clear once the message is sent.
  await expect(typingLine).toHaveText('', { timeout: 8_000 });

  // Assistant had the thread open → doctor sees "Lu par".
  await expect(dock.getByText(/Lu par/)).toBeVisible({ timeout: 10_000 });

  // Private 1:1 from the doctor's dock.
  await dock.getByRole('button', { name: 'Toutes les conversations' }).click();
  await dock.getByRole('button', { name: new RegExp(`assistant e2e-msg`) }).click();
  const dm = dock.getByLabel('Votre message');
  await dm.fill('Message privé pour vous');
  await dm.press('Enter');
  await assistant.goto('/messages');
  await assistant.getByRole('button', { name: /doctor e2e-msg/ }).click();
  await expect(assistant.getByRole('region', { name: 'Conversation', exact: true }).getByText('Message privé pour vous')).toBeVisible({ timeout: 10_000 });
  // Read tick on the doctor's side once the assistant opened it.
  await expect(dock.getByLabel('Lu').last()).toBeVisible({ timeout: 10_000 });

  // Deep link onto an unread thread (full page load) clears the badge.
  await assistant.waitForURL(/\/messages\?c=/);
  const dmUrl = new URL(assistant.url());
  const answer = assistant.getByLabel('Votre message');
  await answer.fill('Bien reçu');
  await answer.press('Enter');
  await dock.getByRole('button', { name: 'Fermer la messagerie' }).click();
  await doctor.goto('/patients');
  await expect(doctor.getByRole('button', { name: /Messagerie — 1 message non lu/ }).first()).toBeVisible({
    timeout: 10_000,
  });
  await doctor.goto(`/messages${dmUrl.search}`);
  await expect(doctor.getByRole('region', { name: 'Conversation', exact: true }).getByText('Bien reçu')).toBeVisible();
  await expect(doctor.getByRole('button', { name: 'Messagerie', exact: true }).first()).toBeVisible({
    timeout: 10_000,
  });

  await doctorCtx.close();
  await assistantCtx.close();
});
