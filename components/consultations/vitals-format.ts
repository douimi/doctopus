type VitalsLike = {
  weightKg: string | null;
  heightCm: string | null;
  temperatureC: string | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  heartRate: number | null;
};

function frNum(v: string | number): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

/** Parses "71", "71.5" or "71,5"; null when empty / not a number. */
export function parseFrNumber(v: string): number | null {
  const t = v.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** BMI from kg / cm, or null when either is missing or implausible. */
export function computeBmi(weightKg: string, heightCm: string): number | null {
  const w = parseFrNumber(weightKg);
  const h = parseFrNumber(heightCm);
  if (!w || !h || h < 50 || w <= 0) return null;
  const bmi = w / (h / 100) ** 2;
  return Number.isFinite(bmi) ? Math.round(bmi * 10) / 10 : null;
}

/** "71 kg · 172 cm · TA 140/90 · FC 80 · 37,2 °C · IMC 24", or null if empty. */
export function formatVitalsLine(v: VitalsLike | null): string | null {
  if (!v) return null;
  const parts: string[] = [];
  if (v.weightKg) parts.push(`${frNum(v.weightKg)} kg`);
  if (v.heightCm) parts.push(`${frNum(v.heightCm)} cm`);
  if (v.bpSystolic != null || v.bpDiastolic != null) {
    parts.push(`TA ${v.bpSystolic ?? '—'}/${v.bpDiastolic ?? '—'}`);
  }
  if (v.heartRate != null) parts.push(`FC ${v.heartRate}`);
  if (v.temperatureC) parts.push(`${frNum(v.temperatureC)} °C`);
  if (v.weightKg && v.heightCm) {
    const bmi = computeBmi(v.weightKg, v.heightCm);
    if (bmi) parts.push(`IMC ${frNum(bmi)}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}
