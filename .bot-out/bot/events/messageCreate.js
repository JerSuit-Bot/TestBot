"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMessageHandler = exports.LEVEL_XP_COOLDOWN_MS = void 0;
const logger_1 = require("@/lib/logger");
let handlerInstalled = false;
/** Per-user XP cooldown (seconds between XP-granting messages). */
exports.LEVEL_XP_COOLDOWN_MS = 60000;
function registerMessageHandler(client, sink) {
    if (handlerInstalled)
        return;
    handlerInstalled = true;
    client.on('messageCreate', (message) => {
        void (async () => {
            try {
                if (message.author.bot || !message.inGuild())
                    return;
                const { getGuildDbIdByDiscordId, getGuildSettings } = await Promise.resolve().then(() => __importStar(require('@/lib/services')));
                const guildDbId = await getGuildDbIdByDiscordId(message.guildId);
                if (!guildDbId)
                    return;
                const settings = await getGuildSettings(guildDbId);
                if (!settings)
                    return;
                // Leveling.
                const s = settings;
                if (s.leveling_enabled === true) {
                    await awardXp(message, guildDbId, s);
                }
                // Custom commands via prefix (!name) - configurable prefix support.
                const prefix = typeof s.prefix === 'string' && s.prefix ? s.prefix : '!';
                if (message.content.startsWith(prefix)) {
                    const name = message.content.slice(prefix.length).split(/\s+/)[0]?.toLowerCase();
                    if (name) {
                        const { runCustomCommand } = await Promise.resolve().then(() => __importStar(require('@/bot/custom')));
                        await runCustomCommand(message, name, prefix);
                    }
                }
            }
            catch (error) {
                logger_1.logger.warn('bot', 'messageCreate handling failed', {
                    message: error instanceof Error ? error.message : 'unknown',
                });
            }
        })();
    });
}
exports.registerMessageHandler = registerMessageHandler;
async function awardXp(message, guildDbId, settings) {
    const xpKey = `xp:${guildDbId}:${message.author.id}`;
    const last = xpCooldowns.get(xpKey);
    const now = Date.now();
    if (last && now - last < xpCooldownMs)
        return;
    xpCooldowns.set(xpKey, now);
    const { addXpForMessage } = await Promise.resolve().then(() => __importStar(require('@/lib/services')));
    const level = await addXpForMessage({
        discordGuildId: message.guildId ?? '',
        discordUserId: message.author.id,
        xp: 15,
    });
    if (level?.leveledUp && level.newLevel) {
        const { jerSuitEmbed } = await Promise.resolve().then(() => __importStar(require('@/bot/commands/ui')));
        await message.channel.send({
            embeds: [
                jerSuitEmbed(`🎉 ${message.author.displayName} reached level ${level.newLevel}!`),
            ],
        }).catch(() => undefined);
    }
}
const xpCooldowns = new Map();
const xpCooldownMs = 60000;
