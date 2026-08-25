/**
 * Reusable message variables for welcome/goodbye, tickets, moderation,
 * logging, announcements, embeds and custom commands.
 *
 * Example: "Welcome to {server}, {user}!"
 */
export interface VariableContext {
  user?: { id: string; username: string; displayName: string | null; mention: string } | null;
  guild?: { id: string; name: string; memberCount: number; mention: string } | null;
  channel?: { id: string; name: string; mention: string } | null;
  role?: { id: string; name: string; mention: string } | null;
  bot?: { id: string; username: string; mention: string } | null;
  extra?: Record<string, string | number>;
}

const DEFAULTS: VariableContext = {
  user: null,
  guild: null,
  channel: null,
  role: null,
  bot: null,
  extra: {},
};

/**
 * Replaces every supported variable token in `template`.
 * Unknown tokens are left untouched (never silently stripped).
 */
export function renderVariables(template: string, ctx: VariableContext = {}): string {
  const c = { ...DEFAULTS, ...ctx, extra: ctx.extra ?? {} };
  let out = template;

  const replace = (token: string, value: string | number | null | undefined): void => {
    if (value === null || value === undefined) return;
    out = out.replaceAll(token, String(value));
  };

  replace('{user}', c.user?.displayName || c.user?.username || null);
  replace('{username}', c.user?.username ?? null);
  replace('{userId}', c.user?.id ?? null);
  replace('{userMention}', c.user?.mention ?? null);
  replace('{server}', c.guild?.name ?? null);
  replace('{serverId}', c.guild?.id ?? null);
  replace('{serverMention}', c.guild?.mention ?? null);
  replace('{guild}', c.guild?.name ?? null);
  replace('{memberCount}', c.guild?.memberCount ?? null);
  replace('{channel}', c.channel?.name ?? null);
  replace('{channelId}', c.channel?.id ?? null);
  replace('{channelMention}', c.channel?.mention ?? null);
  replace('{role}', c.role?.name ?? null);
  replace('{roleId}', c.role?.id ?? null);
  replace('{roleMention}', c.role?.mention ?? null);
  replace('{bot}', c.bot?.username ?? null);
  replace('{botId}', c.bot?.id ?? null);
  replace('{timestamp}', Math.floor(Date.now() / 1000));
  replace('{@timestamp}', `<t:${Math.floor(Date.now() / 1000)}:R>`);

  for (const [k, v] of Object.entries(c.extra ?? {})) {
    out = out.replaceAll(`{${k}}`, String(v));
  }

  return out;
}

export const VARIABLE_TOKENS: string[] = [
  '{user}', '{username}', '{userId}', '{userMention}',
  '{server}', '{serverId}', '{serverMention}',
  '{guild}', '{memberCount}',
  '{channel}', '{channelId}', '{channelMention}',
  '{role}', '{roleId}', '{roleMention}',
  '{bot}', '{botId}',
  '{timestamp}', '{@timestamp}',
];
