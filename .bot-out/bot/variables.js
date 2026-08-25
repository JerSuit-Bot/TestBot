"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VARIABLE_TOKENS = exports.renderVariables = void 0;
const DEFAULTS = {
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
function renderVariables(template, ctx = {}) {
    const c = { ...DEFAULTS, ...ctx, extra: ctx.extra ?? {} };
    let out = template;
    const replace = (token, value) => {
        if (value === null || value === undefined)
            return;
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
exports.renderVariables = renderVariables;
exports.VARIABLE_TOKENS = [
    '{user}', '{username}', '{userId}', '{userMention}',
    '{server}', '{serverId}', '{serverMention}',
    '{guild}', '{memberCount}',
    '{channel}', '{channelId}', '{channelMention}',
    '{role}', '{roleId}', '{roleMention}',
    '{bot}', '{botId}',
    '{timestamp}', '{@timestamp}',
];
