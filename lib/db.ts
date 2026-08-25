import { logger } from '@/lib/logger';
import { PGlite } from '@electric-sql/pglite';

let dbInstance: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar TEXT,
  is_platform_owner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);

CREATE TABLE IF NOT EXISTS guilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  owner_discord_id TEXT,
  member_count INTEGER NOT NULL DEFAULT 0,
  bot_added_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guild_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  discord_guild_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'SERVER_MEMBER',
  permissions TEXT NOT NULL DEFAULT '0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, guild_id)
);

CREATE INDEX IF NOT EXISTS idx_guild_memberships_user ON guild_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_guild_memberships_guild ON guild_memberships(guild_id);

CREATE TABLE IF NOT EXISTS guild_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID UNIQUE NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'en',
  embed_color TEXT DEFAULT '#199155',
  prefix TEXT DEFAULT '!',
  welcome_enabled BOOLEAN DEFAULT false,
  welcome_channel_id TEXT,
  welcome_message TEXT,
  welcome_embed_enabled BOOLEAN DEFAULT true,
  leave_enabled BOOLEAN DEFAULT false,
  leave_channel_id TEXT,
  leave_message TEXT,
  logging_enabled BOOLEAN DEFAULT false,
  log_channel_id TEXT,
  member_log_channel_id TEXT,
  moderation_log_channel_id TEXT,
  voice_log_channel_id TEXT,
  role_log_channel_id TEXT,
  channel_log_channel_id TEXT,
  message_log_channel_id TEXT,
  moderation_enabled BOOLEAN DEFAULT true,
  automod_enabled BOOLEAN DEFAULT false,
  automod_config JSONB DEFAULT '{}',
  tickets_enabled BOOLEAN DEFAULT false,
  ticket_config JSONB DEFAULT '{}',
  music_enabled BOOLEAN DEFAULT false,
  music_config JSONB DEFAULT '{}',
  automations_enabled BOOLEAN DEFAULT true,
  roles_config JSONB DEFAULT '{}',
  feature_toggles JSONB DEFAULT '{}',
  bot_nickname TEXT,
  command_overrides JSONB DEFAULT '{}',
  welcome_image TEXT,
  leave_image TEXT,
  starboard_enabled BOOLEAN DEFAULT false,
  starboard_channel_id TEXT,
  starboard_limit INTEGER DEFAULT 5,
  suggestions_enabled BOOLEAN DEFAULT false,
  suggestions_channel_id TEXT,
  leveling_enabled BOOLEAN DEFAULT false,
  leveling_config JSONB DEFAULT '{}',
  economy_enabled BOOLEAN DEFAULT false,
  economy_config JSONB DEFAULT '{}',
  giveaway_config JSONB DEFAULT '{}',
  voice_config JSONB DEFAULT '{}',
  verification_enabled BOOLEAN DEFAULT false,
  verification_config JSONB DEFAULT '{}',
  quarantine_role_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  target TEXT,
  guild_id UUID,
  result TEXT DEFAULT 'success',
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);

CREATE TABLE IF NOT EXISTS bot_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL DEFAULT 'offline',
  uptime_seconds BIGINT DEFAULT 0,
  gateway_latency_ms INTEGER,
  connected_guilds INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  cpu_percent REAL DEFAULT 0,
  memory_mb REAL DEFAULT 0,
  node_version TEXT,
  last_heartbeat TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bot_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'online',
  activity_type TEXT DEFAULT 'playing',
  activity_name TEXT,
  token_configured BOOLEAN DEFAULT false,
  last_started_at TIMESTAMPTZ,
  last_stopped_at TIMESTAMPTZ,
  last_crash_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bot_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  result TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_commands_status ON bot_commands(status);

CREATE TABLE IF NOT EXISTS moderation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  case_number INTEGER NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_name TEXT,
  moderator_id TEXT,
  moderator_name TEXT,
  reason TEXT,
  duration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mod_cases_guild ON moderation_cases(guild_id);
CREATE INDEX IF NOT EXISTS idx_mod_cases_created ON moderation_cases(created_at DESC);

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  channel_id TEXT,
  user_id TEXT,
  user_name TEXT,
  status TEXT DEFAULT 'open',
  category TEXT,
  assigned_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC);

CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  conditions JSONB DEFAULT '[]',
  actions JSONB DEFAULT '[]',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automations_guild ON automations(guild_id);

CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'custom',
  title TEXT,
  description TEXT,
  footer TEXT,
  author TEXT,
  thumbnail TEXT,
  image TEXT,
  color TEXT DEFAULT '#199155',
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL,
  target_id TEXT,
  target_name TEXT,
  content JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled ON scheduled_messages(scheduled_at);

CREATE TABLE IF NOT EXISTS message_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name TEXT,
  target_type TEXT,
  target_id TEXT,
  target_name TEXT,
  content JSONB DEFAULT '{}',
  status TEXT DEFAULT 'sent',
  discord_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_history_created ON message_history(created_at DESC);

CREATE TABLE IF NOT EXISTS appearance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT DEFAULT 'JerSuit',
  primary_color TEXT DEFAULT '#199155',
  secondary_color TEXT DEFAULT '#33A765',
  accent_color TEXT DEFAULT '#F5FAF5',
  background_color TEXT DEFAULT '#F4F7F5',
  surface_color TEXT DEFAULT '#FFFFFF',
  text_color TEXT DEFAULT '#13221B',
  border_color TEXT DEFAULT '#DFE8E1',
  border_radius INTEGER DEFAULT 12,
  theme_mode TEXT DEFAULT 'light',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  moderator_id TEXT,
  moderator_name TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warnings_user ON warnings(guild_id, user_id);

CREATE TABLE IF NOT EXISTS leveling (
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  xp BIGINT NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  last_message_at TIMESTAMPTZ,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS economy_wallets (
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  bank BIGINT NOT NULL DEFAULT 0,
  last_daily_at TIMESTAMPTZ,
  last_weekly_at TIMESTAMPTZ,
  last_work_at TIMESTAMPTZ,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS economy_shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price BIGINT NOT NULL DEFAULT 0,
  role_id TEXT,
  role_name TEXT,
  stock INTEGER NOT NULL DEFAULT -1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_guild ON economy_shop_items(guild_id);

CREATE TABLE IF NOT EXISTS giveaways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  channel_id TEXT,
  message_id TEXT,
  prize TEXT NOT NULL,
  winners INTEGER NOT NULL DEFAULT 1,
  ends_at TIMESTAMPTZ NOT NULL,
  ended BOOLEAN NOT NULL DEFAULT false,
  host_id TEXT,
  entry_roles JSONB DEFAULT '[]',
  winner_ids JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_giveaways_guild ON giveaways(guild_id);

CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  channel_id TEXT,
  message_id TEXT,
  author_id TEXT,
  author_name TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  review_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suggestions_guild ON suggestions(guild_id);

CREATE TABLE IF NOT EXISTS starboard_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  source_message_id TEXT NOT NULL,
  source_channel_id TEXT NOT NULL,
  starboard_message_id TEXT,
  stars INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_message_id, guild_id)
);

CREATE TABLE IF NOT EXISTS custom_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aliases JSONB DEFAULT '[]',
  response TEXT,
  embed JSONB,
  cooldown_seconds INTEGER NOT NULL DEFAULT 0,
  allowed_roles JSONB DEFAULT '[]',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guild_id, name)
);

CREATE INDEX IF NOT EXISTS idx_custom_commands_guild ON custom_commands(guild_id);

CREATE TABLE IF NOT EXISTS command_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID REFERENCES guilds(id) ON DELETE SET NULL,
  command TEXT NOT NULL,
  category TEXT,
  user_id TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_command_usage_command ON command_usage(command);
CREATE INDEX IF NOT EXISTS idx_command_usage_created ON command_usage(created_at DESC);

CREATE TABLE IF NOT EXISTS reaction_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reaction_roles_msg ON reaction_roles(message_id);

CREATE TABLE IF NOT EXISTS autoroles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autoroles_guild ON autoroles(guild_id);

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  guild_id TEXT,
  channel_id TEXT,
  message TEXT,
  remind_at TIMESTAMPTZ NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(remind_at) WHERE done = false;

CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_users ON verification_codes(guild_id, user_id);

CREATE TABLE IF NOT EXISTS form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  questions JSONB DEFAULT '[]',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guild_id, name)
);

CREATE TABLE IF NOT EXISTS form_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  answers JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_entries_guild ON form_entries(guild_id);

CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

async function seedIfEmpty(db: PGlite, table: string, sql: string): Promise<void> {
  const result = await db.query<{ cnt: string | number }>(
    `SELECT count(*) AS cnt FROM ${table}`,
  );
  const count = Number(result.rows[0]?.cnt ?? 0);
  if (count === 0) {
    await db.query(sql);
  }
}

const DEFAULT_PLATFORM_SETTINGS: Record<string, unknown> = {
  platform_name: 'JerSuit',
  support_url: '',
  default_language: 'en',
  notify_new_owner: true,
  notify_crashes: true,
  notify_weekly: false,
  session_timeout_hours: 24,
  max_login_attempts: 5,
};

/**
 * Idempotent migrations for databases created before new columns existed.
 * CREATE TABLE IF NOT EXISTS does not add missing columns, so each new column
 * is applied with ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
 */
const MIGRATIONS_SQL = `
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS command_overrides JSONB DEFAULT '{}';
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS welcome_image TEXT;
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS leave_image TEXT;
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS starboard_enabled BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS starboard_channel_id TEXT;
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS starboard_limit INTEGER DEFAULT 5;
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS suggestions_enabled BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS suggestions_channel_id TEXT;
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS leveling_enabled BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS leveling_config JSONB DEFAULT '{}';
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS economy_enabled BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS economy_config JSONB DEFAULT '{}';
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS giveaway_config JSONB DEFAULT '{}';
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS voice_config JSONB DEFAULT '{}';
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS verification_enabled BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS verification_config JSONB DEFAULT '{}';
ALTER TABLE IF EXISTS guild_settings ADD COLUMN IF NOT EXISTS quarantine_role_id TEXT;
`;

/**
 * Opens a PGlite instance in the given data directory.
 *
 * ROOT-CAUSE RECOVERY: a persisted data directory can become unreadable (e.g.
 * a partial write, an interrupted init, or a PGlite version upgrade). When
 * that happens PGlite throws a bare "Aborted()" WASM error which previously
 * crashed session validation on EVERY request. We detect that failure, move
 * the corrupt directory aside to a timestamped backup, and initialize a fresh
 * database so the application stays up without data loss risk.
 */
/**
 * Opens a PGlite instance in the given data directory.
 *
 * ROOT-CAUSE RECOVERY: a persisted data directory can become unreadable (e.g.
 * a partial write, an interrupted init, or a PGlite version upgrade). When
 * that happens PGlite throws a bare "Aborted()" WASM error which previously
 * crashed session validation on EVERY request. We detect that failure, move
 * the corrupt directory aside to a timestamped backup, and initialize a fresh
 * database so the application stays up without data loss risk.
 */
async function openPGlite(dataDir: string): Promise<PGlite> {
  const fs = await import('fs/promises');
  await fs.mkdir(dataDir, { recursive: true });

  // PGlite opens the data directory lazily: the constructor does not throw on
  // a corrupt/legacy directory - the failure surfaces on the FIRST query or
  // exec. We therefore probe immediately with a trivial query so a corrupt
  // persisted directory is detected and recovered in one place, instead of
  // crashing session validation on every later request.
  try {
    const db = new PGlite(dataDir);
    const probe = await db.query<{ v: number }>('SELECT 1 AS v');
    void probe;
    return db;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('db', 'PGlite failed to open data directory - attempting recovery', {
      error: message,
      dataDir,
    });

    const corruptDir = `${dataDir}.corrupt-${Date.now()}`;
    try {
      await fs.rename(dataDir, corruptDir);
      await fs.mkdir(dataDir, { recursive: true });
    } catch (renameErr) {
      const renameMessage = renameErr instanceof Error ? renameErr.message : String(renameErr);
      logger.error('db', 'PGlite recovery: could not move corrupt data directory', {
        error: renameMessage,
      });
      throw err;
    }
    logger.warn('db', 'PGlite recovered: initializing a fresh data directory', {
      backup: corruptDir,
    });
    return new PGlite(dataDir);
  }
}

async function initDb(): Promise<PGlite> {
  // Node server runtime: use a filesystem-backed data directory so that data
  // survives application restarts. The `idb://` scheme is browser-only and
  // fails inside a Node.js server, so it is not used here.
  const dataDir =
    process.env.PGLITE_DATA_DIR || `${process.cwd()}/.data/jersuit-v2`;

  const db = await openPGlite(dataDir);
  await db.exec(SCHEMA_SQL);
  await db.exec(MIGRATIONS_SQL);

  // Seed default rows if empty
  await seedIfEmpty(
    db,
    'bot_configuration',
    "INSERT INTO bot_configuration (status, activity_type, activity_name, token_configured) VALUES ('offline', 'playing', NULL, false)",
  );
  await seedIfEmpty(
    db,
    'bot_status',
    "INSERT INTO bot_status (state) VALUES ('offline')",
  );
  await seedIfEmpty(
    db,
    'appearance_settings',
    'INSERT INTO appearance_settings DEFAULT VALUES',
  );

  // Seed platform_settings defaults (key-value)
  for (const [key, value] of Object.entries(DEFAULT_PLATFORM_SETTINGS)) {
    await db.query(
      `INSERT INTO platform_settings (key, value)
       SELECT $1, $2::jsonb
       WHERE NOT EXISTS (SELECT 1 FROM platform_settings WHERE key = $1)`,
      [key, JSON.stringify(value)],
    );
  }

  return db;
}

export async function getDb(): Promise<PGlite> {
  if (dbInstance) return dbInstance;
  if (!initPromise) {
    initPromise = initDb().then((db) => {
      dbInstance = db;
      return db;
    });
  }
  return initPromise;
}

export interface DbHealth {
  ok: boolean;
  error?: string;
  schema: boolean;
}

/** Returns whether the database is reachable - used by /api/bot/status. */
export async function getDbHealth(): Promise<DbHealth> {
  try {
    const db = await getDb();
    await db.query<{ cnt: string | number }>('SELECT count(*) AS cnt FROM users');
    return { ok: true, schema: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      schema: false,
    };
  }
}


export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
