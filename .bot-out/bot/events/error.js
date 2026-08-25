"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerErrorHandler = void 0;
/**
 * Real Discord `error` event handler.
 *
 * discord.js v14 emits `error` when the REST/websocket layer produces an
 * error. Safely records it on the runtime manager without exposing secrets.
 */
const logger_1 = require("@/lib/logger");
function registerErrorHandler(client, sink) {
    client.on('error', (error) => {
        logger_1.logger.warn('bot', '[Bot] Discord error', { message: error.message });
        sink.noteError(error);
    });
}
exports.registerErrorHandler = registerErrorHandler;
