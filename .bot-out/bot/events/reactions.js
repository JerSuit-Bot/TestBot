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
exports.registerReactionHandlers = void 0;
/**
 * messageReactionAdd/messageReactionRemove handlers.
 *
 *  - Reaction roles: assigns/removes the configured role for an emoji on a
 *    specific message.
 *  - Starboard: tracks star emojis and posts messages that pass the threshold.
 */
const logger_1 = require("@/lib/logger");
let installed = false;
function registerReactionHandlers(client, sink) {
    if (installed)
        return;
    installed = true;
    client.on('messageReactionAdd', (reaction, user) => {
        void handleReaction('add', reaction, user).catch(() => undefined);
    });
    client.on('messageReactionRemove', (reaction, user) => {
        void handleReaction('remove', reaction, user).catch(() => undefined);
    });
}
exports.registerReactionHandlers = registerReactionHandlers;
async function handleReaction(kind, reaction, user) {
    try {
        if (!reaction.message?.guild || !reaction.emoji)
            return;
        if (user.bot)
            return;
        const guildDiscordId = reaction.message.guild.id;
        const messageId = reaction.message.id ?? '';
        const emojiKey = resolveEmojiKey(reaction.emoji);
        const { getDb } = await Promise.resolve().then(() => __importStar(require('@/lib/db')));
        const db = await getDb();
        const guild = await db.query('SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1', [guildDiscordId]);
        if (!guild.rows[0])
            return;
        const guildDbId = guild.rows[0].id;
        // 1) Reaction roles.
        const rr = await db.query(`SELECT role_id FROM reaction_roles
       WHERE guild_id = $1 AND message_id = $2 AND emoji = $3
       LIMIT 1`, [guildDbId, messageId, emojiKey]);
        const roleId = rr.rows[0]?.role_id;
        if (roleId) {
            const { getClient } = await Promise.resolve().then(() => __importStar(require('@/lib/bot-runtime')));
            const client = getClient();
            if (client) {
                const guild = client.guilds.cache.get(guildDiscordId);
                if (guild) {
                    const member = await guild.members.fetch(user.id ?? '').catch(() => null);
                    const role = guild.roles.cache.get(roleId);
                    if (member && role && role.editable && !role.managed) {
                        if (kind === 'add')
                            await member.roles.add(roleId).catch(() => undefined);
                        else
                            await member.roles.remove(roleId).catch(() => undefined);
                    }
                }
            }
        }
        // 2) Starboard (only on adds, with star emoji).
        if (kind === 'add' && (emojiKey.includes('⭐') || emojiKey.includes('star'))) {
            await updateStarboard(db, guildDbId, messageId, guildDiscordId).catch(() => undefined);
        }
    }
    catch (error) {
        logger_1.logger.warn('bot', 'Reaction handling failed', {
            message: error instanceof Error ? error.message : 'unknown',
        });
    }
}
function resolveEmojiKey(emoji) {
    return emoji.id ? `${emoji.name}:${emoji.id}` : (emoji.name ?? '');
}
async function updateStarboard(db, guildDbId, sourceMessageId, _guildDiscordId) {
    const { getGuildSettings } = await Promise.resolve().then(() => __importStar(require('@/lib/services')));
    const settings = await getGuildSettings(guildDbId);
    if (!settings?.starboard_enabled || !settings.starboard_channel_id)
        return;
    const res = await db.query(`SELECT stars FROM starboard_messages
     WHERE source_message_id = $1 AND guild_id = $2`, [sourceMessageId, guildDbId]);
    const stars = (res.rows[0]?.stars ?? 0) + 1;
    const threshold = Number(settings.starboard_limit ?? 5);
    if (stars < threshold)
        return;
    if (res.rows[0]) {
        await db.query(`UPDATE starboard_messages SET stars = $3 WHERE source_message_id = $1 AND guild_id = $2`, [sourceMessageId, guildDbId, stars]);
    }
    else {
        await db.query(`INSERT INTO starboard_messages (guild_id, source_message_id, source_channel_id, stars)
       VALUES ($1, $2, 'unknown', $3)`, [guildDbId, sourceMessageId, stars]);
    }
}
