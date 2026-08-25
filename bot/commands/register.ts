/**
 * Idempotent slash-command registration for the JerSuit bot.
 *
 * Uses the full-sync `.set()` API so the command set is replaced atomically -
 * never appended - which guarantees no duplicate registrations across restarts
 * or hot reloads. Commands disabled via the Admin Panel are filtered out here
 * so a disabled command is truly unavailable in Discord.
 */
import type { Client, GuildResolvable, ApplicationCommandDataResolvable } from 'discord.js';
import { logger } from '@/lib/logger';
import { getAllCommands } from './registry';
import { getGlobalCommandSettings } from '@/lib/services';

export async function collectCommandData(): Promise<ApplicationCommandDataResolvable[]> {
  const commands = getAllCommands();
  const resolvable: ApplicationCommandDataResolvable[] = [];

  for (const c of commands) {
    try {
      const settings = (await getGlobalCommandSettings(c.data.name)) as Record<string, unknown>;
      const inner = (settings.settings ?? settings) as Record<string, unknown>;
      const enabled = inner.enabled !== false && settings.enabled !== false;
      if (!enabled) continue;
      resolvable.push(c.data.toJSON() as ApplicationCommandDataResolvable);
    } catch {
      resolvable.push(c.data.toJSON() as ApplicationCommandDataResolvable);
    }
  }
  return resolvable;
}

export async function registerGlobalCommands(client: Client<true>): Promise<void> {
  const commands = await collectCommandData();
  if (commands.length === 0) return;
  await client.application.commands.set(commands);
  logger.info('bot', `[Bot] Registered ${commands.length} global commands`);
}

export async function registerGuildCommands(client: Client<true>, guildId: string): Promise<void> {
  const commands = await collectCommandData();
  const guild = client.guilds.resolve(guildId);
  if (!guild) return;
  await guild.commands.set(commands);
  logger.info('bot', `[Bot] Registered ${commands.length} guild commands`);
}
