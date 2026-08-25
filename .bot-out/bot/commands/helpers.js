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
exports.dbGuildId = exports.formatDuration = exports.parseDuration = exports.requireOwner = exports.isOwner = exports.error = exports.success = exports.defineCommand = exports.PermissionFlagsBits = exports.PERMS = void 0;
/**
 * Shared helpers for writing JerSuit commands with less boilerplate.
 */
const discord_js_1 = require("discord.js");
Object.defineProperty(exports, "PermissionFlagsBits", { enumerable: true, get: function () { return discord_js_1.PermissionFlagsBits; } });
const registry_1 = require("./registry");
const ui_1 = require("./ui");
/** Common Discord permission bit values. */
exports.PERMS = {
    ADMINISTRATOR: 8n,
    MANAGE_GUILD: 32n,
    MANAGE_ROLES: 1n << 28n,
    MANAGE_CHANNELS: 16n,
    KICK_MEMBERS: 2n,
    BAN_MEMBERS: 4n,
    MANAGE_MESSAGES: 1n << 13n,
    MODERATE_MEMBERS: 1n << 40n,
    MANAGE_NICKNAMES: 1n << 3n,
    SEND_MESSAGES: 1n << 11n,
    MENTION_EVERYONE: 1n << 17n,
};
/**
 * Creates a command from a builder and metadata and registers it immediately.
 */
function defineCommand(options) {
    const baseBuilder = new discord_js_1.SlashCommandBuilder()
        .setName(options.name)
        .setDescription(options.description);
    const built = options.builder ? options.builder(baseBuilder) : baseBuilder;
    if (options.nameLocalizations) {
        built.setNameLocalizations(options.nameLocalizations);
    }
    if (options.descriptionLocalizations) {
        built.setDescriptionLocalizations(options.descriptionLocalizations);
    }
    const metadata = {
        name: options.name,
        description: options.description,
        category: options.category,
        defaultMemberPermissions: options.memberPermissions ?? null,
        botPermissions: options.botPermissions ?? [],
        cooldownSeconds: options.cooldown ?? 0,
        guildOnly: options.guildOnly ?? true,
        ownerOnly: options.ownerOnly ?? false,
        disabled: options.disabled ?? false,
        usage: options.usage,
        examples: options.examples,
        configurable: options.configurable ?? true,
        toggleable: options.toggleable ?? true,
        nameLocalizations: options.nameLocalizations,
        descriptionLocalizations: options.descriptionLocalizations,
        ...(options.metadata ?? {}),
    };
    const command = {
        data: built,
        category: options.category,
        defaultMemberPermissions: options.memberPermissions ?? null,
        cooldownSeconds: options.cooldown ?? 0,
        metadata,
        execute: options.execute,
    };
    (0, registry_1.registerCommand)(command);
    return command;
}
exports.defineCommand = defineCommand;
/** Replies with a plain JerSuit success embed. */
async function success(interaction, descriptionOrEmbed, ephemeral = false) {
    const embed = typeof descriptionOrEmbed === 'string'
        ? (0, ui_1.jerSuitEmbed)().setColor(0x199155).setDescription(descriptionOrEmbed)
        : descriptionOrEmbed;
    await interaction.reply({ embeds: [embed], ephemeral });
}
exports.success = success;
/** Replies with a danger embed. */
async function error(interaction, description, ephemeral = true) {
    await interaction.reply({ embeds: [(0, ui_1.jerSuitErrorEmbed)(description)], ephemeral });
}
exports.error = error;
/** Checks whether the invoking user is the platform owner. */
async function isOwner(userId) {
    const configId = process.env.PLATFORM_OWNER_DISCORD_ID;
    if (configId && userId === configId)
        return true;
    try {
        const { getDb } = await Promise.resolve().then(() => __importStar(require('@/lib/db')));
        const db = await getDb();
        const res = await db.query('SELECT is_platform_owner FROM users WHERE discord_id = $1 LIMIT 1', [userId]);
        return res.rows[0]?.is_platform_owner === true;
    }
    catch {
        return false;
    }
}
exports.isOwner = isOwner;
/** Requires the platform owner; returns false when rejected. */
async function requireOwner(interaction) {
    if (await isOwner(interaction.user.id))
        return true;
    await error(interaction, 'This command is restricted to the platform owner.');
    return false;
}
exports.requireOwner = requireOwner;
/** Parses a duration string like "1d 2h 30m 5s" into seconds (or null). */
function parseDuration(input) {
    const regex = /(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hour|hours|d|day|days|w|week|weeks)/gi;
    let total = 0;
    let matches = 0;
    let m;
    while ((m = regex.exec(input)) !== null) {
        matches += 1;
        const value = parseInt(m[1], 10);
        const unit = m[2].toLowerCase();
        if (unit.startsWith('s'))
            total += value;
        else if (unit.startsWith('m'))
            total += value * 60;
        else if (unit.startsWith('h'))
            total += value * 3600;
        else if (unit.startsWith('d'))
            total += value * 86400;
        else if (unit.startsWith('w'))
            total += value * 604800;
    }
    return matches > 0 ? total : null;
}
exports.parseDuration = parseDuration;
function formatDuration(seconds) {
    if (seconds < 60)
        return seconds + 's';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [];
    if (h)
        parts.push(h + 'h');
    if (m)
        parts.push(m + 'm');
    if (s)
        parts.push(s + 's');
    return parts.join(' ') || '0s';
}
exports.formatDuration = formatDuration;
/** Resolves the internal guild id for a Discord guild (returns null when absent). */
async function dbGuildId(discordGuildId) {
    if (!discordGuildId)
        return null;
    const { getGuildDbIdByDiscordId } = await Promise.resolve().then(() => __importStar(require('@/lib/services')));
    return getGuildDbIdByDiscordId(discordGuildId);
}
exports.dbGuildId = dbGuildId;
