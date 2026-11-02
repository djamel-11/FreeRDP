import { getSession } from '@/lib/auth';
import path from 'node:path';
import { FORMATS, toCsv, toXlsx } from '@/lib/exporters';
import { exportableOrders } from '@/lib/orders';

export async function GET(req: Request) {
  const me = await getSession();
  if (!me) return new Response('Unauthorized', { status: 401 });
  const key = new URL(req.url).searchParams.get('format') ?? 'generic';
  const fmt = FORMATS[key];
  if (!fmt) return new Response('Unknown format', { status: 400 });
  const orders = exportableOrders(me.workspaceId, true);
  const date = new Date().toISOString().slice(0, 10);
  if (key === 'ameex') {
    const buf = await toXlsx(fmt, orders, path.join(process.cwd(), 'templates', 'AMEEX_MODELE.xlsx'));
    return new Response(new Uint8Array(buf), { headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'content-disposition': `attachment; filename="akked-ameex-${date}.xlsx"` } });
  }
  const csv = toCsv(fmt, orders);
  return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="akked-${key}-${date}.csv"` } });
}
