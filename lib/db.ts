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
`;

async function initDb(): Promise<PGlite> {
  const db = new PGlite('idb://jersuit-v2');
  await db.exec(SCHEMA_SQL);

  // Seed default rows if empty
  const botConfig = await db.query('SELECT count(*) as cnt FROM bot_configuration');
  if (botConfig.rows[0].cnt === 0) {
    await db.query("INSERT INTO bot_configuration (status, activity_type, activity_name, token_configured) VALUES ('online', 'playing', NULL, false)");
  }
  const botStatus = await db.query('SELECT count(*) as cnt FROM bot_status');
  if (botStatus.rows[0].cnt === 0) {
    await db.query("INSERT INTO bot_status (state) VALUES ('offline')");
  }
  const appearance = await db.query('SELECT count(*) as cnt FROM appearance_settings');
  if (appearance.rows[0].cnt === 0) {
    await db.query("INSERT INTO appearance_settings DEFAULT VALUES");
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

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
