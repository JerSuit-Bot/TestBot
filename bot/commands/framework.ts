/**
 * JerSuit command framework — lightweight helpers shared by every command.
 *
 * Adds a compact, data-driven way to define real commands (including large
 * libraries of “static” commands whose reply is computed at runtime) on top of
 * the existing registry/defineCommand architecture.
 */
import type {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import { defineCommand, PERMS, error, success, requireOwner, isOwner, parseDuration, formatDuration, dbGuildId } from './helpers';
import { jerSuitEmbed } from './ui';
import type { CommandCategory, CommandExecute } from './types';

export { defineCommand, PERMS, error, success, requireOwner, isOwner, parseDuration, formatDuration, dbGuildId };
export type { CommandCategory, CommandExecute };

/** Checks channel-manage style executor permissions inside the polymorphic defineCommand. */
export interface StaticCommandInput {
  name: string;
  description: string;
  category: CommandCategory;
  /** Optional interaction-based handler. When provided it fully controls the reply. */
  execute?: CommandExecute;
  /** Simple string template rendered inside a JerSuit embed. */
  content?: string | ((i: ChatInputCommandInteraction) => string | Promise<string>);
  cooldown?: number;
  ownerOnly?: boolean;
  guildOnly?: boolean;
  memberPermissions?: bigint | null;
  usage?: string;
  examples?: string[];
  configurable?: boolean;
  toggleable?: boolean;
  disabled?: boolean;
  metadata?: Record<string, unknown>;
  builder?: (b: SlashCommandBuilder) => SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  embedFn?: (i: ChatInputCommandInteraction) => EmbedBuilder | Promise<EmbedBuilder>;
}

/**
 * Registers a command whose reply is primarily an embedded message. This keeps
 * short informational/utility commands to a few lines while staying fully real
 * (reads runtime data where the content function asks for it).
 */
export function staticCommand(input: StaticCommandInput) {
  const execute: CommandExecute = async (ctx) => {
    if (input.execute) {
      await input.execute(ctx);
      return;
    }
    if (input.embedFn) {
      const embed = await input.embedFn(ctx.interaction);
      await ctx.interaction.reply({ embeds: [embed], ephemeral: false });
      return;
    }
    const text = typeof input.content === 'function' ? await input.content(ctx.interaction) : (input.content ?? '');
    await ctx.interaction.reply({
      embeds: [jerSuitEmbed(input.name).setDescription(String(text))],
      ephemeral: false,
    });
  };

  return defineCommand({
    name: input.name,
    description: input.description,
    category: input.category,
    cooldown: input.cooldown ?? 2,
    ownerOnly: input.ownerOnly,
    guildOnly: input.guildOnly ?? true,
    memberPermissions: input.memberPermissions ?? null,
    usage: input.usage,
    examples: input.examples,
    configurable: input.configurable ?? true,
    toggleable: input.toggleable ?? true,
    disabled: input.disabled,
    builder: input.builder,
    execute,
  });
}

/** Registers a batch of static commands in one sweep. */
export function staticCommands(defs: StaticCommandInput[]): void {
  for (const def of defs) staticCommand(def);
}