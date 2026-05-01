import 'server-only';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { appointments, patients, type Patient, type Appointment } from '@/db/schema';

export type AppointmentWithPatient = Appointment & {
  patient: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'phone' | 'dateOfBirth'>;
};

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}
function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

export async function listTodaySchedule(
  tenantId: string,
  now: Date = new Date(),
): Promise<AppointmentWithPatient[]> {
  return withTenantTx(tenantId, async (tx) => {
    const rows = await tx
      .select({
        appt: appointments,
        patient: {
          id: patients.id,
          firstName: patients.firstName,
          lastName: patients.lastName,
          phone: patients.phone,
          dateOfBirth: patients.dateOfBirth,
        },
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(
        and(
          eq(appointments.kind, 'scheduled'),
          gte(appointments.scheduledAt, startOfDay(now)),
          lte(appointments.scheduledAt, endOfDay(now)),
        ),
      )
      .orderBy(asc(appointments.scheduledAt));
    return rows.map((r) => ({ ...r.appt, patient: r.patient }));
  });
}

export async function listWaiting(tenantId: string): Promise<AppointmentWithPatient[]> {
  return withTenantTx(tenantId, async (tx) => {
    const rows = await tx
      .select({
        appt: appointments,
        patient: {
          id: patients.id,
          firstName: patients.firstName,
          lastName: patients.lastName,
          phone: patients.phone,
          dateOfBirth: patients.dateOfBirth,
        },
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(eq(appointments.status, 'waiting'))
      .orderBy(asc(appointments.arrivedAt));
    return rows.map((r) => ({ ...r.appt, patient: r.patient }));
  });
}

export async function listInConsultation(tenantId: string): Promise<AppointmentWithPatient[]> {
  return withTenantTx(tenantId, async (tx) => {
    const rows = await tx
      .select({
        appt: appointments,
        patient: {
          id: patients.id,
          firstName: patients.firstName,
          lastName: patients.lastName,
          phone: patients.phone,
          dateOfBirth: patients.dateOfBirth,
        },
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(eq(appointments.status, 'in_consultation'))
      .orderBy(asc(appointments.startedAt));
    return rows.map((r) => ({ ...r.appt, patient: r.patient }));
  });
}

export async function getAppointmentById(tenantId: string, id: string) {
  return withTenantTx(tenantId, async (tx) => {
    const [row] = await tx.select().from(appointments).where(eq(appointments.id, id));
    return row ?? null;
  });
}
