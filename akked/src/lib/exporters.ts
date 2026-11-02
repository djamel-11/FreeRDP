/** Configurable export formats. Add a delivery company by adding an entry here (or later a DB row). */
export interface ExportOrder {
  order_number: string; customer_name: string; phone: string; city: string; address: string;
  products: string; size: string; color: string; quantity: number; price: number; notes: string;
}
export interface ExportColumn { header: string; value: (o: ExportOrder) => string | number }
export interface ExportFormat { key: string; name: string; columns: ExportColumn[] }

const nationalPhone = (p: string) => (p.startsWith('+212') ? '0' + p.slice(4) : p);

export const FORMATS: Record<string, ExportFormat> = {
  // Columns taken from the official AMEEX_MODELE.xlsx (templates/AMEEX_MODELE.xlsx)
  ameex: {
    key: 'ameex', name: 'AMEEX',
    columns: [
      { header: 'NUMERO DE COMMANDE', value: (o) => o.order_number },
      { header: 'DESTINATAIRE', value: (o) => o.customer_name },
      { header: 'TELEPHONE', value: (o) => nationalPhone(o.phone) },
      { header: 'ADRESSE', value: (o) => o.address },
      { header: 'PRIX', value: (o) => o.price },
      { header: 'VILLE', value: (o) => o.city },
      { header: 'COMMENTAIRE', value: (o) => o.notes },
      { header: 'MARCHANDISE', value: (o) => [o.products, o.size, o.color].filter(Boolean).join(' ') + (o.quantity > 1 ? ` x${o.quantity}` : '') },
    ],
  },
  generic: {
    key: 'generic', name: 'CSV générique',
    columns: [
      { header: 'order_number', value: (o) => o.order_number },
      { header: 'name', value: (o) => o.customer_name },
      { header: 'phone', value: (o) => o.phone },
      { header: 'city', value: (o) => o.city },
      { header: 'address', value: (o) => o.address },
      { header: 'product', value: (o) => o.products },
      { header: 'size', value: (o) => o.size },
      { header: 'color', value: (o) => o.color },
      { header: 'quantity', value: (o) => o.quantity },
      { header: 'price', value: (o) => o.price },
      { header: 'notes', value: (o) => o.notes },
    ],
  },
};

const esc = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@]/.test(s) && !/^[+\-]?\d+(\.\d+)?$/.test(s)) s = "'" + s; // CSV/Excel formula injection guard
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(fmt: ExportFormat, orders: ExportOrder[]): string {
  const rows = [fmt.columns.map((c) => esc(c.header)).join(',')];
  for (const o of orders) rows.push(fmt.columns.map((c) => esc(c.value(o))).join(','));
  return '﻿' + rows.join('\r\n'); // BOM so Excel reads Arabic correctly
}

/** Build an .xlsx from the official template (keeps its styling), or from scratch for formats without one. */
export async function toXlsx(fmt: ExportFormat, orders: ExportOrder[], templatePath?: string): Promise<Buffer> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  if (templatePath) await wb.xlsx.readFile(templatePath);
  const ws = wb.worksheets[0] ?? wb.addWorksheet('Sheet1');
  if (!templatePath) ws.addRow(fmt.columns.map((c) => c.header));
  const safe = (v: string | number) => (typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v);
  orders.forEach((o, i) => {
    const row = ws.getRow(i + 2);
    fmt.columns.forEach((c, j) => { row.getCell(j + 1).value = safe(c.value(o)); });
    // phone as text so Excel keeps the leading 0
    const phoneIdx = fmt.columns.findIndex((c) => /TELEPHONE|phone/i.test(c.header));
    if (phoneIdx >= 0) row.getCell(phoneIdx + 1).numFmt = '@';
    row.commit();
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
}
