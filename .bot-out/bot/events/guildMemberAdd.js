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
exports.registerGuildMemberAddHandler = void 0;
const variables_1 = require("@/bot/variables");
let handlerInstalled = false;
function registerGuildMemberAddHandler(client, sink) {
    if (handlerInstalled)
        return;
    handlerInstalled = true;
    client.on('guildMemberAdd', (member) => {
        void (async () => {
            try {
                const guild = member.guild;
                // Find the internal guild id + settings row.
                const { getGuildDbIdByDiscordId, getGuildSettings, getAutoroles } = await Promise.resolve().then(() => __importStar(require('@/lib/services')));
                const guildDbId = await getGuildDbIdByDiscordId(guild.id);
                if (!guildDbId)
                    return;
                const settings = await getGuildSettings(guildDbId);
                if (!settings)
                    return;
                // Welcome message.
                if (settings.welcome_enabled && settings.welcome_channel_id) {
                    const { resolveChannel } = await Promise.resolve().then(() => __importStar(require('@/bot/settings')));
                    const channel = resolveChannel(member.client, settings.welcome_channel_id);
                    if (channel) {
                        const content = settings.welcome_message ?? 'Welcome to {server}, {userMention}!';
                        const rendered = (0, variables_1.renderVariables)(content, {
                            user: {
                                id: member.id,
                                username: member.user.username,
                                displayName: member.user.displayName ?? null,
                                mention: member.toString(),
                            },
                            guild: {
                                id: guild.id,
                                name: guild.name,
                                memberCount: guild.memberCount,
                                mention: guild.toString(),
                            },
                        });
                        const { jerSuitEmbed } = await Promise.resolve().then(() => __importStar(require('@/bot/commands/ui')));
                        const embed = jerSuitEmbed(`Welcome to ${guild.name}!`)
                            .setColor(0x199155)
                            .setDescription(rendered)
                            .setThumbnail(member.user.displayAvatarURL({ size: 256 }));
                        await channel.send({
                            content: settings.welcome_embed_enabled === false ? rendered : undefined,
                            embeds: settings.welcome_embed_enabled === false ? [] : [embed],
                        }).catch(() => undefined);
                    }
                }
                // Auto roles.
                const autoroles = await getAutoroles(guild.id);
                for (const ar of autoroles) {
                    const roleId = String(ar.role_id);
                    const role = guild.roles.cache.get(roleId);
                    if (role && role.editable && role.managed === false) {
                        await member.roles.add(roleId).catch(() => undefined);
                    }
                }
                // Verification: assign nothing here; /verify grants the verified role.
            }
            catch (error) {
                const logger = (await Promise.resolve().then(() => __importStar(require('@/lib/logger')))).logger;
                logger.warn('bot', 'guildMemberAdd handling failed', {
                    message: error instanceof Error ? error.message : 'unknown',
                });
            }
        })();
    });
}
exports.registerGuildMemberAddHandler = registerGuildMemberAddHandler;
