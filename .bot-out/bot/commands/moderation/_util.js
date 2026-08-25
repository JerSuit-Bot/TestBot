"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logCase = exports.moderationGuard = exports.getTargetMember = exports.getReason = exports.getUser = void 0;
/**
 * Shared helpers for moderation commands.
 */
const discord_js_1 = require("discord.js");
const services_1 = require("@/lib/services");
const PERM_ADMIN = discord_js_1.PermissionFlagsBits.Administrator;
function getUser(ctx) {
    return ctx.interaction.options.getUser('user', true);
}
exports.getUser = getUser;
function getReason(ctx, fallback = 'No reason provided') {
    return ctx.interaction.options.getString('reason') ?? fallback;
}
exports.getReason = getReason;
async function getTargetMember(ctx) {
    return ctx.interaction.guild?.members.fetch(getUser(ctx).id).catch(() => null);
}
exports.getTargetMember = getTargetMember;
async function cannotModerate(member) {
    if (!member)
        return false;
    if (member.permissions.has(PERM_ADMIN))
        return true;
    if (member.moderatable === false)
        return true;
    return false;
}
/** Guards: user missing, self-harm, admin target, bot hierarchy. Returns a message or null. */
async function moderationGuard(ctx) {
    const target = getUser(ctx);
    const member = await getTargetMember(ctx);
    if (target.id === ctx.interaction.user.id)
        return 'You cannot moderate yourself.';
    if (target.id === ctx.interaction.client.user?.id)
        return 'I cannot moderate myself.';
    if (member && (await cannotModerate(member)))
        return 'That member cannot be moderated.';
    if (!member && !target.bot)
        return 'That user is not a member of this server.';
    return null;
}
exports.moderationGuard = moderationGuard;
async function logCase(ctx, action, targetId, targetName, reason, duration) {
    if (!ctx.interaction.guildId)
        return;
    await (0, services_1.createModerationCase)({
        discordGuildId: ctx.interaction.guildId,
        action,
        targetId,
        targetName,
        moderatorId: ctx.interaction.user.id,
        moderatorName: ctx.interaction.user.username,
        reason,
        duration,
    }).catch(() => undefined);
}
exports.logCase = logCase;
