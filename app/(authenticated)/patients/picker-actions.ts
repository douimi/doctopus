'use server';

import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { getPatientById, searchPatients } from '@/lib/patients/queries';
import { formatAge } from '@/lib/patients/age';
import type { PickerPatient } from '@/components/patients/patient-picker';

const PICKER_LIMIT = 8;

function toPicker(p: {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  cin: string | null;
  dateOfBirth: string | null;
}): PickerPatient {
  return {
    id: p.id,
    fullName: `${p.lastName} ${p.firstName}`,
    ageLabel: formatAge(p.dateOfBirth),
    phone: p.phone,
    cin: p.cin,
  };
}

/**
 * Backs the shared PatientPicker combobox. Empty query → most recently
 * created patients (handy right after "Nouveau patient"). Archived
 * patients never show up: you don't book or seat an archived file.
 */
export async function searchPatientsForPickerAction(query: string): Promise<PickerPatient[]> {
  const session = await requireSession();
  const q = typeof query === 'string' ? query.slice(0, 80) : '';
  const rows = await searchPatients(session.tenantId, q, { limit: PICKER_LIMIT });
  return rows.map(toPicker);
}

/** Resolves a single patient for a `?patient=<id>` preselection. */
export async function getPatientForPickerAction(id: string): Promise<PickerPatient | null> {
  const session = await requireSession();
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return null;
  const p = await getPatientById(session.tenantId, parsed.data);
  if (!p || p.isArchived) return null;
  return toPicker(p);
}
