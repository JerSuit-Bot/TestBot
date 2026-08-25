"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerReadyHandler = void 0;
const logger_1 = require("@/lib/logger");
/**
 * Installs a `clientReady` listener on the given client.
 *
 * @param client   the authenticated client (typically already logged in)
 * @param sink     the runtime telemetry sink
 * @param resolve  resolves the ready wait in the Runtime Manager
 */
function registerReadyHandler(client, sink, resolve) {
    const onReady = (readyClient) => {
        if (!readyClient.isReady())
            return;
        // discord.js v14 exposes the connected user, ready timestamp and uptime.
        const user = readyClient.user;
        const guildCount = readyClient.guilds.cache.size ?? 0;
        const readyAt = new Date(readyClient.readyAt instanceof Date ? readyClient.readyAt.getTime() : Date.now());
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
        logger_1.logger.info('bot', `[Bot] Ready as ${user.username}`, {
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
exports.registerReadyHandler = registerReadyHandler;
