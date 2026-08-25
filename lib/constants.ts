export const JERSUIT_EMOJIS = [
  'dev', '1_', '2_', '3_', '4_', '5_', '6_', '7_', '8_', '9_',
  'icon10', 'id', 'owner', 'developer', 'done',
] as const;

export type JerSuitEmoji = typeof JERSUIT_EMOJIS[number];

export const BRAND_COLORS = {
  primary: '#33A765',
  deep: '#199155',
  snow: '#F5FAF5',
  white: '#FFFFFF',
} as const;

export const SESSION_COOKIE = 'jersuit_session';
export const ADMIN_COOKIE = 'jersuit_admin';

/** Runtime lifecycle commands accepted by the Runtime Control API. */
export const BOT_RUNTIME_COMMANDS = ['start', 'stop', 'restart'] as const;

export const DISCORD_API_BASE = 'https://discord.com/api/v10';
export const DISCORD_CDN_BASE = 'https://cdn.discordapp.com';

export const PERMISSIONS = {
  ADMINISTRATOR: 1n << 3n,
  MANAGE_GUILD: 1n << 5n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_CHANNELS: 1n << 4n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  MANAGE_MESSAGES: 1n << 13n,
  MODERATE_MEMBERS: 1n << 40n,
} as const;

export function hasPermission(permissions: string, perm: bigint): boolean {
  const perms = BigInt(permissions || '0');
  return (perms & PERMISSIONS.ADMINISTRATOR) === PERMISSIONS.ADMINISTRATOR || (perms & perm) === perm;
}

export function canManageGuild(permissions: string, isOwner: boolean): boolean {
  if (isOwner) return true;
  return hasPermission(permissions, PERMISSIONS.MANAGE_GUILD) || hasPermission(permissions, PERMISSIONS.ADMINISTRATOR);
}

export function discordAvatarUrl(userId: string, avatarHash: string | null, size: number = 128): string {
  if (!avatarHash) {
    const defaultIndex = Number(userId) % 5;
    return `${DISCORD_CDN_BASE}/embed/avatars/${defaultIndex}.png`;
  }
  const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
  return `${DISCORD_CDN_BASE}/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
}

export function discordIconUrl(guildId: string, iconHash: string | null, size: number = 128): string {
  if (!iconHash) return '';
  const ext = iconHash.startsWith('a_') ? 'gif' : 'png';
  return `${DISCORD_CDN_BASE}/icons/${guildId}/${iconHash}.${ext}?size=${size}`;
}
