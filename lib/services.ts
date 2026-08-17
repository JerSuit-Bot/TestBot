import { getDb, generateToken } from '@/lib/db';
import { DatabaseError, NotFoundError, PermissionError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { canManageGuild } from '@/lib/constants';

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

// ─── Users ───

export async function upsertUserFromDiscord(
  discordId: string,
  username: string,
  displayName: string | null,
  avatar: string | null,
): Promise<string> {
  const db = await getDb();
  const platformOwnerId = process.env.PLATFORM_OWNER_DISCORD_ID;
  const isOwner = platformOwnerId ? discordId === platformOwnerId : false;

  try {
    const result = await db.query(
      `INSERT INTO users (discord_id, username, display_name, avatar, is_platform_owner, last_login_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, now(), now())
       ON CONFLICT (discord_id) DO UPDATE SET
         username = EXCLUDED.username,
         display_name = EXCLUDED.display_name,
         avatar = EXCLUDED.avatar,
         is_platform_owner = EXCLUDED.is_platform_owner,
         last_login_at = now(),
         updated_at = now()
       RETURNING id`,
      [discordId, username, displayName, avatar, isOwner],
    );
    return result.rows[0].id as string;
  } catch (e) {
    logger.error('db', 'upsertUserFromDiscord failed', { error: (e as Error).message });
    throw new DatabaseError((e as Error).message);
  }
}

// ─── Sessions ───

export async function createSession(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null,
  hours: number = 168,
): Promise<string> {
  const db = await getDb();
  const token = generateToken();
  try {
    await db.query(
      `INSERT INTO sessions (token, user_id, expires_at, ip_address, user_agent)
       VALUES ($1, $2, now() + ($3 || ' hours')::interval, $4, $5)`,
      [token, userId, String(hours), ipAddress, userAgent],
    );
    return token;
  } catch (e) {
    logger.error('db', 'createSession failed', { error: (e as Error).message });
    throw new DatabaseError((e as Error).message);
  }
}

export async function validateSession(token: string): Promise<SessionUser | null> {
  const db = await getDb();
  try {
    const result = await db.query(
      `SELECT u.id, u.discord_id, u.username, u.display_name, u.avatar, u.is_platform_owner
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > now()
       LIMIT 1`,
      [token],
    );
    if (result.rows.length === 0) return null;
    await db.query('UPDATE sessions SET last_used_at = now() WHERE token = $1', [token]);
    return result.rows[0] as SessionUser;
  } catch (e) {
    logger.error('db', 'validateSession failed', { error: (e as Error).message });
    return null;
  }
}

export async function deleteSession(token: string): Promise<void> {
  const db = await getDb();
  try {
    await db.query('DELETE FROM sessions WHERE token = $1', [token]);
  } catch (e) {
    logger.error('db', 'deleteSession failed', { error: (e as Error).message });
  }
}

export async function deleteAllUserSessions(userId: string): Promise<number> {
  const db = await getDb();
  try {
    const result = await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    return result.affectedRows ?? 0;
  } catch (e) {
    logger.error('db', 'deleteAllUserSessions failed', { error: (e as Error).message });
    return 0;
  }
}

export async function getUserSessions(userId: string): Promise<Array<{
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_used_at: string;
  expires_at: string;
}>> {
  const db = await getDb();
  try {
    const result = await db.query(
      `SELECT id, ip_address, user_agent, created_at, last_used_at, expires_at
       FROM sessions WHERE user_id = $1 AND expires_at > now() ORDER BY last_used_at DESC`,
      [userId],
    );
    return result.rows as any[];
  } catch (e) {
    logger.error('db', 'getUserSessions failed', { error: (e as Error).message });
    return [];
  }
}

export async function revokeSessionById(sessionId: string, userId: string): Promise<void> {
  const db = await getDb();
  try {
    await db.query('DELETE FROM sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);
  } catch (e) {
    logger.error('db', 'revokeSessionById failed', { error: (e as Error).message });
  }
}

export async function cleanupExpiredSessions(): Promise<number> {
  const db = await getDb();
  try {
    const result = await db.query('DELETE FROM sessions WHERE expires_at < now()');
    return result.affectedRows ?? 0;
  } catch (e) {
    logger.error('db', 'cleanupExpiredSessions failed', { error: (e as Error).message });
    return 0;
  }
}

// ─── Admin Sessions ───

export async function createAdminSession(
  username: string,
  ipAddress: string | null,
  userAgent: string | null,
  hours: number = 24,
): Promise<string> {
  const db = await getDb();
  const token = generateToken();
  try {
    await db.query(
      `INSERT INTO admin_sessions (token, username, expires_at, ip_address, user_agent)
       VALUES ($1, $2, now() + ($3 || ' hours')::interval, $4, $5)`,
      [token, username, String(hours), ipAddress, userAgent],
    );
    return token;
  } catch (e) {
    logger.error('db', 'createAdminSession failed', { error: (e as Error).message });
    throw new DatabaseError((e as Error).message);
  }
}

export async function validateAdminSession(token: string): Promise<AdminSession | null> {
  const db = await getDb();
  try {
    const result = await db.query(
      'SELECT username FROM admin_sessions WHERE token = $1 AND expires_at > now() LIMIT 1',
      [token],
    );
    if (result.rows.length === 0) return null;
    return { valid: true, username: result.rows[0].username as string };
  } catch (e) {
    logger.error('db', 'validateAdminSession failed', { error: (e as Error).message });
    return null;
  }
}

export async function deleteAdminSession(token: string): Promise<void> {
  const db = await getDb();
  try {
    await db.query('DELETE FROM admin_sessions WHERE token = $1', [token]);
  } catch (e) {
    logger.error('db', 'deleteAdminSession failed', { error: (e as Error).message });
  }
}

// ─── Guilds ───

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
  const db = await getDb();
  try {
    for (const g of guilds) {
      const guildResult = await db.query(
        `INSERT INTO guilds (discord_id, name, icon, owner_discord_id, member_count, bot_added_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())
         ON CONFLICT (discord_id) DO UPDATE SET
           name = EXCLUDED.name, icon = EXCLUDED.icon, owner_discord_id = EXCLUDED.owner_discord_id,
           member_count = EXCLUDED.member_count,
           bot_added_at = COALESCE(guilds.bot_added_at, EXCLUDED.bot_added_at),
           updated_at = now()
         RETURNING id`,
        [g.id, g.name, g.icon, g.owner ? 'true' : 'false', g.member_count, g.bot_added ? 'now()' : 'NULL'],
      );
      const guildId = guildResult.rows[0].id as string;

      const role = g.owner ? 'SERVER_OWNER' : 'SERVER_MEMBER';
      await db.query(
        `INSERT INTO guild_memberships (user_id, guild_id, discord_guild_id, role, permissions, updated_at)
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (user_id, guild_id) DO UPDATE SET role = EXCLUDED.role, permissions = EXCLUDED.permissions, updated_at = now()`,
        [userId, guildId, g.id, role, g.permissions],
      );

      await db.query(
        `INSERT INTO guild_settings (guild_id) SELECT $1 WHERE NOT EXISTS (SELECT 1 FROM guild_settings WHERE guild_id = $1)`,
        [guildId],
      );
    }
  } catch (e) {
    logger.error('db', 'syncUserGuilds failed', { error: (e as Error).message });
  }
}

export async function getUserGuilds(userId: string): Promise<GuildWithAccess[]> {
  const db = await getDb();
  try {
    const result = await db.query(
      `SELECT g.id as guild_id, g.discord_id, g.name, g.icon, g.member_count,
              g.bot_added_at IS NOT NULL as bot_added, gm.role, gm.permissions
       FROM guilds g
       JOIN guild_memberships gm ON gm.guild_id = g.id
       WHERE gm.user_id = $1
       ORDER BY g.name`,
      [userId],
    );
    return result.rows as any[];
  } catch (e) {
    logger.error('db', 'getUserGuilds failed', { error: (e as Error).message });
    return [];
  }
}

export async function verifyGuildAccess(
  userId: string,
  discordGuildId: string,
): Promise<{ guildId: string; role: string } | null> {
  const db = await getDb();
  try {
    const result = await db.query(
      `SELECT g.id as guild_id, gm.role
       FROM guilds g
       JOIN guild_memberships gm ON gm.guild_id = g.id
       WHERE g.discord_id = $1 AND gm.user_id = $2
       LIMIT 1`,
      [discordGuildId, userId],
    );
    if (result.rows.length === 0) return null;
    return { guildId: result.rows[0].guild_id as string, role: result.rows[0].role as string };
  } catch (e) {
    logger.error('db', 'verifyGuildAccess failed', { error: (e as Error).message });
    return null;
  }
}

export async function getGuildSettings(guildId: string): Promise<GuildSettings | null> {
  const db = await getDb();
  try {
    const result = await db.query('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
    if (result.rows.length === 0) return null;
    return result.rows[0] as any;
  } catch (e) {
    logger.error('db', 'getGuildSettings failed', { error: (e as Error).message });
    return null;
  }
}

export async function updateGuildSettings(guildId: string, settings: Partial<GuildSettings>): Promise<void> {
  const db = await getDb();
  const allowedFields = [
    'language', 'embed_color', 'prefix', 'welcome_enabled', 'welcome_channel_id',
    'welcome_message', 'welcome_embed_enabled', 'leave_enabled', 'leave_channel_id',
    'leave_message', 'logging_enabled', 'log_channel_id', 'member_log_channel_id',
    'moderation_log_channel_id', 'voice_log_channel_id', 'role_log_channel_id',
    'channel_log_channel_id', 'message_log_channel_id', 'moderation_enabled',
    'automod_enabled', 'automod_config', 'tickets_enabled', 'ticket_config',
    'music_enabled', 'music_config', 'automations_enabled', 'roles_config',
    'feature_toggles', 'bot_nickname',
  ];

  const setClauses: string[] = [];
  const params: unknown[] = [guildId];
  let paramIdx = 2;

  for (const [key, value] of Object.entries(settings)) {
    if (!allowedFields.includes(key)) continue;
    setClauses.push(`${key} = $${paramIdx}`);
    params.push(value);
    paramIdx++;
  }

  if (setClauses.length === 0) return;
  setClauses.push('updated_at = now()');

  try {
    await db.query(
      `UPDATE guild_settings SET ${setClauses.join(', ')} WHERE guild_id = $1`,
      params,
    );
  } catch (e) {
    logger.error('db', 'updateGuildSettings failed', { error: (e as Error).message });
    throw new DatabaseError((e as Error).message);
  }
}

// ─── Audit Logs ───

export async function createAuditLog(entry: AuditEntry): Promise<void> {
  const db = await getDb();
  try {
    await db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, target, guild_id, result, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
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
    logger.error('db', 'createAuditLog failed', { error: (e as Error).message });
  }
}

export async function getAuditLogs(limit: number = 50, offset: number = 0): Promise<any[]> {
  const db = await getDb();
  try {
    const result = await db.query(
      `SELECT id, actor_name, action, target, result, metadata, created_at
       FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return result.rows;
  } catch (e) {
    logger.error('db', 'getAuditLogs failed', { error: (e as Error).message });
    return [];
  }
}

// ─── Security Events ───

export async function createSecurityEvent(event: SecurityEvent): Promise<void> {
  const db = await getDb();
  try {
    await db.query(
      `INSERT INTO security_events (user_id, type, severity, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        event.user_id ?? null,
        event.type,
        event.severity ?? 'info',
        JSON.stringify(event.metadata ?? {}),
        event.ip_address ?? null,
      ],
    );
  } catch (e) {
    logger.error('db', 'createSecurityEvent failed', { error: (e as Error).message });
  }
}

export async function getSecurityEvents(userId?: string, limit: number = 50): Promise<any[]> {
  const db = await getDb();
  try {
    if (userId) {
      const result = await db.query(
        `SELECT id, type, severity, metadata, ip_address, created_at
         FROM security_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [userId, limit],
      );
      return result.rows;
    }
    const result = await db.query(
      `SELECT id, user_id, type, severity, metadata, ip_address, created_at
       FROM security_events ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return result.rows;
  } catch (e) {
    logger.error('db', 'getSecurityEvents failed', { error: (e as Error).message });
    return [];
  }
}

// ─── Bot Status ───

export async function getBotStatus(): Promise<any> {
  const db = await getDb();
  try {
    const statusResult = await db.query('SELECT * FROM bot_status ORDER BY created_at DESC LIMIT 1');
    const configResult = await db.query('SELECT * FROM bot_configuration ORDER BY updated_at DESC LIMIT 1');
    const status = statusResult.rows[0] || { state: 'offline' };
    const config = configResult.rows[0] || {};
    return {
      state: status.state || 'offline',
      uptime_seconds: status.uptime_seconds || 0,
      gateway_latency_ms: status.gateway_latency_ms || null,
      connected_guilds: status.connected_guilds || 0,
      total_users: status.total_users || 0,
      cpu_percent: status.cpu_percent || 0,
      memory_mb: status.memory_mb || 0,
      node_version: status.node_version || null,
      last_heartbeat: status.last_heartbeat || null,
      last_error: status.last_error || null,
      token_configured: config.token_configured || false,
      last_started_at: config.last_started_at || null,
      last_stopped_at: config.last_stopped_at || null,
      last_crash_at: config.last_crash_at || null,
      activity_type: config.activity_type || 'playing',
      activity_name: config.activity_name || null,
      status: config.status || 'online',
    };
  } catch (e) {
    logger.error('db', 'getBotStatus failed', { error: (e as Error).message });
    return { state: 'offline', token_configured: false };
  }
}

export async function getBotConfiguration(adminToken: string): Promise<any | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;
  const db = await getDb();
  try {
    const result = await db.query('SELECT * FROM bot_configuration ORDER BY updated_at DESC LIMIT 1');
    return result.rows[0] || null;
  } catch (e) {
    logger.error('db', 'getBotConfiguration failed', { error: (e as Error).message });
    return null;
  }
}

export async function updateBotConfiguration(
  adminToken: string,
  updates: { status?: string; activity_type?: string; activity_name?: string | null; token_configured?: boolean },
): Promise<boolean> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return false;
  const db = await getDb();
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (updates.status !== undefined) { setClauses.push(`status = $${idx++}`); params.push(updates.status); }
  if (updates.activity_type !== undefined) { setClauses.push(`activity_type = $${idx++}`); params.push(updates.activity_type); }
  if (updates.activity_name !== undefined) { setClauses.push(`activity_name = $${idx++}`); params.push(updates.activity_name); }
  if (updates.token_configured !== undefined) { setClauses.push(`token_configured = $${idx++}`); params.push(updates.token_configured); }
  if (setClauses.length === 0) return true;
  setClauses.push('updated_at = now()');
  try {
    await db.query(
      `UPDATE bot_configuration SET ${setClauses.join(', ')} WHERE id = (SELECT id FROM bot_configuration ORDER BY updated_at DESC LIMIT 1)`,
      params,
    );
    return true;
  } catch (e) {
    logger.error('db', 'updateBotConfiguration failed', { error: (e as Error).message });
    return false;
  }
}

export async function issueBotCommand(adminToken: string, command: string, payload: Record<string, unknown> = {}): Promise<string | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;
  if (!['start', 'stop', 'restart', 'set_activity', 'set_status', 'set_avatar'].includes(command)) return null;
  const db = await getDb();
  try {
    const result = await db.query(
      'INSERT INTO bot_commands (command, payload) VALUES ($1, $2) RETURNING id',
      [command, JSON.stringify(payload)],
    );
    return result.rows[0].id as string;
  } catch (e) {
    logger.error('db', 'issueBotCommand failed', { error: (e as Error).message });
    return null;
  }
}

// ─── Platform Stats ───

export async function getPlatformStats(adminToken: string): Promise<any | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;
  const db = await getDb();
  try {
    const [users, guilds, sessions, tickets, modCases, auditLogs, botStatus] = await Promise.all([
      db.query('SELECT count(*) as cnt FROM users'),
      db.query('SELECT count(*) as cnt FROM guilds'),
      db.query('SELECT count(*) as cnt FROM sessions WHERE expires_at > now()'),
      db.query('SELECT count(*) as cnt FROM tickets'),
      db.query('SELECT count(*) as cnt FROM moderation_cases'),
      db.query('SELECT count(*) as cnt FROM audit_logs'),
      db.query('SELECT state FROM bot_status ORDER BY created_at DESC LIMIT 1'),
    ]);
    return {
      users: users.rows[0].cnt,
      guilds: guilds.rows[0].cnt,
      active_sessions: sessions.rows[0].cnt,
      tickets: tickets.rows[0].cnt,
      moderation_cases: modCases.rows[0].cnt,
      audit_logs: auditLogs.rows[0].cnt,
      bot_state: botStatus.rows[0]?.state || 'offline',
    };
  } catch (e) {
    logger.error('db', 'getPlatformStats failed', { error: (e as Error).message });
    return null;
  }
}

export async function getAllUsers(adminToken: string, limit: number = 50, offset: number = 0): Promise<any[] | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;
  const db = await getDb();
  try {
    const result = await db.query(
      `SELECT id, discord_id, username, display_name, avatar, is_platform_owner, created_at, last_login_at
       FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return result.rows;
  } catch (e) {
    logger.error('db', 'getAllUsers failed', { error: (e as Error).message });
    return null;
  }
}

export async function getAllGuilds(adminToken: string, limit: number = 50, offset: number = 0): Promise<any[] | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;
  const db = await getDb();
  try {
    const result = await db.query(
      `SELECT id, discord_id, name, icon, member_count, bot_added_at, created_at
       FROM guilds ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return result.rows;
  } catch (e) {
    logger.error('db', 'getAllGuilds failed', { error: (e as Error).message });
    return null;
  }
}

// ─── Moderation Cases ───

export async function getModerationCases(guildId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
  const db = await getDb();
  try {
    const result = await db.query(
      `SELECT id, case_number, action, target_id, target_name, moderator_id, moderator_name, reason, duration, created_at
       FROM moderation_cases WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [guildId, limit, offset],
    );
    return result.rows;
  } catch (e) {
    logger.error('db', 'getModerationCases failed', { error: (e as Error).message });
    return [];
  }
}

// ─── Tickets ───

export async function getTickets(guildId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
  const db = await getDb();
  try {
    const result = await db.query(
      `SELECT id, channel_id, user_id, user_name, status, category, assigned_to, created_at, closed_at
       FROM tickets WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [guildId, limit, offset],
    );
    return result.rows;
  } catch (e) {
    logger.error('db', 'getTickets failed', { error: (e as Error).message });
    return [];
  }
}

// ─── Automations ───

export async function getAutomations(guildId: string): Promise<any[]> {
  const db = await getDb();
  try {
    const result = await db.query(
      `SELECT id, name, trigger, conditions, actions, enabled, created_at, updated_at
       FROM automations WHERE guild_id = $1 ORDER BY created_at DESC`,
      [guildId],
    );
    return result.rows;
  } catch (e) {
    logger.error('db', 'getAutomations failed', { error: (e as Error).message });
    return [];
  }
}

export async function createAutomation(
  guildId: string,
  name: string,
  trigger: string,
  conditions: unknown[] = [],
  actions: unknown[] = [],
): Promise<string | null> {
  const db = await getDb();
  try {
    const result = await db.query(
      `INSERT INTO automations (guild_id, name, trigger, conditions, actions)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [guildId, name, trigger, JSON.stringify(conditions), JSON.stringify(actions)],
    );
    return result.rows[0].id as string;
  } catch (e) {
    logger.error('db', 'createAutomation failed', { error: (e as Error).message });
    return null;
  }
}

export async function deleteAutomation(guildId: string, automationId: string): Promise<boolean> {
  const db = await getDb();
  try {
    await db.query('DELETE FROM automations WHERE id = $1 AND guild_id = $2', [automationId, guildId]);
    return true;
  } catch (e) {
    logger.error('db', 'deleteAutomation failed', { error: (e as Error).message });
    return false;
  }
}

export async function toggleAutomation(guildId: string, automationId: string, enabled: boolean): Promise<boolean> {
  const db = await getDb();
  try {
    await db.query('UPDATE automations SET enabled = $1 WHERE id = $2 AND guild_id = $3', [enabled, automationId, guildId]);
    return true;
  } catch (e) {
    logger.error('db', 'toggleAutomation failed', { error: (e as Error).message });
    return false;
  }
}

// ─── Appearance ───

export async function getAppearanceSettings(): Promise<any> {
  const db = await getDb();
  try {
    const result = await db.query('SELECT * FROM appearance_settings ORDER BY updated_at DESC LIMIT 1');
    return result.rows[0] || null;
  } catch (e) {
    logger.error('db', 'getAppearanceSettings failed', { error: (e as Error).message });
    return null;
  }
}

export async function updateAppearanceSettings(adminToken: string, settings: Record<string, unknown>): Promise<boolean> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return false;
  const db = await getDb();
  const allowedFields = [
    'brand_name', 'primary_color', 'secondary_color', 'accent_color',
    'background_color', 'surface_color', 'text_color', 'border_color',
    'border_radius', 'theme_mode',
  ];
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  for (const [key, value] of Object.entries(settings)) {
    if (!allowedFields.includes(key)) continue;
    setClauses.push(`${key} = $${idx++}`);
    params.push(value);
  }
  if (setClauses.length === 0) return true;
  setClauses.push('updated_at = now()');
  try {
    await db.query(
      `UPDATE appearance_settings SET ${setClauses.join(', ')} WHERE id = (SELECT id FROM appearance_settings ORDER BY updated_at DESC LIMIT 1)`,
      params,
    );
    return true;
  } catch (e) {
    logger.error('db', 'updateAppearanceSettings failed', { error: (e as Error).message });
    return false;
  }
}

// ─── Message Templates ───

export async function getMessageTemplates(adminToken: string): Promise<any[] | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;
  const db = await getDb();
  try {
    const result = await db.query('SELECT * FROM message_templates ORDER BY created_at DESC');
    return result.rows;
  } catch (e) {
    logger.error('db', 'getMessageTemplates failed', { error: (e as Error).message });
    return null;
  }
}

export async function createMessageTemplate(adminToken: string, template: Record<string, unknown>): Promise<string | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;
  const db = await getDb();
  try {
    const result = await db.query(
      `INSERT INTO message_templates (name, type, title, description, footer, author, thumbnail, image, color, content)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        template.name, template.type || 'custom', template.title || null,
        template.description || null, template.footer || null, template.author || null,
        template.thumbnail || null, template.image || null,
        template.color || '#199155', template.content || null,
      ],
    );
    return result.rows[0].id as string;
  } catch (e) {
    logger.error('db', 'createMessageTemplate failed', { error: (e as Error).message });
    return null;
  }
}

export async function deleteMessageTemplate(adminToken: string, templateId: string): Promise<boolean> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return false;
  const db = await getDb();
  try {
    await db.query('DELETE FROM message_templates WHERE id = $1', [templateId]);
    return true;
  } catch (e) {
    logger.error('db', 'deleteMessageTemplate failed', { error: (e as Error).message });
    return false;
  }
}

// ─── Scheduled Messages ───

export async function getScheduledMessages(adminToken: string): Promise<any[] | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;
  const db = await getDb();
  try {
    const result = await db.query('SELECT * FROM scheduled_messages ORDER BY scheduled_at DESC');
    return result.rows;
  } catch (e) {
    logger.error('db', 'getScheduledMessages failed', { error: (e as Error).message });
    return null;
  }
}

export async function createScheduledMessage(
  adminToken: string,
  targetType: string,
  targetId: string | null,
  targetName: string | null,
  content: Record<string, unknown>,
  scheduledAt: string,
): Promise<string | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;
  const db = await getDb();
  try {
    const result = await db.query(
      `INSERT INTO scheduled_messages (target_type, target_id, target_name, content, scheduled_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [targetType, targetId, targetName, JSON.stringify(content), scheduledAt],
    );
    return result.rows[0].id as string;
  } catch (e) {
    logger.error('db', 'createScheduledMessage failed', { error: (e as Error).message });
    return null;
  }
}

export async function cancelScheduledMessage(adminToken: string, messageId: string): Promise<boolean> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return false;
  const db = await getDb();
  try {
    await db.query("UPDATE scheduled_messages SET status = 'cancelled' WHERE id = $1 AND status = 'scheduled'", [messageId]);
    return true;
  } catch (e) {
    logger.error('db', 'cancelScheduledMessage failed', { error: (e as Error).message });
    return false;
  }
}

export async function getMessageHistory(adminToken: string, limit: number = 50, offset: number = 0): Promise<any[] | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;
  const db = await getDb();
  try {
    const result = await db.query(
      `SELECT id, sender_name, target_type, target_id, target_name, content, status, discord_message_id, created_at
       FROM message_history ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return result.rows;
  } catch (e) {
    logger.error('db', 'getMessageHistory failed', { error: (e as Error).message });
    return null;
  }
}

// ─── User Settings ───

export async function getUserSetting(userId: string, key: string): Promise<unknown | null> {
  const db = await getDb();
  try {
    const result = await db.query('SELECT value FROM user_settings WHERE user_id = $1 AND key = $2', [userId, key]);
    if (result.rows.length === 0) return null;
    return result.rows[0].value;
  } catch (e) {
    logger.error('db', 'getUserSetting failed', { error: (e as Error).message });
    return null;
  }
}

export async function setUserSetting(userId: string, key: string, value: unknown): Promise<void> {
  const db = await getDb();
  try {
    await db.query(
      `INSERT INTO user_settings (user_id, key, value, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [userId, key, JSON.stringify(value)],
    );
  } catch (e) {
    logger.error('db', 'setUserSetting failed', { error: (e as Error).message });
  }
}
