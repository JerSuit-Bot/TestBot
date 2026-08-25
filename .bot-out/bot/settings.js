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
exports.resolveChannel = exports.resolveMemberName = exports.resolveGuildDbId = exports.getGuildLanguage = exports.getCommandSettings = exports.invalidateAllCommandSettings = exports.invalidateCommandSettings = exports.DEFAULT_COMMAND_RUNTIME = void 0;
const discord_js_1 = require("discord.js");
const services_1 = require("@/lib/services");
exports.DEFAULT_COMMAND_RUNTIME = {
    enabled: true,
    cooldownSeconds: 2,
    allowedRoles: [],
    blockedRoles: [],
    requiredPermission: null,
    responseMessage: null,
    dmMessage: null,
    logEnabled: false,
    logChannelId: null,
    punishmentReason: null,
};
/**
 * Merges global overrides + per-guild overrides for a single command.
 * Runs a DB read on first call per (guild,name) then caches for the lifetime
 * of the process (ok for single-replica runtime; dashboard saves invalidate).
 */
const cache = new Map();
function invalidateCommandSettings(guildId, name) {
    cache.delete(`${guildId ?? 'global'}:${name}`);
    cache.delete(`global:${name}`);
}
exports.invalidateCommandSettings = invalidateCommandSettings;
function invalidateAllCommandSettings() {
    cache.clear();
}
exports.invalidateAllCommandSettings = invalidateAllCommandSettings;
async function getCommandSettings(guildId, name) {
    const key = `${guildId ?? 'global'}:${name}`;
    const cached = cache.get(key);
    if (cached)
        return cached;
    let guildOverrides = {};
    let globalOverrides = {};
    if (guildId) {
        guildOverrides = await (0, services_1.getGuildCommandOverrides)(guildId, name).catch(() => ({}));
    }
    globalOverrides = await (0, services_1.getGlobalCommandSettings)(name).catch(() => ({}));
    const merged = {
        ...exports.DEFAULT_COMMAND_RUNTIME,
        cooldownSeconds: exports.DEFAULT_COMMAND_RUNTIME.cooldownSeconds,
        ...normalize(globalOverrides),
        ...normalize(guildOverrides),
    };
    cache.set(key, merged);
    return merged;
}
exports.getCommandSettings = getCommandSettings;
function normalize(raw) {
    const out = {};
    const rawSettings = (raw.settings ?? raw);
    if (typeof rawSettings.enabled === 'boolean')
        out.enabled = rawSettings.enabled;
    if (typeof rawSettings.cooldownSeconds === 'number')
        out.cooldownSeconds = rawSettings.cooldownSeconds;
    if (typeof rawSettings.cooldown === 'number')
        out.cooldownSeconds = rawSettings.cooldown;
    if (Array.isArray(rawSettings.allowedRoles))
        out.allowedRoles = rawSettings.allowedRoles.map(String);
    if (Array.isArray(rawSettings.blockedRoles))
        out.blockedRoles = rawSettings.blockedRoles.map(String);
    if (typeof rawSettings.requiredPermission === 'string' && rawSettings.requiredPermission) {
        out.requiredPermission = rawSettings.requiredPermission;
    }
    if (typeof rawSettings.responseMessage === 'string')
        out.responseMessage = rawSettings.responseMessage;
    if (typeof rawSettings.dmMessage === 'string')
        out.dmMessage = rawSettings.dmMessage;
    if (typeof rawSettings.logEnabled === 'boolean')
        out.logEnabled = rawSettings.logEnabled;
    if (typeof rawSettings.logChannelId === 'string')
        out.logChannelId = rawSettings.logChannelId;
    if (typeof rawSettings.punishmentReason === 'string')
        out.punishmentReason = rawSettings.punishmentReason;
    return out;
}
/** Resolves the guild language (for bot i18n). */
async function getGuildLanguage(interaction) {
    try {
        const guildId = await resolveGuildDbId(interaction).catch(() => null);
        if (guildId) {
            const { getGuildSettings } = await Promise.resolve().then(() => __importStar(require('@/lib/services')));
            const settings = await getGuildSettings(guildId);
            if (settings?.language)
                return settings.language;
        }
    }
    catch { /* default */ }
    return 'en';
}
exports.getGuildLanguage = getGuildLanguage;
/** Resolves the internal guild_settings row id for a Discord guild. */
async function resolveGuildDbId(interaction) {
    const { getGuildDbIdByDiscordId } = await Promise.resolve().then(() => __importStar(require('@/lib/services')));
    return getGuildDbIdByDiscordId(interaction.guildId ?? '');
}
exports.resolveGuildDbId = resolveGuildDbId;
/** Helper used across moderation commands to write audit / mod cases. */
function resolveMemberName(name) {
    return name ?? 'Unknown User';
}
exports.resolveMemberName = resolveMemberName;
function resolveChannel(client, id) {
    if (!id)
        return null;
    const c = client.channels.cache.get(id);
    return c && c.type === discord_js_1.ChannelType.GuildText ? c : null;
}
exports.resolveChannel = resolveChannel;
