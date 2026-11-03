import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

/** Payment proofs are uploaded by users: served to admins only, as an attachment-safe response (no sniffing, sandboxed). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me?.isAdmin) return new Response('Forbidden', { status: 403 });
  const { id } = await params;
  const p = db().prepare('SELECT proof, proof_mime FROM payments WHERE id = ?').get(Number(id)) as any;
  if (!p?.proof) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(p.proof), { headers: { 'content-type': p.proof_mime, 'content-security-policy': "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'", 'x-content-type-options': 'nosniff', 'cache-control': 'private, no-store' } });
}
