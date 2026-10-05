type Level = 'debug' | 'info' | 'warn' | 'error';

const secrets = new Set<string>();

/** Register a secret so it is scrubbed from every log line. */
export function registerSecret(value: string | undefined): void {
  if (value) secrets.add(value);
}

function scrub(text: string): string {
  let out = text;
  for (const secret of secrets) out = out.split(secret).join('[redacted]');
  return out;
}

function format(arg: unknown): string {
  if (arg instanceof Error) return arg.message;
  return typeof arg === 'string' ? arg : JSON.stringify(arg);
}

function log(level: Level, message: string, ...args: unknown[]): void {
  const line = scrub([message, ...args.map(format)].join(' '));
  const stream = level === 'error' || level === 'warn' ? console.error : console.log;
  stream(`${new Date().toISOString()} [${level}] ${line}`);
}

export const logger = {
  debug: (m: string, ...a: unknown[]) => log('debug', m, ...a),
  info: (m: string, ...a: unknown[]) => log('info', m, ...a),
  warn: (m: string, ...a: unknown[]) => log('warn', m, ...a),
  error: (m: string, ...a: unknown[]) => log('error', m, ...a),
};
