/**
 * Real Discord `ready` event handler.
 *
 * discord.js v14 emits `clientReady` (and the aliased `ready` event) with the
 * connected `Client<true>`. This handler is wired by the Runtime Manager after
 * `login()` and represents a *real* Gateway connection: it carries the actual
 * bot user, the actual requested guild count, and the Gateway ready timestamp.
 */
import type { Client } from 'discord.js';
import type { ClientEvents } from 'discord.js';
import { logger } from '@/lib/logger';
import type { RuntimeSink } from '@/bot/types';

/**
 * Installs a `clientReady` listener on the given client.
 *
 * @param client   the authenticated client (typically already logged in)
 * @param sink     the runtime telemetry sink
 * @param resolve  resolves the ready wait in the Runtime Manager
 */
export function registerReadyHandler(
  client: Client,
  sink: RuntimeSink,
  resolve: () => void,
): void {
  const onReady = (readyClient: ClientEvents['clientReady'][0]): void => {
    if (!readyClient.isReady()) return;

    // discord.js v14 exposes the connected user, ready timestamp and uptime.
    const user = readyClient.user;
    const guildCount = readyClient.guilds.cache.size ?? 0;
    const readyAt = new Date(
      readyClient.readyAt instanceof Date ? readyClient.readyAt.getTime() : Date.now(),
    );

    const tag = typeof user.tag === 'string' ? user.tag : null;
    const displayName = typeof user.displayName === 'string' ? user.displayName : null;

    sink.markReady({
      botUser: {
        id: user.id,
        username: user.username,
        tag,
        displayName,
      },
      guildCount,
      readyAt,
    });

    logger.info('bot', `[Bot] Ready as ${user.username}`, {
      userId: user.id,
      guildCount,
      readyAt: readyAt.toISOString(),
    });

    // Release the Runtime Manager's start() waiter.
    resolve();
  };

  // discord.js emits both `clientReady` and the deprecated `ready` alias; we
  // listen to the canonical `clientReady` event.
  client.on('clientReady', onReady);
}
