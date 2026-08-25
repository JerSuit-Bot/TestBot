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
import { Client, type ClientOptions, GatewayIntentBits } from 'discord.js';

/**
 * The single set of gateway intents the bot requests.
 */
export const BOT_GATEWAY_INTENTS: ClientOptions['intents'] = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMessageReactions,
];

/**
 * Creates a new, disconnected discord.js Client.
 *
 * The caller (Runtime Manager) is exclusively responsible for or invoking
 * `.login()` and `.destroy()`. No connection is attempted here.
 */
export function createBotClient(): Client<false> {
  return new Client<false>({
    intents: BOT_GATEWAY_INTENTS,
  });
}
