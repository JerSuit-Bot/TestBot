/**
 * Real Discord `guildCreate` event handler.
 *
 * discord.js v14 emits `guildCreate` when a guild becomes available to the
 * bot. The ready snapshot already captured an initial guild count; this event
 * keeps runtime telemetry correct when the bot is added to / guilds become
 * available after ready.
 *
 * NOTE: The current implementation keeps telemetry purely in-memory on the
 * runtime manager. No database write is performed here.
 */
import type { ClientEvents } from 'discord.js';
import { logger } from '@/lib/logger';
import type { RuntimeSink } from '@/bot/types';

export function registerGuildCreateHandler(
  client: { on: (event: string, listener: (guild: ClientEvents['guildCreate'][0]) => void) => unknown },
  sink: RuntimeSink,
): void {
  client.on('guildCreate', (guild: ClientEvents['guildCreate'][0]) => {
    logger.debug('bot', '[Bot] Guild available', { guildId: guild.id });
    sink.adjustGuildCount(1);
  });
}
