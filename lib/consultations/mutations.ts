import 'server-only';
import { and, eq } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import {
  appointments,
  consultations,
  consultationVitals,
  type Consultation,
} from '@/db/schema';
import { applyTransition, canTransition } from '@/lib/appointments/state-machine';
import type { SectionsUpdateInput, VitalsUpdateInput } from './schemas';

/**
 * Create a follow-up consultation linked to a parent. Follow-ups are
 * billed as free by default — the patient already paid for the initial
 * visit — but the doctor can flip Gratuit off at finalization if they
 * want to charge for a long control visit. Synthesizes a 'walkin'
 * appointment for the FK, same pattern as createManualConsultation.
 *
 * Returns the new consultation, or null when the parent doesn't exist
 * in this tenant.
 */
export async function createFollowUpConsultation(
  tenantId: string,
  parentConsultationId: string,
  doctorId: string,
): Promise<Consultation | null> {
  return withTenantTx(tenantId, async (tx) => {
    const [parent] = await tx
      .select()
      .from(consultations)
      .where(and(eq(consultations.id, parentConsultationId), eq(consultations.tenantId, tenantId)));
    if (!parent) return null;

    const now = new Date();
    const [appt] = await tx
      .insert(appointments)
      .values({
        tenantId,
        patientId: parent.patientId,
        kind: 'walkin',
        status: 'done',
        arrivedAt: now,
        startedAt: now,
        endedAt: now,
        createdBy: doctorId,
      })
      .returning();

    const [created] = await tx
      .insert(consultations)
      .values({
        tenantId,
        appointmentId: appt.id,
        patientId: parent.patientId,
        doctorId,
        parentConsultationId: parent.id,
        consultedAt: now,
        // Pre-seed billing as free — finalize dialog still lets the
        // doctor override if they need to charge. Both isFree and
        // paymentStatus must be set together: the
        // consultations_free_implies_free_status_and_no_method CHECK
        // refuses (is_free=true, payment_status='awaiting').
        isFree: true,
        paymentStatus: 'free',
      })
      .returning();
    return created;
  });
}

/**
 * Manually register a past or off-platform consultation. We still need
 * an appointment row to anchor the FK (the `appointments` table is the
 * canonical "visit happened" record), so we synthesize one as a walk-in
 * marked done at the same timestamp — invisible to the agenda views
 * (which filter on kind='scheduled' or status='waiting'/'in_consultation').
 */
export async function createManualConsultation(
  tenantId: string,
  args: { patientId: string; doctorId: string; consultedAt: Date },
): Promise<Consultation> {
  return withTenantTx(tenantId, async (tx) => {
    const [appt] = await tx
      .insert(appointments)
      .values({
        tenantId,
        patientId: args.patientId,
        kind: 'walkin',
        status: 'done',
        arrivedAt: args.consultedAt,
        startedAt: args.consultedAt,
        endedAt: args.consultedAt,
        createdBy: args.doctorId,
      })
      .returning();

    const [created] = await tx
      .insert(consultations)
      .values({
        tenantId,
        appointmentId: appt.id,
        patientId: args.patientId,
        doctorId: args.doctorId,
        consultedAt: args.consultedAt,
      })
      .returning();
    return created;
  });
}

/**
 * Hard-delete a consultation. Cascades — via the DB constraints — to
 * consultation_vitals, prescriptions + prescription_items, chat
 * messages, and chatbot_usage. The chatbot_credit_ledger entry tied to
 * this consultation has consultation_id set to NULL so the ledger
 * stays intact (we don't want to lose accounting history).
 *
 * The synthetic appointment row from a manual create is intentionally
 * left behind — it's harmless (status='done', no scheduled time, hidden
 * from agenda views) and removing it would require us to know whether
 * the appointment was "manual" or real.
 *
 * Returns false when the consultation doesn't exist in this tenant.
 */
export async function deleteConsultation(
  tenantId: string,
  id: string,
): Promise<boolean> {
  return withTenantTx(tenantId, async (tx) => {
    const result = await tx
      .delete(consultations)
      .where(and(eq(consultations.id, id), eq(consultations.tenantId, tenantId)))
      .returning({ id: consultations.id });
    return result.length > 0;
  });
}

export async function startFromAppointment(
  tenantId: string,
  appointmentId: string,
  doctorId: string,
): Promise<Consultation> {
  return withTenantTx(tenantId, async (tx) => {
    const [appt] = await tx.select().from(appointments).where(eq(appointments.id, appointmentId));
    if (!appt) throw new Error('Appointment not found');

    // Idempotent: if a consultation already exists, return it.
    const [existing] = await tx
      .select()
      .from(consultations)
      .where(eq(consultations.appointmentId, appointmentId));
    if (existing) return existing;

    if (!canTransition(appt.status, 'start')) {
      throw new Error(`Cannot start consultation from status ${appt.status}`);
    }

    const now = new Date();
    const patch = applyTransition(appt.status, 'start', now);
    await tx
      .update(appointments)
      .set({
        status: patch.status,
        startedAt: patch.startedAt ?? appt.startedAt,
        updatedAt: now,
      })
      .where(eq(appointments.id, appointmentId));

    const [created] = await tx
      .insert(consultations)
      .values({
        tenantId,
        appointmentId,
        patientId: appt.patientId,
        doctorId,
        consultedAt: now,
      })
      .returning();
    return created;
  });
}

function emptyToNull(s: string): string | null {
  return s.length > 0 ? s : null;
}

function strToNumeric(s: string): string | null {
  return s.length > 0 ? s : null;
}
function strToInt(s: string): number | null {
  return s.length > 0 ? Number(s) : null;
}

/**
 * Update the editable clinical sections. Allowed at any point in the
 * consultation's lifecycle — finalization locks pricing/payment, not
 * the medical record itself, so the doctor can amend their notes after
 * the fact (correcting a diagnosis, adding follow-up info, etc.).
 *
 * Returns false only when the consultation doesn't exist in this tenant.
 */
export async function updateConsultationSections(
  tenantId: string,
  id: string,
  input: SectionsUpdateInput,
): Promise<boolean> {
  return withTenantTx(tenantId, async (tx) => {
    const [current] = await tx.select().from(consultations).where(eq(consultations.id, id));
    if (!current) return false;
    await tx
      .update(consultations)
      .set({
        motif: emptyToNull(input.motif),
        historyNotes: emptyToNull(input.historyNotes),
        examNotes: emptyToNull(input.examNotes),
        diagnosis: emptyToNull(input.diagnosis),
        followUpNotes: emptyToNull(input.followUpNotes),
        updatedAt: new Date(),
      })
      .where(eq(consultations.id, id));
    return true;
  });
}

export async function updateConsultationVitals(
  tenantId: string,
  consultationId: string,
  input: VitalsUpdateInput,
): Promise<boolean> {
  return withTenantTx(tenantId, async (tx) => {
    const [current] = await tx
      .select()
      .from(consultations)
      .where(eq(consultations.id, consultationId));
    // Vitals follow the same "edit anytime" rule as the clinical sections —
    // see updateConsultationSections above.
    if (!current) return false;

    const [existing] = await tx
      .select()
      .from(consultationVitals)
      .where(eq(consultationVitals.consultationId, consultationId));

    const values = {
      tenantId,
      consultationId,
      weightKg: strToNumeric(input.weightKg),
      heightCm: strToNumeric(input.heightCm),
      temperatureC: strToNumeric(input.temperatureC),
      bpSystolic: strToInt(input.bpSystolic),
      bpDiastolic: strToInt(input.bpDiastolic),
      heartRate: strToInt(input.heartRate),
      notes: emptyToNull(input.notes),
      updatedAt: new Date(),
    };

    if (existing) {
      await tx
        .update(consultationVitals)
        .set(values)
        .where(eq(consultationVitals.id, existing.id));
    } else {
      await tx.insert(consultationVitals).values(values);
    }
    return true;
  });
}

export type FinalizeConsultationOutcome = 'ok' | 'not_found' | 'already_finalized';

export type FinalizeConsultationOptions = {
  isFree: boolean;
  priceMad?: string;
  doctorId: string;
};

export async function finalizeConsultation(
  tenantId: string,
  id: string,
  opts: FinalizeConsultationOptions,
): Promise<FinalizeConsultationOutcome> {
  return withTenantTx(tenantId, async (tx) => {
    const [c] = await tx.select().from(consultations).where(eq(consultations.id, id));
    if (!c) return 'not_found';
    if (c.isFinalized) return 'already_finalized';

    const [appt] = await tx.select().from(appointments).where(eq(appointments.id, c.appointmentId));
    if (!appt) throw new Error('Appointment missing');
    if (!canTransition(appt.status, 'finalize')) {
      throw new Error(`Cannot finalize from appointment status ${appt.status}`);
    }
    const now = new Date();
    const patch = applyTransition(appt.status, 'finalize', now);

    const pricingPatch = opts.isFree
      ? {
          priceMad: null,
          isFree: true,
          paymentStatus: 'free' as const,
          paidAt: now,
          paidBy: opts.doctorId,
        }
      : {
          priceMad: opts.priceMad ?? null,
          isFree: false,
          paymentStatus: 'awaiting' as const,
          paidAt: null,
          paidBy: null,
        };

    // Guarded UPDATE: only succeeds if isFinalized is still false. Returning
    // an empty array means a concurrent finalize raced ahead of us.
    const updated = await tx
      .update(consultations)
      .set({
        isFinalized: true,
        finalizedAt: now,
        updatedAt: now,
        ...pricingPatch,
      })
      .where(and(eq(consultations.id, id), eq(consultations.isFinalized, false)))
      .returning({ id: consultations.id });

    if (updated.length === 0) return 'already_finalized';

    await tx
      .update(appointments)
      .set({
        status: patch.status,
        endedAt: patch.endedAt ?? appt.endedAt,
        updatedAt: now,
      })
      .where(eq(appointments.id, c.appointmentId));

    return 'ok';
  });
}
