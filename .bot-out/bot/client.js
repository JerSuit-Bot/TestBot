"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBotClient = exports.BOT_GATEWAY_INTENTS = void 0;
/**
 * Discord.js Client construction for the JerSuit Bot Runtime.
 *
 * This module is intentionally free of side effects. It only *creates* the
 * client when explicitly requested by the Runtime Manager - importing this
 * file must never open a socket or connect to Discord.
 *
 * Gateway intents required by the current feature set:
 *  - `Guilds` - guild create/delete + slash registration
 *  - `GuildMembers` - auto-role, welcome, leveling, verification member tracking
 *  - `GuildMessages` + `MessageContent` - leveling, automod, custom commands
 *  - `GuildMessageReactions` - reaction roles + starboard
 * No privileged member-intent gateway subscriptions beyond the above are used.
 */
const discord_js_1 = require("discord.js");
/**
 * The single set of gateway intents the bot requests.
 */
exports.BOT_GATEWAY_INTENTS = [
    discord_js_1.GatewayIntentBits.Guilds,
    discord_js_1.GatewayIntentBits.GuildMembers,
    discord_js_1.GatewayIntentBits.GuildMessages,
    discord_js_1.GatewayIntentBits.MessageContent,
    discord_js_1.GatewayIntentBits.GuildMessageReactions,
];
/**
 * Creates a new, disconnected discord.js Client.
 *
 * The caller (Runtime Manager) is exclusively responsible for or invoking
 * `.login()` and `.destroy()`. No connection is attempted here.
 */
function createBotClient() {
    return new discord_js_1.Client({
        intents: exports.BOT_GATEWAY_INTENTS,
    });
}
exports.createBotClient = createBotClient;
