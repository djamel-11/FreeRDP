import { getSession } from '@/lib/auth';
import { FORMATS, toCsv } from '@/lib/exporters';
import { exportableOrders } from '@/lib/orders';

export async function GET(req: Request) {
  const me = await getSession();
  if (!me) return new Response('Unauthorized', { status: 401 });
  const key = new URL(req.url).searchParams.get('format') ?? 'generic';
  const fmt = FORMATS[key];
  if (!fmt) return new Response('Unknown format', { status: 400 });
  const csv = toCsv(fmt, exportableOrders(me.workspaceId, true));
  return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="akked-${key}-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
