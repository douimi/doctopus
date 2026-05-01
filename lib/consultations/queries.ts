import 'server-only';
import { desc, eq } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import {
  consultations,
  consultationVitals,
  type Consultation,
  type ConsultationVitals,
} from '@/db/schema';

export type ConsultationDetail = {
  consultation: Consultation;
  vitals: ConsultationVitals | null;
};

export async function getConsultationById(
  tenantId: string,
  id: string,
): Promise<ConsultationDetail | null> {
  return withTenantTx(tenantId, async (tx) => {
    const [c] = await tx.select().from(consultations).where(eq(consultations.id, id));
    if (!c) return null;
    const [v] = await tx
      .select()
      .from(consultationVitals)
      .where(eq(consultationVitals.consultationId, id));
    return { consultation: c, vitals: v ?? null };
  });
}

export async function listConsultationsForPatient(
  tenantId: string,
  patientId: string,
): Promise<Consultation[]> {
  return withTenantTx(tenantId, async (tx) => {
    return tx
      .select()
      .from(consultations)
      .where(eq(consultations.patientId, patientId))
      .orderBy(desc(consultations.consultedAt));
  });
}

export async function getOpenConsultationForAppointment(
  tenantId: string,
  appointmentId: string,
): Promise<Consultation | null> {
  return withTenantTx(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(consultations)
      .where(eq(consultations.appointmentId, appointmentId));
    return row ?? null;
  });
}
