export function ageFromDob(dob: string, now?: Date): number;
export function ageFromDob(dob: string | null, now?: Date): number | null;
export function ageFromDob(dob: string | null, now: Date = new Date()): number | null {
  if (!dob) return null;
  const [y, m, d] = dob.split('-').map(Number);
  let age = now.getUTCFullYear() - y;
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  if (month < m || (month === m && day < d)) age -= 1;
  return age;
}

/** "32 ans" / "—" depending on whether the patient has a DOB on file. */
export function formatAge(dob: string | null, now?: Date): string {
  const age = ageFromDob(dob, now);
  return age == null ? '—' : `${age} ans`;
}
