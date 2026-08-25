import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth';
import { getUserGuilds } from '@/lib/services';
import { SESSION_COOKIE } from '@/lib/constants';

type DiscordBotGuild = {
  id: string;
};

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        {
          authenticated: false,
          guilds: [],
        },
        { status: 401 }
      );
    }

    const cookieStore = cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          authenticated: false,
          guilds: [],
        },
        { status: 401 }
      );
    }

    const userGuilds = await getUserGuilds(sessionToken);

    const botToken = process.env.DISCORD_BOT_TOKEN?.trim();

    if (!botToken) {
      return NextResponse.json(
        {
          error: 'DISCORD_BOT_TOKEN is missing',
          guilds: [],
        },
        { status: 500 }
      );
    }

    const botResponse = await fetch(
      'https://discord.com/api/v10/users/@me/guilds',
      {
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!botResponse.ok) {
      const body = await botResponse.text();

      console.error(
        'Discord bot guild lookup failed:',
        botResponse.status,
        body
      );

      return NextResponse.json(
        {
          error: 'Discord bot guild lookup failed',
          status: botResponse.status,
          guilds: [],
        },
        { status: 502 }
      );
    }

    const botGuilds =
      (await botResponse.json()) as DiscordBotGuild[];

    const installedGuildIds = new Set(
      botGuilds.map((guild) => guild.id)
    );

    const guilds = userGuilds.map((guild) => ({
      guild_id: guild.guild_id,
      discord_id: guild.discord_id,
      name: guild.name,
      icon: guild.icon ?? null,
      member_count: Number(guild.member_count ?? 0),
      bot_added: installedGuildIds.has(guild.discord_id),
      role: guild.role,
      permissions: guild.permissions ?? '0',
    }));

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          discord_id: user.discord_id,
          username: user.username,
        },
        guilds,
        installedGuildIds: [...installedGuildIds],
      },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/guilds failed:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load guilds',
        guilds: [],
      },
      { status: 500 }
    );
  }
}
