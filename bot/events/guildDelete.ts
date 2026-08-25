/**
 * Real Discord `guildDelete` event handler.
 *
 * discord.js v14 emits `guildDelete` when a guild the bot is in is deleted or
 * the bot is removed. Decreases the runtime singleton guild-count telemetry.
 * No database operation is performed.
 */
import type { ClientEvents } from 'discord.js';
import { logger } from '@/lib/logger';
import type { RuntimeSink } from '@/bot/types';

export function registerGuildDeleteHandler(
  client: {
    on: (event: string, listener: (guild: ClientEvents['guildDelete'][0]) => void) => unknown;
  },
  sink: RuntimeSink,
): void {
  client.on('guildDelete', (guild: ClientEvents['guildDelete'][0]) => {
    logger.debug('bot', '[Bot] Guild removed', { guildId: guild.id });
    sink.adjustGuildCount(-1);
  });
}
