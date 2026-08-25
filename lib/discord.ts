import { randomBytes } from 'crypto';
import { DISCORD_API_BASE } from './constants';
import { getConfig, getOAuthRedirectUri, isConfigured, getConfigErrors } from './config';
import { logger } from './logger';

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar: string | null;
  discriminator: string;
  global_name: string | null;
}

export interface DiscordPartialGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
}

/** Discord OAuth error from the token endpoint (safe subset, never secrets). */
export type DiscordOAuthError =
  | 'invalid_client'
  | 'invalid_grant'
  | 'invalid_request'
  | 'access_denied'
  | 'expired_code'
  | 'http_error'
  | 'network_error'
  | 'unknown';

export interface DiscordExchangeResult {
  ok: boolean;
  token: DiscordTokenResponse | null;
  status?: number;
  /** safe error category */
  errorKind?: DiscordOAuthError;
  /** error description returned by Discord (contains no secrets) */
  errorDescription?: string;
}

/**
 * Builds the Discord authorization URL from the SINGLE canonical config.
 * The redirect URI is exactly getOAuthRedirectUri() so authorize/callback/
 * token-exchange always agree.
 */
export function getDiscordOAuthUrl(state: string): string {
  const config = getConfig();
  const redirectUri = encodeURIComponent(getOAuthRedirectUri());
  const scope = encodeURIComponent('identify guilds');
  return `${DISCORD_API_BASE}/oauth2/authorize?client_id=${config.DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
}

/**
 * Exchange a one-time authorization code for tokens.
 *
 * Logs only SAFE diagnostics: HTTP status, Discord error code, error
 * description and the redirect URI. NEVER logs the client secret, the code,
 * the access token or the refresh token.
 */
export async function exchangeDiscordCode(code: string): Promise<DiscordExchangeResult> {
  if (!isConfigured()) {
    logger.error('auth', '[OAuth] Discord OAuth not configured', {
      reason: getConfigErrors(),
    });
    return { ok: false, token: null, errorKind: 'invalid_request', errorDescription: 'OAuth not configured.' };
  }

  const config = getConfig();
  const redirectUri = getOAuthRedirectUri();

  const body = new URLSearchParams({
    client_id: config.DISCORD_CLIENT_ID,
    client_secret: config.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  try {
    const res = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      let error = '';
      let errorDescription = '';
      try {
        const parsed = (await res.json()) as { error?: string; error_description?: string };
        error = parsed.error ?? '';
        errorDescription = parsed.error_description ?? '';
      } catch {
        // non-JSON error body; fall through with empty details
      }

      const kind: DiscordOAuthError =
        error === 'invalid_client'
          ? 'invalid_client'
          : error === 'invalid_grant'
            ? 'invalid_grant'
            : error === 'invalid_request'
              ? 'invalid_request'
              : error === 'access_denied'
                ? 'access_denied'
                : error === 'expired_code' || error === 'invalid_authorization_code'
                  ? 'expired_code'
                  : 'http_error';

      logger.error('auth', '[OAuth] Discord token exchange failed', {
        status: res.status,
        statusText: res.statusText,
        error,
        errorDescription,
        redirectUri,
      });

      return { ok: false, token: null, status: res.status, errorKind: kind, errorDescription };
    }

    const token = (await res.json()) as DiscordTokenResponse;
    logger.info('auth', '[OAuth] Discord token exchange succeeded', {
      status: res.status,
      redirectUri,
      scope: token.scope,
    });
    return { ok: true, token };
  } catch (err) {
    logger.error('auth', '[OAuth] Discord token exchange network error', {
      message: err instanceof Error ? err.message : 'unknown',
      redirectUri,
    });
    return { ok: false, token: null, errorKind: 'network_error', errorDescription: 'Network error contacting Discord.' };
  }
}

/**
 * Fetches the authenticated Discord user. Never logs the token.
 */
export async function getDiscordUser(accessToken: string): Promise<DiscordUser | null> {
  try {
    const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      logger.warn('auth', '[OAuth] Failed to fetch Discord user', { status: res.status });
      return null;
    }
    return (await res.json()) as DiscordUser;
  } catch {
    return null;
  }
}

/**
 * Fetch guilds for the authenticated user. Never logs the token.
 */
export async function getDiscordGuilds(accessToken: string): Promise<DiscordPartialGuild[]> {
  try {
    const res = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    return (await res.json()) as DiscordPartialGuild[];
  } catch {
    return [];
  }
}

/**
 * Cryptographically-secure OAuth state. Each login gets a fresh 32-byte
 * random hex value so the state cookie is unpredictable and single-use.
 */
export function generateOAuthState(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Maps the Discord token response into a stored session token (the DB session
 * token is generated separately by the services layer). Kept for API parity.
 */
export function getDiscordClientIdSafe(): string | null {
  try {
    return getConfig().DISCORD_CLIENT_ID;
  } catch {
    return null;
  }
}
