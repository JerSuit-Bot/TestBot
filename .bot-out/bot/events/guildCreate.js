"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGuildCreateHandler = void 0;
const logger_1 = require("@/lib/logger");
function registerGuildCreateHandler(client, sink) {
    client.on('guildCreate', (guild) => {
        logger_1.logger.debug('bot', '[Bot] Guild available', { guildId: guild.id });
        sink.adjustGuildCount(1);
    });
}
exports.registerGuildCreateHandler = registerGuildCreateHandler;
