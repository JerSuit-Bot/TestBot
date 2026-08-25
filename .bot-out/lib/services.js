"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAutoroles = exports.createTicket = exports.toggleGiveawayEntry = exports.createGiveaway = exports.clearWarningsForUser = exports.getWarningsForUser = exports.createModerationCase = exports.getCommandUsageStats = exports.recordCommandUsage = exports.getGuildDbIdByDiscordId = exports.setGuildCommandOverride = exports.getGuildCommandOverrides = exports.deleteGlobalCommandSettings = exports.setGlobalCommandSettings = exports.getGlobalCommandSettings = exports.getTickets = exports.getModerationCases = exports.toggleAutomation = exports.deleteAutomation = exports.createAutomation = exports.getAutomations = exports.setPlatformSettings = exports.getPlatformSettings = exports.getPlatformStats = exports.getAllGuilds = exports.getAllUsers = exports.getBotStatus = exports.issueBotCommand = exports.loadStoredBotPresence = exports.storeBotPresence = exports.getStoredBotPresence = exports.updateBotConfiguration = exports.getBotConfiguration = exports.updateAppearanceSettings = exports.getAppearanceSettings = exports.getAuditLogs = exports.createAuditLog = exports.updateGuildSettings = exports.getGuildSettings = exports.verifyGuildAccess = exports.getUserGuilds = exports.syncUserGuilds = exports.deleteAdminSession = exports.validateAdminSession = exports.createAdminSession = exports.cleanupExpiredSessions = exports.deleteSession = exports.validateSession = exports.createSession = exports.upsertUserFromDiscord = void 0;
exports.listCustomCommands = exports.getCustomCommandByName = exports.transferCoins = exports.deductCoins = exports.addCoins = exports.coinsOf = exports.setEconomyState = exports.getEconomyState = exports.getLeaderboard = exports.getLevel = exports.addXpForMessage = exports.removeAutorole = exports.addAutorole = void 0;
const db_1 = require("@/lib/db");
const errors_1 = require("@/lib/errors");
const logger_1 = require("@/lib/logger");
/* ─────────────────────────────────────────────
 * Users
 * ───────────────────────────────────────────── */
async function upsertUserFromDiscord(discordId, username, displayName, avatar) {
    const platformOwnerId = process.env.PLATFORM_OWNER_DISCORD_ID;
    const isOwner = Boolean(platformOwnerId && discordId === platformOwnerId);
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
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
      `, [discordId, username, displayName, avatar, isOwner]);
        const userId = result.rows[0]?.id;
        if (!userId) {
            throw new Error('Failed to create or update Discord user');
        }
        return userId;
    }
    catch (e) {
        logger_1.logger.error('db', 'upsertUserFromDiscord failed', {
            error: e.message,
        });
        throw new errors_1.DatabaseError(e.message);
    }
}
exports.upsertUserFromDiscord = upsertUserFromDiscord;
/* ─────────────────────────────────────────────
 * Sessions
 * ───────────────────────────────────────────── */
async function createSession(userId, ipAddress, userAgent, hours = 168) {
    try {
        const db = await (0, db_1.getDb)();
        const token = (0, db_1.generateToken)();
        await db.query(`
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
      `, [token, userId, hours, ipAddress, userAgent]);
        return token;
    }
    catch (e) {
        logger_1.logger.error('db', 'createSession failed', {
            error: e.message,
        });
        throw new errors_1.DatabaseError(e.message);
    }
}
exports.createSession = createSession;
async function validateSession(token) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
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
      `, [token]);
        return result.rows[0] ?? null;
    }
    catch (e) {
        logger_1.logger.error('db', 'validateSession failed', {
            error: e.message,
        });
        return null;
    }
}
exports.validateSession = validateSession;
async function deleteSession(token) {
    try {
        const db = await (0, db_1.getDb)();
        await db.query(`DELETE FROM sessions WHERE token = $1`, [token]);
    }
    catch (e) {
        logger_1.logger.error('db', 'deleteSession failed', {
            error: e.message,
        });
    }
}
exports.deleteSession = deleteSession;
async function cleanupExpiredSessions() {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
      DELETE FROM sessions
      WHERE expires_at < now()
      RETURNING id
      `);
        return result.rows.length;
    }
    catch (e) {
        logger_1.logger.error('db', 'cleanupExpiredSessions failed', {
            error: e.message,
        });
        return 0;
    }
}
exports.cleanupExpiredSessions = cleanupExpiredSessions;
/* ─────────────────────────────────────────────
 * Admin Sessions
 * ───────────────────────────────────────────── */
async function createAdminSession(username, ipAddress, userAgent, hours = 24) {
    try {
        const db = await (0, db_1.getDb)();
        const token = (0, db_1.generateToken)();
        await db.query(`
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
      `, [token, username, hours, ipAddress, userAgent]);
        return token;
    }
    catch (e) {
        logger_1.logger.error('db', 'createAdminSession failed', {
            error: e.message,
        });
        throw new errors_1.DatabaseError(e.message);
    }
}
exports.createAdminSession = createAdminSession;
async function validateAdminSession(token) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
      SELECT username
      FROM admin_sessions
      WHERE token = $1
        AND expires_at > now()
      LIMIT 1
      `, [token]);
        const session = result.rows[0];
        if (!session) {
            return null;
        }
        return {
            valid: true,
            username: session.username,
        };
    }
    catch (e) {
        logger_1.logger.error('db', 'validateAdminSession failed', {
            error: e.message,
        });
        return null;
    }
}
exports.validateAdminSession = validateAdminSession;
async function deleteAdminSession(token) {
    try {
        const db = await (0, db_1.getDb)();
        await db.query(`DELETE FROM admin_sessions WHERE token = $1`, [token]);
    }
    catch (e) {
        logger_1.logger.error('db', 'deleteAdminSession failed', {
            error: e.message,
        });
    }
}
exports.deleteAdminSession = deleteAdminSession;
/* ─────────────────────────────────────────────
 * Guilds
 * ───────────────────────────────────────────── */
async function syncUserGuilds(userId, guilds) {
    try {
        const db = await (0, db_1.getDb)();
        for (const guild of guilds) {
            const role = guild.owner ? 'SERVER_OWNER' : 'SERVER_MEMBER';
            const guildResult = await db.query(`
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
        `, [
                guild.id,
                guild.name,
                guild.icon,
                guild.owner,
                guild.member_count ?? 0,
                guild.bot_added ?? false,
            ]);
            const guildId = guildResult.rows[0]?.id;
            if (!guildId) {
                throw new Error(`Failed to sync guild ${guild.id}`);
            }
            await db.query(`
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
        `, [
                userId,
                guildId,
                guild.id,
                role,
                guild.permissions ?? '0',
            ]);
            await db.query(`
        INSERT INTO guild_settings (guild_id)
        SELECT $1
        WHERE NOT EXISTS (
          SELECT 1
          FROM guild_settings
          WHERE guild_id = $1
        )
        `, [guildId]);
        }
    }
    catch (e) {
        logger_1.logger.error('db', 'syncUserGuilds failed', {
            error: e.message,
        });
    }
}
exports.syncUserGuilds = syncUserGuilds;
async function getUserGuilds(sessionToken) {
    try {
        const db = await (0, db_1.getDb)();
        const session = await validateSession(sessionToken);
        if (!session) {
            return [];
        }
        const result = await db.query(`
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
      `, [session.id]);
        return result.rows;
    }
    catch (e) {
        logger_1.logger.error('db', 'getUserGuilds failed', {
            error: e.message,
        });
        return [];
    }
}
exports.getUserGuilds = getUserGuilds;
async function verifyGuildAccess(userId, discordGuildId) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
      SELECT
        g.id::text AS guild_id,
        gm.role
      FROM guilds g
      INNER JOIN guild_memberships gm
        ON gm.guild_id = g.id
      WHERE g.discord_id = $1
        AND gm.user_id = $2
      LIMIT 1
      `, [discordGuildId, userId]);
        const access = result.rows[0];
        if (!access) {
            return null;
        }
        return {
            guildId: access.guild_id,
            role: access.role,
        };
    }
    catch (e) {
        logger_1.logger.error('db', 'verifyGuildAccess failed', {
            error: e.message,
        });
        return null;
    }
}
exports.verifyGuildAccess = verifyGuildAccess;
async function getGuildSettings(guildId) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
      SELECT *
      FROM guild_settings
      WHERE guild_id = $1
      LIMIT 1
      `, [guildId]);
        return result.rows[0] ?? null;
    }
    catch (e) {
        logger_1.logger.error('db', 'getGuildSettings failed', {
            error: e.message,
        });
        return null;
    }
}
exports.getGuildSettings = getGuildSettings;
async function updateGuildSettings(guildId, settings) {
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
    ];
    const entries = Object.entries(settings).filter(([key, value]) => allowedFields.includes(key) &&
        value !== undefined);
    if (entries.length === 0) {
        return;
    }
    try {
        const db = await (0, db_1.getDb)();
        const setClauses = [];
        const values = [guildId];
        entries.forEach(([key, value], index) => {
            const parameter = `$${index + 2}`;
            const jsonFields = new Set([
                'automod_config',
                'ticket_config',
                'music_config',
                'roles_config',
                'feature_toggles',
            ]);
            setClauses.push(`${key} = ${jsonFields.has(key) ? `${parameter}::jsonb` : parameter}`);
            values.push(jsonFields.has(key) && typeof value !== 'string'
                ? JSON.stringify(value)
                : value);
        });
        setClauses.push('updated_at = now()');
        await db.query(`
      UPDATE guild_settings
      SET ${setClauses.join(', ')}
      WHERE guild_id = $1
      `, values);
    }
    catch (e) {
        logger_1.logger.error('db', 'updateGuildSettings failed', {
            error: e.message,
        });
        throw new errors_1.DatabaseError(e.message);
    }
}
exports.updateGuildSettings = updateGuildSettings;
/* ─────────────────────────────────────────────
 * Audit Logs
 * ───────────────────────────────────────────── */
async function createAuditLog(entry) {
    try {
        const db = await (0, db_1.getDb)();
        await db.query(`
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
      `, [
            entry.actor_id ?? null,
            entry.actor_name ?? null,
            entry.action,
            entry.target ?? null,
            entry.guild_id ?? null,
            entry.result ?? 'success',
            JSON.stringify(entry.metadata ?? {}),
            entry.ip_address ?? null,
            entry.user_agent ?? null,
        ]);
    }
    catch (e) {
        logger_1.logger.error('db', 'createAuditLog failed', {
            error: e.message,
        });
    }
}
exports.createAuditLog = createAuditLog;
async function getAuditLogs(limit = 50, offset = 0) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
      SELECT *
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
      `, [limit, offset]);
        return result.rows;
    }
    catch (e) {
        logger_1.logger.error('db', 'getAuditLogs failed', {
            error: e.message,
        });
        return [];
    }
}
exports.getAuditLogs = getAuditLogs;
/* ─────────────────────────────────────────────
 * Appearance Settings
 * ───────────────────────────────────────────── */
async function getAppearanceSettings() {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query('SELECT * FROM appearance_settings ORDER BY id LIMIT 1');
        return result.rows[0] ?? null;
    }
    catch (e) {
        logger_1.logger.error('db', 'getAppearanceSettings failed', {
            error: e.message,
        });
        return null;
    }
}
exports.getAppearanceSettings = getAppearanceSettings;
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
];
async function updateAppearanceSettings(settings) {
    const entries = Object.entries(settings).filter(([key, value]) => APPEARANCE_FIELDS.includes(key) && value !== undefined);
    if (entries.length === 0) {
        return true;
    }
    try {
        const db = await (0, db_1.getDb)();
        const setClauses = [];
        const values = [];
        entries.forEach(([key, value], index) => {
            setClauses.push(`${key} = $${index + 1}`);
            values.push(value);
        });
        setClauses.push('updated_at = now()');
        await db.query(`
      UPDATE appearance_settings
      SET ${setClauses.join(', ')}
      WHERE id = (SELECT id FROM appearance_settings ORDER BY id LIMIT 1)
      `, values);
        return true;
    }
    catch (e) {
        logger_1.logger.error('db', 'updateAppearanceSettings failed', {
            error: e.message,
        });
        return false;
    }
}
exports.updateAppearanceSettings = updateAppearanceSettings;
/* ─────────────────────────────────────────────
 * Bot Configuration / Status
 * ───────────────────────────────────────────── */
async function getBotConfiguration(adminToken) {
    const admin = await validateAdminSession(adminToken);
    if (!admin)
        return null;
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query('SELECT * FROM bot_configuration ORDER BY id LIMIT 1');
        return result.rows[0] ?? null;
    }
    catch (e) {
        logger_1.logger.error('db', 'getBotConfiguration failed', {
            error: e.message,
        });
        return null;
    }
}
exports.getBotConfiguration = getBotConfiguration;
const BOT_CONFIG_FIELDS = ['status', 'activity_type', 'activity_name'];
async function updateBotConfiguration(adminToken, settings) {
    const admin = await validateAdminSession(adminToken);
    if (!admin)
        return false;
    const entries = Object.entries(settings).filter(([key, value]) => BOT_CONFIG_FIELDS.includes(key) && value !== undefined);
    if (entries.length === 0) {
        return true;
    }
    try {
        const db = await (0, db_1.getDb)();
        const setClauses = [];
        const values = [];
        entries.forEach(([key, value], index) => {
            setClauses.push(`${key} = $${index + 1}`);
            values.push(value === null ? null : value);
        });
        setClauses.push('updated_at = now()');
        await db.query(`
      UPDATE bot_configuration
      SET ${setClauses.join(', ')}
      WHERE id = (SELECT id FROM bot_configuration ORDER BY id LIMIT 1)
      `, values);
        return true;
    }
    catch (e) {
        logger_1.logger.error('db', 'updateBotConfiguration failed', {
            error: e.message,
        });
        return false;
    }
}
exports.updateBotConfiguration = updateBotConfiguration;
/* ─────────────────────────────────────────────
 * Bot Presence (safe persistence)
 *
 * The presence configuration is stored WITHOUT any secret material. The
 * Discord bot token is never persisted; the presence stored here is only
 * used to restore the real bot's activity/status after a restart.
 * ───────────────────────────────────────────── */
const BOT_PRESENCE_KEY = 'bot_presence';
async function getStoredBotPresence(adminToken) {
    const admin = await validateAdminSession(adminToken);
    if (!admin)
        return null;
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`SELECT value FROM platform_settings WHERE key = $1`, [BOT_PRESENCE_KEY]);
        const row = result.rows[0];
        if (!row || typeof row.value !== 'object' || row.value === null) {
            return null;
        }
        const value = row.value;
        if (typeof value.status === 'string' &&
            typeof value.activity === 'object' &&
            value.activity !== null) {
            const activity = value.activity;
            return {
                status: value.status,
                activity: {
                    type: activity.type,
                    name: String(activity.name ?? ''),
                    url: typeof activity.url === 'string' ? activity.url : null,
                },
            };
        }
        return null;
    }
    catch (e) {
        logger_1.logger.error('db', 'getStoredBotPresence failed', {
            error: e.message,
        });
        return null;
    }
}
exports.getStoredBotPresence = getStoredBotPresence;
async function storeBotPresence(adminToken, presence) {
    const admin = await validateAdminSession(adminToken);
    if (!admin)
        return false;
    try {
        const db = await (0, db_1.getDb)();
        await db.query(`
      INSERT INTO platform_settings (key, value, updated_at)
      VALUES ($1, $2::jsonb, now())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `, [BOT_PRESENCE_KEY, JSON.stringify(presence)]);
        return true;
    }
    catch (e) {
        logger_1.logger.error('db', 'storeBotPresence failed', {
            error: e.message,
        });
        return false;
    }
}
exports.storeBotPresence = storeBotPresence;
/**
 * Reads the stored presence without requiring an admin session - used on bot
 * startup to restore the last applied presence. Returns safe data only.
 */
async function loadStoredBotPresence() {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`SELECT value FROM platform_settings WHERE key = $1`, [BOT_PRESENCE_KEY]);
        const row = result.rows[0];
        if (!row || typeof row.value !== 'object' || row.value === null) {
            return null;
        }
        const value = row.value;
        if (typeof value.status === 'string' &&
            typeof value.activity === 'object' &&
            value.activity !== null) {
            const activity = value.activity;
            return {
                status: value.status,
                activity: {
                    type: activity.type,
                    name: String(activity.name ?? ''),
                    url: typeof activity.url === 'string' ? activity.url : null,
                },
            };
        }
        return null;
    }
    catch (e) {
        logger_1.logger.error('db', 'loadStoredBotPresence failed', {
            error: e.message,
        });
        return null;
    }
}
exports.loadStoredBotPresence = loadStoredBotPresence;
async function issueBotCommand(adminToken, command, payload) {
    const admin = await validateAdminSession(adminToken);
    if (!admin)
        return null;
    if (!command || !['start', 'stop', 'restart'].includes(command)) {
        return null;
    }
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
      INSERT INTO bot_commands (command, payload, status)
      VALUES ($1, $2::jsonb, 'pending')
      RETURNING id::text AS id
      `, [command, JSON.stringify(payload ?? {})]);
        return result.rows[0]?.id ?? null;
    }
    catch (e) {
        logger_1.logger.error('db', 'issueBotCommand failed', {
            error: e.message,
        });
        return null;
    }
}
exports.issueBotCommand = issueBotCommand;
async function getBotStatus() {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
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
      `);
        return result.rows[0] ?? null;
    }
    catch (e) {
        logger_1.logger.error('db', 'getBotStatus failed', {
            error: e.message,
        });
        return null;
    }
}
exports.getBotStatus = getBotStatus;
/* ─────────────────────────────────────────────
 * Admin: Users, Guilds, Platform Stats
 * ───────────────────────────────────────────── */
async function getAllUsers(adminToken) {
    const admin = await validateAdminSession(adminToken);
    if (!admin)
        return null;
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
      SELECT id::text AS id, discord_id, username, display_name, avatar,
             is_platform_owner, last_login_at, created_at
      FROM users
      ORDER BY created_at DESC
      `);
        return result.rows;
    }
    catch (e) {
        logger_1.logger.error('db', 'getAllUsers failed', {
            error: e.message,
        });
        return null;
    }
}
exports.getAllUsers = getAllUsers;
async function getAllGuilds(adminToken) {
    const admin = await validateAdminSession(adminToken);
    if (!admin)
        return null;
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
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
      `);
        return result.rows;
    }
    catch (e) {
        logger_1.logger.error('db', 'getAllGuilds failed', {
            error: e.message,
        });
        return null;
    }
}
exports.getAllGuilds = getAllGuilds;
async function getPlatformStats(adminToken) {
    const admin = await validateAdminSession(adminToken);
    if (!admin)
        return null;
    try {
        const db = await (0, db_1.getDb)();
        const count = async (table) => {
            const res = await db.query(`SELECT count(*) AS cnt FROM ${table}`);
            return Number(res.rows[0]?.cnt ?? 0);
        };
        const [users, guilds, activeSessions, tickets, moderationCases, auditLogs] = await Promise.all([
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
    }
    catch (e) {
        logger_1.logger.error('db', 'getPlatformStats failed', {
            error: e.message,
        });
        return null;
    }
}
exports.getPlatformStats = getPlatformStats;
/* ─────────────────────────────────────────────
 * Platform Settings (key-value)
 * ───────────────────────────────────────────── */
async function getPlatformSettings() {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query('SELECT key, value FROM platform_settings');
        const settings = {};
        for (const row of result.rows) {
            settings[row.key] = row.value;
        }
        return settings;
    }
    catch (e) {
        logger_1.logger.error('db', 'getPlatformSettings failed', {
            error: e.message,
        });
        return {};
    }
}
exports.getPlatformSettings = getPlatformSettings;
async function setPlatformSettings(settings) {
    try {
        const db = await (0, db_1.getDb)();
        for (const [key, value] of Object.entries(settings)) {
            await db.query(`
        INSERT INTO platform_settings (key, value)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = now()
        `, [key, JSON.stringify(value)]);
        }
    }
    catch (e) {
        logger_1.logger.error('db', 'setPlatformSettings failed', {
            error: e.message,
        });
        throw new errors_1.DatabaseError(e.message);
    }
}
exports.setPlatformSettings = setPlatformSettings;
/* ─────────────────────────────────────────────
 * Automations
 * ───────────────────────────────────────────── */
async function getAutomations(guildId) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
      SELECT id::text AS id, name, trigger, conditions, actions, enabled, created_at
      FROM automations
      WHERE guild_id = $1
      ORDER BY created_at DESC
      `, [guildId]);
        return result.rows;
    }
    catch (e) {
        logger_1.logger.error('db', 'getAutomations failed', {
            error: e.message,
        });
        return [];
    }
}
exports.getAutomations = getAutomations;
async function createAutomation(guildId, name, trigger, conditions, actions) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
      INSERT INTO automations (guild_id, name, trigger, conditions, actions)
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
      RETURNING id::text AS id
      `, [guildId, name, trigger, JSON.stringify(conditions ?? []), JSON.stringify(actions ?? [])]);
        return result.rows[0]?.id ?? null;
    }
    catch (e) {
        logger_1.logger.error('db', 'createAutomation failed', {
            error: e.message,
        });
        return null;
    }
}
exports.createAutomation = createAutomation;
async function deleteAutomation(guildId, automationId) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
      DELETE FROM automations
      WHERE id = $1 AND guild_id = $2
      RETURNING id
      `, [automationId, guildId]);
        return result.rows.length > 0;
    }
    catch (e) {
        logger_1.logger.error('db', 'deleteAutomation failed', {
            error: e.message,
        });
        return false;
    }
}
exports.deleteAutomation = deleteAutomation;
async function toggleAutomation(guildId, automationId, enabled) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
      UPDATE automations
      SET enabled = $3, updated_at = now()
      WHERE id = $1 AND guild_id = $2
      RETURNING id
      `, [automationId, guildId, enabled]);
        return result.rows.length > 0;
    }
    catch (e) {
        logger_1.logger.error('db', 'toggleAutomation failed', {
            error: e.message,
        });
        return false;
    }
}
exports.toggleAutomation = toggleAutomation;
/* ─────────────────────────────────────────────
 * Moderation + Tickets
 * ───────────────────────────────────────────── */
async function getModerationCases(guildId) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
      SELECT id::text AS id, case_number, action, target_id, target_name,
             moderator_id, moderator_name, reason, duration, created_at
      FROM moderation_cases
      WHERE guild_id = $1
      ORDER BY created_at DESC
      `, [guildId]);
        return result.rows;
    }
    catch (e) {
        logger_1.logger.error('db', 'getModerationCases failed', {
            error: e.message,
        });
        return [];
    }
}
exports.getModerationCases = getModerationCases;
async function getTickets(guildId) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`
      SELECT id::text AS id, channel_id, user_id, user_name, status,
             category, assigned_to, created_at, closed_at
      FROM tickets
      WHERE guild_id = $1
      ORDER BY created_at DESC
      `, [guildId]);
        return result.rows;
    }
    catch (e) {
        logger_1.logger.error('db', 'getTickets failed', {
            error: e.message,
        });
        return [];
    }
}
exports.getTickets = getTickets;
/* ─────────────────────────────────────────────
 * Command settings (global portal-level) + overrides
 * ───────────────────────────────────────────── */
const GLOBAL_COMMAND_KEY_PREFIX = 'command_settings:';
/** Reads the global (portal-level) settings object for one command. */
async function getGlobalCommandSettings(name) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query('SELECT value FROM platform_settings WHERE key = $1', [`${GLOBAL_COMMAND_KEY_PREFIX}${name}`]);
        const row = result.rows[0];
        if (row && typeof row.value === 'object' && row.value !== null) {
            return row.value;
        }
        return {};
    }
    catch (e) {
        logger_1.logger.error('db', 'getGlobalCommandSettings failed', { error: e.message });
        return {};
    }
}
exports.getGlobalCommandSettings = getGlobalCommandSettings;
async function setGlobalCommandSettings(name, settings) {
    try {
        const db = await (0, db_1.getDb)();
        await db.query(`INSERT INTO platform_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [`${GLOBAL_COMMAND_KEY_PREFIX}${name}`, JSON.stringify(settings)]);
        return true;
    }
    catch (e) {
        logger_1.logger.error('db', 'setGlobalCommandSettings failed', { error: e.message });
        return false;
    }
}
exports.setGlobalCommandSettings = setGlobalCommandSettings;
async function deleteGlobalCommandSettings(name) {
    try {
        const db = await (0, db_1.getDb)();
        await db.query('DELETE FROM platform_settings WHERE key = $1', [`${GLOBAL_COMMAND_KEY_PREFIX}${name}`]);
        return true;
    }
    catch (e) {
        logger_1.logger.error('db', 'deleteGlobalCommandSettings failed', { error: e.message });
        return false;
    }
}
exports.deleteGlobalCommandSettings = deleteGlobalCommandSettings;
async function getGuildCommandOverrides(discordGuildId, name) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`SELECT gs.command_overrides AS overrides
       FROM guilds g
       JOIN guild_settings gs ON gs.guild_id = g.id
       WHERE g.discord_id = $1
       LIMIT 1`, [discordGuildId]);
        const row = result.rows[0];
        if (!row)
            return {};
        const overrides = (row.overrides ?? {});
        const specific = overrides[name];
        return (typeof specific === 'object' && specific !== null ? specific : {});
    }
    catch (e) {
        logger_1.logger.error('db', 'getGuildCommandOverrides failed', { error: e.message });
        return {};
    }
}
exports.getGuildCommandOverrides = getGuildCommandOverrides;
async function setGuildCommandOverride(discordGuildId, name, settings) {
    try {
        const db = await (0, db_1.getDb)();
        await db.query(`UPDATE guild_settings gs
       SET command_overrides = jsonb_set(
         COALESCE(gs.command_overrides, '{}'::jsonb),
         $3,
         $4::jsonb,
         true
       ), updated_at = now()
       FROM guilds g
       WHERE g.discord_id = $1 AND gs.guild_id = g.id`, [discordGuildId, name, `{${name}}`, JSON.stringify(settings)]);
        return true;
    }
    catch (e) {
        logger_1.logger.error('db', 'setGuildCommandOverride failed', { error: e.message });
        return false;
    }
}
exports.setGuildCommandOverride = setGuildCommandOverride;
/* ─────────────────────────────────────────────
 * Guild resolution helper (discord -> uuid)
 * ───────────────────────────────────────────── */
async function getGuildDbIdByDiscordId(discordGuildId) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query('SELECT id::text AS id FROM guilds WHERE discord_id = $1 LIMIT 1', [discordGuildId]);
        return result.rows[0]?.id ?? null;
    }
    catch (e) {
        logger_1.logger.error('db', 'getGuildDbIdByDiscordId failed', { error: e.message });
        return null;
    }
}
exports.getGuildDbIdByDiscordId = getGuildDbIdByDiscordId;
/* ─────────────────────────────────────────────
 * Analytics: command usage
 * ───────────────────────────────────────────── */
async function recordCommandUsage({ commandName, category, discordGuildId, userId, success, latencyMs, }) {
    try {
        const db = await (0, db_1.getDb)();
        let guildUuid = null;
        if (discordGuildId) {
            const g = await db.query('SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1', [discordGuildId]);
            guildUuid = g.rows[0]?.id ?? null;
        }
        await db.query(`INSERT INTO command_usage (guild_id, command, category, user_id, success, latency_ms)
       VALUES ($1::uuid, $2, $3, $4, $5, $6)`, [guildUuid, commandName, category ?? null, userId ?? null, success ?? true, latencyMs ?? null]);
    }
    catch (e) {
        logger_1.logger.error('db', 'recordCommandUsage failed', { error: e.message });
    }
}
exports.recordCommandUsage = recordCommandUsage;
async function getCommandUsageStats() {
    try {
        const db = await (0, db_1.getDb)();
        const [mostUsed, errorsRes, totalsRes] = await Promise.all([
            db.query(`
        SELECT command, category, count(*) AS uses,
               count(*) FILTER (WHERE success = true) AS ok
        FROM command_usage
        GROUP BY command, category
        ORDER BY uses DESC
        LIMIT 30`),
            db.query(`
        SELECT command, count(*) AS failures
        FROM command_usage
        WHERE success = false
        GROUP BY command
        ORDER BY failures DESC
        LIMIT 20`),
            db.query(`
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
    }
    catch (e) {
        logger_1.logger.error('db', 'getCommandUsage failed', { error: e.message });
        return { mostUsed: [], errors: [], totals: { total: 0 } };
    }
}
exports.getCommandUsageStats = getCommandUsageStats;
function normalizeCounts(row) {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
        out[k] = Number(v ?? 0);
    }
    return out;
}
/* ─────────────────────────────────────────────
 * Moderation cases + warnings
 * ───────────────────────────────────────────── */
async function createModerationCase({ discordGuildId, action, targetId, targetName, moderatorId, moderatorName, reason, duration, }) {
    try {
        const db = await (0, db_1.getDb)();
        const guild = await db.query('SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1', [discordGuildId]);
        if (!guild.rows[0])
            return false;
        await db.query(`INSERT INTO moderation_cases (
        guild_id, action, target_id, target_name,
        moderator_id, moderator_name, reason, duration
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            guild.rows[0].id,
            action,
            targetId,
            targetName ?? null,
            moderatorId,
            moderatorName ?? null,
            reason ?? null,
            duration ?? null,
        ]);
        return true;
    }
    catch (e) {
        logger_1.logger.error('db', 'createModerationCase failed', { error: e.message });
        return false;
    }
}
exports.createModerationCase = createModerationCase;
async function getWarningsForUser(discordGuildId, targetUserId) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`SELECT id::text AS id, action, target_id, target_name, moderator_name, reason, duration, created_at
       FROM moderation_cases
       WHERE guild_id = (SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1)
         AND action = 'warn' AND target_id = $2
       ORDER BY created_at DESC`, [discordGuildId, targetUserId]);
        return result.rows;
    }
    catch (e) {
        logger_1.logger.error('db', 'getWarningsForUser failed', { error: e.message });
        return [];
    }
}
exports.getWarningsForUser = getWarningsForUser;
async function clearWarningsForUser(discordGuildId, targetUserId) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`DELETE FROM moderation_cases
       WHERE guild_id = (SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1)
         AND action = 'warn' AND target_id = $2`, [discordGuildId, targetUserId]);
        return result.affectedRows ?? 0;
    }
    catch (e) {
        logger_1.logger.error('db', 'clearWarningsForUser failed', { error: e.message });
        return 0;
    }
}
exports.clearWarningsForUser = clearWarningsForUser;
/* ─────────────────────────────────────────────
 * Giveaways
 * ───────────────────────────────────────────── */
async function createGiveaway({ discordGuildId, channelId, messageId, prize, winners, endsAtIso, hostId, }) {
    try {
        const db = await (0, db_1.getDb)();
        const guild = await db.query('SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1', [discordGuildId]);
        if (!guild.rows[0])
            return null;
        const result = await db.query(`INSERT INTO giveaways (guild_id, channel_id, message_id, prize, winners, ends_at, host_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id::text AS id`, [guild.rows[0].id, channelId, messageId, prize, winners, new Date(endsAtIso), hostId]);
        return result.rows[0]?.id ?? null;
    }
    catch (e) {
        logger_1.logger.error('db', 'createGiveaway failed', { error: e.message });
        return null;
    }
}
exports.createGiveaway = createGiveaway;
async function toggleGiveawayEntry(giveawayDbId, discordUserId) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query('SELECT winner_ids, ended FROM giveaways WHERE id = $1::uuid LIMIT 1', [giveawayDbId]);
        const row = result.rows[0];
        if (!row || row.ended)
            return { joined: false };
        const winners = (row.winner_ids ?? []);
        const set = new Set(winners.map(String));
        const joined = !set.has(discordUserId);
        if (joined) {
            set.add(discordUserId);
        }
        else {
            set.delete(discordUserId);
        }
        await db.query('UPDATE giveaways SET winner_ids = $2::jsonb WHERE id = $1::uuid', [giveawayDbId, JSON.stringify(Array.from(set))]);
        return { joined };
    }
    catch (e) {
        logger_1.logger.error('db', 'toggleGiveawayEntry failed', { error: e.message });
        return { joined: false };
    }
}
exports.toggleGiveawayEntry = toggleGiveawayEntry;
/* ─────────────────────────────────────────────
 * Tickets
 * ───────────────────────────────────────────── */
async function createTicket({ discordGuildId, channelId, userId, userName, }) {
    try {
        const db = await (0, db_1.getDb)();
        const guild = await db.query('SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1', [discordGuildId]);
        if (!guild.rows[0])
            return false;
        // Prevent duplicate open tickets for the same user in the same guild.
        const existing = await db.query(`SELECT id FROM tickets
       WHERE guild_id = $1 AND user_id = $2 AND status = 'open'
       LIMIT 1`, [guild.rows[0].id, userId]);
        if (existing.rows[0])
            return false;
        await db.query(`INSERT INTO tickets (guild_id, channel_id, user_id, user_name, status)
       VALUES ($1, $2, $3, $4, 'open')`, [guild.rows[0].id, channelId, userId, userName]);
        return true;
    }
    catch (e) {
        logger_1.logger.error('db', 'createTicket failed', { error: e.message });
        return false;
    }
}
exports.createTicket = createTicket;
/* ─────────────────────────────────────────────
 * Auto roles
 * ───────────────────────────────────────────── */
async function getAutoroles(discordGuildId) {
    try {
        const db = await (0, db_1.getDb)();
        const guild = await db.query('SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1', [discordGuildId]);
        if (!guild.rows[0])
            return [];
        const result = await db.query('SELECT id::text AS id, role_id FROM autoroles WHERE guild_id = $1 ORDER BY created_at', [guild.rows[0].id]);
        return result.rows;
    }
    catch (e) {
        logger_1.logger.error('db', 'getAutoroles failed', { error: e.message });
        return [];
    }
}
exports.getAutoroles = getAutoroles;
async function addAutorole(discordGuildId, roleId) {
    try {
        const db = await (0, db_1.getDb)();
        const guild = await db.query('SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1', [discordGuildId]);
        if (!guild.rows[0])
            return false;
        await db.query('INSERT INTO autoroles (guild_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [guild.rows[0].id, roleId]);
        return true;
    }
    catch (e) {
        logger_1.logger.error('db', 'addAutorole failed', { error: e.message });
        return false;
    }
}
exports.addAutorole = addAutorole;
async function removeAutorole(discordGuildId, roleId) {
    try {
        const db = await (0, db_1.getDb)();
        const guild = await db.query('SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1', [discordGuildId]);
        if (!guild.rows[0])
            return false;
        await db.query('DELETE FROM autoroles WHERE guild_id = $1 AND role_id = $2', [guild.rows[0].id, roleId]);
        return true;
    }
    catch (e) {
        logger_1.logger.error('db', 'removeAutorole failed', { error: e.message });
        return false;
    }
}
exports.removeAutorole = removeAutorole;
/* ─────────────────────────────────────────────
 * Leveling
 * ───────────────────────────────────────────── */
async function addXpForMessage({ discordGuildId, discordUserId, xp, }) {
    try {
        const db = await (0, db_1.getDb)();
        const guild = await db.query('SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1', [discordGuildId]);
        if (!guild.rows[0])
            return null;
        const result = await db.query(`INSERT INTO leveling (guild_id, user_id, xp, level, last_message_at)
       VALUES ($1, $2, $3, 1, now())
       ON CONFLICT (guild_id, user_id)
       DO UPDATE SET
         xp = leveling.xp + EXCLUDED.xp,
         last_message_at = now()
       RETURNING xp, level`, [guild.rows[0].id, discordUserId, xp]);
        const totalXp = Number(result.rows[0]?.xp ?? 0);
        const newLevel = Math.floor(Math.sqrt(totalXp / 50)) + 1;
        const oldLevel = Number(result.rows[0]?.level ?? 1);
        if (newLevel > oldLevel) {
            await db.query('UPDATE leveling SET level = $3 WHERE guild_id = $1 AND user_id = $2', [guild.rows[0].id, discordUserId, newLevel]);
            return { leveledUp: true, newLevel };
        }
        return { leveledUp: false, newLevel: null };
    }
    catch (e) {
        logger_1.logger.error('db', 'addXpForMessage failed', { error: e.message });
        return null;
    }
}
exports.addXpForMessage = addXpForMessage;
async function getLevel(discordGuildId, discordUserId) {
    try {
        const db = await (0, db_1.getDb)();
        const guild = await db.query('SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1', [discordGuildId]);
        if (!guild.rows[0])
            return null;
        const result = await db.query(`SELECT xp, level,
        (
          SELECT count(*) + 1 FROM leveling l2
          WHERE l2.guild_id = leveling.guild_id AND l2.xp > leveling.xp
        ) AS rank
       FROM leveling
       WHERE guild_id = $1 AND user_id = $2
       LIMIT 1`, [guild.rows[0].id, discordUserId]);
        const row = result.rows[0];
        if (!row)
            return { xp: 0, level: 1, rank: 0 };
        return { xp: Number(row.xp), level: Number(row.level), rank: Number(row.rank) };
    }
    catch (e) {
        logger_1.logger.error('db', 'getLevel failed', { error: e.message });
        return null;
    }
}
exports.getLevel = getLevel;
async function getLeaderboard(discordGuildId, limit = 10) {
    try {
        const db = await (0, db_1.getDb)();
        const guild = await db.query('SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1', [discordGuildId]);
        if (!guild.rows[0])
            return [];
        const result = await db.query('SELECT user_id, xp, level FROM leveling WHERE guild_id = $1 ORDER BY xp DESC LIMIT $2', [guild.rows[0].id, limit]);
        return result.rows;
    }
    catch (e) {
        logger_1.logger.error('db', 'getLeaderboard failed', { error: e.message });
        return [];
    }
}
exports.getLeaderboard = getLeaderboard;
const EMPTY_ECONOMY = { enabled: false, coins: {}, lastDaily: {}, bank: {} };
async function getEconomyState(discordGuildId) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`SELECT gs.economy_config AS config
       FROM guilds g JOIN guild_settings gs ON gs.guild_id = g.id
       WHERE g.discord_id = $1 LIMIT 1`, [discordGuildId]);
        const raw = result.rows[0]?.config;
        if (typeof raw === 'object' && raw !== null) {
            const r = raw;
            return {
                enabled: r.enabled === true,
                coins: r.coins ?? {},
                lastDaily: r.lastDaily ?? {},
                bank: r.bank ?? {},
            };
        }
        return { ...EMPTY_ECONOMY };
    }
    catch (e) {
        logger_1.logger.error('db', 'getEconomyState failed', { error: e.message });
        return { ...EMPTY_ECONOMY };
    }
}
exports.getEconomyState = getEconomyState;
async function setEconomyState(discordGuildId, state) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`UPDATE guild_settings gs
       SET economy_config = $2::jsonb, updated_at = now()
       FROM guilds g WHERE g.discord_id = $1 AND gs.guild_id = g.id`, [discordGuildId, JSON.stringify(state)]);
        return (result.affectedRows ?? 0) > 0;
    }
    catch (e) {
        logger_1.logger.error('db', 'setEconomyState failed', { error: e.message });
        return false;
    }
}
exports.setEconomyState = setEconomyState;
async function coinsOf(discordGuildId, userId) {
    const state = await getEconomyState(discordGuildId);
    return state.coins[userId] ?? 0;
}
exports.coinsOf = coinsOf;
async function addCoins(discordGuildId, userId, amount) {
    const state = await getEconomyState(discordGuildId);
    const current = state.coins[userId] ?? 0;
    state.coins[userId] = Math.max(0, current + Math.max(0, Math.floor(amount)));
    await setEconomyState(discordGuildId, state);
    return state.coins[userId];
}
exports.addCoins = addCoins;
async function deductCoins(discordGuildId, userId, amount) {
    const state = await getEconomyState(discordGuildId);
    const current = state.coins[userId] ?? 0;
    const deduct = Math.max(0, Math.floor(amount));
    if (current < deduct)
        return false;
    const next = current - deduct;
    if (next <= 0)
        delete state.coins[userId];
    else
        state.coins[userId] = next;
    await setEconomyState(discordGuildId, state);
    return true;
}
exports.deductCoins = deductCoins;
async function transferCoins(discordGuildId, fromId, toId, amount) {
    if (fromId === toId)
        return false;
    const ok = await deductCoins(discordGuildId, fromId, amount);
    if (!ok)
        return false;
    await addCoins(discordGuildId, toId, amount);
    return true;
}
exports.transferCoins = transferCoins;
/* ─────────────────────────────────────────────
 * Custom commands
 * ───────────────────────────────────────────── */
async function getCustomCommandByName(guildDbId, name) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`SELECT id::text AS id, name, response, embed, cooldown_seconds, allowed_roles, enabled
       FROM custom_commands
       WHERE guild_id = $1 AND enabled = true AND (name = $2 OR $2 = ANY(aliases::text[]))
       LIMIT 1`, [guildDbId, name.toLowerCase()]);
        return result.rows[0] ?? null;
    }
    catch (e) {
        logger_1.logger.error('db', 'getCustomCommandByName failed', { error: e.message });
        return null;
    }
}
exports.getCustomCommandByName = getCustomCommandByName;
async function listCustomCommands(guildDbId) {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.query(`SELECT id::text AS id, name, aliases, response, cooldown_seconds, allowed_roles, enabled, updated_at
       FROM custom_commands
       WHERE guild_id = $1
       ORDER BY name`, [guildDbId]);
        return result.rows;
    }
    catch (e) {
        logger_1.logger.error('db', 'listCustomCommands failed', { error: e.message });
        return [];
    }
}
exports.listCustomCommands = listCustomCommands;
