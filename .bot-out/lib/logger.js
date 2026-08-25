"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const SENSITIVE_KEYS = new Set([
    'password', 'token', 'secret', 'authorization', 'cookie',
    'access_token', 'refresh_token', 'session', 'apiKey', 'api_key',
]);
function redact(obj) {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (Array.isArray(obj))
        return obj.map(redact);
    if (obj instanceof Error)
        return { name: obj.name, message: obj.message };
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.has(key.toLowerCase())) {
            result[key] = '[REDACTED]';
        }
        else {
            result[key] = redact(value);
        }
    }
    return result;
}
function formatLog(level, service, message, metadata) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        service,
        message,
        ...(metadata ? { metadata: redact(metadata) } : {}),
    };
    return JSON.stringify(entry);
}
exports.logger = {
    debug(service, message, metadata) {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(formatLog('DEBUG', service, message, metadata));
        }
    },
    info(service, message, metadata) {
        console.info(formatLog('INFO', service, message, metadata));
    },
    warn(service, message, metadata) {
        console.warn(formatLog('WARN', service, message, metadata));
    },
    error(service, message, metadata) {
        console.error(formatLog('ERROR', service, message, metadata));
    },
};
