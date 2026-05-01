export function ageFromDob(dob: string, now: Date = new Date()): number {
  const [y, m, d] = dob.split('-').map(Number);
  let age = now.getUTCFullYear() - y;
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  if (month < m || (month === m && day < d)) age -= 1;
  return age;
}
