import { supabase } from '@/lib/supabase';
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

// ─── Users ───

export async function upsertUserFromDiscord(
  discordId: string,
  username: string,
  displayName: string | null,
  avatar: string | null,
): Promise<string> {
  const platformOwnerId = process.env.PLATFORM_OWNER_DISCORD_ID;
  const isOwner = platformOwnerId ? discordId === platformOwnerId : false;

  try {
    const { data, error } = await supabase.rpc('upsert_user_from_discord', {
      p_discord_id: discordId,
      p_username: username,
      p_display_name: displayName,
      p_avatar: avatar,
    });
    if (error) throw error;
    if (isOwner) {
      await supabase.from('users').update({ is_platform_owner: true }).eq('discord_id', discordId);
    }
    return data as string;
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
  try {
    const { data, error } = await supabase.rpc('create_session', {
      p_user_id: userId,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_hours: hours,
    });
    if (error) throw error;
    return data as string;
  } catch (e) {
    logger.error('db', 'createSession failed', { error: (e as Error).message });
    throw new DatabaseError((e as Error).message);
  }
}

export async function validateSession(token: string): Promise<SessionUser | null> {
  try {
    const { data, error } = await supabase.rpc('validate_session', { p_token: token });
    if (error) throw error;
    if (!data || !(data as any).valid) return null;
    return (data as any).user as SessionUser;
  } catch (e) {
    logger.error('db', 'validateSession failed', { error: (e as Error).message });
    return null;
  }
}

export async function deleteSession(token: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('delete_session', { p_token: token });
    if (error) throw error;
  } catch (e) {
    logger.error('db', 'deleteSession failed', { error: (e as Error).message });
  }
}

export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_sessions');
    if (error) throw error;
    return (data as number) || 0;
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
  try {
    const { data, error } = await supabase.rpc('create_admin_session', {
      p_username: username,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_hours: hours,
    });
    if (error) throw error;
    return data as string;
  } catch (e) {
    logger.error('db', 'createAdminSession failed', { error: (e as Error).message });
    throw new DatabaseError((e as Error).message);
  }
}

export async function validateAdminSession(token: string): Promise<AdminSession | null> {
  try {
    const { data, error } = await supabase.rpc('validate_admin_session', { p_token: token });
    if (error) throw error;
    if (!data || !(data as any).valid) return null;
    return { valid: true, username: (data as any).username as string };
  } catch (e) {
    logger.error('db', 'validateAdminSession failed', { error: (e as Error).message });
    return null;
  }
}

export async function deleteAdminSession(token: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('delete_admin_session', { p_token: token });
    if (error) throw error;
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
  try {
    const guildsJson = guilds.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: g.owner,
      permissions: g.permissions,
      member_count: g.member_count,
      bot_added: g.bot_added,
    }));
    const { error } = await supabase.rpc('sync_user_guilds', {
      p_user_id: userId,
      p_guilds: guildsJson,
    });
    if (error) throw error;
  } catch (e) {
    logger.error('db', 'syncUserGuilds failed', { error: (e as Error).message });
  }
}

export async function getUserGuilds(sessionToken: string): Promise<GuildWithAccess[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_guilds_with_access', { p_token: sessionToken });
    if (error) throw error;
    if (!data) return [];
    if (Array.isArray(data)) return data as GuildWithAccess[];
    return [];
  } catch (e) {
    logger.error('db', 'getUserGuilds failed', { error: (e as Error).message });
    return [];
  }
}

export async function verifyGuildAccess(
  userId: string,
  discordGuildId: string,
): Promise<{ guildId: string; role: string } | null> {
  try {
    const { data, error } = await supabase
      .from('guilds')
      .select('id, guild_memberships!inner(role)')
      .eq('discord_id', discordGuildId)
      .eq('guild_memberships.user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const memberships = data.guild_memberships as any[];
    if (!memberships || memberships.length === 0) return null;
    return { guildId: data.id as string, role: memberships[0].role as string };
  } catch (e) {
    logger.error('db', 'verifyGuildAccess failed', { error: (e as Error).message });
    return null;
  }
}

export async function getGuildSettings(guildId: string): Promise<GuildSettings | null> {
  try {
    const { data, error } = await supabase
      .from('guild_settings')
      .select('*')
      .eq('guild_id', guildId)
      .maybeSingle();
    if (error) throw error;
    return data as GuildSettings | null;
  } catch (e) {
    logger.error('db', 'getGuildSettings failed', { error: (e as Error).message });
    return null;
  }
}

export async function updateGuildSettings(guildId: string, settings: Partial<GuildSettings>): Promise<void> {
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

  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (allowedFields.includes(key)) update[key] = value;
  }
  if (Object.keys(update).length === 0) return;
  update.updated_at = new Date().toISOString();

  try {
    const { error } = await supabase.from('guild_settings').update(update).eq('guild_id', guildId);
    if (error) throw error;
  } catch (e) {
    logger.error('db', 'updateGuildSettings failed', { error: (e as Error).message });
    throw new DatabaseError((e as Error).message);
  }
}

// ─── Audit Logs ───

export async function createAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const { error } = await supabase.rpc('create_audit_log', {
      p_actor_id: entry.actor_id ?? null,
      p_actor_name: entry.actor_name ?? null,
      p_action: entry.action,
      p_target: entry.target ?? null,
      p_guild_id: entry.guild_id ?? null,
      p_result: entry.result ?? 'success',
      p_metadata: entry.metadata ?? {},
    });
    if (error) throw error;
  } catch (e) {
    logger.error('db', 'createAuditLog failed', { error: (e as Error).message });
  }
}

export async function getAuditLogs(limit: number = 50, offset: number = 0): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, actor_name, action, target, result, metadata, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  } catch (e) {
    logger.error('db', 'getAuditLogs failed', { error: (e as Error).message });
    return [];
  }
}

// ─── Security Events ───

export async function createSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    const { error } = await supabase.from('security_events').insert({
      user_id: event.user_id ?? null,
      type: event.type,
      severity: event.severity ?? 'info',
      metadata: event.metadata ?? {},
      ip_address: event.ip_address ?? null,
    });
    if (error) throw error;
  } catch (e) {
    logger.error('db', 'createSecurityEvent failed', { error: (e as Error).message });
  }
}

export async function getSecurityEvents(userId?: string, limit: number = 50): Promise<any[]> {
  try {
    let query = supabase
      .from('security_events')
      .select('id, user_id, type, severity, metadata, ip_address, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) {
    logger.error('db', 'getSecurityEvents failed', { error: (e as Error).message });
    return [];
  }
}

// ─── Bot Status ───

export async function getBotStatus(): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_bot_status');
    if (error) throw error;
    return data || { state: 'offline', token_configured: false };
  } catch (e) {
    logger.error('db', 'getBotStatus failed', { error: (e as Error).message });
    return { state: 'offline', token_configured: false };
  }
}

export async function getBotConfiguration(adminToken: string): Promise<any | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;
  try {
    const { data, error } = await supabase.rpc('get_bot_configuration', { p_token: adminToken });
    if (error) throw error;
    return data || null;
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
  try {
    const { error } = await supabase.rpc('update_bot_configuration', {
      p_token: adminToken,
      p_status: updates.status ?? null,
      p_activity_type: updates.activity_type ?? null,
      p_activity_name: updates.activity_name ?? null,
      p_token_configured: updates.token_configured ?? null,
    });
    if (error) throw error;
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
  try {
    const { data, error } = await supabase.rpc('issue_bot_command', {
      p_token: adminToken,
      p_command: command,
      p_payload: payload,
    });
    if (error) throw error;
    return (data as any)?.command_id ?? null;
  } catch (e) {
    logger.error('db', 'issueBotCommand failed', { error: (e as Error).message });
    return null;
  }
}

// ─── Platform Stats ───

export async function getPlatformStats(adminToken: string): Promise<any | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;
  try {
    const { data, error } = await supabase.rpc('get_platform_stats', { p_token: adminToken });
    if (error) throw error;
    return data;
  } catch (e) {
    logger.error('db', 'getPlatformStats failed', { error: (e as Error).message });
    return null;
  }
}

export async function getAllUsers(adminToken: string, limit: number = 50, offset: number = 0): Promise<any[] | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;
  try {
    const { data, error } = await supabase.rpc('get_all_users', {
      p_token: adminToken,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    return data || [];
  } catch (e) {
    logger.error('db', 'getAllUsers failed', { error: (e as Error).message });
    return null;
  }
}

export async function getAllGuilds(adminToken: string, limit: number = 50, offset: number = 0): Promise<any[] | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;
  try {
    const { data, error } = await supabase.rpc('get_all_guilds', {
      p_token: adminToken,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    return data || [];
  } catch (e) {
    logger.error('db', 'getAllGuilds failed', { error: (e as Error).message });
    return null;
  }
}

// ─── Moderation Cases ───

export async function getModerationCases(guildId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('moderation_cases')
      .select('id, case_number, action, target_id, target_name, moderator_id, moderator_name, reason, duration, created_at')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  } catch (e) {
    logger.error('db', 'getModerationCases failed', { error: (e as Error).message });
    return [];
  }
}

// ─── Tickets ───

export async function getTickets(guildId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('id, channel_id, user_id, user_name, status, category, assigned_to, created_at, closed_at')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  } catch (e) {
    logger.error('db', 'getTickets failed', { error: (e as Error).message });
    return [];
  }
}

// ─── Automations ───

export async function getAutomations(guildId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('automations')
      .select('id, name, trigger, conditions, actions, enabled, created_at, updated_at')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
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
  try {
    const { data, error } = await supabase
      .from('automations')
      .insert({ guild_id: guildId, name, trigger, conditions, actions })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  } catch (e) {
    logger.error('db', 'createAutomation failed', { error: (e as Error).message });
    return null;
  }
}

export async function deleteAutomation(guildId: string, automationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('automations')
      .delete()
      .eq('id', automationId)
      .eq('guild_id', guildId);
    if (error) throw error;
    return true;
  } catch (e) {
    logger.error('db', 'deleteAutomation failed', { error: (e as Error).message });
    return false;
  }
}

export async function toggleAutomation(guildId: string, automationId: string, enabled: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('automations')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('id', automationId)
      .eq('guild_id', guildId);
    if (error) throw error;
    return true;
  } catch (e) {
    logger.error('db', 'toggleAutomation failed', { error: (e as Error).message });
    return false;
  }
}

// ─── Appearance ───

export async function getAppearanceSettings(): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_appearance_settings');
    if (error) throw error;
    return data || null;
  } catch (e) {
    logger.error('db', 'getAppearanceSettings failed', { error: (e as Error).message });
    return null;
  }
}

export async function updateAppearanceSettings(adminToken: string, settings: Record<string, unknown>): Promise<boolean> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return false;
  try {
    const { error } = await supabase.rpc('update_appearance_settings', {
      p_token: adminToken,
      p_settings: settings,
    });
    if (error) throw error;
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
  try {
    const { data, error } = await supabase.rpc('get_message_templates', { p_token: adminToken });
    if (error) throw error;
    return data || [];
  } catch (e) {
    logger.error('db', 'getMessageTemplates failed', { error: (e as Error).message });
    return null;
  }
}

export async function createMessageTemplate(adminToken: string, template: Record<string, unknown>): Promise<string | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;
  try {
    const { data, error } = await supabase.rpc('create_message_template', {
      p_token: adminToken,
      p_name: template.name as string,
      p_type: (template.type as string) || 'custom',
      p_title: (template.title as string) || null,
      p_description: (template.description as string) || null,
      p_footer: (template.footer as string) || null,
      p_author: (template.author as string) || null,
      p_thumbnail: (template.thumbnail as string) || null,
      p_image: (template.image as string) || null,
      p_color: (template.color as string) || '#199155',
      p_content: (template.content as string) || null,
    });
    if (error) throw error;
    return (data as any)?.id ?? null;
  } catch (e) {
    logger.error('db', 'createMessageTemplate failed', { error: (e as Error).message });
    return null;
  }
}

export async function deleteMessageTemplate(adminToken: string, templateId: string): Promise<boolean> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return false;
  try {
    const { error } = await supabase.rpc('delete_message_template', {
      p_token: adminToken,
      p_template_id: templateId,
    });
    if (error) throw error;
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
  try {
    const { data, error } = await supabase.rpc('get_scheduled_messages', { p_token: adminToken });
    if (error) throw error;
    return data || [];
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
  try {
    const { data, error } = await supabase.rpc('create_scheduled_message', {
      p_token: adminToken,
      p_target_type: targetType,
      p_target_id: targetId,
      p_target_name: targetName,
      p_content: content,
      p_scheduled_at: scheduledAt,
    });
    if (error) throw error;
    return (data as any)?.id ?? null;
  } catch (e) {
    logger.error('db', 'createScheduledMessage failed', { error: (e as Error).message });
    return null;
  }
}

export async function cancelScheduledMessage(adminToken: string, messageId: string): Promise<boolean> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return false;
  try {
    const { error } = await supabase.rpc('cancel_scheduled_message', {
      p_token: adminToken,
      p_message_id: messageId,
    });
    if (error) throw error;
    return true;
  } catch (e) {
    logger.error('db', 'cancelScheduledMessage failed', { error: (e as Error).message });
    return false;
  }
}

export async function getMessageHistory(adminToken: string, limit: number = 50, offset: number = 0): Promise<any[] | null> {
  const admin = await validateAdminSession(adminToken);
  if (!admin) return null;
  try {
    const { data, error } = await supabase.rpc('get_message_history', {
      p_token: adminToken,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    return data || [];
  } catch (e) {
    logger.error('db', 'getMessageHistory failed', { error: (e as Error).message });
    return null;
  }
}

// ─── User Settings ───

export async function getUserSetting(userId: string, key: string): Promise<unknown | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    return data?.value ?? null;
  } catch (e) {
    logger.error('db', 'getUserSetting failed', { error: (e as Error).message });
    return null;
  }
}

export async function setUserSetting(userId: string, key: string, value: unknown): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' });
    if (error) throw error;
  } catch (e) {
    logger.error('db', 'setUserSetting failed', { error: (e as Error).message });
  }
}
