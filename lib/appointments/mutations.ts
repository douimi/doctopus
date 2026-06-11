import 'server-only';
import { eq } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { appointments, type Appointment } from '@/db/schema';
import { applyTransition, canTransition, type Action } from './state-machine';
import type { BookAppointmentInput, WalkInInput } from './schemas';

export async function bookAppointment(
  tenantId: string,
  createdBy: string,
  input: BookAppointmentInput,
): Promise<Appointment> {
  return withTenantTx(tenantId, async (tx) => {
    const [row] = await tx
      .insert(appointments)
      .values({
        tenantId,
        patientId: input.patientId,
        scheduledAt: new Date(input.scheduledAt),
        status: 'scheduled',
        kind: 'scheduled',
        reason: input.reason && input.reason.length > 0 ? input.reason : null,
        parentConsultationId: input.parentConsultationId ?? null,
        createdBy,
      })
      .returning();
    return row;
  });
}

export async function walkIn(
  tenantId: string,
  createdBy: string,
  input: WalkInInput,
): Promise<Appointment> {
  return withTenantTx(tenantId, async (tx) => {
    const now = new Date();
    const [row] = await tx
      .insert(appointments)
      .values({
        tenantId,
        patientId: input.patientId,
        status: 'waiting',
        kind: 'walkin',
        arrivedAt: now,
        reason: input.reason && input.reason.length > 0 ? input.reason : null,
        parentConsultationId: input.parentConsultationId ?? null,
        createdBy,
      })
      .returning();
    return row;
  });
}

async function transitionAppointment(
  tenantId: string,
  id: string,
  action: Action,
): Promise<Appointment | null> {
  return withTenantTx(tenantId, async (tx) => {
    const [current] = await tx.select().from(appointments).where(eq(appointments.id, id));
    if (!current) return null;
    if (!canTransition(current.status, action)) {
      throw new Error(`Cannot ${action} an appointment in status ${current.status}`);
    }
    const patch = applyTransition(current.status, action, new Date());
    const [updated] = await tx
      .update(appointments)
      .set({
        status: patch.status,
        arrivedAt: patch.arrivedAt ?? current.arrivedAt,
        startedAt: patch.startedAt ?? current.startedAt,
        endedAt: patch.endedAt ?? current.endedAt,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();
    return updated;
  });
}

export const markArrived = (tenantId: string, id: string) =>
  transitionAppointment(tenantId, id, 'arrive');
export const cancelAppointment = (tenantId: string, id: string) =>
  transitionAppointment(tenantId, id, 'cancel');
export const markNoShow = (tenantId: string, id: string) =>
  transitionAppointment(tenantId, id, 'noShow');
