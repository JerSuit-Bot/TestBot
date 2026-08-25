"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBotConfigError = exports.isBotTokenConfigured = exports.getBotToken = void 0;
/**
 * Strongly typed runtime configuration for the JerSuit Discord Bot.
 *
 * SECURITY: The bot token is read only from the DISCORD_BOT_TOKEN environment
 * variable. It is never written, logged, exported, or exposed through any API
 * surface. Every module in this file returns safe metadata about *whether* a
 * token is configured - never the token value itself.
 */
const zod_1 = require("zod");
/**
 * Only schema used to *validate* token presence/format. The trimmed value is
 * used internally and never stored or returned.
 */
const botTokenSchema = zod_1.z.object({
    DISCORD_BOT_TOKEN: zod_1.z.string().trim().min(1),
});
/**
 * Reads the configured bot token.
 *
 * @throws when no token is configured. Never logs or exposes the value.
 */
function getBotToken() {
    const result = botTokenSchema.safeParse({
        DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN ?? '',
    });
    if (!result.success) {
        throw new Error('DISCORD_BOT_TOKEN is not configured. Set the environment variable before starting the bot.');
    }
    return result.data.DISCORD_BOT_TOKEN;
}
exports.getBotToken = getBotToken;
/**
 * Safe boolean indicating whether an environment-side token is configured.
 * This is the *only* token information the Dashboard / runtime status may
 * expose.
 */
function isBotTokenConfigured() {
    return Boolean((process.env.DISCORD_BOT_TOKEN ?? '').trim());
}
exports.isBotTokenConfigured = isBotTokenConfigured;
/**
 * A safe, human-readable reason the bot cannot start, or `null` when it can.
 */
function getBotConfigError() {
    if (!isBotTokenConfigured()) {
        return 'DISCORD_BOT_TOKEN is not configured. Set the environment variable and restart to enable the bot.';
    }
    return null;
}
exports.getBotConfigError = getBotConfigError;
