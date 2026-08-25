/**
 * Per-command and per-feature configuration loader.
 *
 * The Admin Panel writes overrides into the database (platform settings for
 * global command settings, guild_settings.command_overrides for per-server).
 * This module merges static defaults + database overrides at runtime so every
 * dashboard control has a real effect inside the bot.
 */
import type { ChatInputCommandInteraction, Client } from 'discord.js';
import { ChannelType, type TextChannel } from 'discord.js';
import { getGlobalCommandSettings, getGuildCommandOverrides } from '@/lib/services';

/** Defaults applied to every command when no override exists. */
export interface CommandRuntimeSettings {
  enabled: boolean;
  cooldownSeconds: number;
  allowedRoles: string[];
  blockedRoles: string[];
  requiredPermission: string | null;
  responseMessage: string | null;
  dmMessage: string | null;
  logEnabled: boolean;
  logChannelId: string | null;
  punishmentReason: string | null;
}

export const DEFAULT_COMMAND_RUNTIME: CommandRuntimeSettings = {
  enabled: true,
  cooldownSeconds: 2,
  allowedRoles: [],
  blockedRoles: [],
  requiredPermission: null,
  responseMessage: null,
  dmMessage: null,
  logEnabled: false,
  logChannelId: null,
  punishmentReason: null,
};

/**
 * Merges global overrides + per-guild overrides for a single command.
 * Runs a DB read on first call per (guild,name) then caches for the lifetime
 * of the process (ok for single-replica runtime; dashboard saves invalidate).
 */
const cache = new Map<string, CommandRuntimeSettings>();

export function invalidateCommandSettings(guildId: string | null, name: string): void {
  cache.delete(`${guildId ?? 'global'}:${name}`);
  cache.delete(`global:${name}`);
}

export function invalidateAllCommandSettings(): void {
  cache.clear();
}

export async function getCommandSettings(
  guildId: string | null,
  name: string,
): Promise<CommandRuntimeSettings> {
  const key = `${guildId ?? 'global'}:${name}`;
  const cached = cache.get(key);
  if (cached) return cached;

  let guildOverrides: Record<string, unknown> = {};
  let globalOverrides: Record<string, unknown> = {};

  if (guildId) {
    guildOverrides = await getGuildCommandOverrides(guildId, name).catch(() => ({}));
  }
  globalOverrides = await getGlobalCommandSettings(name).catch(() => ({}));

  const merged: CommandRuntimeSettings = {
    ...DEFAULT_COMMAND_RUNTIME,
    cooldownSeconds: DEFAULT_COMMAND_RUNTIME.cooldownSeconds,
    ...normalize(globalOverrides),
    ...normalize(guildOverrides),
  };

  cache.set(key, merged);
  return merged;
}

function normalize(raw: Record<string, unknown>): Partial<CommandRuntimeSettings> {
  const out: Partial<CommandRuntimeSettings> = {};
  const rawSettings = (raw.settings ?? raw) as Record<string, unknown>;

  if (typeof rawSettings.enabled === 'boolean') out.enabled = rawSettings.enabled;
  if (typeof rawSettings.cooldownSeconds === 'number') out.cooldownSeconds = rawSettings.cooldownSeconds;
  if (typeof rawSettings.cooldown === 'number') out.cooldownSeconds = rawSettings.cooldown;
  if (Array.isArray(rawSettings.allowedRoles)) out.allowedRoles = rawSettings.allowedRoles.map(String);
  if (Array.isArray(rawSettings.blockedRoles)) out.blockedRoles = rawSettings.blockedRoles.map(String);
  if (typeof rawSettings.requiredPermission === 'string' && rawSettings.requiredPermission) {
    out.requiredPermission = rawSettings.requiredPermission;
  }
  if (typeof rawSettings.responseMessage === 'string') out.responseMessage = rawSettings.responseMessage;
  if (typeof rawSettings.dmMessage === 'string') out.dmMessage = rawSettings.dmMessage;
  if (typeof rawSettings.logEnabled === 'boolean') out.logEnabled = rawSettings.logEnabled;
  if (typeof rawSettings.logChannelId === 'string') out.logChannelId = rawSettings.logChannelId;
  if (typeof rawSettings.punishmentReason === 'string') out.punishmentReason = rawSettings.punishmentReason;

  return out;
}

/** Resolves the guild language (for bot i18n). */
export async function getGuildLanguage(interaction: ChatInputCommandInteraction): Promise<string> {
  try {
    const guildId = await resolveGuildDbId(interaction).catch(() => null);
    if (guildId) {
      const { getGuildSettings } = await import('@/lib/services');
      const settings = await getGuildSettings(guildId);
      if (settings?.language) return settings.language;
    }
  } catch { /* default */ }
  return 'en';
}

/** Resolves the internal guild_settings row id for a Discord guild. */
export async function resolveGuildDbId(interaction: ChatInputCommandInteraction): Promise<string | null> {
  const { getGuildDbIdByDiscordId } = await import('@/lib/services');
  return getGuildDbIdByDiscordId(interaction.guildId ?? '');
}

/** Helper used across moderation commands to write audit / mod cases. */
export function resolveMemberName(name: string | null): string {
  return name ?? 'Unknown User';
}

export function resolveChannel(client: Client, id: string | null): TextChannel | null {
  if (!id) return null;
  const c = client.channels.cache.get(id);
  return c && c.type === ChannelType.GuildText ? (c as TextChannel) : null;
}
