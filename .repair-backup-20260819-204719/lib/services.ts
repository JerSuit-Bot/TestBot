import { getDb, generateToken } from '@/lib/db';
import { DatabaseError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface SessionUser {
  id: string;
  discord_id: string;
  username: string;
  display_name: string | null;
  avatar: string | null;
  is_platform_owner: boolean;
}

export interface AdminSession {
  valid: boolean;
  username?: string;
}

export interface GuildWithAccess {
  guild_id: string;
  discord_id: string;
  name: string;
  icon: string | null;
  member_count: number;
  bot_added: boolean;
  role: string;
  permissions: string;
}

export interface GuildSettings {
  guild_id?: string;
  language?: string;
  embed_color?: string;
  prefix?: string;
  welcome_enabled?: boolean;
  welcome_channel_id?: string | null;
  welcome_message?: string | null;
  welcome_embed_enabled?: boolean;
  leave_enabled?: boolean;
  leave_channel_id?: string | null;
  leave_message?: string | null;
  logging_enabled?: boolean;
  log_channel_id?: string | null;
  member_log_channel_id?: string | null;
  moderation_log_channel_id?: string | null;
  voice_log_channel_id?: string | null;
  role_log_channel_id?: string | null;
  channel_log_channel_id?: string | null;
  message_log_channel_id?: string | null;
  moderation_enabled?: boolean;
  automod_enabled?: boolean;
  automod_config?: Record<string, unknown>;
  tickets_enabled?: boolean;
  ticket_config?: Record<string, unknown>;
  music_enabled?: boolean;
  music_config?: Record<string, unknown>;
  automations_enabled?: boolean;
  roles_config?: Record<string, unknown>;
  feature_toggles?: Record<string, unknown>;
  bot_nickname?: string | null;
}

export interface AuditEntry {
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  target?: string | null;
  guild_id?: string | null;
  result?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface SecurityEvent {
  user_id?: string | null;
  type: string;
  severity?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
}

/* ─────────────────────────────────────────────
 * Users
 * ───────────────────────────────────────────── */

export async function upsertUserFromDiscord(
  discordId: string,
  username: string,
  displayName: string | null,
  avatar: string | null,
): Promise<string> {
  const platformOwnerId = process.env.PLATFORM_OWNER_DISCORD_ID;
  const isOwner = Boolean(platformOwnerId && discordId === platformOwnerId);

  try {
    const db = await getDb();

    const result = await db.query<{ id: string }>(
      `
      INSERT INTO users (
        discord_id,
        username,
        display_name,
        avatar,
        is_platform_owner,
        last_login_at
      )
      VALUES ($1, $2, $3, $4, $5, now())
      ON CONFLICT (discord_id)
      DO UPDATE SET
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        avatar = EXCLUDED.avatar,
        last_login_at = now(),
        is_platform_owner =
          CASE
            WHEN $5 = true THEN true
            ELSE users.is_platform_owner
          END
      RETURNING id::text AS id
      `,
      [discordId, username, displayName, avatar, isOwner],
    );

    const userId = result.rows[0]?.id;

    if (!userId) {
      throw new Error('Failed to create or update Discord user');
    }

    return userId;
  } catch (e) {
    logger.error('db', 'upsertUserFromDiscord failed', {
      error: (e as Error).message,
    });

    throw new DatabaseError((e as Error).message);
  }
}

/* ─────────────────────────────────────────────
 * Sessions
 * ───────────────────────────────────────────── */

export async function createSession(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null,
  hours: number = 168,
): Promise<string> {
  try {
    const db = await getDb();
    const token = generateToken();

    await db.query(
      `
      INSERT INTO sessions (
        token,
        user_id,
        expires_at,
        ip_address,
        user_agent
      )
      VALUES (
        $1,
        $2,
        now() + ($3 * interval '1 hour'),
        $4,
        $5
      )
      `,
      [token, userId, hours, ipAddress, userAgent],
    );

    return token;
  } catch (e) {
    logger.error('db', 'createSession failed', {
      error: (e as Error).message,
    });

    throw new DatabaseError((e as Error).message);
  }
}

export async function validateSession(
  token: string,
): Promise<SessionUser | null> {
  try {
    const db = await getDb();

    const result = await db.query<SessionUser>(
      `
      SELECT
        u.id::text AS id,
        u.discord_id,
        u.username,
        u.display_name,
        u.avatar,
        COALESCE(u.is_platform_owner, false) AS is_platform_owner
      FROM sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.token = $1
        AND s.expires_at > now()
      LIMIT 1
      `,
      [token],
    );

    return result.rows[0] ?? null;
  } catch (e) {
    logger.error('db', 'validateSession failed', {
      error: (e as Error).message,
    });

    return null;
  }
}

export async function deleteSession(token: string): Promise<void> {
  try {
    const db = await getDb();

    await db.query(
      `DELETE FROM sessions WHERE token = $1`,
      [token],
    );
  } catch (e) {
    logger.error('db', 'deleteSession failed', {
      error: (e as Error).message,
    });
  }
}

export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const db = await getDb();

    const result = await db.query(
      `
      DELETE FROM sessions
      WHERE expires_at < now()
      RETURNING id
      `,
    );

    return result.rows.length;
  } catch (e) {
    logger.error('db', 'cleanupExpiredSessions failed', {
      error: (e as Error).message,
    });

    return 0;
  }
}

/* ─────────────────────────────────────────────
 * Admin Sessions
 * ───────────────────────────────────────────── */

export async function createAdminSession(
  username: string,
  ipAddress: string | null,
  userAgent: string | null,
  hours: number = 24,
): Promise<string> {
  try {
    const db = await getDb();
    const token = generateToken();

    await db.query(
      `
      INSERT INTO admin_sessions (
        token,
        username,
        expires_at,
        ip_address,
        user_agent
      )
      VALUES (
        $1,
        $2,
        now() + ($3 * interval '1 hour'),
        $4,
        $5
      )
      `,
      [token, username, hours, ipAddress, userAgent],
    );

    return token;
  } catch (e) {
    logger.error('db', 'createAdminSession failed', {
      error: (e as Error).message,
    });

    throw new DatabaseError((e as Error).message);
  }
}

export async function validateAdminSession(
  token: string,
): Promise<AdminSession | null> {
  try {
    const db = await getDb();

    const result = await db.query<{ username: string }>(
      `
      SELECT username
      FROM admin_sessions
      WHERE token = $1
        AND expires_at > now()
      LIMIT 1
      `,
      [token],
    );

    const session = result.rows[0];

    if (!session) {
      return null;
    }

    return {
      valid: true,
      username: session.username,
    };
  } catch (e) {
    logger.error('db', 'validateAdminSession failed', {
      error: (e as Error).message,
    });

    return null;
  }
}

export async function deleteAdminSession(token: string): Promise<void> {
  try {
    const db = await getDb();

    await db.query(
      `DELETE FROM admin_sessions WHERE token = $1`,
      [token],
    );
  } catch (e) {
    logger.error('db', 'deleteAdminSession failed', {
      error: (e as Error).message,
    });
  }
}

/* ─────────────────────────────────────────────
 * Guilds
 * ───────────────────────────────────────────── */

export async function syncUserGuilds(
  userId: string,
  guilds: Array<{
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: string;
    member_count: number;
    bot_added: boolean;
  }>,
): Promise<void> {
  try {
    const db = await getDb();

    for (const guild of guilds) {
      const role = guild.owner ? 'SERVER_OWNER' : 'SERVER_MEMBER';

      const guildResult = await db.query<{ id: string }>(
        `
        INSERT INTO guilds (
          discord_id,
          name,
          icon,
          owner_discord_id,
          member_count,
          bot_added_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          CASE WHEN $4 = true THEN $1 ELSE NULL END,
          $5,
          CASE WHEN $6 = true THEN now() ELSE NULL END,
          now()
        )
        ON CONFLICT (discord_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          icon = EXCLUDED.icon,
          owner_discord_id = EXCLUDED.owner_discord_id,
          member_count = EXCLUDED.member_count,
          bot_added_at =
            COALESCE(guilds.bot_added_at, EXCLUDED.bot_added_at),
          updated_at = now()
        RETURNING id::text AS id
        `,
        [
          guild.id,
          guild.name,
          guild.icon,
          guild.owner,
          guild.member_count ?? 0,
          guild.bot_added ?? false,
        ],
      );

      const guildId = guildResult.rows[0]?.id;

      if (!guildId) {
        throw new Error(`Failed to sync guild ${guild.id}`);
      }

      await db.query(
        `
        INSERT INTO guild_memberships (
          user_id,
          guild_id,
          discord_guild_id,
          role,
          permissions,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, now())
        ON CONFLICT (user_id, guild_id)
        DO UPDATE SET
          role = EXCLUDED.role,
          permissions = EXCLUDED.permissions,
          updated_at = now()
        `,
        [
          userId,
          guildId,
          guild.id,
          role,
          guild.permissions ?? '0',
        ],
      );

      await db.query(
        `
        INSERT INTO guild_settings (guild_id)
        SELECT $1
        WHERE NOT EXISTS (
          SELECT 1
          FROM guild_settings
          WHERE guild_id = $1
        )
        `,
        [guildId],
      );
    }
  } catch (e) {
    logger.error('db', 'syncUserGuilds failed', {
      error: (e as Error).message,
    });
  }
}

export async function getUserGuilds(
  sessionToken: string,
): Promise<GuildWithAccess[]> {
  try {
    const db = await getDb();

    const session = await validateSession(sessionToken);

    if (!session) {
      return [];
    }

    const result = await db.query<GuildWithAccess>(
      `
      SELECT
        g.id::text AS guild_id,
        g.discord_id,
        g.name,
        g.icon,
        COALESCE(g.member_count, 0)::integer AS member_count,
        (g.bot_added_at IS NOT NULL) AS bot_added,
        gm.role,
        COALESCE(gm.permissions, '0') AS permissions
      FROM guilds g
      INNER JOIN guild_memberships gm
        ON gm.guild_id = g.id
      WHERE gm.user_id = $1
      ORDER BY g.name ASC
      `,
      [session.id],
    );

    return result.rows;
  } catch (e) {
    logger.error('db', 'getUserGuilds failed', {
      error: (e as Error).message,
    });

    return [];
  }
}

export async function verifyGuildAccess(
  userId: string,
  discordGuildId: string,
): Promise<{ guildId: string; role: string } | null> {
  try {
    const db = await getDb();

    const result = await db.query<{
      guild_id: string;
      role: string;
    }>(
      `
      SELECT
        g.id::text AS guild_id,
        gm.role
      FROM guilds g
      INNER JOIN guild_memberships gm
        ON gm.guild_id = g.id
      WHERE g.discord_id = $1
        AND gm.user_id = $2
      LIMIT 1
      `,
      [discordGuildId, userId],
    );

    const access = result.rows[0];

    if (!access) {
      return null;
    }

    return {
      guildId: access.guild_id,
      role: access.role,
    };
  } catch (e) {
    logger.error('db', 'verifyGuildAccess failed', {
      error: (e as Error).message,
    });

    return null;
  }
}

export async function getGuildSettings(
  guildId: string,
): Promise<GuildSettings | null> {
  try {
    const db = await getDb();

    const result = await db.query<GuildSettings>(
      `
      SELECT *
      FROM guild_settings
      WHERE guild_id = $1
      LIMIT 1
      `,
      [guildId],
    );

    return result.rows[0] ?? null;
  } catch (e) {
    logger.error('db', 'getGuildSettings failed', {
      error: (e as Error).message,
    });

    return null;
  }
}

export async function updateGuildSettings(
  guildId: string,
  settings: Partial<GuildSettings>,
): Promise<void> {
  const allowedFields = [
    'language',
    'embed_color',
    'prefix',
    'welcome_enabled',
    'welcome_channel_id',
    'welcome_message',
    'welcome_embed_enabled',
    'leave_enabled',
    'leave_channel_id',
    'leave_message',
    'logging_enabled',
    'log_channel_id',
    'member_log_channel_id',
    'moderation_log_channel_id',
    'voice_log_channel_id',
    'role_log_channel_id',
    'channel_log_channel_id',
    'message_log_channel_id',
    'moderation_enabled',
    'automod_enabled',
    'automod_config',
    'tickets_enabled',
    'ticket_config',
    'music_enabled',
    'music_config',
    'automations_enabled',
    'roles_config',
    'feature_toggles',
    'bot_nickname',
  ] as const;

  const entries = Object.entries(settings).filter(
    ([key, value]) =>
      allowedFields.includes(key as (typeof allowedFields)[number]) &&
      value !== undefined,
  );

  if (entries.length === 0) {
    return;
  }

  try {
    const db = await getDb();

    const setClauses: string[] = [];
    const values: unknown[] = [guildId];

    entries.forEach(([key, value], index) => {
      const parameter = `$${index + 2}`;

      const jsonFields = new Set([
        'automod_config',
        'ticket_config',
        'music_config',
        'roles_config',
        'feature_toggles',
      ]);

      setClauses.push(
        `${key} = ${jsonFields.has(key) ? `${parameter}::jsonb` : parameter}`,
      );

      values.push(
        jsonFields.has(key) && typeof value !== 'string'
          ? JSON.stringify(value)
          : value,
      );
    });

    setClauses.push('updated_at = now()');

    await db.query(
      `
      UPDATE guild_settings
      SET ${setClauses.join(', ')}
      WHERE guild_id = $1
      `,
      values,
    );
  } catch (e) {
    logger.error('db', 'updateGuildSettings failed', {
      error: (e as Error).message,
    });

    throw new DatabaseError((e as Error).message);
  }
}
