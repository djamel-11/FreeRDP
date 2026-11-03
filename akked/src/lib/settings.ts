import { db } from './db';
/** Platform-wide settings edited by the admin (payment instructions, support number, operator details for legal pages). */
export const getSetting = (key: string, fallback = ''): string =>
  ((db().prepare('SELECT value FROM platform_settings WHERE key = ?').get(key) as any)?.value as string | undefined) ?? fallback;
export const setSetting = (key: string, value: string) =>
  void db().prepare('INSERT INTO platform_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
export const SETTING_KEYS = ['payment_instructions', 'support_whatsapp', 'operator_name', 'operator_contact'] as const;
