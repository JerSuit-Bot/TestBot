/**
 * Shared helpers for writing JerSuit commands with less boilerplate.
 */
import {
  SlashCommandBuilder,
  EmbedBuilder,

  PermissionFlagsBits,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import type { Command, CommandExecute, CommandMetadata, CommandCategory } from './types';
import { registerCommand } from './registry';
import { jerSuitEmbed, jerSuitErrorEmbed } from './ui';

/** Common Discord permission bit values. */
export const PERMS = {
  ADMINISTRATOR: 8n,
  MANAGE_GUILD: 32n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_CHANNELS: 16n,
  KICK_MEMBERS: 2n,
  BAN_MEMBERS: 4n,
  MANAGE_MESSAGES: 1n << 13n,
  MODERATE_MEMBERS: 1n << 40n,
  MANAGE_NICKNAMES: 1n << 3n,
  SEND_MESSAGES: 1n << 11n,
  MENTION_EVERYONE: 1n << 17n,
} as const;

export { PermissionFlagsBits };
export type { CommandCategory, Command };

/**
 * Creates a command from a builder and metadata and registers it immediately.
 */
export function defineCommand(options: {
  name: string;
  description: string;
  category: CommandCategory;
  builder?: (
    b: SlashCommandBuilder,
  ) => SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  memberPermissions?: bigint | null;
  botPermissions?: bigint[];
  cooldown?: number;
  guildOnly?: boolean;
  ownerOnly?: boolean;
  disabled?: boolean;
  usage?: string;
  examples?: string[];
  configurable?: boolean;
  toggleable?: boolean;
  nameLocalizations?: Record<string, string>;
  descriptionLocalizations?: Record<string, string>;
  metadata?: Partial<CommandMetadata>;
  execute: CommandExecute;
}): Command {
  const baseBuilder = new SlashCommandBuilder()
    .setName(options.name)
    .setDescription(options.description);

  const built:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder =
    options.builder ? options.builder(baseBuilder) : baseBuilder;

  if (options.nameLocalizations) {
    built.setNameLocalizations(options.nameLocalizations);
  }
  if (options.descriptionLocalizations) {
    built.setDescriptionLocalizations(options.descriptionLocalizations);
  }

  const metadata: CommandMetadata = {
    name: options.name,
    description: options.description,
    category: options.category,
    defaultMemberPermissions: options.memberPermissions ?? null,
    botPermissions: options.botPermissions ?? [],
    cooldownSeconds: options.cooldown ?? 0,
    guildOnly: options.guildOnly ?? true,
    ownerOnly: options.ownerOnly ?? false,
    disabled: options.disabled ?? false,
    usage: options.usage,
    examples: options.examples,
    configurable: options.configurable ?? true,
    toggleable: options.toggleable ?? true,
    nameLocalizations: options.nameLocalizations,
    descriptionLocalizations: options.descriptionLocalizations,
    ...(options.metadata ?? {}),
  };

  const command: Command = {
    data: built,
    category: options.category,
    defaultMemberPermissions: options.memberPermissions ?? null,
    cooldownSeconds: options.cooldown ?? 0,
    metadata,
    execute: options.execute,
  };
  registerCommand(command);
  return command;
}

/** Replies with a plain JerSuit success embed. */
export async function success(
  interaction: import('discord.js').ChatInputCommandInteraction,
  descriptionOrEmbed: string | EmbedBuilder,
  ephemeral = false,
): Promise<void> {
  const embed = typeof descriptionOrEmbed === 'string'
    ? jerSuitEmbed().setColor(0x199155).setDescription(descriptionOrEmbed)
    : descriptionOrEmbed;
  await interaction.reply({ embeds: [embed], ephemeral });
}

/** Replies with a danger embed. */
export async function error(
  interaction: import('discord.js').ChatInputCommandInteraction,
  description: string,
  ephemeral = true,
): Promise<void> {
  await interaction.reply({ embeds: [jerSuitErrorEmbed(description)], ephemeral });
}

/** Checks whether the invoking user is the platform owner. */
export async function isOwner(userId: string): Promise<boolean> {
  const configId = process.env.PLATFORM_OWNER_DISCORD_ID;
  if (configId && userId === configId) return true;
  try {
    const { getDb } = await import('@/lib/db');
    const db = await getDb();
    const res = await db.query<{ is_platform_owner: boolean }>(
      'SELECT is_platform_owner FROM users WHERE discord_id = $1 LIMIT 1',
      [userId],
    );
    return res.rows[0]?.is_platform_owner === true;
  } catch {
    return false;
  }
}

/** Requires the platform owner; returns false when rejected. */
export async function requireOwner(
  interaction: import('discord.js').ChatInputCommandInteraction,
): Promise<boolean> {
  if (await isOwner(interaction.user.id)) return true;
  await error(interaction, 'This command is restricted to the platform owner.');
  return false;
}

/** Parses a duration string like "1d 2h 30m 5s" into seconds (or null). */
export function parseDuration(input: string): number | null {
  const regex = /(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hour|hours|d|day|days|w|week|weeks)/gi;
  let total = 0;
  let matches = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(input)) !== null) {
    matches += 1;
    const value = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    if (unit.startsWith('s')) total += value;
    else if (unit.startsWith('m')) total += value * 60;
    else if (unit.startsWith('h')) total += value * 3600;
    else if (unit.startsWith('d')) total += value * 86400;
    else if (unit.startsWith('w')) total += value * 604800;
  }
  return matches > 0 ? total : null;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return seconds + 's';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h) parts.push(h + 'h');
  if (m) parts.push(m + 'm');
  if (s) parts.push(s + 's');
  return parts.join(' ') || '0s';
}

/** Resolves the internal guild id for a Discord guild (returns null when absent). */
export async function dbGuildId(discordGuildId: string | null): Promise<string | null> {
  if (!discordGuildId) return null;
  const { getGuildDbIdByDiscordId } = await import('@/lib/services');
  return getGuildDbIdByDiscordId(discordGuildId);
}
