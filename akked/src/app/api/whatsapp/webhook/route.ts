import { handleWebhook } from '@/lib/inbox';
import { verifySignature } from '@/lib/whatsapp';

/** Meta webhook verification handshake. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const token = process.env.WA_VERIFY_TOKEN;
  if (token && q.get('hub.mode') === 'subscribe' && q.get('hub.verify_token') === token) return new Response(q.get('hub.challenge') ?? '', { status: 200 });
  return new Response('Forbidden', { status: 403 });
}

export async function POST(req: Request) {
  const secret = process.env.WA_APP_SECRET;
  if (!secret) return new Response('WA_APP_SECRET not configured', { status: 503 });
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get('x-hub-signature-256'), secret)) return new Response('Bad signature', { status: 401 });
  let payload: unknown; try { payload = JSON.parse(raw); } catch { return new Response('Bad JSON', { status: 400 }); }
  try { handleWebhook(payload); } catch (e) { console.error('whatsapp webhook error', e); } // always 200 so Meta doesn't retry-storm
  return new Response('ok', { status: 200 });
}
