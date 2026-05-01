import 'server-only';
import { eq } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import {
  patients,
  patientAllergies,
  patientChronicConditions,
  type Patient,
} from '@/db/schema';
import type { PatientCreateInput, PatientUpdateInput } from './schemas';

function emptyToNull(v: string | undefined): string | null {
  return v && v.length > 0 ? v : null;
}

export async function createPatient(
  tenantId: string,
  input: PatientCreateInput,
): Promise<Patient> {
  return withTenantTx(tenantId, async (tx) => {
    const [row] = await tx
      .insert(patients)
      .values({
        tenantId,
        firstName: input.firstName,
        lastName: input.lastName,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
        phone: emptyToNull(input.phone),
        cin: emptyToNull(input.cin ?? ''),
        coverageType: (input.coverageType as Patient['coverageType']) || null,
        coverageId: emptyToNull(input.coverageId),
        address: emptyToNull(input.address),
        notes: emptyToNull(input.notes),
      })
      .returning();
    return row;
  });
}

export async function updatePatient(
  tenantId: string,
  input: PatientUpdateInput,
): Promise<Patient | null> {
  return withTenantTx(tenantId, async (tx) => {
    const [row] = await tx
      .update(patients)
      .set({
        firstName: input.firstName,
        lastName: input.lastName,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
        phone: input.phone === undefined ? undefined : emptyToNull(input.phone),
        cin: input.cin === undefined ? undefined : emptyToNull(input.cin),
        coverageType:
          input.coverageType === undefined
            ? undefined
            : ((input.coverageType as Patient['coverageType']) || null),
        coverageId: input.coverageId === undefined ? undefined : emptyToNull(input.coverageId),
        address: input.address === undefined ? undefined : emptyToNull(input.address),
        notes: input.notes === undefined ? undefined : emptyToNull(input.notes),
        updatedAt: new Date(),
      })
      .where(eq(patients.id, input.id))
      .returning();
    return row ?? null;
  });
}

export async function archivePatient(tenantId: string, id: string): Promise<boolean> {
  return withTenantTx(tenantId, async (tx) => {
    const result = await tx
      .update(patients)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning({ id: patients.id });
    return result.length > 0;
  });
}

export async function addAllergy(tenantId: string, patientId: string, label: string) {
  return withTenantTx(tenantId, async (tx) => {
    const [row] = await tx
      .insert(patientAllergies)
      .values({ tenantId, patientId, label })
      .returning();
    return row;
  });
}

export async function removeAllergy(tenantId: string, id: string): Promise<boolean> {
  return withTenantTx(tenantId, async (tx) => {
    const result = await tx
      .delete(patientAllergies)
      .where(eq(patientAllergies.id, id))
      .returning({ id: patientAllergies.id });
    return result.length > 0;
  });
}

export async function addChronicCondition(
  tenantId: string,
  patientId: string,
  label: string,
) {
  return withTenantTx(tenantId, async (tx) => {
    const [row] = await tx
      .insert(patientChronicConditions)
      .values({ tenantId, patientId, label })
      .returning();
    return row;
  });
}

export async function removeChronicCondition(tenantId: string, id: string): Promise<boolean> {
  return withTenantTx(tenantId, async (tx) => {
    const result = await tx
      .delete(patientChronicConditions)
      .where(eq(patientChronicConditions.id, id))
      .returning({ id: patientChronicConditions.id });
    return result.length > 0;
  });
}
