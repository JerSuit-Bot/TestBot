"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGuildDeleteHandler = void 0;
const logger_1 = require("@/lib/logger");
function registerGuildDeleteHandler(client, sink) {
    client.on('guildDelete', (guild) => {
        logger_1.logger.debug('bot', '[Bot] Guild removed', { guildId: guild.id });
        sink.adjustGuildCount(-1);
    });
}
exports.registerGuildDeleteHandler = registerGuildDeleteHandler;
