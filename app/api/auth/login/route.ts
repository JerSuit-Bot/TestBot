export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { generateOAuthState, getDiscordOAuthUrl } from '@/lib/discord';
import { cookies } from 'next/headers';
import { getConfig, getOAuthRedirectUri } from '@/lib/config';
import { logger } from '@/lib/logger';

/**
 * Step 1 of OAuth: generate a crypto-secure state, store it in an httpOnly
 * cookie, and redirect to Discord's authorize endpoint. The redirect URI comes
 * from the single canonical config so authorize/callback/token-exchange agree.
 */
export async function GET(request: NextRequest) {
  try {
    getConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown configuration error';
    logger.error('auth', '[OAuth] Configuration error at login', { message });
    return NextResponse.json(
      { error: 'Discord OAuth configuration error', details: message },
      { status: 503 },
    );
  }

  const state = generateOAuthState();
  const cookieStore = cookies();
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  logger.info('auth', '[OAuth] Starting login flow', {
    redirectUri: getOAuthRedirectUri(),
  });

  const authUrl = getDiscordOAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
