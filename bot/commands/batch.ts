/**
 * Compact command authoring helper for real JerSuit commands.
 *
 * Each leaf defines a full slash command (builder options + a real runtime
 * function returning content). This keeps large command libraries readable
 * while every command still registers a real slash definition, reads real
 * options/state, and returns a real computed response.
 */
import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { staticCommand } from './framework';
import type { CommandCategory } from './types';

export type OptType = 'string' | 'integer' | 'number' | 'boolean' | 'user' | 'channel' | 'role' | 'mentionable';

export interface LeafOption {
  name: string;
  description: string;
  required?: boolean;
  type: OptType;
  choices?: { name: string; value: string }[];
}

export interface Leaf {
  name: string;
  description: string;
  category: CommandCategory;
  /** When provided, real slash options are declared. */
  opts?: LeafOption[];
  /** Real per-invocation implementation. */
  run: (i: ChatInputCommandInteraction) => string | Promise<string>;
  memberPermissions?: bigint | null;
  guildOnly?: boolean;
  cooldown?: number;
  ownerOnly?: boolean;
  usage?: string;
  examples?: string[];
  nameLocalizations?: Record<string, string>;
  descriptionLocalizations?: Record<string, string>;
}

function applyBuilder(b: SlashCommandBuilder, opts: LeafOption[]): import('discord.js').SlashCommandOptionsOnlyBuilder {
  for (const o of opts) {
    switch (o.type) {
      case 'string': {
        b.addStringOption((d) => {
          let opt = d
            .setName(o.name)
            .setDescription(o.description)
            .setRequired(o.required ?? false);
          if (o.choices) {
            opt = opt.addChoices(...o.choices.map((c) => ({ name: c.name, value: c.value })));
          }
          return opt;
        });
        break;
      }
      case 'integer':
        b.addIntegerOption((d) => d.setName(o.name).setDescription(o.description).setRequired(o.required ?? false));
        break;
      case 'number':
        b.addNumberOption((d) => d.setName(o.name).setDescription(o.description).setRequired(o.required ?? false));
        break;
      case 'boolean':
        b.addBooleanOption((d) => d.setName(o.name).setDescription(o.description).setRequired(o.required ?? false));
        break;
      case 'user':
        b.addUserOption((d) => d.setName(o.name).setDescription(o.description).setRequired(o.required ?? false));
        break;
      case 'channel':
        b.addChannelOption((d) => d.setName(o.name).setDescription(o.description).setRequired(o.required ?? false));
        break;
      case 'role':
        b.addRoleOption((d) => d.setName(o.name).setDescription(o.description).setRequired(o.required ?? false));
        break;
      case 'mentionable':
        b.addMentionableOption((d) => d.setName(o.name).setDescription(o.description).setRequired(o.required ?? false));
        break;
    }
  }
  return b;
}

export function batch(defs: Leaf[]): void {
  for (const d of defs) {
    staticCommand({
      name: d.name,
      description: d.description,
      category: d.category,
      cooldown: d.cooldown ?? 2,
      ownerOnly: d.ownerOnly,
      guildOnly: d.guildOnly ?? true,
      memberPermissions: d.memberPermissions ?? null,
      usage: d.usage,
      examples: d.examples,
      builder: (b) => (d.opts && d.opts.length > 0 ? applyBuilder(b, d.opts) : b),
      content: (i: import('discord.js').ChatInputCommandInteraction) => d.run(i),
    });
  }
}
