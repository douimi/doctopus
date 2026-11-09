import { test, expect, type Page } from '@playwright/test';
import { closeDb } from './helpers/invite';
import { seedAuthedTenant, type AuthedUser } from '../fixtures/auth-users';
import { seedPatient } from '../fixtures/patients';
import { seedAppointment } from '../fixtures/appointments';

// Fake microphone so MediaRecorder works headless.
test.use({
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
});

test.afterAll(async () => {
  await closeDb();
});

// 1×1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64',
);

async function signInAs(page: Page, user: AuthedUser) {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Mot de passe').fill('Realtime-test-password-42!');
  await page.getByRole('button', { name: /Se connecter/ }).click();
  await page.waitForURL('**/today');
}

test('quick replies, patient mentions, /today shortcut, photo and voice note', async ({ browser }) => {
  test.setTimeout(150_000);
  const t = await seedAuthedTenant(`e2e-x-${Date.now()}`);
  const patient = await seedPatient(t.tenantId);
  await seedAppointment(t.tenantId, patient.id, t.assistant.id, {
    status: 'waiting',
    kind: 'walkin',
    scheduledAt: null,
    arrivedAt: new Date(),
  });

  const doctorCtx = await browser.newContext({ permissions: ['microphone'] });
  const assistantCtx = await browser.newContext({ permissions: ['microphone'] });
  const doctor = await doctorCtx.newPage();
  const assistant = await assistantCtx.newPage();
  await signInAs(doctor, t.doctor);
  await signInAs(assistant, t.assistant);

  await doctor.goto('/messages');
  const docThread = doctor.getByRole('region', { name: 'Conversation', exact: true });
  await expect(docThread.getByRole('toolbar', { name: 'Messages rapides' })).toBeVisible({ timeout: 15_000 });

  // 1. Quick reply: one tap sends.
  await docThread.getByRole('button', { name: 'Patient suivant' }).click();
  await assistant.goto('/messages');
  const asstThread = assistant.getByRole('region', { name: 'Conversation', exact: true });
  await expect(asstThread.getByText('Faites entrer le patient suivant, s’il vous plaît.')).toBeVisible({
    timeout: 15_000,
  });

  // 2. "@" mention: the card shows the patient + live waiting status.
  const asstBox = asstThread.getByLabel('Votre message');
  await asstBox.pressSequentially('@');
  const picker = assistant.getByRole('dialog', { name: 'Mentionner un patient' });
  await expect(picker).toBeVisible();
  await picker.getByLabel('Rechercher un patient').fill(patient.lastName);
  await picker.getByRole('option').first().click();
  await asstBox.fill('Elle demande si ses analyses sont prêtes');
  await asstBox.press('Enter');
  const card = docThread.getByRole('link', { name: new RegExp(patient.lastName) });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card).toContainText('En salle d’attente');

  // 3. Photo: picked, captioned, sent; the doctor sees the image.
  await asstThread.getByTestId('composer-file-input').setInputFiles({
    name: 'ordonnance.png',
    mimeType: 'image/png',
    buffer: PNG,
  });
  await asstBox.fill('Ordonnance du cardiologue');
  await asstBox.press('Enter');
  await expect(docThread.getByRole('img', { name: 'ordonnance.png' })).toBeVisible({ timeout: 20_000 });
  await expect(docThread.getByText('Ordonnance du cardiologue')).toBeVisible();

  // 4. Voice note from the doctor (fake microphone).
  await docThread.getByRole('button', { name: 'Enregistrer une note vocale' }).click();
  const send = docThread.getByRole('button', { name: 'Envoyer la note vocale' });
  await expect(send).toBeEnabled({ timeout: 10_000 });
  await doctor.waitForTimeout(1500);
  await send.click();
  await expect(asstThread.getByRole('button', { name: 'Écouter la note vocale' })).toBeVisible({
    timeout: 20_000,
  });

  // 5. /today → "Envoyer un message à propos…" opens the dock with the patient attached.
  await doctor.goto('/today');
  await doctor.getByRole('button', { name: new RegExp(`Plus d'actions pour`) }).first().click();
  await doctor.getByRole('menuitem', { name: /Envoyer un message à propos/ }).click();
  const dock = doctor.getByRole('dialog', { name: 'Messagerie du cabinet' });
  await expect(dock).toBeVisible();
  await expect(dock.getByRole('button', { name: new RegExp(`Retirer ${patient.lastName}`) })).toBeVisible();
  const dockBox = dock.getByLabel('Votre message');
  await dockBox.fill('Je la prends après le patient en cours');
  await dockBox.press('Enter');
  await expect(asstThread.getByText('Je la prends après le patient en cours')).toBeVisible({ timeout: 15_000 });

  await doctorCtx.close();
  await assistantCtx.close();
});
