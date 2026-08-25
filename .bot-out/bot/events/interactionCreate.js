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
exports.registerInteractionHandler = void 0;
const logger_1 = require("@/lib/logger");
const registry_1 = require("@/bot/commands/registry");
const ui_1 = require("@/bot/commands/ui");
const i18n_1 = require("@/bot/i18n");
const settings_1 = require("@/bot/settings");
const services_1 = require("@/lib/services");
const variables_1 = require("@/bot/variables");
/** Per user per command cooldown store (module-level, resets on restart). */
const cooldowns = new Map();
function registerInteractionHandler(client, sink) {
    client.on('interactionCreate', async (interaction) => {
        sink.noteInteraction();
        try {
            if (interaction.isChatInputCommand()) {
                await handleSlashCommand(interaction);
                return;
            }
            if (interaction.isStringSelectMenu() && interaction.customId === 'help_category') {
                await handleHelpSelect(interaction);
                return;
            }
            if (interaction.isButton() && interaction.customId.startsWith('gg_')) {
                await handleGiveawayEntry(interaction);
                return;
            }
            if (interaction.isChannelSelectMenu() && interaction.customId.startsWith('ticket_panel_')) {
                await handleTicketPanelChannel(interaction);
                return;
            }
            logger_1.logger.debug('bot', 'Unhandled interaction', { type: interaction.type, id: interaction.id });
        }
        catch (error) {
            logger_1.logger.warn('bot', 'Interaction handling failed', {
                message: error instanceof Error ? error.message : 'unknown',
            });
        }
    });
    async function handleSlashCommand(interaction) {
        const commandName = interaction.commandName;
        const command = (0, registry_1.getCommand)(commandName);
        const lang = await (0, settings_1.getGuildLanguage)(interaction);
        const startedAt = Date.now();
        let ok = false;
        try {
            if (!command) {
                await interaction.reply({ embeds: [(0, ui_1.jerSuitErrorEmbed)((0, i18n_1.botT)(lang, 'errors.notRegistered'))], ephemeral: true });
                return;
            }
            // Maintenance mode blocks all slash commands except owner-only ones.
            const isOwner = await isOwnerUser(interaction);
            const platformSettings = (await (0, services_1.getPlatformSettings)().catch(() => ({})));
            if (platformSettings.maintenance_mode === true && !command.metadata?.ownerOnly && !isOwner) {
                await interaction.reply({ embeds: [(0, ui_1.jerSuitErrorEmbed)('Bot is in maintenance mode.')], ephemeral: true });
                return;
            }
            // Guild-only enforcement.
            if (command.metadata?.guildOnly && !interaction.inGuild()) {
                await interaction.reply({ embeds: [(0, ui_1.jerSuitErrorEmbed)((0, i18n_1.botT)(lang, 'errors.guildOnly'))], ephemeral: true });
                return;
            }
            // Owner-only enforcement.
            if (command.metadata?.ownerOnly && !isOwner) {
                await interaction.reply({ embeds: [(0, ui_1.jerSuitErrorEmbed)((0, i18n_1.botT)(lang, 'errors.ownerOnly'))], ephemeral: true });
                return;
            }
            // Load per-command runtime settings (portal + guild overrides merged).
            const settings = await (0, settings_1.getCommandSettings)(interaction.guildId ?? null, commandName);
            if (!settings.enabled) {
                await interaction.reply({ embeds: [(0, ui_1.jerSuitErrorEmbed)((0, i18n_1.botT)(lang, 'errors.disabled'))], ephemeral: true });
                return;
            }
            if (interaction.inGuild() && interaction.member) {
                const member = interaction.member;
                const roles = Array.isArray(member.roles)
                    ? member.roles.map((r) => r)
                    : Array.from(member.roles.cache.keys());
                if (settings.blockedRoles.some((r) => roles.includes(r))) {
                    await interaction.reply({ embeds: [(0, ui_1.jerSuitErrorEmbed)((0, i18n_1.botT)(lang, 'errors.missingPermissions'))], ephemeral: true });
                    return;
                }
                if (settings.allowedRoles.length > 0 && !settings.allowedRoles.some((r) => roles.includes(r))) {
                    await interaction.reply({ embeds: [(0, ui_1.jerSuitErrorEmbed)((0, i18n_1.botT)(lang, 'errors.missingPermissions'))], ephemeral: true });
                    return;
                }
            }
            // Cooldown enforcement (per user per command).
            const cooldownKey = `cd:${interaction.user.id}:${commandName}`;
            const now = Date.now();
            const last = cooldowns.get(cooldownKey);
            const cooldownValue = settings.cooldownSeconds > 0 ? settings.cooldownSeconds : (command.cooldownSeconds ?? 0);
            if (cooldownValue > 0 && last && now - last < cooldownValue * 1000) {
                const remaining = Math.ceil((cooldownValue * 1000 - (now - last)) / 1000);
                await interaction.reply({
                    embeds: [(0, ui_1.jerSuitErrorEmbed)((0, i18n_1.botT)(lang, 'errors.cooldown', { cooldown: remaining }))],
                    ephemeral: true,
                });
                return;
            }
            cooldowns.set(cooldownKey, now);
            await command.execute({ interaction, startedAt });
            ok = true;
            // Custom DM message support (configured from the Admin Panel).
            if (settings.dmMessage) {
                const dm = (0, variables_1.renderVariables)(settings.dmMessage, buildVars(interaction));
                await interaction.user.send(dm).catch(() => undefined);
            }
        }
        catch (error) {
            logger_1.logger.error('bot', `Command "${commandName}" failed`, {
                message: error instanceof Error ? error.message : 'unknown',
            });
            const reply = { embeds: [(0, ui_1.jerSuitErrorEmbed)((0, i18n_1.botT)(lang, 'errors.failed'))], ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(reply).catch(() => undefined);
            }
            else {
                await interaction.reply(reply).catch(() => undefined);
            }
        }
        finally {
            await (0, services_1.recordCommandUsage)({
                commandName,
                category: command?.metadata?.category,
                discordGuildId: interaction.guildId,
                userId: interaction.user.id,
                success: ok,
                latencyMs: Date.now() - startedAt,
            }).catch(() => undefined);
        }
    }
    async function handleHelpSelect(interaction) {
        const selected = interaction.values[0];
        if (!selected)
            return;
        const cmds = (0, registry_1.getAllCommands)().filter((c) => c.metadata?.category === selected);
        const list = cmds.map((c) => `/${c.data.name} — ${c.data.description}`).join('\n') || 'No commands in this category.';
        await interaction.update({
            embeds: [(0, ui_1.jerSuitEmbed)(`JerSuit Help — ${selected}`).setDescription(list)],
        });
    }
    async function handleGiveawayEntry(interaction) {
        const id = interaction.customId.replace('gg_', '');
        const { toggleGiveawayEntry } = await Promise.resolve().then(() => __importStar(require('@/lib/services')));
        const result = await toggleGiveawayEntry(id, interaction.user.id);
        await interaction.reply({
            embeds: [(0, ui_1.jerSuitEmbed)(result.joined ? '🎉 You entered the giveaway!' : 'You left the giveaway.')],
            ephemeral: true,
        });
    }
    async function handleTicketPanelChannel(interaction) {
        const channelId = interaction.values[0];
        if (!channelId)
            return;
        const { createTicket } = await Promise.resolve().then(() => __importStar(require('@/lib/services')));
        await createTicket({
            discordGuildId: interaction.guildId ?? '',
            channelId,
            userId: interaction.user.id,
            userName: interaction.user.username,
        }).catch(() => undefined);
        await interaction.reply({
            embeds: [(0, ui_1.jerSuitEmbed)(`Ticket opened: <#${channelId}>`)],
            ephemeral: true,
        });
    }
    function buildVars(interaction) {
        return {
            user: {
                id: interaction.user.id,
                username: interaction.user.username,
                displayName: interaction.user.displayName ?? null,
                mention: interaction.user.toString(),
            },
            guild: interaction.inGuild() && interaction.guild
                ? {
                    id: interaction.guild.id,
                    name: interaction.guild.name,
                    memberCount: interaction.guild.memberCount,
                    mention: interaction.guild.toString(),
                }
                : null,
        };
    }
    /** Determines whether the invoking user is the platform owner. */
    async function isOwnerUser(interaction) {
        const ownerDiscordId = process.env.PLATFORM_OWNER_DISCORD_ID;
        if (ownerDiscordId && interaction.user.id === ownerDiscordId)
            return true;
        try {
            const { getDb } = await Promise.resolve().then(() => __importStar(require('@/lib/db')));
            const db = await getDb();
            const res = await db.query('SELECT is_platform_owner FROM users WHERE discord_id = $1 LIMIT 1', [interaction.user.id]);
            return res.rows[0]?.is_platform_owner === true;
        }
        catch {
            return false;
        }
    }
}
exports.registerInteractionHandler = registerInteractionHandler;
