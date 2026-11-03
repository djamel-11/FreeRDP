import { esc, type ExportOrder } from './exporters';

/** Configurable export for ANY delivery company: map the company's own columns to our order fields. */
export const SOURCES = ['order_number', 'customer_name', 'phone_national', 'phone_e164', 'city', 'city_id', 'address', 'price', 'products', 'product_full', 'quantity', 'size', 'color', 'notes', 'date', 'fixed', 'empty'] as const;
export type Source = (typeof SOURCES)[number];
export interface ColumnMap { col: number; header: string; source: Source; fixed?: string }
export interface ExportConfig { headerRow: number; columns: ColumnMap[]; output: 'xlsx' | 'csv' }
export interface ExportRow extends ExportOrder { city_name: string; city_id: string }

const RULES: [RegExp, Source][] = [
  [/(n[°o]?\s*(de\s*)?(commande|cmd|bon)|r[ée]f|order\s*(n|id|num)|num[ée]ro|code\s*(cmd|commande)|رقم\s*الطلب)/i, 'order_number'],
  [/(destinataire|client|nom|name|receiver|consignee|الاسم|المستلم)/i, 'customer_name'],
  [/(t[ée]l|phone|gsm|mobile|portable|contact|الهاتف|رقم الهاتف)/i, 'phone_national'],
  [/(ville.*(id|code)|city.*(id|code)|id.*(ville|city))/i, 'city_id'],
  [/(ville|city|destination|المدينة)/i, 'city'],
  [/(adresse|address|الع[نن]وان)/i, 'address'],
  [/(prix|montant|cod|crbt|price|amount|total|valeur|الثمن|السعر|المبلغ)/i, 'price'],
  [/(marchandise|produit|article|d[ée]signation|contenu|product|content|description|المنتج)/i, 'product_full'],
  [/(quantit|qt[ée]|qty|nbr|nombre|colis|pieces|pi[èe]ces|الكمية)/i, 'quantity'],
  [/(commentaire|remarque|note|observation|comment|ملاحظات)/i, 'notes'],
  [/(date)/i, 'date'],
];
/** Guess what a carrier column means from its header text (user confirms/changes it). */
export function suggestSource(header: string): Source {
  const h = header.trim();
  for (const [re, s] of RULES) if (re.test(h)) return s;
  return 'empty';
}

export const nationalPhone = (p: string) => (p.startsWith('+212') ? '0' + p.slice(4) : p);
export function valueFor(m: ColumnMap, o: ExportRow, today = new Date()): string | number {
  switch (m.source) {
    case 'order_number': return o.order_number; case 'customer_name': return o.customer_name;
    case 'phone_national': return nationalPhone(o.phone); case 'phone_e164': return o.phone;
    case 'city': return o.city_name || o.city; case 'city_id': return o.city_id;
    case 'address': return o.address; case 'price': return o.price;
    case 'products': return o.products; case 'quantity': return o.quantity; case 'size': return o.size; case 'color': return o.color; case 'notes': return o.notes;
    case 'product_full': return [o.products, o.size, o.color].filter(Boolean).join(' ') + (o.quantity > 1 ? ` x${o.quantity}` : '');
    case 'date': return today.toISOString().slice(0, 10);
    case 'fixed': return m.fixed ?? '';
    default: return '';
  }
}

/** Parse a carrier template (xlsx or csv) → header cells of the first row that looks like a header. */
export async function readTemplate(bytes: Uint8Array, filename: string): Promise<{ headerRow: number; headers: { col: number; header: string }[]; kind: 'xlsx' | 'csv' } | null> {
  const isXlsx = bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK" zip signature
  if (isXlsx) {
    const ExcelJS = (await import('exceljs')).default; const wb = new ExcelJS.Workbook();
    try { await wb.xlsx.load(Buffer.from(bytes) as any); } catch { return null; }
    const ws = wb.worksheets[0]; if (!ws) return null;
    for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) {
      const cells: { col: number; header: string }[] = [];
      ws.getRow(r).eachCell({ includeEmpty: false }, (c, col) => { const v = String((c.value as any)?.text ?? (c.value as any)?.richText?.map((x: any) => x.text).join('') ?? c.value ?? '').trim(); if (v) cells.push({ col, header: v }); });
      if (cells.length >= 2) return { headerRow: r, headers: cells, kind: 'xlsx' };
    }
    return null;
  }
  if (!/\.(csv|txt)$/i.test(filename) && bytes.length > 100_000) return null;
  const text = new TextDecoder().decode(bytes).replace(/^﻿/, '');
  const first = text.split(/\r?\n/).find((l) => l.trim()); if (!first) return null;
  const delim = first.includes(';') && !first.includes(',') ? ';' : first.includes('\t') ? '\t' : ',';
  const headers = first.split(delim).map((h, i) => ({ col: i + 1, header: h.replace(/^"|"$/g, '').trim() })).filter((h) => h.header);
  return headers.length >= 2 ? { headerRow: 1, headers, kind: 'csv' } : null;
}

/** Build the file: fill the carrier's own template (keeps its styling) or generate a new sheet/CSV from the mapped headers. */
export async function renderExport(cfg: ExportConfig, template: Uint8Array | null, rows: ExportRow[], today = new Date()): Promise<{ bytes: Buffer; mime: string; ext: string }> {
  const cols = [...cfg.columns].sort((a, b) => a.col - b.col);
  const safe = (v: string | number) => (typeof v === 'string' && /^[=+\-@]/.test(v) && !/^[+\-]?\d+(\.\d+)?$/.test(v) ? "'" + v : v);
  if (cfg.output === 'csv') {
    const lines = [cols.map((c) => esc(c.header)).join(',')];
    for (const r of rows) lines.push(cols.map((c) => esc(valueFor(c, r, today))).join(','));
    return { bytes: Buffer.from('﻿' + lines.join('\r\n')), mime: 'text/csv; charset=utf-8', ext: 'csv' };
  }
  const ExcelJS = (await import('exceljs')).default; const wb = new ExcelJS.Workbook();
  let ws;
  if (template && template[0] === 0x50) { await wb.xlsx.load(Buffer.from(template) as any); ws = wb.worksheets[0]; }
  else { ws = wb.addWorksheet('Sheet1'); const hr = ws.getRow(cfg.headerRow || 1); for (const c of cols) hr.getCell(c.col).value = c.header; hr.commit(); }
  rows.forEach((r, i) => {
    const row = ws.getRow((cfg.headerRow || 1) + 1 + i);
    for (const c of cols) {
      const cell = row.getCell(c.col); cell.value = safe(valueFor(c, r, today) as any);
      if (c.source === 'phone_national' || c.source === 'phone_e164') cell.numFmt = '@'; // keep the leading 0
    }
    row.commit();
  });
  return { bytes: Buffer.from(await wb.xlsx.writeBuffer()), mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' };
}

export const SAMPLE_ROWS: ExportRow[] = [
  { order_number: 'AK-10001', customer_name: 'Sara Alaoui', phone: '+212612345678', city: 'Casablanca', address: 'Rue 5 n 3, Maarif', products: 'Robe', size: 'M', color: 'Noir', quantity: 2, price: 199, notes: 'Appeler avant', city_name: 'Casablanca', city_id: '129' },
  { order_number: 'AK-10002', customer_name: 'Youssef B.', phone: '+212661223344', city: 'Fes', address: 'Hay Atlas', products: 'Veste', size: 'L', color: '', quantity: 1, price: 250, notes: '', city_name: 'Fes', city_id: '69' },
];
