export function formatMad(ppv: string | null): string {
  if (ppv == null || ppv === '') return '—';
  const n = Number(ppv);
  if (!Number.isFinite(n)) return '—';
  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)} MAD`;
}
