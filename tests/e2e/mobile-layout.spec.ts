import { expect, test, type Browser, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { closeDb, mintOwnerInvite } from './helpers/invite';
import { seedAuthedTenant, type AuthedUser } from '../fixtures/auth-users';
import { seedPatient } from '../fixtures/patients';
import { seedAppointment } from '../fixtures/appointments';
import { seedConsultation, seedVitals } from '../fixtures/consultations';
import { seedPrescription, seedPrescriptionItem } from '../fixtures/prescriptions';
import { dbAdmin } from '@/db/client';
import { conversations, messages } from '@/db/schema';

const PASSWORD = 'Realtime-test-password-42!';
/** Small Android (360) and iPhone 12–15 (390). */
const VIEWPORTS = [360, 390];

test.afterAll(async () => {
  await closeDb();
});

type Finding = { role: string; vw: number; route: string; final: string; scrollW: number; offenders: string[] };

async function audit(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const describe = (el: Element, r: DOMRect) => {
      const cls = (el.getAttribute('class') ?? '').split(/\s+/).slice(0, 6).join('.');
      const txt = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
      return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls ? '.' + cls : ''} [${Math.round(r.left)}→${Math.round(r.right)}] "${txt}"`;
    };
    const offending = new Set<Element>();
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue;
      if (r.right <= vw + 1 && r.left >= -1) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      // Ignore content clipped by a scroll/overflow container that itself fits.
      let p = el.parentElement;
      let clipped = false;
      while (p && p !== document.body) {
        const ps = getComputedStyle(p);
        if (['hidden', 'auto', 'scroll', 'clip'].includes(ps.overflowX)) {
          const pr = p.getBoundingClientRect();
          if (pr.right <= vw + 1 && pr.left >= -1) {
            clipped = true;
            break;
          }
        }
        p = p.parentElement;
      }
      if (!clipped) offending.add(el);
    }
    // Keep the outermost offenders only.
    const top = [...offending].filter((el) => {
      let p = el.parentElement;
      while (p) {
        if (offending.has(p)) return false;
        p = p.parentElement;
      }
      return true;
    });
    // Content cut off by an overflow:hidden/clip ancestor (not scrollable,
    // not an intentional ellipsis) — invisible to the page-width check.
    const clipped: string[] = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const r = el.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) continue;
      const cs = getComputedStyle(el);
      if (cs.position === 'absolute' || cs.position === 'fixed') continue;
      let p = el.parentElement;
      while (p && p !== document.body) {
        const ps = getComputedStyle(p);
        if (['auto', 'scroll'].includes(ps.overflowX)) break;
        if (['hidden', 'clip'].includes(ps.overflowX)) {
          if (ps.textOverflow === 'ellipsis') break;
          const pr = p.getBoundingClientRect();
          if (r.right > pr.right + 2 && pr.width > 40) {
            clipped.push(describe(el, r) + ' ⊄ ' + describe(p, pr));
          }
          break;
        }
        p = p.parentElement;
      }
    }
    const clippedTop = clipped.filter((d, i) => i < 6);
    return {
      scrollW: document.documentElement.scrollWidth,
      vw,
      offenders: [...top.slice(0, 6).map((el) => describe(el, el.getBoundingClientRect())), ...clippedTop.map((c) => 'CLIPPED ' + c)],
    };
  });
}

async function signIn(browser: Browser, email: string, vw: number) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe').fill(PASSWORD);
  await page.getByRole('button', { name: /Se connecter/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/sign-in'), { timeout: 20_000 });
  return { ctx, page };
}

/**
 * Every app page at phone widths, for each role: nothing may stick out of
 * the viewport, and nothing may be silently clipped by an overflow:hidden
 * container (how /messages hid the user's own bubbles). Tables are allowed
 * to scroll inside their own overflow-x container.
 */
test('mobile layout: no horizontal overflow or clipped content on any page', async ({ browser }) => {
  test.setTimeout(900_000);
  const t = await seedAuthedTenant(`mob-${Date.now()}`);
  const p1 = await seedPatient(t.tenantId, {
    firstName: 'Fatima-Zahra',
    lastName: 'El Idrissi Benjelloun',
    address: '123, boulevard Mohammed V, résidence Les Orangers, appartement 14, Casablanca',
    phone: '+212661234567',
    cin: 'BK123456',
  });
  const p2 = await seedPatient(t.tenantId, { firstName: 'Ahmed', lastName: 'Bennani' });
  const p3 = await seedPatient(t.tenantId, { firstName: 'Salma', lastName: 'Tazi' });
  await seedAppointment(t.tenantId, p2.id, t.assistant.id, { status: 'scheduled', kind: 'scheduled', reason: 'Contrôle tension artérielle et renouvellement ordonnance' });
  await seedAppointment(t.tenantId, p3.id, t.assistant.id, { status: 'waiting', kind: 'walkin', scheduledAt: null, arrivedAt: new Date() });
  const apInConsult = await seedAppointment(t.tenantId, p1.id, t.assistant.id, { status: 'in_consultation', kind: 'walkin', scheduledAt: null, arrivedAt: new Date(), startedAt: new Date() });
  const inConsult = await seedConsultation(t.tenantId, apInConsult.id, p1.id, t.doctor.id, { motif: 'Douleurs thoraciques atypiques depuis trois jours', historyNotes: 'Antécédents familiaux de cardiopathie ischémique.' });
  await seedVitals(t.tenantId, inConsult.id, { weightKg: '72.5', heightCm: '165', bpSystolic: 135, bpDiastolic: 85, heartRate: 78, temperatureC: '37.2' });
  const apDone = await seedAppointment(t.tenantId, p2.id, t.assistant.id, { status: 'done', kind: 'walkin', scheduledAt: null, arrivedAt: new Date(), endedAt: new Date() });
  const done = await seedConsultation(t.tenantId, apDone.id, p2.id, t.doctor.id, {
    motif: 'Hypertension artérielle — suivi', diagnosis: 'HTA essentielle équilibrée', isFinalized: true, finalizedAt: new Date(),
  });
  const rx = await seedPrescription(t.tenantId, done.id, p2.id, t.doctor.id);
  await seedPrescriptionItem(t.tenantId, rx.id, { medicationLabelSnapshot: 'AMLODIPINE TEVA 10 mg comprimé sécable boîte de 30', posologie: '1 comprimé le matin pendant 3 mois' } as never);

  const db = dbAdmin();
  const [cab] = await db.insert(conversations).values({ tenantId: t.tenantId, kind: 'cabinet' }).returning();
  const [a, b] = [t.doctor.id, t.assistant.id].sort();
  const [dm] = await db.insert(conversations).values({ tenantId: t.tenantId, kind: 'direct', userA: a, userB: b }).returning();
  const long = 'Le laboratoire a envoyé les résultats : https://exemple-laboratoire-tres-long-domaine.ma/resultats/patient/123456789/bilan-complet-hematologie-biochimie.pdf merci de vérifier';
  let k = 0;
  const say = (sender: string, c: string, body: string, extra: Record<string, unknown> = {}) =>
    db.insert(messages).values({ id: randomUUID(), tenantId: t.tenantId, conversationId: c, senderId: sender, body, createdAt: new Date(Date.now() - 600_000 + (k++) * 30_000), ...extra });
  await say(t.assistant.id, cab.id, 'Bonjour Docteur, la salle d’attente est pleine ce matin.');
  await say(t.doctor.id, cab.id, 'Merci, je commence dans 5 minutes. Faites entrer Mme El Idrissi Benjelloun en premier.');
  await say(t.assistant.id, cab.id, long, { patientId: p1.id, appointmentId: apInConsult.id });
  await say(t.doctor.id, cab.id, 'Supercalifragilisticexpialidociousanticonstitutionnellement_sans_espaces_du_tout_1234567890');
  await say(t.doctor.id, cab.id, 'Faites entrer le patient suivant, s’il vous plaît.', { kind: 'quick' });
  await say(t.assistant.id, dm.id, 'Message privé : un appel pour vous sur la ligne 2.');

  // Admin pages need the dev server's SUPER_ADMIN_EMAILS to allow *@admin.e2e.local.
  const adminAllowed = (process.env.SUPER_ADMIN_EMAILS ?? '').includes('*@admin.e2e.local');
  const adminEmail = `mobile-${Date.now()}@admin.e2e.local`;
  await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!, { auth: { persistSession: false } })
    .auth.admin.createUser({ email: adminEmail, password: PASSWORD, email_confirm: true });
  const invite = await mintOwnerInvite(`new-${Date.now()}@e2e.local`);

  const doctorRoutes = [
    '/today', '/today/book', '/today/walk-in', '/today/walk-in/suivi', '/today/payments',
    '/patients', '/patients/new', `/patients/${p1.id}`, `/patients/${p1.id}/edit`,
    '/consultations', `/consultations/${inConsult.id}`, `/consultations/${done.id}`, '/consultations/new',
    '/suivis', '/suivis/new', '/stats', '/settings/cabinet', '/settings/team', '/settings/audit',
    '/messages', `/messages?c=${cab.id}`, `/messages?c=${dm.id}`, 'DOCK',
  ];
  const assistantRoutes = ['/today', '/today/book', '/today/walk-in', '/today/payments', '/patients', `/patients/${p1.id}`, `/messages?c=${cab.id}`, 'DOCK'];
  const adminRoutes = ['/admin', '/admin/tenants', `/admin/tenants/${t.tenantId}`, '/admin/invites', '/admin/design'];
  const publicRoutes = ['/', '/sign-in', `/invite/${invite}`, '/static/sous-traitants'];

  const findings: Finding[] = [];
  const run = async (role: string, page: Page, routes: string[], vw: number) => {
    for (const route of routes) {
      if (route === 'DOCK') {
        await page.goto('/patients');
        await page.waitForTimeout(1500);
        await page.getByRole('button', { name: /^Messagerie/ }).first().click();
        await page.getByRole('dialog', { name: 'Messagerie du cabinet' }).getByRole('button', { name: /^Cabinet/ }).click();
        await page.waitForTimeout(1500);
      } else {
        await page.goto(route);
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(route.startsWith('/messages') ? 1800 : 600);
      }
      const res = await audit(page);
      const f = { role, vw, route, final: new URL(page.url()).pathname, scrollW: res.scrollW, offenders: res.offenders };
      findings.push(f);
      if (route === '/today') {
        for (const tab of ['Agenda', 'Paiements']) {
          const btn = page.getByRole('button', { name: new RegExp(`^${tab}`) }).first();
          if (!(await btn.isVisible().catch(() => false))) continue;
          await btn.click();
          await page.waitForTimeout(400);
          const r2 = await audit(page);
          findings.push({ role, vw, route: `/today#${tab}`, final: '/today', scrollW: r2.scrollW, offenders: r2.offenders });
        }
      }
    }
  };

  for (const vw of VIEWPORTS) {
    for (const [role, user, routes] of [
      ['doctor', t.doctor, doctorRoutes],
      ['assistant', t.assistant, assistantRoutes],
    ] as Array<[string, AuthedUser, string[]]>) {
      const { ctx, page } = await signIn(browser, user.email, vw);
      await run(role, page, routes, vw);
      await ctx.close();
    }
    if (adminAllowed) {
      const admin = await signIn(browser, adminEmail, vw);
      await run('admin', admin.page, adminRoutes, vw);
      await admin.ctx.close();
    }
    const pub = await browser.newContext({ viewport: { width: vw, height: 800 }, isMobile: true, hasTouch: true });
    await run('public', await pub.newPage(), publicRoutes, vw);
    await pub.close();
  }
  const problems = findings.filter((f) => f.offenders.length > 0 || f.scrollW > f.vw);
  expect(problems, JSON.stringify(problems, null, 2)).toEqual([]);
});
