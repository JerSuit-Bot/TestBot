import { NextRequest, NextResponse } from 'next/server';
import { generateOAuthState } from '@/lib/discord';
import { cookies } from 'next/headers';
import { getConfig } from '@/lib/config';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const config = getConfig();
  } catch {
    return NextResponse.json(
      { error: 'Discord OAuth is not configured. Set DISCORD_CLIENT_ID and DISCORD_REDIRECT_URI environment variables.' },
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

  const config = getConfig();
  const scope = encodeURIComponent('identify guilds');
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${config.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(config.DISCORD_REDIRECT_URI)}&response_type=code&scope=${scope}&state=${state}`;
  return NextResponse.redirect(authUrl);
}
