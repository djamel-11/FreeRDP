/** AMEEX Customers API client (https://documenter.getpostman.com/view/10265205/2sA3rwLZD1). */
export const AMEEX_BASE = process.env.AMEEX_BASE_URL || 'https://api.ameex.app/customer'; // override only for tests

export interface AmeexCreds { apiId: string; apiKey: string }
export interface AmeexOrder {
  id: number; order_number: string; customer_name: string; phone: string; address: string; city: string;
  notes: string; products: string; size: string; color: string; quantity: number; price: number;
}

export function buildParcelForm(o: AmeexOrder, apiId: string, cityId: number): FormData {
  const f = new FormData();
  const phone = o.phone.startsWith('+212') ? '0' + o.phone.slice(4) : o.phone;
  const product = [o.products, o.size, o.color].filter(Boolean).join(' ') + (o.quantity > 1 ? ` x${o.quantity}` : '');
  const fields: Record<string, string> = {
    type: 'SIMPLE', business: apiId, order_num: o.order_number, replace: 'false', open: 'YES', try: 'YES', fragile: '0',
    receiver: o.customer_name, phone, city: String(cityId), address: o.address, comment: o.notes || '', product, cod: String(o.price),
  };
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

/** The docs show no response body, so we search common shapes for the parcel code and keep the raw text otherwise. */
export function extractParcelCode(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const stack: any[] = [body];
  while (stack.length) {
    const cur = stack.pop();
    for (const [k, v] of Object.entries(cur)) {
      if (/^(parcel_?code|code|tracking)$/i.test(k) && typeof v === 'string' && v) return v;
      if (v && typeof v === 'object') stack.push(v);
    }
  }
  return null;
}

export async function sendParcel(creds: AmeexCreds, o: AmeexOrder, cityId: number, fetchImpl: typeof fetch = fetch):
  Promise<{ ok: boolean; parcelCode?: string; error?: string; raw?: string }> {
  if (!o.address.trim()) return { ok: false, error: 'address_required' };
  try {
    const res = await fetchImpl(`${AMEEX_BASE}/Delivery/Parcels/Action/Type/Add`, {
      method: 'POST', headers: { 'C-Api-Id': creds.apiId, 'C-Api-Key': creds.apiKey },
      body: buildParcelForm(o, creds.apiId, cityId), signal: AbortSignal.timeout(15000),
    });
    const text = (await res.text()).slice(0, 500);
    let json: any = null; try { json = JSON.parse(text); } catch { /* not json */ }
    const failedFlag = json && (json.status === false || json.success === false || json.error);
    if (!res.ok || failedFlag) return { ok: false, error: 'rejected', raw: text };
    const code = extractParcelCode(json);
    return code ? { ok: true, parcelCode: code, raw: text } : { ok: true, raw: text };
  } catch (e: any) {
    return { ok: false, error: 'network', raw: String(e?.message ?? e).slice(0, 200) };
  }
}
