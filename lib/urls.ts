import type { NextRequest } from 'next/server';

/**
 * Canonical base URL resolution.
 *
 * In local/dev the configured NEXT_PUBLIC_APP_URL (from `.env.local`, made
 * authoritative by lib/env.ts) is always returned so a stale request-host
 * can never silently override it. When no APP_URL is configured (production
 * behind a known proxy), we fall back to the incoming request origin for
 * non-localhost hosts.
 */
export function getBaseUrl(request?: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured && /^https?:\/\//.test(configured)) {
    return configured.replace(/\/+$/, '');
  }

  if (request) {
    const url = new URL(request.url);
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return url.origin;
    }
  }

  return '';
}
