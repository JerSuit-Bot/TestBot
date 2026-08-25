/**
 * Centralized command registry. Commands are keyed by their exact slash name
 * (aliases are not counted) and grouped by category.
 *
 * The dashboard discovers commands through getCommandDescriptors() - there is
 * no duplicated command list anywhere in the frontend.
 */
import type { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import type { Command, CommandDescriptor, CommandOptionInfo } from './types';
import { COMMAND_CATEGORIES, type CommandCategory } from './types';

const commands = new Map<string, Command>();

const DEFAULT_COOLDOWN = 2;

export function registerCommand(command: Command): void {
  if (!command.metadata) {
    command.metadata = {
      name: command.data.name,
      description:
        'description' in command.data && typeof command.data.description === 'string'
          ? command.data.description
          : command.data.name,
      category: command.category as CommandCategory,
    };
  }
  command.metadata.name = command.metadata.name || command.data.name;
  command.metadata.description = command.metadata.description || getDataDescription(command);
  command.metadata.category = command.category;
  commands.set(command.data.name, command);
}

export function getCommand(name: string): Command | undefined {
  return commands.get(name);
}

export function getAllCommands(): Command[] {
  return Array.from(commands.values());
}

export function getCommandCount(): number {
  return commands.size;
}

export function getCommandsByCategory(category: string): Command[] {
  return Array.from(commands.values()).filter((c) => c.metadata?.category === category);
}

export function getCategories(): CommandCategory[] {
  const present = new Set<string>(
    Array.from(commands.values()).map((c) => c.metadata?.category ?? 'general'),
  );
  return COMMAND_CATEGORIES.filter((c) => present.has(c));
}

/**
 * Builds serialisable command descriptors (safe for the Admin Panel API) from
 * the live registry. This is the single source of truth for the dashboard.
 */
export function getCommandDescriptors(): CommandDescriptor[] {
  return Array.from(commands.values()).map((c) => toDescriptor(c));
}

export function getCommandDescriptor(name: string): CommandDescriptor | null {
  const c = commands.get(name);
  return c ? toDescriptor(c) : null;
}

export function toDescriptor(command: Command): CommandDescriptor {
  const m = command.metadata ?? {};
  const data = command.data as SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;

  const options = extractOptions(data);
  const { subcommands } = extractSubcommands(data);

  /** Distinct option names map to all-string usage fragments. */
  const usage = m.usage ?? buildUsage(command.data.name, options);
  const category = (COMMAND_CATEGORIES as readonly string[]).includes(m.category as string)
    ? (m.category as CommandCategory)
    : 'general';

  return {
    name: command.data.name,
    description: m.description || getDataDescription(command),
    category,
    defaultMemberPermissions: command.defaultMemberPermissions?.toString() ?? null,
    cooldownSeconds: command.cooldownSeconds ?? m.cooldownSeconds ?? DEFAULT_COOLDOWN,
    guildOnly: m.guildOnly ?? true,
    ownerOnly: m.ownerOnly ?? false,
    enabledByDefault: !(m.disabled ?? false),
    usage,
    examples: m.examples ?? [],
    configurable: m.configurable ?? false,
    toggleable: m.toggleable ?? true,
    options,
    hasSubcommands: subcommands.length > 0,
    subcommands,
  };
}

function getDataDescription(c: Command): string {
  const data = c.data as { description?: string };
  return data.description ?? c.data.name;
}

function extractOptions(data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder): CommandOptionInfo[] {
  const options = (data as { options?: unknown[] }).options ?? [];
  const out: CommandOptionInfo[] = [];

  for (const opt of options as Array<Record<string, unknown>>) {
    // Subcommand groups / subcommands are handled separately.
    if ((opt as { type?: number }).type === 1 || (opt as { type?: number }).type === 2) continue;
    const typeMap: Record<number, CommandOptionInfo['type']> = {
      3: 'string',
      4: 'integer',
      5: 'boolean',
      6: 'user',
      7: 'channel',
      8: 'role',
      9: 'mentionable',
      10: 'number',
    };
    out.push({
      name: String(opt.name ?? ''),
      description: String(opt.description ?? ''),
      required: Boolean(opt.required),
      type: typeMap[Number(opt.type)] ?? 'string',
    });
  }
  return out;
}

function extractSubcommands(data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder): { subcommands: string[] } {
  const options = (data as { options?: unknown[] }).options ?? [];
  const subcommands: string[] = [];
  for (const opt of options as Array<Record<string, unknown>>) {
    if ((opt as { type?: number }).type === 1) subcommands.push(String(opt.name));
    if ((opt as { type?: number }).type === 2) {
      const groupOptions = (opt as { options?: unknown[] }).options ?? [];
      for (const sub of groupOptions as Array<Record<string, unknown>>) {
        subcommands.push(`${String(opt.name)} ${String(sub.name)}`);
      }
    }
  }
  return { subcommands };
}

function buildUsage(name: string, options: CommandOptionInfo[]): string {
  if (options.length === 0) return `/${name}`;
  const parts = options.map((o) => (o.required ? `<${o.name}>` : `[${o.name}]`));
  return `/${name} ${parts.join(' ')}`;
}

export { DEFAULT_COOLDOWN };
