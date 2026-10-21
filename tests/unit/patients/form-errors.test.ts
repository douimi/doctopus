import { describe, expect, it } from 'vitest';
import { patientCreateSchema } from '@/lib/patients/schemas';
import {
  fieldErrorsFr,
  formValues,
  frenchIssue,
  summaryFr,
} from '@/app/(authenticated)/patients/form-errors';

function parse(data: Record<string, unknown>) {
  const r = patientCreateSchema.safeParse(data, { error: frenchIssue });
  if (r.success) throw new Error('expected failure');
  return r.error;
}

describe('patient form errors', () => {
  it('maps missing required fields to French, per field', () => {
    const err = parse({ lastName: '', firstName: '  ' });
    const fe = fieldErrorsFr(err);
    expect(fe.lastName).toBe('Champ obligatoire.');
    expect(fe.firstName).toBe('Champ obligatoire.');
    expect(fe.gender).toBe('Champ obligatoire.');
  });

  it('keeps schema-level custom messages', () => {
    const err = parse({ lastName: 'A', firstName: 'B', gender: 'm', cin: '12' });
    expect(fieldErrorsFr(err).cin).toBe('CIN invalide');
  });

  it('reports length limits in French', () => {
    const err = parse({ lastName: 'x'.repeat(81), firstName: 'B', gender: 'f' });
    expect(fieldErrorsFr(err).lastName).toBe('80 caractères maximum.');
  });

  it('builds a labelled summary sentence', () => {
    const err = parse({ lastName: '', firstName: 'B', gender: 'm' });
    expect(summaryFr(err)).toBe('Nom : champ obligatoire.');
    const many = parse({});
    expect(summaryFr(many)).toMatch(/^Prénom : champ obligatoire\. \(et 2 autres champs à corriger\)$/);
  });

  it('echoes only string form values', () => {
    const fd = new FormData();
    fd.set('lastName', 'Tazi');
    fd.set('$ACTION_ID_abc', 'x');
    expect(formValues(fd)).toEqual({ lastName: 'Tazi' });
  });
});
