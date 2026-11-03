import { canonicalCity } from './cities';
import { normalizePhone } from './phone';

/** Free-text order parser: turns a pasted WhatsApp/Instagram message into structured order drafts. */
export interface Draft {
  customer_name: string; phone: string; city: string; address: string; products: string;
  price: string; notes: string; size: string; color: string; quantity: string;
}
export const emptyDraft = (): Draft => ({ customer_name: '', phone: '', city: '', address: '', products: '', price: '', notes: '', size: '', color: '', quantity: '1' });

const LABELS: [keyof Draft, RegExp][] = [
  ['customer_name', /^(?:nom(?: et pr[ée]nom)?|name|client|destinataire|الاسم|اسم|الإسم)$/i],
  ['phone', /^(?:t[ée]l(?:[ée]phone)?|phone|mobile|gsm|whatsapp|الهاتف|هاتف|الرقم|رقم(?: الهاتف)?|تيليفون)$/i],
  ['city', /^(?:ville|city|المدينة|مدينة)$/i],
  ['address', /^(?:adresse|address|العنوان|عنوان)$/i],
  ['products', /^(?:produits?|product|article|المنتج|منتج|السلعة)$/i],
  ['price', /^(?:prix|price|total|montant|الثمن|ثمن|السعر|سعر|المبلغ)$/i],
  ['quantity', /^(?:qt[ée]|quantit[ée]|qty|الكمية|كمية)$/i],
  ['size', /^(?:taille|pointure|size|المقاس|مقاس)$/i],
  ['color', /^(?:couleur|color|اللون|لون)$/i],
  ['notes', /^(?:notes?|commentaire|remarque|ملاحظات?)$/i],
];
const PHONE_RE = /(?:\+|00)?\d[\d\s.\-]{7,16}\d/g;
const PRICE_RES = [
  /(\d+(?:[.,]\d+)?)\s*(?:dhs?|mad|درهم|دراهم|د\.م\.?|dirhams?)/i,
  /(?:prix|price|total|الثمن|ثمن|السعر)\s*:?\s*(\d+(?:[.,]\d+)?)/i,
];
const ADDRESS_HINT = /\b(?:rue|avenue|av\.?|bd|boulevard|lot|imm|immeuble|r[ée]sidence|n°|num|quartier|hay)\b|شارع|حي|درب|زنقة|رقم|إقامة|عمارة/i;
const clean = (s: string) => s.replace(/^[\s,;|\-–—/،:]+|[\s,;|\-–—/،:]+$/g, '').replace(/\s{2,}/g, ' ');

function findPhone(line: string): { phone: string; before: string; after: string } | null {
  for (const m of line.matchAll(PHONE_RE)) {
    const n = normalizePhone(m[0]);
    if (n) return { phone: n, before: line.slice(0, m.index), after: line.slice((m.index ?? 0) + m[0].length) };
  }
  return null;
}

function extractCity(s: string): { city: string; rest: string } | null {
  const tokens = s.split(/[\s,،;|/]+/).filter(Boolean);
  for (let n = Math.min(3, tokens.length); n >= 1; n--)
    for (let i = 0; i + n <= tokens.length; i++) {
      const c = canonicalCity(tokens.slice(i, i + n).join(' '), { fuzzy: false });
      if (c) return { city: c, rest: [...tokens.slice(0, i), ...tokens.slice(i + n)].join(' ') };
    }
  return null;
}

export function parseBlock(block: string): Draft {
  const d = emptyDraft();
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  const single = lines.length === 1;
  const left: string[] = [];
  for (const line of lines) {
    const lab = line.match(/^([^:：]{2,25}?)\s*[:：]\s*(.+)$/);
    const hit = lab && LABELS.find(([, re]) => re.test(lab[1].trim()));
    if (lab && hit) {
      const [key] = hit; const val = lab[2].trim();
      if (key === 'phone') d.phone = normalizePhone(val) ?? val;
      else if (key === 'city') d.city = canonicalCity(val) ?? val;
      else if (key === 'price') d.price = val.replace(/[^\d.,]/g, '').replace(',', '.');
      else if (key === 'quantity') d.quantity = String(parseInt(val) || 1);
      else d[key] = val;
      continue;
    }
    let rest = line;
    const ph = !d.phone ? findPhone(rest) : null;
    let nameFromBefore = '';
    if (ph) { d.phone = ph.phone; nameFromBefore = clean(ph.before); rest = ph.after; if (!nameFromBefore) rest = ph.after; }
    if (!d.price) for (const re of PRICE_RES) { const m = rest.match(re); if (m) { d.price = m[1].replace(',', '.'); rest = rest.replace(m[0], ' '); break; } }
    if (nameFromBefore && !d.customer_name && !/\d/.test(nameFromBefore)) d.customer_name = nameFromBefore;
    else if (nameFromBefore) rest = nameFromBefore + ' ' + rest;
    if (!d.city) { const c = extractCity(rest); if (c) { d.city = c.city; rest = c.rest; } }
    rest = clean(rest);
    if (!rest) continue;
    if (single && ph && !d.customer_name && !/\d/.test(rest.split(' ')[0])) {
      const [first, ...others] = rest.split(' '); d.customer_name = first; rest = others.join(' ');
      if (!rest) continue;
    }
    left.push(rest);
  }
  for (const s of left) {
    if (!d.customer_name && !/\d/.test(s) && !ADDRESS_HINT.test(s)) d.customer_name = s;
    else if (!d.address && (ADDRESS_HINT.test(s) || /\d/.test(s))) d.address = s;
    else if (!d.products) d.products = s;
    else d.notes = d.notes ? d.notes + ' · ' + s : s;
  }
  return d;
}

const NAME_LABEL = /^\s*(?:nom(?: et pr[ée]nom)?|name|client|destinataire|الاسم|اسم|الإسم)\s*[:：]/i;

/** Inside one block, start a new order when a second phone / second name appears. */
function segment(block: string): string[] {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  const phoneLines = lines.filter((l) => findPhone(l)).length;
  const nameLabels = lines.filter((l) => NAME_LABEL.test(l)).length;
  if (phoneLines < 2 && nameLabels < 2) return [block];
  const out: string[][] = [[]];
  let hasPhone = false, hasName = false, inline = false;
  for (const l of lines) {
    const ph = !!findPhone(l), nm = NAME_LABEL.test(l);
    if ((ph && hasPhone) || (nm && (hasName || inline))) { out.push([]); hasPhone = false; hasName = false; inline = false; }
    out[out.length - 1].push(l);
    hasPhone = hasPhone || ph; hasName = hasName || nm;
    if (ph && !/^[^:：]{2,25}[:：]/.test(l)) inline = true; // a one-line order (phone not behind a "Tel:" label)
  }
  return out.map((x) => x.join('\n'));
}

/** Split pasted text into orders: blank lines separate orders; inside a block a second phone/name starts a new one. */
export function parseOrdersText(text: string): Draft[] {
  const t = text.replace(/\r/g, '').trim();
  if (!t) return [];
  return t.split(/\n\s*\n/).flatMap(segment).map(parseBlock).filter((d) => d.phone || d.customer_name);
}
