/**
 * Safe Bot Presence utilities for the JerSuit Runtime.
 *
 * Maps administrative presence/activity choices to the real discord.js API
 * without ever touching secrets. This is the single source of truth for the
 * Runtime Manager and the Admin Panel presence controller.
 */
import { ActivityType } from 'discord.js';
import type { BotPresence, BotActivity, BotActivityType, BotPresenceStatus } from './types';

export const BOT_PRESENCE_STATUSES: readonly BotPresenceStatus[] = [
  'online',
  'idle',
  'dnd',
  'invisible',
];

export const BOT_ACTIVITY_TYPES: readonly BotActivityType[] = [
  'playing',
  'streaming',
  'listening',
  'watching',
  'competing',
];

/** Safe default used when no persisted presence is configured. */
export const DEFAULT_BOT_PRESENCE: BotPresence = {
  status: 'online',
  activity: { type: 'playing', name: 'JerSuit', url: null },
};

export interface PresenceValidationResult {
  ok: boolean;
  value: BotPresence | null;
  error: string | null;
}

/**
 * Validates a bare presence payload. Never throws - returns structured errors
 * that can be turned into a clean JerSuit error embed.
 */
export function validateBotPresence(raw: unknown): PresenceValidationResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, value: null, error: 'Presence must be an object.' };
  }

  const obj = raw as Record<string, unknown>;
  const status = obj.status;
  if (typeof status !== 'string' || !BOT_PRESENCE_STATUSES.includes(status as BotPresenceStatus)) {
    return { ok: false, value: null, error: 'Invalid presence status. Use online, idle, dnd or invisible.' };
  }

  const activityRaw = obj.activity;
  if (typeof activityRaw !== 'object' || activityRaw === null) {
    return { ok: false, value: null, error: 'Presence activity is required.' };
  }

  const activity = activityRaw as Record<string, unknown>;
  const type = activity.type;
  if (typeof type !== 'string' || !BOT_ACTIVITY_TYPES.includes(type as BotActivityType)) {
    return { ok: false, value: null, error: 'Invalid activity type.' };
  }

  const name = typeof activity.name === 'string' ? activity.name.trim() : '';
  if (!name) {
    return { ok: false, value: null, error: 'Activity name is required.' };
  }
  if (name.length > 128) {
    return { ok: false, value: null, error: 'Activity name must be 128 characters or fewer.' };
  }

  let url: string | null = null;
  if (type === 'streaming') {
    if (typeof activity.url !== 'string' || !activity.url.trim()) {
      return { ok: false, value: null, error: 'A streaming URL is required when the activity type is Streaming.' };
    }
    try {
      const parsed = new URL(activity.url.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('not http');
      url = parsed.toString();
    } catch {
      return { ok: false, value: null, error: 'The streaming URL must be a valid http(s) URL.' };
    }
  } else if (typeof activity.url === 'string' && activity.url.trim()) {
    try {
      url = new URL(activity.url.trim()).toString();
    } catch {
      url = null;
    }
  }

  const value: BotPresence = {
    status: status as BotPresenceStatus,
    activity: {
      type: type as BotActivityType,
      name,
      url,
    } as BotActivity,
  };

  return { ok: true, value, error: null };
}

/**
 * Maps a typed BotActivityType to the discord.js ActivityType enum value used
 * by the real presence API (client.user.setActivity).
 */
export function toDiscordActivityType(type: BotActivityType): ActivityType {
  switch (type) {
    case 'streaming':
      return ActivityType.Streaming;
    case 'listening':
      return ActivityType.Listening;
    case 'watching':
      return ActivityType.Watching;
    case 'competing':
      return ActivityType.Competing;
    case 'playing':
    default:
      return ActivityType.Playing;
  }
}

/**
 * Describes a presence for display/preview. Never includes secrets.
 */
export function describePresence(presence: BotPresence): string {
  const statusLabel: Record<BotPresenceStatus, string> = {
    online: 'Online',
    idle: 'Idle',
    dnd: 'Do Not Disturb',
    invisible: 'Invisible',
  };
  const typeLabel: Record<BotActivityType, string> = {
    playing: 'Playing',
    streaming: 'Streaming',
    listening: 'Listening to',
    watching: 'Watching',
    competing: 'Competing in',
  };
  const activityLabel = `${typeLabel[presence.activity.type]} ${presence.activity.name}`;
  return `${statusLabel[presence.status]} | ${activityLabel}`;
}
