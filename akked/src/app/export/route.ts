import { getSession } from '@/lib/auth';
import { FORMATS, toCsv } from '@/lib/exporters';
import { exportableOrders } from '@/lib/orders';
import { exportRowsFor, getCarrier, getTemplate, listCarriers } from '@/lib/carriers';
import { renderExport, SAMPLE_ROWS } from '@/lib/exportEngine';

export async function GET(req: Request) {
  const me = await getSession();
  if (!me) return new Response('Unauthorized', { status: 401 });
  if (me.role !== 'owner') return new Response('Forbidden', { status: 403 }); // agents cannot download the customer list
  const q = new URL(req.url).searchParams; const date = new Date().toISOString().slice(0, 10);

  // A delivery company profile (any company: its own columns/template) — or the legacy ?format=ameex alias.
  let carrierId = Number(q.get('carrier') ?? 0);
  if (!carrierId && q.get('format') === 'ameex') carrierId = listCarriers(me.workspaceId).find((c) => c.connector === 'ameex')?.id ?? 0;
  if (carrierId) {
    const c = getCarrier(me.workspaceId, carrierId); if (!c) return new Response('Not found', { status: 404 });
    const sample = q.get('sample') === '1';
    const { rows, unmatched } = sample ? { rows: SAMPLE_ROWS, unmatched: [] as string[] } : exportRowsFor(me.workspaceId, c, true);
    const out = await renderExport(c.config, getTemplate(me.workspaceId, c.id), rows);
    const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'carrier';
    return new Response(new Uint8Array(out.bytes), { headers: { 'content-type': out.mime, 'content-disposition': `attachment; filename="akked-${slug}-${sample ? 'sample' : date}.${out.ext}"`, 'x-unmatched-orders': unmatched.join(','), 'cache-control': 'no-store' } });
  }

  const fmt = FORMATS[q.get('format') ?? 'generic'];
  if (!fmt || fmt.key !== 'generic') return new Response('Unknown format', { status: 400 });
  return new Response(toCsv(fmt, exportableOrders(me.workspaceId, true)), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="akked-generic-${date}.csv"` } });
}
