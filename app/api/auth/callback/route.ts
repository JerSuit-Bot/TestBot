import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeDiscordCode, getDiscordUser, getDiscordGuilds } from '@/lib/discord';
import { canManageGuild, SESSION_COOKIE } from '@/lib/constants';
import { setSessionCookie, getClientIP, getUserAgent } from '@/lib/api-utils';
import { auditLog } from '@/lib/audit';
import { upsertUserFromDiscord, syncUserGuilds, createSession } from '@/lib/services';
import { getConfig } from '@/lib/config';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/?auth_error=' + error, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/?auth_error=no_code', request.url));
  }

  const cookieStore = cookies();
  const storedState = cookieStore.get('oauth_state')?.value;

  if (!storedState || storedState !== state) {
    logger.warn('auth', 'OAuth state mismatch', { storedState: !!storedState, providedState: !!state });
    return NextResponse.redirect(new URL('/?auth_error=state_mismatch', request.url));
  }

  cookieStore.delete('oauth_state');

  const tokenData = await exchangeDiscordCode(code);
  if (!tokenData) {
    return NextResponse.redirect(new URL('/?auth_error=token_exchange_failed', request.url));
  }

  const discordUser = await getDiscordUser(tokenData.access_token);
  if (!discordUser) {
    return NextResponse.redirect(new URL('/?auth_error=user_fetch_failed', request.url));
  }

  const discordGuilds = await getDiscordGuilds(tokenData.access_token);

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
    return NextResponse.redirect(new URL('/?auth_error=db_error', request.url));
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
    return NextResponse.redirect(new URL('/?auth_error=session_failed', request.url));
  }

  await auditLog({
    actor_id: userId,
    actor_name: discordUser.username,
    action: 'user_login',
    metadata: { guild_count: manageableGuilds.length },
    ip_address: ip,
    user_agent: ua,
  });

  const response = NextResponse.redirect(new URL('/servers', request.url));
  setSessionCookie(response, SESSION_COOKIE, sessionToken, 168);
  return response;
}
