"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describePresence = exports.toDiscordActivityType = exports.validateBotPresence = exports.DEFAULT_BOT_PRESENCE = exports.BOT_ACTIVITY_TYPES = exports.BOT_PRESENCE_STATUSES = void 0;
/**
 * Safe Bot Presence utilities for the JerSuit Runtime.
 *
 * Maps administrative presence/activity choices to the real discord.js API
 * without ever touching secrets. This is the single source of truth for the
 * Runtime Manager and the Admin Panel presence controller.
 */
const discord_js_1 = require("discord.js");
exports.BOT_PRESENCE_STATUSES = [
    'online',
    'idle',
    'dnd',
    'invisible',
];
exports.BOT_ACTIVITY_TYPES = [
    'playing',
    'streaming',
    'listening',
    'watching',
    'competing',
];
/** Safe default used when no persisted presence is configured. */
exports.DEFAULT_BOT_PRESENCE = {
    status: 'online',
    activity: { type: 'playing', name: 'JerSuit', url: null },
};
/**
 * Validates a bare presence payload. Never throws - returns structured errors
 * that can be turned into a clean JerSuit error embed.
 */
function validateBotPresence(raw) {
    if (typeof raw !== 'object' || raw === null) {
        return { ok: false, value: null, error: 'Presence must be an object.' };
    }
    const obj = raw;
    const status = obj.status;
    if (typeof status !== 'string' || !exports.BOT_PRESENCE_STATUSES.includes(status)) {
        return { ok: false, value: null, error: 'Invalid presence status. Use online, idle, dnd or invisible.' };
    }
    const activityRaw = obj.activity;
    if (typeof activityRaw !== 'object' || activityRaw === null) {
        return { ok: false, value: null, error: 'Presence activity is required.' };
    }
    const activity = activityRaw;
    const type = activity.type;
    if (typeof type !== 'string' || !exports.BOT_ACTIVITY_TYPES.includes(type)) {
        return { ok: false, value: null, error: 'Invalid activity type.' };
    }
    const name = typeof activity.name === 'string' ? activity.name.trim() : '';
    if (!name) {
        return { ok: false, value: null, error: 'Activity name is required.' };
    }
    if (name.length > 128) {
        return { ok: false, value: null, error: 'Activity name must be 128 characters or fewer.' };
    }
    let url = null;
    if (type === 'streaming') {
        if (typeof activity.url !== 'string' || !activity.url.trim()) {
            return { ok: false, value: null, error: 'A streaming URL is required when the activity type is Streaming.' };
        }
        try {
            const parsed = new URL(activity.url.trim());
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
                throw new Error('not http');
            url = parsed.toString();
        }
        catch {
            return { ok: false, value: null, error: 'The streaming URL must be a valid http(s) URL.' };
        }
    }
    else if (typeof activity.url === 'string' && activity.url.trim()) {
        try {
            url = new URL(activity.url.trim()).toString();
        }
        catch {
            url = null;
        }
    }
    const value = {
        status: status,
        activity: {
            type: type,
            name,
            url,
        },
    };
    return { ok: true, value, error: null };
}
exports.validateBotPresence = validateBotPresence;
/**
 * Maps a typed BotActivityType to the discord.js ActivityType enum value used
 * by the real presence API (client.user.setActivity).
 */
function toDiscordActivityType(type) {
    switch (type) {
        case 'streaming':
            return discord_js_1.ActivityType.Streaming;
        case 'listening':
            return discord_js_1.ActivityType.Listening;
        case 'watching':
            return discord_js_1.ActivityType.Watching;
        case 'competing':
            return discord_js_1.ActivityType.Competing;
        case 'playing':
        default:
            return discord_js_1.ActivityType.Playing;
    }
}
exports.toDiscordActivityType = toDiscordActivityType;
/**
 * Describes a presence for display/preview. Never includes secrets.
 */
function describePresence(presence) {
    const statusLabel = {
        online: 'Online',
        idle: 'Idle',
        dnd: 'Do Not Disturb',
        invisible: 'Invisible',
    };
    const typeLabel = {
        playing: 'Playing',
        streaming: 'Streaming',
        listening: 'Listening to',
        watching: 'Watching',
        competing: 'Competing in',
    };
    const activityLabel = `${typeLabel[presence.activity.type]} ${presence.activity.name}`;
    return `${statusLabel[presence.status]} | ${activityLabel}`;
}
exports.describePresence = describePresence;
