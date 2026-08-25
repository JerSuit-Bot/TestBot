import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeDiscordCode, getDiscordUser, getDiscordGuilds } from '@/lib/discord';
import { canManageGuild, SESSION_COOKIE } from '@/lib/constants';
import { setSessionCookie, getClientIP, getUserAgent } from '@/lib/api-utils';
import { auditLog } from '@/lib/audit';
import { upsertUserFromDiscord, syncUserGuilds, createSession } from '@/lib/services';
import { getConfig } from '@/lib/config';
import { getBaseUrl } from '@/lib/urls';
import { logger } from '@/lib/logger';

function redirectWithError(base: string, key: string): NextResponse {
  logger.warn('auth', `[OAuth] login failed: ${key}`);
  return NextResponse.redirect(`${base}/?auth_error=${key}`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const base = getBaseUrl(request);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    if (error === 'access_denied') return redirectWithError(base, 'access_denied');
    logger.warn('auth', '[OAuth] Discord returned an error', {
      error,
      errorDescription: errorDescription ?? undefined,
    });
    return redirectWithError(base, 'access_denied');
  }

  if (!code) {
    return redirectWithError(base, 'missing_code');
  }
  if (!state) {
    return redirectWithError(base, 'state_mismatch');
  }

  const cookieStore = cookies();
  const storedState = cookieStore.get('oauth_state')?.value;
  cookieStore.delete('oauth_state');

  if (!storedState || storedState !== state) {
    logger.warn('auth', 'OAuth state mismatch', { storedState: Boolean(storedState), providedState: Boolean(state) });
    return redirectWithError(base, 'state_mismatch');
  }

  const exchange = await exchangeDiscordCode(code);
  if (!exchange.ok || !exchange.token) {
    const key =
      exchange.errorKind === 'invalid_client' ? 'invalid_client'
      : exchange.errorKind === 'invalid_grant' ? 'invalid_grant'
      : exchange.errorKind === 'invalid_request' ? 'invalid_request'
      : exchange.errorKind === 'access_denied' ? 'access_denied'
      : exchange.errorKind === 'expired_code' ? 'invalid_code'
      : exchange.errorKind === 'network_error' ? 'network_error'
      : 'token_exchange_failed';
    if (key === 'invalid_code') return redirectWithError(base, 'invalid_code');
    return redirectWithError(base, key);
  }

  const discordUser = await getDiscordUser(exchange.token.access_token);
  if (!discordUser) {
    return redirectWithError(base, 'user_fetch_failed');
  }

  const discordGuilds = await getDiscordGuilds(exchange.token.access_token);

  let userId: string;
  try {
    userId = await upsertUserFromDiscord(
      discordUser.id,
      discordUser.username,
      discordUser.display_name || discordUser.global_name || discordUser.username,
      discordUser.avatar,
    );
  } catch (e) {
    logger.error('auth', 'Failed to upsert user', { error: (e as Error).message });
    return redirectWithError(base, 'db_error');
  }

  const manageableGuilds = discordGuilds
    .filter((g) => canManageGuild(g.permissions, g.owner))
    .map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: g.owner,
      permissions: g.permissions,
      member_count: 0,
      bot_added: false,
    }));

  await syncUserGuilds(userId, manageableGuilds);

  const ip = getClientIP(request);
  const ua = getUserAgent(request);

  let sessionToken: string;
  try {
    sessionToken = await createSession(userId, ip, ua, 168);
  } catch (e) {
    logger.error('auth', 'Failed to create session', { error: (e as Error).message });
    return redirectWithError(base, 'session_failed');
  }

  await auditLog({
    actor_id: userId,
    actor_name: discordUser.username,
    action: 'user_login',
    metadata: { guild_count: manageableGuilds.length },
    ip_address: ip,
    user_agent: ua,
  });

  const response = NextResponse.redirect(`${base}/servers`);
  setSessionCookie(response, SESSION_COOKIE, sessionToken, 168);
  return response;
}
