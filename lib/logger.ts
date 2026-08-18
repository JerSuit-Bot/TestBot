export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const SENSITIVE_KEYS = new Set([
  'password', 'token', 'secret', 'authorization', 'cookie',
  'access_token', 'refresh_token', 'session', 'apiKey', 'api_key',
]);

function redact(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  if (obj instanceof Error) return { name: obj.name, message: obj.message };
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redact(value);
    }
  }
  return result;
}

function formatLog(level: LogLevel, service: string, message: string, metadata?: Record<string, unknown>): string {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    ...(metadata ? { metadata: redact(metadata) } : {}),
  };
  return JSON.stringify(entry);
}

export const logger = {
  debug(service: string, message: string, metadata?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatLog('DEBUG', service, message, metadata));
    }
  },
  info(service: string, message: string, metadata?: Record<string, unknown>) {
    console.info(formatLog('INFO', service, message, metadata));
  },
  warn(service: string, message: string, metadata?: Record<string, unknown>) {
    console.warn(formatLog('WARN', service, message, metadata));
  },
  error(service: string, message: string, metadata?: Record<string, unknown>) {
    console.error(formatLog('ERROR', service, message, metadata));
  },
};
