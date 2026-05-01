import 'server-only';
import { eq } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import {
  appointments,
  consultations,
  consultationVitals,
  type Consultation,
} from '@/db/schema';
import { applyTransition, canTransition } from '@/lib/appointments/state-machine';
import type { SectionsUpdateInput, VitalsUpdateInput } from './schemas';

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

export async function updateConsultationSections(
  tenantId: string,
  id: string,
  input: SectionsUpdateInput,
): Promise<boolean> {
  return withTenantTx(tenantId, async (tx) => {
    const [current] = await tx.select().from(consultations).where(eq(consultations.id, id));
    if (!current || current.isFinalized) return false;
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
    if (!current || current.isFinalized) return false;

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

export async function finalizeConsultation(tenantId: string, id: string): Promise<boolean> {
  return withTenantTx(tenantId, async (tx) => {
    const [c] = await tx.select().from(consultations).where(eq(consultations.id, id));
    if (!c || c.isFinalized) return false;

    const [appt] = await tx.select().from(appointments).where(eq(appointments.id, c.appointmentId));
    if (!appt) throw new Error('Appointment missing');
    if (!canTransition(appt.status, 'finalize')) {
      throw new Error(`Cannot finalize from appointment status ${appt.status}`);
    }
    const now = new Date();
    const patch = applyTransition(appt.status, 'finalize', now);

    await tx
      .update(consultations)
      .set({ isFinalized: true, finalizedAt: now, updatedAt: now })
      .where(eq(consultations.id, id));

    await tx
      .update(appointments)
      .set({
        status: patch.status,
        endedAt: patch.endedAt ?? appt.endedAt,
        updatedAt: now,
      })
      .where(eq(appointments.id, c.appointmentId));

    return true;
  });
}
