/**
 * Command architecture types for the JerSuit bot.
 *
 * Every command carries rich metadata so the dashboard can automatically
 * discover and configure it from a single source of truth (the registry).
 */
import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandSubcommandGroupBuilder,
  SlashCommandSubcommandBuilder,
  PermissionResolvable,
} from 'discord.js';

export type CommandDataLikable =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | SlashCommandSubcommandGroupBuilder
  | SlashCommandSubcommandBuilder;

export interface CommandContext {
  interaction: ChatInputCommandInteraction;
  /** UTC epoch ms at which the command started (for cooldown accounting). */
  startedAt: number;
}

export type CommandExecute = (ctx: CommandContext) => Promise<void>;

export type CommandCategory =
  | 'moderation'
  | 'administration'
  | 'automod'
  | 'server'
  | 'channel'
  | 'roles'
  | 'user'
  | 'utility'
  | 'general'
  | 'information'
  | 'welcome'
  | 'goodbye'
  | 'logging'
  | 'tickets'
  | 'giveaways'
  | 'leveling'
  | 'economy'
  | 'reaction'
  | 'verification'
  | 'automation'
  | 'suggestions'
  | 'starboard'
  | 'voice'
  | 'music'
  | 'security'
  | 'anti-raid'
  | 'backup'
  | 'embeds'
  | 'developer'
  | 'owner'
  | 'configuration'
  | 'fun'
  | 'forms'
  | 'social';

export const COMMAND_CATEGORIES: readonly CommandCategory[] = [
  'moderation',
  'administration',
  'automod',
  'server',
  'channel',
  'roles',
  'user',
  'utility',
  'general',
  'information',
  'welcome',
  'goodbye',
  'logging',
  'tickets',
  'giveaways',
  'leveling',
  'economy',
  'reaction',
  'verification',
  'automation',
  'suggestions',
  'starboard',
  'voice',
  'music',
  'security',
  'anti-raid',
  'backup',
  'embeds',
  'developer',
  'owner',
  'configuration',
  'fun',
  'forms',
  'social',
];

export interface CommandOptionInfo {
  name: string;
  description: string;
  required?: boolean;
  type: 'string' | 'integer' | 'boolean' | 'user' | 'channel' | 'role' | 'number' | 'mentionable';
}

export interface CommandMetadata {
  name: string;
  description: string;
  category: CommandCategory;

  /** Minimum permission required to *use* the command in a guild. */
  defaultMemberPermissions?: bigint | null;
  /** Permissions the bot itself must hold for the command to work. */
  botPermissions?: PermissionResolvable[];

  /** Cooldown in seconds applied per user. 0 disables. */
  cooldownSeconds?: number;

  /** Whether the command may only run inside a guild. */
  guildOnly?: boolean;
  /** Whether the command is restricted to the platform owner (env-controlled). */
  ownerOnly?: boolean;
  /** Whether the command is disabled by default. */
  disabled?: boolean;

  /** Optional usage string shown on the dashboard (e.g. "/ban <user> [reason]"). */
  usage?: string;
  /** Example invocations shown on the dashboard. */
  examples?: string[];

  /** Whether the command is configurable from the Admin Panel and exposes settings. */
  configurable?: boolean;
  /** Whether this command can be disabled/enabled per server and globally. */
  toggleable?: boolean;

  /** Localized descriptions for slash commands. */
  nameLocalizations?: Record<string, string>;
  descriptionLocalizations?: Record<string, string>;
}

export interface Command {
  data: CommandDataLikable;
  category: CommandCategory;
  /**
   * Rich metadata. Optional at the source for legacy commands - the registry
   * synthesizes defaults when it is absent. New commands should always provide it.
   */
  metadata?: Partial<CommandMetadata>;
  /** Minimum required permission for this guild. Optional. */
  defaultMemberPermissions?: bigint | null;
  /** Cooldown in seconds applied per user. 0 disables. */
  cooldownSeconds?: number;
  execute: CommandExecute;
}

/** Stable metadata exposed to the dashboard (never functions / builders). */
export interface CommandDescriptor {
  name: string;
  description: string;
  category: CommandCategory;
  defaultMemberPermissions: string | null;
  cooldownSeconds: number;
  guildOnly: boolean;
  ownerOnly: boolean;
  enabledByDefault: boolean;
  usage: string | null;
  examples: string[];
  configurable: boolean;
  toggleable: boolean;
  options: CommandOptionInfo[];
  hasSubcommands: boolean;
  subcommands: string[];
}
