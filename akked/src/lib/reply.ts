/** Client-safe: classify a customer's short WhatsApp reply (no Node-only imports). */
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ًͯ-ٟ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ى/g, 'ي').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
const YES = new Set(['1', 'oui', 'ouii', 'ok', 'okay', 'okk', 'yes', 'y', 'confirme', 'confirmer', 'confirm', 'daccord', 'نعم', 'اه', 'ايه', 'واه', 'واخا', 'اكد', 'اكدو', 'تاكيد', 'تاكيد الطلب', 'مؤكد', 'موافق', 'اوكد', 'نعم اوكد', 'نعم اكد']);
const NO = new Set(['2', 'non', 'no', 'annuler', 'annule', 'annulee', 'cancel', 'لا', 'الغاء', 'الغي', 'الغيه', 'الغ', 'بغيتش', 'مابغيتش', 'ما بغيتش', 'لا الغي', 'لا الغ', 'لا الغاء']);
/** Short, unambiguous replies only. Anything longer is left for a human. */
export function classifyReply(text: string | null | undefined): 'confirm' | 'cancel' | null {
  const n = norm(text ?? '');
  if (!n || n.split(' ').length > 4) return null;
  if (YES.has(n)) return 'confirm';
  if (NO.has(n)) return 'cancel';
  return null;
}

