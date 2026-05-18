import { afterAll, describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { __closeDbForTests } from '@/db/client';
import { importPatients, parsePatientImport } from '@/lib/admin/patient-import';
import { seedTenant } from '../../fixtures/tenants';
import { seedPatient } from '../../fixtures/patients';

function csvBuf(text: string): Buffer {
  return Buffer.from(text, 'utf-8');
}

describe('parsePatientImport — CSV', () => {
  it('accepts YYYY-MM-DD dates without silently shifting them by one day', () => {
    // Regression: xlsx's CSV parser was detecting "1997-01-01" as a date and
    // converting it to Excel serial 35430.99976 (off by ~21s), which then
    // formatted back as "12/31/96" — failing the regex AND silently moving
    // the patient's DOB back by one day.
    const buf = csvBuf(
      'last_name,first_name,gender,date_of_birth,phone\n' +
        'Aakab,Fatima Ezzahra,f,1997-01-01,0612345678\n',
    );
    const out = parsePatientImport(buf);
    expect(out.errors).toEqual([]);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].date_of_birth).toBe('1997-01-01');
    expect(out.rows[0].phone).toBe('0612345678');
  });

  it('accepts DD/MM/YYYY dates', () => {
    const buf = csvBuf(
      'last_name,first_name,gender,date_of_birth,phone\n' +
        'Test,Joe,m,12/03/1985,0600000000\n',
    );
    const out = parsePatientImport(buf);
    expect(out.errors).toEqual([]);
    expect(out.rows[0].date_of_birth).toBe('1985-03-12');
  });

  it('accepts rows with empty phone (phone is nullable in DB)', () => {
    const buf = csvBuf(
      'last_name,first_name,gender,date_of_birth,phone\n' +
        'Aakab,Fatima,f,1997-01-01,\n',
    );
    const out = parsePatientImport(buf);
    expect(out.errors).toEqual([]);
    expect(out.rows[0].phone).toBeNull();
  });

  it('preserves phone leading zeros', () => {
    const buf = csvBuf(
      'last_name,first_name,gender,date_of_birth,phone\n' +
        'A,B,f,1997-01-01,0612345678\n',
    );
    const out = parsePatientImport(buf);
    expect(out.rows[0].phone).toBe('0612345678');
  });

  it('handles quoted fields containing commas', () => {
    const buf = csvBuf(
      'last_name,first_name,gender,date_of_birth,phone,address\n' +
        'A,B,f,1997-01-01,0612345678,"Lot 11, Sidi Moumen"\n',
    );
    const out = parsePatientImport(buf);
    expect(out.errors).toEqual([]);
    expect(out.rows[0].address).toBe('Lot 11, Sidi Moumen');
  });

  it('strips UTF-8 BOM', () => {
    const buf = csvBuf(
      '﻿last_name,first_name,gender,date_of_birth,phone\n' +
        'A,B,f,1997-01-01,0612345678\n',
    );
    const out = parsePatientImport(buf);
    expect(out.errors).toEqual([]);
    expect(out.rows).toHaveLength(1);
  });

  it('handles CRLF line endings', () => {
    const buf = csvBuf(
      'last_name,first_name,gender,date_of_birth,phone\r\n' +
        'A,B,f,1997-01-01,0612345678\r\n',
    );
    const out = parsePatientImport(buf);
    expect(out.errors).toEqual([]);
    expect(out.rows).toHaveLength(1);
  });

  it('still reports a clear error for unparseable date formats', () => {
    const buf = csvBuf(
      'last_name,first_name,gender,date_of_birth,phone\n' +
        'A,B,f,not-a-date,0612345678\n',
    );
    const out = parsePatientImport(buf);
    expect(out.errors).toHaveLength(1);
    expect(out.errors[0].field).toBe('date_of_birth');
  });
});

describe('parsePatientImport — XLSX', () => {
  it('reads real Excel date cells without timezone shifts', () => {
    // Build the worksheet cell-by-cell with integer serial dates, the way
    // Excel itself stores them. (aoa_to_sheet with JS Date inputs writes
    // a slightly imprecise serial — that's an xlsx-writer quirk, not what
    // real .xlsx files contain.)
    const ws: XLSX.WorkSheet = {
      '!ref': 'A1:E3',
      A1: { t: 's', v: 'last_name' },
      B1: { t: 's', v: 'first_name' },
      C1: { t: 's', v: 'gender' },
      D1: { t: 's', v: 'date_of_birth' },
      E1: { t: 's', v: 'phone' },
      A2: { t: 's', v: 'Aakab' },
      B2: { t: 's', v: 'Fatima' },
      C2: { t: 's', v: 'f' },
      D2: { t: 'n', v: 35431, z: 'm/d/yyyy' }, // 1997-01-01
      E2: { t: 's', v: '0612345678' },
      A3: { t: 's', v: 'Test' },
      B3: { t: 's', v: 'Joe' },
      C3: { t: 's', v: 'm' },
      D3: { t: 'n', v: 31412, z: 'm/d/yyyy' }, // 1985-12-31
      E3: { t: 's', v: '0700000000' },
    };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const out = parsePatientImport(buf);
    expect(out.errors).toEqual([]);
    expect(out.rows[0].date_of_birth).toBe('1997-01-01');
    expect(out.rows[1].date_of_birth).toBe('1985-12-31');
  });
});

describe('importPatients — dedup', () => {
  afterAll(async () => {
    await __closeDbForTests();
  });

  it('skips rows that match an existing patient on (last_name, first_name, dob)', async () => {
    const t = await seedTenant('import-dedup');
    // One patient already in the DB.
    await seedPatient(t.tenantId, {
      lastName: 'Aakab',
      firstName: 'Fatima Ezzahra',
      dateOfBirth: '1997-01-01',
    });

    const rows = [
      // Same person, different case + extra whitespace → should be skipped
      {
        rowNumber: 2,
        last_name: 'aakab ',
        first_name: 'FATIMA EZZAHRA',
        gender: 'f' as const,
        date_of_birth: '1997-01-01',
        phone: null,
        cin: null,
        coverage_type: null,
        coverage_id: null,
        address: null,
        notes: null,
      },
      // New patient → should be inserted
      {
        rowNumber: 3,
        last_name: 'Bennani',
        first_name: 'Ahmed',
        gender: 'm' as const,
        date_of_birth: '1980-06-15',
        phone: '0612000000',
        cin: null,
        coverage_type: null,
        coverage_id: null,
        address: null,
        notes: null,
      },
    ];

    const out = await importPatients(t.tenantId, rows);
    expect(out.inserted).toBe(1);
    expect(out.skipped).toBe(1);
    expect(out.failed).toEqual([]);
  });

  it('also dedups duplicates within the same file', async () => {
    const t = await seedTenant('import-dedup-self');
    const row = {
      rowNumber: 2,
      last_name: 'Solo',
      first_name: 'Han',
      gender: 'm' as const,
      date_of_birth: '1980-01-01',
      phone: null,
      cin: null,
      coverage_type: null,
      coverage_id: null,
      address: null,
      notes: null,
    };
    const out = await importPatients(t.tenantId, [row, { ...row, rowNumber: 3 }]);
    expect(out.inserted).toBe(1);
    expect(out.skipped).toBe(1);
  });
});
