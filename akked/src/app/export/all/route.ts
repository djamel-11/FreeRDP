import { getSession } from '@/lib/auth';
import { exportWorkspaceData } from '@/lib/dataRights';

export async function GET() {
  const me = await getSession();
  if (!me) return new Response('Unauthorized', { status: 401 });
  if (me.role !== 'owner') return new Response('Forbidden', { status: 403 });
  return new Response(JSON.stringify(exportWorkspaceData(me.workspaceId), null, 2), { headers: {
    'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="akked-data-${new Date().toISOString().slice(0, 10)}.json"`, 'cache-control': 'no-store' } });
}
