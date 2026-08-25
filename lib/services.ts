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
  command_overrides?: Record<string, unknown>;
  welcome_image?: string | null;
  leave_image?: string | null;
  starboard_enabled?: boolean;
  starboard_channel_id?: string | null;
  starboard_limit?: number;
  suggestions_enabled?: boolean;
  suggestions_channel_id?: string | null;
  leveling_enabled?: boolean;
  leveling_config?: Record<string, unknown>;
  economy_enabled?: boolean;
  economy_config?: Record<string, unknown>;
  giveaway_config?: Record<string, unknown>;
  voice_config?: Record<string, unknown>;
  verification_enabled?: boolean;
  verification_config?: Record<string, unknown>;
  quarantine_role_id?: string | null;
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

/* ─────────────────────────────────────────────
 * Audit Logs
 * ───────────────────────────────────────────── */

export async function createAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const db = await getDb();

    await db.query(
      `
      INSERT INTO audit_logs (
        actor_id,
        actor_name,
        action,
        target,
        guild_id,
        result,
        metadata,
        ip_address,
        user_agent
      )
      VALUES ($1::uuid, $2, $3, $4, $5::uuid, $6, $7::jsonb, $8, $9)
      `,
      [
        entry.actor_id ?? null,
        entry.actor_name ?? null,
        entry.action,
        entry.target ?? null,
        entry.guild_id ?? null,
        entry.result ?? 'success',
        JSON.stringify(entry.metadata ?? {}),
        entry.ip_address ?? null,
        entry.user_agent ?? null,
      ],
    );
  } catch (e) {
    logger.error('db', 'createAuditLog failed', {
      error: (e as Error).message,
    });
  }
}

export async function getAuditLogs(
  limit: number = 50,
  offset: number = 0,
): Promise<Array<Record<string, unknown>>> {
  try {
    const db = await getDb();

    const result = await db.query<Record<string, unknown>>(
      `
      SELECT *
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    );

    return result.rows;
  } catch (e) {
    logger.error('db', 'getAuditLogs failed', {
      error: (e as Error).message,
    });

    return [];
  }
}

/* ─────────────────────────────────────────────
 * Appearance Settings
 * ───────────────────────────────────────────── */

export async function getAppearanceSettings(): Promise<Record<string, unknown> | null> {
  try {
    const db = await getDb();

    const result = await db.query<Record<string, unknown>>(
      'SELECT * FROM appearance_settings ORDER BY id LIMIT 1',
    );

    return result.rows[0] ?? null;
  } catch (e) {
    logger.error('db', 'getAppearanceSettings failed', {
      error: (e as Error).message,
    });

    return null;
  }
}

const APPEARANCE_FIELDS = [
  'brand_name',
  'primary_color',
  'secondary_color',
  'accent_color',
  'background_color',
  'surface_color',
  'text_color',
  'border_color',
  'border_radius',
  'theme_mode',
] as const;

export async function updateAppearanceSettings(
  settings: Record<string, unknown>,
): Promise<boolean> {
  const entries = Object.entries(settings).filter(([key, value]) =>
    (APPEARANCE_FIELDS as readonly string[]).includes(key) && value !== undefined,
  );

  if (entries.length === 0) {
    return true;
  }

  try {
    const db = await getDb();

    const setClauses: string[] = [];
    const values: unknown[] = [];

    entries.forEach(([key, value], index) => {
      setClauses.push(`${key} = $${index + 1}`);
      values.push(value);
    });

    setClauses.push('updated_at = now()');

    await db.query(
      `
      UPDATE appearance_settings
      SET ${setClauses.join(', ')}
      WHERE id = (SELECT id FROM appearance_settings ORDER BY id LIMIT 1)
      `,
      values,
    );

    return true;
  } catch (e) {
    logger.error('db', 'updateAppearanceSettings failed', {
      error: (e as Error).message,
    });

    return false;
  }
}


/* ─────────────────────────────────────────────
 * Bot Configuration / Status
 * ───────────────────────────────────────────── */

export async function getBotConfiguration(
  adminToken: string,
): Promise<Record<string, unknown> | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;

  try {
    const db = await getDb();

    const result = await db.query<Record<string, unknown>>(
      'SELECT * FROM bot_configuration ORDER BY id LIMIT 1',
    );

    return result.rows[0] ?? null;
  } catch (e) {
    logger.error('db', 'getBotConfiguration failed', {
      error: (e as Error).message,
    });

    return null;
  }
}

const BOT_CONFIG_FIELDS = ['status', 'activity_type', 'activity_name'] as const;

export async function updateBotConfiguration(
  adminToken: string,
  settings: Record<string, unknown>,
): Promise<boolean> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return false;

  const entries = Object.entries(settings).filter(([key, value]) =>
    (BOT_CONFIG_FIELDS as readonly string[]).includes(key) && value !== undefined,
  );

  if (entries.length === 0) {
    return true;
  }

  try {
    const db = await getDb();

    const setClauses: string[] = [];
    const values: unknown[] = [];

    entries.forEach(([key, value], index) => {
      setClauses.push(`${key} = $${index + 1}`);
      values.push(value === null ? null : value);
    });

    setClauses.push('updated_at = now()');

    await db.query(
      `
      UPDATE bot_configuration
      SET ${setClauses.join(', ')}
      WHERE id = (SELECT id FROM bot_configuration ORDER BY id LIMIT 1)
      `,
      values,
    );

    return true;
  } catch (e) {
    logger.error('db', 'updateBotConfiguration failed', {
      error: (e as Error).message,
    });

    return false;
  }
}

/* ─────────────────────────────────────────────
 * Bot Presence (safe persistence)
 *
 * The presence configuration is stored WITHOUT any secret material. The
 * Discord bot token is never persisted; the presence stored here is only
 * used to restore the real bot's activity/status after a restart.
 * ───────────────────────────────────────────── */

const BOT_PRESENCE_KEY = 'bot_presence';

export interface StoredBotPresence {
  status: 'online' | 'idle' | 'dnd' | 'invisible';
  activity: {
    type: 'playing' | 'streaming' | 'listening' | 'watching' | 'competing';
    name: string;
    url: string | null;
  };
}

export async function getStoredBotPresence(
  adminToken: string,
): Promise<StoredBotPresence | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;

  try {
    const db = await getDb();
    const result = await db.query<{ value: unknown }>(
      `SELECT value FROM platform_settings WHERE key = $1`,
      [BOT_PRESENCE_KEY],
    );
    const row = result.rows[0];
    if (!row || typeof row.value !== 'object' || row.value === null) {
      return null;
    }
    const value = row.value as Record<string, unknown>;
    if (
      typeof value.status === 'string' &&
      typeof value.activity === 'object' &&
      value.activity !== null
    ) {
      const activity = value.activity as Record<string, unknown>;
      return {
        status: value.status as StoredBotPresence['status'],
        activity: {
          type: activity.type as StoredBotPresence['activity']['type'],
          name: String(activity.name ?? ''),
          url: typeof activity.url === 'string' ? activity.url : null,
        },
      };
    }
    return null;
  } catch (e) {
    logger.error('db', 'getStoredBotPresence failed', {
      error: (e as Error).message,
    });
    return null;
  }
}

export async function storeBotPresence(
  adminToken: string,
  presence: StoredBotPresence,
): Promise<boolean> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return false;

  try {
    const db = await getDb();
    await db.query(
      `
      INSERT INTO platform_settings (key, value, updated_at)
      VALUES ($1, $2::jsonb, now())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `,
      [BOT_PRESENCE_KEY, JSON.stringify(presence)],
    );
    return true;
  } catch (e) {
    logger.error('db', 'storeBotPresence failed', {
      error: (e as Error).message,
    });
    return false;
  }
}

/**
 * Reads the stored presence without requiring an admin session - used on bot
 * startup to restore the last applied presence. Returns safe data only.
 */
export async function loadStoredBotPresence(): Promise<StoredBotPresence | null> {
  try {
    const db = await getDb();
    const result = await db.query<{ value: unknown }>(
      `SELECT value FROM platform_settings WHERE key = $1`,
      [BOT_PRESENCE_KEY],
    );
    const row = result.rows[0];
    if (!row || typeof row.value !== 'object' || row.value === null) {
      return null;
    }
    const value = row.value as Record<string, unknown>;
    if (
      typeof value.status === 'string' &&
      typeof value.activity === 'object' &&
      value.activity !== null
    ) {
      const activity = value.activity as Record<string, unknown>;
      return {
        status: value.status as StoredBotPresence['status'],
        activity: {
          type: activity.type as StoredBotPresence['activity']['type'],
          name: String(activity.name ?? ''),
          url: typeof activity.url === 'string' ? activity.url : null,
        },
      };
    }
    return null;
  } catch (e) {
    logger.error('db', 'loadStoredBotPresence failed', {
      error: (e as Error).message,
    });
    return null;
  }
}

export async function issueBotCommand(
  adminToken: string,
  command: string,
  payload: Record<string, unknown>,
): Promise<string | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;

  if (!command || !['start', 'stop', 'restart'].includes(command)) {
    return null;
  }

  try {
    const db = await getDb();

    const result = await db.query<{ id: string }>(
      `
      INSERT INTO bot_commands (command, payload, status)
      VALUES ($1, $2::jsonb, 'pending')
      RETURNING id::text AS id
      `,
      [command, JSON.stringify(payload ?? {})],
    );

    return result.rows[0]?.id ?? null;
  } catch (e) {
    logger.error('db', 'issueBotCommand failed', {
      error: (e as Error).message,
    });

    return null;
  }
}

export async function getBotStatus(): Promise<Record<string, unknown> | null> {
  try {
    const db = await getDb();

    const result = await db.query<Record<string, unknown>>(
      `
      SELECT
        bs.state,
        bs.uptime_seconds,
        bs.gateway_latency_ms,
        bs.connected_guilds,
        bs.total_users,
        bs.cpu_percent,
        bs.memory_mb,
        bs.node_version,
        bs.last_heartbeat,
        bs.last_error,
        bc.token_configured,
        bc.activity_type,
        bc.activity_name,
        bc.last_started_at,
        bc.last_stopped_at,
        bc.last_crash_at
      FROM bot_status bs
      CROSS JOIN bot_configuration bc
      ORDER BY bs.id LIMIT 1
      `,
    );

    return result.rows[0] ?? null;
  } catch (e) {
    logger.error('db', 'getBotStatus failed', {
      error: (e as Error).message,
    });

    return null;
  }
}


/* ─────────────────────────────────────────────
 * Admin: Users, Guilds, Platform Stats
 * ───────────────────────────────────────────── */

export async function getAllUsers(
  adminToken: string,
): Promise<Array<Record<string, unknown>> | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;

  try {
    const db = await getDb();

    const result = await db.query<Record<string, unknown>>(
      `
      SELECT id::text AS id, discord_id, username, display_name, avatar,
             is_platform_owner, last_login_at, created_at
      FROM users
      ORDER BY created_at DESC
      `,
    );

    return result.rows;
  } catch (e) {
    logger.error('db', 'getAllUsers failed', {
      error: (e as Error).message,
    });

    return null;
  }
}

export async function getAllGuilds(
  adminToken: string,
): Promise<Array<Record<string, unknown>> | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;

  try {
    const db = await getDb();

    const result = await db.query<Record<string, unknown>>(
      `
      SELECT
        id::text AS id,
        discord_id,
        name,
        icon,
        member_count,
        bot_added_at,
        created_at,
        (SELECT count(*) FROM guild_memberships gm WHERE gm.guild_id = guilds.id) AS owner_count
      FROM guilds
      ORDER BY created_at DESC
      `,
    );

    return result.rows;
  } catch (e) {
    logger.error('db', 'getAllGuilds failed', {
      error: (e as Error).message,
    });

    return null;
  }
}

export async function getPlatformStats(
  adminToken: string,
): Promise<Record<string, unknown> | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;

  try {
    const db = await getDb();

    const count = async (table: string): Promise<number> => {
      const res = await db.query<{ cnt: string | number }>(
        `SELECT count(*) AS cnt FROM ${table}`,
      );
      return Number(res.rows[0]?.cnt ?? 0);
    };

    const [users, guilds, activeSessions, tickets, moderationCases, auditLogs] =
      await Promise.all([
        count('users'),
        count('guilds'),
        count('sessions'),
        count('tickets'),
        count('moderation_cases'),
        count('audit_logs'),
      ]);

    return {
      users,
      guilds,
      active_sessions: activeSessions,
      tickets,
      moderation_cases: moderationCases,
      audit_logs: auditLogs,
    };
  } catch (e) {
    logger.error('db', 'getPlatformStats failed', {
      error: (e as Error).message,
    });

    return null;
  }
}

/* ─────────────────────────────────────────────
 * Platform Settings (key-value)
 * ───────────────────────────────────────────── */

export async function getPlatformSettings(): Promise<Record<string, unknown>> {
  try {
    const db = await getDb();

    const result = await db.query<{ key: string; value: unknown }>(
      'SELECT key, value FROM platform_settings',
    );

    const settings: Record<string, unknown> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }

    return settings;
  } catch (e) {
    logger.error('db', 'getPlatformSettings failed', {
      error: (e as Error).message,
    });

    return {};
  }
}

export async function setPlatformSettings(
  settings: Record<string, unknown>,
): Promise<void> {
  try {
    const db = await getDb();

    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        `
        INSERT INTO platform_settings (key, value)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = now()
        `,
        [key, JSON.stringify(value)],
      );
    }
  } catch (e) {
    logger.error('db', 'setPlatformSettings failed', {
      error: (e as Error).message,
    });

    throw new DatabaseError((e as Error).message);
  }
}


/* ─────────────────────────────────────────────
 * Automations
 * ───────────────────────────────────────────── */

export async function getAutomations(
  guildId: string,
): Promise<Array<Record<string, unknown>>> {
  try {
    const db = await getDb();

    const result = await db.query<Record<string, unknown>>(
      `
      SELECT id::text AS id, name, trigger, conditions, actions, enabled, created_at
      FROM automations
      WHERE guild_id = $1
      ORDER BY created_at DESC
      `,
      [guildId],
    );

    return result.rows;
  } catch (e) {
    logger.error('db', 'getAutomations failed', {
      error: (e as Error).message,
    });

    return [];
  }
}

export async function createAutomation(
  guildId: string,
  name: string,
  trigger: string,
  conditions: unknown[],
  actions: unknown[],
): Promise<string | null> {
  try {
    const db = await getDb();

    const result = await db.query<{ id: string }>(
      `
      INSERT INTO automations (guild_id, name, trigger, conditions, actions)
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
      RETURNING id::text AS id
      `,
      [guildId, name, trigger, JSON.stringify(conditions ?? []), JSON.stringify(actions ?? [])],
    );

    return result.rows[0]?.id ?? null;
  } catch (e) {
    logger.error('db', 'createAutomation failed', {
      error: (e as Error).message,
    });

    return null;
  }
}

export async function deleteAutomation(
  guildId: string,
  automationId: string,
): Promise<boolean> {
  try {
    const db = await getDb();

    const result = await db.query<{ id: string }>(
      `
      DELETE FROM automations
      WHERE id = $1 AND guild_id = $2
      RETURNING id
      `,
      [automationId, guildId],
    );

    return result.rows.length > 0;
  } catch (e) {
    logger.error('db', 'deleteAutomation failed', {
      error: (e as Error).message,
    });

    return false;
  }
}

export async function toggleAutomation(
  guildId: string,
  automationId: string,
  enabled: boolean,
): Promise<boolean> {
  try {
    const db = await getDb();

    const result = await db.query<{ id: string }>(
      `
      UPDATE automations
      SET enabled = $3, updated_at = now()
      WHERE id = $1 AND guild_id = $2
      RETURNING id
      `,
      [automationId, guildId, enabled],
    );

    return result.rows.length > 0;
  } catch (e) {
    logger.error('db', 'toggleAutomation failed', {
      error: (e as Error).message,
    });

    return false;
  }
}

/* ─────────────────────────────────────────────
 * Moderation + Tickets
 * ───────────────────────────────────────────── */

export async function getModerationCases(
  guildId: string,
): Promise<Array<Record<string, unknown>>> {
  try {
    const db = await getDb();

    const result = await db.query<Record<string, unknown>>(
      `
      SELECT id::text AS id, case_number, action, target_id, target_name,
             moderator_id, moderator_name, reason, duration, created_at
      FROM moderation_cases
      WHERE guild_id = $1
      ORDER BY created_at DESC
      `,
      [guildId],
    );

    return result.rows;
  } catch (e) {
    logger.error('db', 'getModerationCases failed', {
      error: (e as Error).message,
    });

    return [];
  }
}

export async function getTickets(
  guildId: string,
): Promise<Array<Record<string, unknown>>> {
  try {
    const db = await getDb();

    const result = await db.query<Record<string, unknown>>(
      `
      SELECT id::text AS id, channel_id, user_id, user_name, status,
             category, assigned_to, created_at, closed_at
      FROM tickets
      WHERE guild_id = $1
      ORDER BY created_at DESC
      `,
      [guildId],
    );

    return result.rows;
  } catch (e) {
    logger.error('db', 'getTickets failed', {
      error: (e as Error).message,
    });

    return [];
  }
}


/* ─────────────────────────────────────────────
 * Command settings (global portal-level) + overrides
 * ───────────────────────────────────────────── */

const GLOBAL_COMMAND_KEY_PREFIX = 'command_settings:';

/** Reads the global (portal-level) settings object for one command. */
export async function getGlobalCommandSettings(
  name: string,
): Promise<Record<string, unknown>> {
  try {
    const db = await getDb();
    const result = await db.query<{ value: unknown }>(
      'SELECT value FROM platform_settings WHERE key = $1',
      [`${GLOBAL_COMMAND_KEY_PREFIX}${name}`],
    );
    const row = result.rows[0];
    if (row && typeof row.value === 'object' && row.value !== null) {
      return row.value as Record<string, unknown>;
    }
    return {};
  } catch (e) {
    logger.error('db', 'getGlobalCommandSettings failed', { error: (e as Error).message });
    return {};
  }
}

export async function setGlobalCommandSettings(
  name: string,
  settings: Record<string, unknown>,
): Promise<boolean> {
  try {
    const db = await getDb();
    await db.query(
      `INSERT INTO platform_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [`${GLOBAL_COMMAND_KEY_PREFIX}${name}`, JSON.stringify(settings)],
    );
    return true;
  } catch (e) {
    logger.error('db', 'setGlobalCommandSettings failed', { error: (e as Error).message });
    return false;
  }
}

export async function deleteGlobalCommandSettings(name: string): Promise<boolean> {
  try {
    const db = await getDb();
    await db.query('DELETE FROM platform_settings WHERE key = $1', [`${GLOBAL_COMMAND_KEY_PREFIX}${name}`]);
    return true;
  } catch (e) {
    logger.error('db', 'deleteGlobalCommandSettings failed', { error: (e as Error).message });
    return false;
  }
}

export async function getGuildCommandOverrides(
  discordGuildId: string,
  name: string,
): Promise<Record<string, unknown>> {
  try {
    const db = await getDb();
    const result = await db.query<{ overrides: unknown }>(
      `SELECT gs.command_overrides AS overrides
       FROM guilds g
       JOIN guild_settings gs ON gs.guild_id = g.id
       WHERE g.discord_id = $1
       LIMIT 1`,
      [discordGuildId],
    );
    const row = result.rows[0];
    if (!row) return {};
    const overrides = (row.overrides ?? {}) as Record<string, unknown>;
    const specific = overrides[name];
    return (typeof specific === 'object' && specific !== null ? specific : {}) as Record<string, unknown>;
  } catch (e) {
    logger.error('db', 'getGuildCommandOverrides failed', { error: (e as Error).message });
    return {};
  }
}

export async function setGuildCommandOverride(
  discordGuildId: string,
  name: string,
  settings: Record<string, unknown>,
): Promise<boolean> {
  try {
    const db = await getDb();
    await db.query(
      `UPDATE guild_settings gs
       SET command_overrides = jsonb_set(
         COALESCE(gs.command_overrides, '{}'::jsonb),
         $3,
         $4::jsonb,
         true
       ), updated_at = now()
       FROM guilds g
       WHERE g.discord_id = $1 AND gs.guild_id = g.id`,
      [discordGuildId, name, `{${name}}`, JSON.stringify(settings)],
    );
    return true;
  } catch (e) {
    logger.error('db', 'setGuildCommandOverride failed', { error: (e as Error).message });
    return false;
  }
}

/* ─────────────────────────────────────────────
 * Guild resolution helper (discord -> uuid)
 * ───────────────────────────────────────────── */

export async function getGuildDbIdByDiscordId(discordGuildId: string): Promise<string | null> {
  try {
    const db = await getDb();
    const result = await db.query<{ id: string }>(
      'SELECT id::text AS id FROM guilds WHERE discord_id = $1 LIMIT 1',
      [discordGuildId],
    );
    return result.rows[0]?.id ?? null;
  } catch (e) {
    logger.error('db', 'getGuildDbIdByDiscordId failed', { error: (e as Error).message });
    return null;
  }
}

/* ─────────────────────────────────────────────
 * Analytics: command usage
 * ───────────────────────────────────────────── */

export async function recordCommandUsage({
  commandName,
  category,
  discordGuildId,
  userId,
  success,
  latencyMs,
}: {
  commandName: string;
  category?: string;
  discordGuildId?: string | null;
  userId?: string | null;
  success?: boolean;
  latencyMs?: number;
}): Promise<void> {
  try {
    const db = await getDb();
    let guildUuid: string | null = null;
    if (discordGuildId) {
      const g = await db.query<{ id: string }>(
        'SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1',
        [discordGuildId],
      );
      guildUuid = g.rows[0]?.id ?? null;
    }
    await db.query(
      `INSERT INTO command_usage (guild_id, command, category, user_id, success, latency_ms)
       VALUES ($1::uuid, $2, $3, $4, $5, $6)`,
      [guildUuid, commandName, category ?? null, userId ?? null, success ?? true, latencyMs ?? null],
    );
  } catch (e) {
    logger.error('db', 'recordCommandUsage failed', { error: (e as Error).message });
  }
}

export async function getCommandUsageStats(): Promise<{
  mostUsed: Array<Record<string, unknown>>;
  errors: Array<Record<string, unknown>>;
  totals: Record<string, number>;
}> {
  try {
    const db = await getDb();
    const [mostUsed, errorsRes, totalsRes] = await Promise.all([
      db.query<Record<string, unknown>>(`
        SELECT command, category, count(*) AS uses,
               count(*) FILTER (WHERE success = true) AS ok
        FROM command_usage
        GROUP BY command, category
        ORDER BY uses DESC
        LIMIT 30`),
      db.query<Record<string, unknown>>(`
        SELECT command, count(*) AS failures
        FROM command_usage
        WHERE success = false
        GROUP BY command
        ORDER BY failures DESC
        LIMIT 20`),
      db.query<Record<string, unknown>>(`
        SELECT
          count(*) AS total,
          count(DISTINCT command) AS commands,
          count(*) FILTER (WHERE success = true) AS ok,
          count(*) FILTER (WHERE success = false) AS failed
        FROM command_usage`),
    ]);

    return {
      mostUsed: mostUsed.rows,
      errors: errorsRes.rows,
      totals: normalizeCounts(totalsRes.rows[0] ?? {}),
    };
  } catch (e) {
    logger.error('db', 'getCommandUsage failed', { error: (e as Error).message });
    return { mostUsed: [], errors: [], totals: { total: 0 } };
  }
}

function normalizeCounts(row: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = Number(v ?? 0);
  }
  return out;
}

/* ─────────────────────────────────────────────
 * Moderation cases + warnings
 * ───────────────────────────────────────────── */

export async function createModerationCase({
  discordGuildId,
  action,
  targetId,
  targetName,
  moderatorId,
  moderatorName,
  reason,
  duration,
}: {
  discordGuildId: string;
  action: string;
  targetId: string;
  targetName: string | null;
  moderatorId: string;
  moderatorName: string | null;
  reason?: string | null;
  duration?: string | null;
}): Promise<boolean> {
  try {
    const db = await getDb();
    const guild = await db.query<{ id: string }>(
      'SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1',
      [discordGuildId],
    );
    if (!guild.rows[0]) return false;

    await db.query(
      `INSERT INTO moderation_cases (
        guild_id, action, target_id, target_name,
        moderator_id, moderator_name, reason, duration
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        guild.rows[0].id,
        action,
        targetId,
        targetName ?? null,
        moderatorId,
        moderatorName ?? null,
        reason ?? null,
        duration ?? null,
      ],
    );
    return true;
  } catch (e) {
    logger.error('db', 'createModerationCase failed', { error: (e as Error).message });
    return false;
  }
}

export async function getWarningsForUser(
  discordGuildId: string,
  targetUserId: string,
): Promise<Array<Record<string, unknown>>> {
  try {
    const db = await getDb();
    const result = await db.query<Record<string, unknown>>(
      `SELECT id::text AS id, action, target_id, target_name, moderator_name, reason, duration, created_at
       FROM moderation_cases
       WHERE guild_id = (SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1)
         AND action = 'warn' AND target_id = $2
       ORDER BY created_at DESC`,
      [discordGuildId, targetUserId],
    );
    return result.rows;
  } catch (e) {
    logger.error('db', 'getWarningsForUser failed', { error: (e as Error).message });
    return [];
  }
}

export async function clearWarningsForUser(discordGuildId: string, targetUserId: string): Promise<number> {
  try {
    const db = await getDb();
    const result = await db.query(
      `DELETE FROM moderation_cases
       WHERE guild_id = (SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1)
         AND action = 'warn' AND target_id = $2`,
      [discordGuildId, targetUserId],
    );
    return result.affectedRows ?? 0;
  } catch (e) {
    logger.error('db', 'clearWarningsForUser failed', { error: (e as Error).message });
    return 0;
  }
}
/* ─────────────────────────────────────────────
 * Giveaways
 * ───────────────────────────────────────────── */

export async function createGiveaway({
  discordGuildId,
  channelId,
  messageId,
  prize,
  winners,
  endsAtIso,
  hostId,
}: {
  discordGuildId: string;
  channelId: string | null;
  messageId: string | null;
  prize: string;
  winners: number;
  endsAtIso: string;
  hostId: string | null;
}): Promise<string | null> {
  try {
    const db = await getDb();
    const guild = await db.query<{ id: string }>(
      'SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1',
      [discordGuildId],
    );
    if (!guild.rows[0]) return null;
    const result = await db.query<{ id: string }>(
      `INSERT INTO giveaways (guild_id, channel_id, message_id, prize, winners, ends_at, host_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id::text AS id`,
      [guild.rows[0].id, channelId, messageId, prize, winners, new Date(endsAtIso), hostId],
    );
    return result.rows[0]?.id ?? null;
  } catch (e) {
    logger.error('db', 'createGiveaway failed', { error: (e as Error).message });
    return null;
  }
}

export async function toggleGiveawayEntry(
  giveawayDbId: string,
  discordUserId: string,
): Promise<{ joined: boolean }> {
  try {
    const db = await getDb();
    const result = await db.query<{ winner_ids: unknown; ended: boolean }>(
      'SELECT winner_ids, ended FROM giveaways WHERE id = $1::uuid LIMIT 1',
      [giveawayDbId],
    );
    const row = result.rows[0];
    if (!row || row.ended) return { joined: false };

    const winners = (row.winner_ids ?? []) as unknown[];
    const set = new Set<string>(winners.map(String));
    const joined = !set.has(discordUserId);
    if (joined) { set.add(discordUserId); } else { set.delete(discordUserId); }

    await db.query(
      'UPDATE giveaways SET winner_ids = $2::jsonb WHERE id = $1::uuid',
      [giveawayDbId, JSON.stringify(Array.from(set))],
    );
    return { joined };
  } catch (e) {
    logger.error('db', 'toggleGiveawayEntry failed', { error: (e as Error).message });
    return { joined: false };
  }
}

/* ─────────────────────────────────────────────
 * Tickets
 * ───────────────────────────────────────────── */

export async function createTicket({
  discordGuildId,
  channelId,
  userId,
  userName,
}: {
  discordGuildId: string;
  channelId: string;
  userId: string;
  userName: string;
}): Promise<boolean> {
  try {
    const db = await getDb();
    const guild = await db.query<{ id: string }>(
      'SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1',
      [discordGuildId],
    );
    if (!guild.rows[0]) return false;

    // Prevent duplicate open tickets for the same user in the same guild.
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM tickets
       WHERE guild_id = $1 AND user_id = $2 AND status = 'open'
       LIMIT 1`,
      [guild.rows[0].id, userId],
    );
    if (existing.rows[0]) return false;

    await db.query(
      `INSERT INTO tickets (guild_id, channel_id, user_id, user_name, status)
       VALUES ($1, $2, $3, $4, 'open')`,
      [guild.rows[0].id, channelId, userId, userName],
    );
    return true;
  } catch (e) {
    logger.error('db', 'createTicket failed', { error: (e as Error).message });
    return false;
  }
}

/* ─────────────────────────────────────────────
 * Auto roles
 * ───────────────────────────────────────────── */

export async function getAutoroles(discordGuildId: string): Promise<Array<Record<string, unknown>>> {
  try {
    const db = await getDb();
    const guild = await db.query<{ id: string }>(
      'SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1',
      [discordGuildId],
    );
    if (!guild.rows[0]) return [];
    const result = await db.query<Record<string, unknown>>(
      'SELECT id::text AS id, role_id FROM autoroles WHERE guild_id = $1 ORDER BY created_at',
      [guild.rows[0].id],
    );
    return result.rows;
  } catch (e) {
    logger.error('db', 'getAutoroles failed', { error: (e as Error).message });
    return [];
  }
}

export async function addAutorole(discordGuildId: string, roleId: string): Promise<boolean> {
  try {
    const db = await getDb();
    const guild = await db.query<{ id: string }>(
      'SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1',
      [discordGuildId],
    );
    if (!guild.rows[0]) return false;
    await db.query(
      'INSERT INTO autoroles (guild_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [guild.rows[0].id, roleId],
    );
    return true;
  } catch (e) {
    logger.error('db', 'addAutorole failed', { error: (e as Error).message });
    return false;
  }
}

export async function removeAutorole(discordGuildId: string, roleId: string): Promise<boolean> {
  try {
    const db = await getDb();
    const guild = await db.query<{ id: string }>(
      'SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1',
      [discordGuildId],
    );
    if (!guild.rows[0]) return false;
    await db.query('DELETE FROM autoroles WHERE guild_id = $1 AND role_id = $2', [guild.rows[0].id, roleId]);
    return true;
  } catch (e) {
    logger.error('db', 'removeAutorole failed', { error: (e as Error).message });
    return false;
  }
}

/* ─────────────────────────────────────────────
 * Leveling
 * ───────────────────────────────────────────── */

export async function addXpForMessage({
  discordGuildId,
  discordUserId,
  xp,
}: {
  discordGuildId: string;
  discordUserId: string;
  xp: number;
}): Promise<{ leveledUp: boolean; newLevel: number | null } | null> {
  try {
    const db = await getDb();
    const guild = await db.query<{ id: string }>(
      'SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1',
      [discordGuildId],
    );
    if (!guild.rows[0]) return null;

    const result = await db.query<{ xp: string | number; level: string | number }>(
      `INSERT INTO leveling (guild_id, user_id, xp, level, last_message_at)
       VALUES ($1, $2, $3, 1, now())
       ON CONFLICT (guild_id, user_id)
       DO UPDATE SET
         xp = leveling.xp + EXCLUDED.xp,
         last_message_at = now()
       RETURNING xp, level`,
      [guild.rows[0].id, discordUserId, xp],
    );

    const totalXp = Number(result.rows[0]?.xp ?? 0);
    const newLevel = Math.floor(Math.sqrt(totalXp / 50)) + 1;
    const oldLevel = Number(result.rows[0]?.level ?? 1);

    if (newLevel > oldLevel) {
      await db.query(
        'UPDATE leveling SET level = $3 WHERE guild_id = $1 AND user_id = $2',
        [guild.rows[0].id, discordUserId, newLevel],
      );
      return { leveledUp: true, newLevel };
    }
    return { leveledUp: false, newLevel: null };
  } catch (e) {
    logger.error('db', 'addXpForMessage failed', { error: (e as Error).message });
    return null;
  }
}

export async function getLevel(discordGuildId: string, discordUserId: string): Promise<{
  xp: number;
  level: number;
  rank: number;
} | null> {
  try {
    const db = await getDb();
    const guild = await db.query<{ id: string }>(
      'SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1',
      [discordGuildId],
    );
    if (!guild.rows[0]) return null;

    const result = await db.query<{ xp: string | number; level: string | number; rank: string | number }>(
      `SELECT xp, level,
        (
          SELECT count(*) + 1 FROM leveling l2
          WHERE l2.guild_id = leveling.guild_id AND l2.xp > leveling.xp
        ) AS rank
       FROM leveling
       WHERE guild_id = $1 AND user_id = $2
       LIMIT 1`,
      [guild.rows[0].id, discordUserId],
    );

    const row = result.rows[0];
    if (!row) return { xp: 0, level: 1, rank: 0 };
    return { xp: Number(row.xp), level: Number(row.level), rank: Number(row.rank) };
  } catch (e) {
    logger.error('db', 'getLevel failed', { error: (e as Error).message });
    return null;
  }
}

export async function getLeaderboard(discordGuildId: string, limit: number = 10): Promise<Array<Record<string, unknown>>> {
  try {
    const db = await getDb();
    const guild = await db.query<{ id: string }>(
      'SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1',
      [discordGuildId],
    );
    if (!guild.rows[0]) return [];
    const result = await db.query<Record<string, unknown>>(
      'SELECT user_id, xp, level FROM leveling WHERE guild_id = $1 ORDER BY xp DESC LIMIT $2',
      [guild.rows[0].id, limit],
    );
    return result.rows;
  } catch (e) {
    logger.error('db', 'getLeaderboard failed', { error: (e as Error).message });
    return [];
  }
}
/* ─────────────────────────────────────────────
 * Economy (per-guild coin ledger) persisted in guild_settings.economy_config.
 * ───────────────────────────────────────────── */

export interface EconomyState {
  enabled: boolean;
  coins: Record<string, number>;
  lastDaily: Record<string, string>;
  bank: Record<string, number>;
}

const EMPTY_ECONOMY: EconomyState = { enabled: false, coins: {}, lastDaily: {}, bank: {} };

export async function getEconomyState(discordGuildId: string): Promise<EconomyState> {
  try {
    const db = await getDb();
    const result = await db.query<{ config: unknown }>(
      `SELECT gs.economy_config AS config
       FROM guilds g JOIN guild_settings gs ON gs.guild_id = g.id
       WHERE g.discord_id = $1 LIMIT 1`,
      [discordGuildId],
    );
    const raw = result.rows[0]?.config;
    if (typeof raw === 'object' && raw !== null) {
      const r = raw as Record<string, unknown>;
      return {
        enabled: r.enabled === true,
        coins: (r.coins as Record<string, number>) ?? {},
        lastDaily: (r.lastDaily as Record<string, string>) ?? {},
        bank: (r.bank as Record<string, number>) ?? {},
      };
    }
    return { ...EMPTY_ECONOMY };
  } catch (e) {
    logger.error('db', 'getEconomyState failed', { error: (e as Error).message });
    return { ...EMPTY_ECONOMY };
  }
}

export async function setEconomyState(discordGuildId: string, state: EconomyState): Promise<boolean> {
  try {
    const db = await getDb();
    const result = await db.query(
      `UPDATE guild_settings gs
       SET economy_config = $2::jsonb, updated_at = now()
       FROM guilds g WHERE g.discord_id = $1 AND gs.guild_id = g.id`,
      [discordGuildId, JSON.stringify(state)],
    );
    return (result.affectedRows ?? 0) > 0;
  } catch (e) {
    logger.error('db', 'setEconomyState failed', { error: (e as Error).message });
    return false;
  }
}

export async function coinsOf(discordGuildId: string, userId: string): Promise<number> {
  const state = await getEconomyState(discordGuildId);
  return state.coins[userId] ?? 0;
}

export async function addCoins(discordGuildId: string, userId: string, amount: number): Promise<number> {
  const state = await getEconomyState(discordGuildId);
  const current = state.coins[userId] ?? 0;
  state.coins[userId] = Math.max(0, current + Math.max(0, Math.floor(amount)));
  await setEconomyState(discordGuildId, state);
  return state.coins[userId];
}

export async function deductCoins(discordGuildId: string, userId: string, amount: number): Promise<boolean> {
  const state = await getEconomyState(discordGuildId);
  const current = state.coins[userId] ?? 0;
  const deduct = Math.max(0, Math.floor(amount));
  if (current < deduct) return false;
  const next = current - deduct;
  if (next <= 0) delete state.coins[userId];
  else state.coins[userId] = next;
  await setEconomyState(discordGuildId, state);
  return true;
}

export async function transferCoins(
  discordGuildId: string,
  fromId: string,
  toId: string,
  amount: number,
): Promise<boolean> {
  if (fromId === toId) return false;
  const ok = await deductCoins(discordGuildId, fromId, amount);
  if (!ok) return false;
  await addCoins(discordGuildId, toId, amount);
  return true;
}

/* ─────────────────────────────────────────────
 * Custom commands
 * ───────────────────────────────────────────── */

export async function getCustomCommandByName(
  guildDbId: string,
  name: string,
): Promise<Record<string, unknown> | null> {
  try {
    const db = await getDb();
    const result = await db.query<Record<string, unknown>>(
      `SELECT id::text AS id, name, response, embed, cooldown_seconds, allowed_roles, enabled
       FROM custom_commands
       WHERE guild_id = $1 AND enabled = true AND (name = $2 OR $2 = ANY(aliases::text[]))
       LIMIT 1`,
      [guildDbId, name.toLowerCase()],
    );
    return result.rows[0] ?? null;
  } catch (e) {
    logger.error('db', 'getCustomCommandByName failed', { error: (e as Error).message });
    return null;
  }
}

export async function listCustomCommands(guildDbId: string): Promise<Array<Record<string, unknown>>> {
  try {
    const db = await getDb();
    const result = await db.query<Record<string, unknown>>(
      `SELECT id::text AS id, name, aliases, response, cooldown_seconds, allowed_roles, enabled, updated_at
       FROM custom_commands
       WHERE guild_id = $1
       ORDER BY name`,
      [guildDbId],
    );
    return result.rows;
  } catch (e) {
    logger.error('db', 'listCustomCommands failed', { error: (e as Error).message });
    return [];
  }
}
