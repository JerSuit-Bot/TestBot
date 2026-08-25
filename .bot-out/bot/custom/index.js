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
exports.runCustomCommand = void 0;
const logger_1 = require("@/lib/logger");
const variables_1 = require("@/bot/variables");
const cd = new Map();
async function getGuildDbId(discordGuildId) {
    if (!discordGuildId)
        return null;
    const { getGuildDbIdByDiscordId } = await Promise.resolve().then(() => __importStar(require('@/lib/services')));
    return getGuildDbIdByDiscordId(discordGuildId);
}
/**
 * Runs a custom command when a prefixed message matches its name or an alias.
 */
async function runCustomCommand(message, name, _prefix) {
    try {
        const guildDbId = await getGuildDbId(message.guildId ?? '');
        if (!guildDbId)
            return;
        const { getCustomCommandByName, recordCommandUsage } = await Promise.resolve().then(() => __importStar(require('@/lib/services')));
        const command = await getCustomCommandByName(guildDbId, name);
        if (!command)
            return;
        const startedAt = Date.now();
        let ok = false;
        try {
            // Allowed roles gate.
            const allowedRoles = Array.isArray(command.allowed_roles) ? command.allowed_roles : [];
            const member = message.member;
            if (member && allowedRoles.length > 0) {
                const memberRoles = member.roles.cache.map((r) => r.id);
                const has = allowedRoles.some((r) => memberRoles.includes(String(r)));
                if (!has)
                    return;
            }
            // Cooldown.
            const cooldownSeconds = Number(command.cooldown_seconds ?? 0);
            if (cooldownSeconds > 0) {
                const key = `cc:${message.guildId}:${message.author.id}:${command.name}`;
                const last = cd.get(key);
                const now = Date.now();
                if (last && now - last < cooldownSeconds * 1000)
                    return;
                cd.set(key, now);
            }
            const ctx = {
                user: {
                    id: message.author.id,
                    username: message.author.username,
                    displayName: message.author.displayName ?? null,
                    mention: message.author.toString(),
                },
                guild: message.guild
                    ? {
                        id: message.guild.id,
                        name: message.guild.name,
                        memberCount: message.guild.memberCount,
                        mention: message.guild.toString(),
                    }
                    : null,
                channel: message.channel
                    ? { id: message.channel.id, name: 'channel', mention: message.channel.toString() }
                    : null,
            };
            // Response content (plain text, variables resolved).
            if (command.response) {
                await sendChannel(message, (0, variables_1.renderVariables)(String(command.response), ctx));
            }
            // Optional embed.
            if (command.embed && typeof command.embed === 'object') {
                const { jerSuitEmbed } = await Promise.resolve().then(() => __importStar(require('@/bot/commands/ui')));
                const embedData = command.embed;
                const embed = jerSuitEmbed();
                if (typeof embedData.title === 'string')
                    embed.setTitle((0, variables_1.renderVariables)(embedData.title, ctx));
                if (typeof embedData.description === 'string') {
                    embed.setDescription((0, variables_1.renderVariables)(embedData.description, ctx));
                }
                if (typeof embedData.color === 'string' || typeof embedData.color === 'number') {
                    embed.setColor(embedData.color);
                }
                if (typeof embedData.footer === 'string')
                    embed.setFooter({ text: (0, variables_1.renderVariables)(embedData.footer, ctx) });
                if (typeof embedData.image === 'string')
                    embed.setImage(embedData.image);
                if (typeof embedData.thumbnail === 'string')
                    embed.setThumbnail(embedData.thumbnail);
                await sendChannel(message, undefined, [embed]);
            }
            ok = true;
        }
        finally {
            await recordCommandUsage({
                commandName: name,
                category: 'custom',
                discordGuildId: message.guildId ?? null,
                userId: message.author.id,
                success: ok,
                latencyMs: Date.now() - startedAt,
            }).catch(() => undefined);
        }
    }
    catch (error) {
        logger_1.logger.warn('bot', 'Custom command failed', {
            message: error instanceof Error ? error.message : 'unknown',
        });
    }
}
exports.runCustomCommand = runCustomCommand;
/** Typesafe channel send used by custom commands (avoids union-type issues). */
async function sendChannel(message, content, embeds) {
    const channel = message.channel;
    if (!channel || typeof channel.send !== 'function')
        return;
    await channel.send({
        content: content ?? undefined,
        embeds: embeds && embeds.length > 0 ? embeds : undefined,
    }).catch(() => undefined);
}
