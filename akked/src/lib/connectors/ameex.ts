import { ameexIdOf } from '../cities';
import { AMEEX_BASE, extractParcelCode, buildParcelForm } from '../ameex';
import type { Connector } from './index';

/** AMEEX status names are not in their public docs: keyword-based and conservative (unknown → no change). */
export function mapAmeexStatus(raw: string | null | undefined): 'delivered' | 'returned' | null {
  const s = (raw ?? '').toLowerCase();
  if (!s) return null;
  if (/retour|return|refus|مرتجع|رفض|non\s*livr|undeliver|not\s*deliver/.test(s)) return 'returned';
  if (/livr[ée]|deliver|تسليم|تم التوصيل/.test(s)) return 'delivered';
  return null;
}
export function extractStatusText(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const stack: any[] = [body];
  while (stack.length) {
    const cur = stack.pop();
    for (const [k, v] of Object.entries(cur)) {
      if (/^(status|statut|state|etat|état|status_name|statusname)$/i.test(k)) {
        if (typeof v === 'string' && v) return v;
        if (v && typeof v === 'object') { const n = (v as any).name ?? (v as any).label ?? (v as any).title; if (typeof n === 'string' && n) return n; }
      }
      if (v && typeof v === 'object') stack.push(v);
    }
  }
  return null;
}

export const ameex: Connector = {
  key: 'ameex', name: 'AMEEX',
  fields: [{ key: 'apiId', label: 'API ID' }, { key: 'apiKey', label: 'API Key', secret: true }],
  cityFor: (canonical) => { const c = ameexIdOf(canonical); return c ? { id: String(c.id), name: c.name } : null; },
  needsCityId: true, requiresAddress: true,
  async send(creds, o, city, fetchImpl = fetch) {
    try {
      const res = await fetchImpl(`${process.env.AMEEX_BASE_URL || AMEEX_BASE}/Delivery/Parcels/Action/Type/Add`, {
        method: 'POST', headers: { 'C-Api-Id': creds.apiId, 'C-Api-Key': creds.apiKey },
        body: buildParcelForm({ ...o, id: o.id } as any, creds.apiId, Number(city?.id)), signal: AbortSignal.timeout(15000),
      });
      const text = (await res.text()).slice(0, 500);
      let json: any = null; try { json = JSON.parse(text); } catch { /* not json */ }
      if (!res.ok || (json && (json.status === false || json.success === false || json.error))) return { ok: false, error: 'rejected', raw: text };
      const code = extractParcelCode(json);
      return code ? { ok: true, code, raw: text } : { ok: true, raw: text };
    } catch (e: any) { return { ok: false, error: 'network', raw: String(e?.message ?? e).slice(0, 200) }; }
  },
  async track(creds, code, fetchImpl = fetch) {
    try {
      const res = await fetchImpl(`${process.env.AMEEX_BASE_URL || AMEEX_BASE}/Delivery/Parcels/Info?ParcelCode=${encodeURIComponent(code)}`, { headers: { 'C-Api-Id': creds.apiId, 'C-Api-Key': creds.apiKey }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) return { ok: false };
      let json: any = null; try { json = JSON.parse(await res.text()); } catch { /* not json */ }
      return { ok: true, status: extractStatusText(json) ?? undefined };
    } catch { return { ok: false }; }
  },
  mapStatus: mapAmeexStatus,
  presetTemplate: {
    file: 'AMEEX_MODELE.xlsx',
    config: { headerRow: 1, output: 'xlsx', columns: [
      { col: 1, header: 'NUMERO DE COMMANDE', source: 'order_number' }, { col: 2, header: 'DESTINATAIRE', source: 'customer_name' },
      { col: 3, header: 'TELEPHONE', source: 'phone_national' }, { col: 4, header: 'ADRESSE', source: 'address' }, { col: 5, header: 'PRIX', source: 'price' },
      { col: 6, header: 'VILLE', source: 'city' }, { col: 7, header: 'COMMENTAIRE', source: 'notes' }, { col: 8, header: 'MARCHANDISE', source: 'product_full' },
    ] },
  },
};
