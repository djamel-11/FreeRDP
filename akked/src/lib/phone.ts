/** Normalize Moroccan mobile numbers to +2126XXXXXXXX / +2127XXXXXXXX. Returns null if invalid. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('212')) d = d.slice(3);
  else if (d.startsWith('0')) d = d.slice(1);
  // after stripping, 9 digits starting with 6 or 7
  if (/^[67]\d{8}$/.test(d)) return '+212' + d;
  return null;
}
