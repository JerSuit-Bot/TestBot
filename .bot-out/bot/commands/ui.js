"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionRow = exports.jerSuitEmoji = exports.jerSuitInfoEmbed = exports.jerSuitSuccessEmbed = exports.jerSuitErrorEmbed = exports.jerSuitEmbed = exports.JERSUIT_DANGER = exports.JERSUIT_DEEP = exports.JERSUIT_PRIMARY = void 0;
/**
 * Centralized JerSuit embed / response system. All commands use these helpers
 * so EmbedBuilder configuration is never duplicated across commands.
 */
const discord_js_1 = require("discord.js");
exports.JERSUIT_PRIMARY = 0x33a65f;
exports.JERSUIT_DEEP = 0x199155;
exports.JERSUIT_DANGER = 0xe23d3d;
/**
 * Default JerSuit embed with the brand color and footer.
 */
function jerSuitEmbed(title) {
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(exports.JERSUIT_PRIMARY)
        .setFooter({ text: 'JerSuit V2' })
        .setTimestamp();
    if (title)
        embed.setTitle(title);
    return embed;
}
exports.jerSuitEmbed = jerSuitEmbed;
function jerSuitErrorEmbed(message) {
    return jerSuitEmbed('JerSuit')
        .setColor(exports.JERSUIT_DANGER)
        .setDescription(message)
        .setTitle('Something went wrong');
}
exports.jerSuitErrorEmbed = jerSuitErrorEmbed;
function jerSuitSuccessEmbed(message) {
    return jerSuitEmbed().setColor(exports.JERSUIT_DEEP).setDescription(message);
}
exports.jerSuitSuccessEmbed = jerSuitSuccessEmbed;
function jerSuitInfoEmbed(title, description) {
    return jerSuitEmbed(title).setColor(exports.JERSUIT_DEEP).setDescription(description);
}
exports.jerSuitInfoEmbed = jerSuitInfoEmbed;
/**
 * Custom emoji resolver. The JerSuit server hosts these emojis; each resolves
 * to a mention if known, otherwise a safe text fallback.
 */
function jerSuitEmoji(name, guildEmojis) {
    if (guildEmojis) {
        for (const e of guildEmojis) {
            if (e.name === name)
                return `<:${name}:${e.id}>`;
        }
    }
    // Safe fallbacks (no hardcoded emoji ids).
    const fallbacks = {
        done: '\u2705',
        dev: '\u{1F527}',
        owner: '\u{1F451}',
        developer: '\u{1F527}',
        id: '\u{1F194}',
        '1_': '1\uFE0F\u20E3',
    };
    return fallbacks[name] ?? '\u{1F539}';
}
exports.jerSuitEmoji = jerSuitEmoji;
function actionRow(components) {
    return new discord_js_1.ActionRowBuilder().addComponents(components);
}
exports.actionRow = actionRow;
