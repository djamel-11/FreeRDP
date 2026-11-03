import Papa from 'papaparse';

export interface Table { headerRow: number; headers: { col: number; header: string }[]; rows: string[][]; kind: 'xlsx' | 'csv' }
const MAX_ROWS = 5000;

/** Read the first sheet of an xlsx, or a csv/tsv, into header cells + rows (rows are indexed by column number − 1). */
export async function readTable(bytes: Uint8Array, filename: string): Promise<Table | null> {
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) return null; // old .xls
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const ExcelJS = (await import('exceljs')).default; const wb = new ExcelJS.Workbook();
    try { await wb.xlsx.load(Buffer.from(bytes) as any); } catch { return null; }
    const ws = wb.worksheets[0]; if (!ws) return null;
    const str = (c: any): string => {
      const v = c.value; if (v == null) return '';
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      if (typeof v === 'object') return String(v.text ?? v.result ?? v.richText?.map((x: any) => x.text).join('') ?? '');
      return String(v);
    };
    let headerRow = 0; let headers: { col: number; header: string }[] = [];
    for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) {
      const cells: { col: number; header: string }[] = [];
      ws.getRow(r).eachCell({ includeEmpty: false }, (c, col) => { const s = str(c).trim(); if (s) cells.push({ col, header: s }); });
      if (cells.length >= 2) { headerRow = r; headers = cells; break; }
    }
    if (!headerRow) return null;
    const width = Math.max(...headers.map((h) => h.col)); const rows: string[][] = [];
    for (let r = headerRow + 1; r <= ws.rowCount && rows.length < MAX_ROWS; r++) {
      const row = ws.getRow(r); const out: string[] = []; let any = false;
      for (let c = 1; c <= width; c++) { const s = str(row.getCell(c)).trim(); out.push(s); if (s) any = true; }
      if (any) rows.push(out);
    }
    return { headerRow, headers, rows, kind: 'xlsx' };
  }
  const text = new TextDecoder().decode(bytes).replace(/^﻿/, '');
  const first = text.split(/\r?\n/).find((l) => l.trim()); if (!first) return null;
  const delimiter = first.includes('\t') ? '\t' : first.includes(';') && first.split(';').length > first.split(',').length ? ';' : ',';
  const parsed = Papa.parse<string[]>(text, { delimiter, skipEmptyLines: 'greedy' });
  const all = parsed.data as string[][];
  const hi = all.findIndex((r) => r.filter((c) => String(c).trim()).length >= 2); if (hi < 0) return null;
  const headers = all[hi].map((h, i) => ({ col: i + 1, header: String(h).trim() })).filter((h) => h.header);
  return { headerRow: hi + 1, headers, rows: all.slice(hi + 1, hi + 1 + MAX_ROWS).map((r) => r.map((c) => String(c ?? '').trim())), kind: 'csv' };
}
