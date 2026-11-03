import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getSession } from '@/lib/auth';
import { backupTo } from '@/lib/backup';

/** Admin-only: take a fresh consistent snapshot and download it (keep a copy off the server). */
export async function GET() {
  const me = await getSession();
  if (!me?.isAdmin) return new Response('Forbidden', { status: 403 });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'akked-dl-'));
  try {
    const file = backupTo(dir);
    return new Response(new Uint8Array(fs.readFileSync(file)), { headers: { 'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename="${path.basename(file)}"`, 'cache-control': 'no-store' } });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
