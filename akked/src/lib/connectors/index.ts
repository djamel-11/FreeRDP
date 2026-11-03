import type { ExportOrder } from '../exporters';

/** A shipping company with an API. Adding one = add a file here and register it below. */
export interface ConnectorOrder extends ExportOrder { id: number }
export interface Connector {
  key: string; name: string;
  /** Credentials the seller must paste (stored encrypted). */
  fields: { key: string; label: string; secret?: boolean }[];
  /** Built-in city list (name → id) if the company has one; sellers can still override per carrier. */
  cityFor?: (canonicalCity: string) => { id: string; name: string } | null;
  needsCityId: boolean; requiresAddress: boolean;
  send(creds: Record<string, string>, o: ConnectorOrder, city: { id: string; name: string } | null, fetchImpl?: typeof fetch): Promise<{ ok: boolean; code?: string; error?: string; raw?: string }>;
  track?(creds: Record<string, string>, code: string, fetchImpl?: typeof fetch): Promise<{ ok: boolean; status?: string }>;
  /** Map the company's status text to our statuses. Unknown → null (no change). */
  mapStatus(raw: string | null | undefined): 'delivered' | 'returned' | null;
  /** Mapping preset for exports (columns of the company's own template). */
  presetTemplate?: { file: string; config: import('../exportEngine').ExportConfig };
}

import { ameex } from './ameex';
export const CONNECTORS: Record<string, Connector> = { [ameex.key]: ameex };
export const connectorList = () => Object.values(CONNECTORS);
