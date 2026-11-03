/** Configurable export formats. Add a delivery company by adding an entry here (or later a DB row). */
export interface ExportOrder {
  order_number: string; customer_name: string; phone: string; city: string; address: string;
  products: string; size: string; color: string; quantity: number; price: number; notes: string;
}
export interface ExportColumn { header: string; value: (o: ExportOrder) => string | number }
export interface ExportFormat { key: string; name: string; columns: ExportColumn[] }


export const FORMATS: Record<string, ExportFormat> = {
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

export const esc = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@]/.test(s) && !/^[+\-]?\d+(\.\d+)?$/.test(s)) s = "'" + s; // CSV/Excel formula injection guard
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(fmt: ExportFormat, orders: ExportOrder[]): string {
  const rows = [fmt.columns.map((c) => esc(c.header)).join(',')];
  for (const o of orders) rows.push(fmt.columns.map((c) => esc(c.value(o))).join(','));
  return '﻿' + rows.join('\r\n'); // BOM so Excel reads Arabic correctly
}
