"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Moderation action commands — real Discord API changes + persistent cases.
 */
const discord_js_1 = require("discord.js");
const framework_1 = require("../framework");
const _util_1 = require("./_util");
const services_1 = require("@/lib/services");
const BAN = discord_js_1.PermissionFlagsBits.BanMembers;
const KICK = discord_js_1.PermissionFlagsBits.KickMembers;
const MOD = discord_js_1.PermissionFlagsBits.ModerateMembers;
const userReason = (b) => b
    .addUserOption((o) => o.setName('user').setDescription('Target member').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the action'));
(0, framework_1.defineCommand)({
    name: 'ban',
    description: 'Ban a member from the server.',
    category: 'moderation',
    memberPermissions: BAN,
    cooldown: 3,
    usage: '/ban <user> [reason]',
    examples: ['/ban @user Spamming'],
    builder: (b) => userReason(b),
    execute: async (ctx) => {
        const target = (0, _util_1.getUser)(ctx);
        const reason = (0, _util_1.getReason)(ctx);
        const guard = await (0, _util_1.moderationGuard)(ctx);
        if (guard)
            return (0, framework_1.error)(ctx.interaction, guard);
        await ctx.interaction.guild?.members.ban(target.id, { reason: reason.slice(0, 512) });
        await (0, _util_1.logCase)(ctx, 'ban', target.id, target.username, reason);
        await ctx.interaction.reply({ embeds: [modEmbed('Banned', `**${target.username}** has been banned.\nReason: ${reason}`)] });
    },
});
(0, framework_1.defineCommand)({
    name: 'unban',
    description: 'Unban a user from the server.',
    category: 'moderation',
    memberPermissions: BAN,
    cooldown: 3,
    builder: (b) => userReason(b),
    execute: async (ctx) => {
        const target = (0, _util_1.getUser)(ctx);
        const reason = (0, _util_1.getReason)(ctx);
        const guild = ctx.interaction.guild;
        const bans = guild ? await guild.bans.fetch().catch(() => null) : null;
        const banned = bans?.has(target.id);
        if (!banned)
            return (0, framework_1.error)(ctx.interaction, 'That user is not banned.');
        await guild?.bans.remove(target.id, reason.slice(0, 512));
        await (0, _util_1.logCase)(ctx, 'unban', target.id, target.username, reason);
        await ctx.interaction.reply({ embeds: [modEmbed('Unbanned', `**${target.username}** has been unbanned.`)] });
    },
});
(0, framework_1.defineCommand)({
    name: 'kick',
    description: 'Kick a member from the server.',
    category: 'moderation',
    memberPermissions: KICK,
    cooldown: 3,
    builder: (b) => userReason(b),
    execute: async (ctx) => {
        const target = (0, _util_1.getUser)(ctx);
        const reason = (0, _util_1.getReason)(ctx);
        const guard = await (0, _util_1.moderationGuard)(ctx);
        if (guard)
            return (0, framework_1.error)(ctx.interaction, guard);
        const member = await (0, _util_1.getTargetMember)(ctx);
        if (member?.kickable)
            await member.kick(reason.slice(0, 512));
        await (0, _util_1.logCase)(ctx, 'kick', target.id, target.username, reason);
        await ctx.interaction.reply({ embeds: [modEmbed('Kicked', `**${target.username}** has been kicked.\nReason: ${reason}`)] });
    },
});
(0, framework_1.defineCommand)({
    name: 'softban',
    description: 'Ban then immediately unban a member (purges their messages).',
    category: 'moderation',
    memberPermissions: BAN,
    cooldown: 3,
    builder: (b) => userReason(b),
    execute: async (ctx) => {
        const target = (0, _util_1.getUser)(ctx);
        const reason = (0, _util_1.getReason)(ctx);
        const guard = await (0, _util_1.moderationGuard)(ctx);
        if (guard)
            return (0, framework_1.error)(ctx.interaction, guard);
        const guild = ctx.interaction.guild;
        await guild?.members.ban(target.id, { reason: `softban: ${reason}`.slice(0, 512) });
        await guild?.bans.remove(target.id, 'softban complete');
        await (0, _util_1.logCase)(ctx, 'softban', target.id, target.username, reason);
        await ctx.interaction.reply({ embeds: [modEmbed('Soft-banned', `**${target.username}** was banned and immediately unbanned. Messages purged.`)] });
    },
});
function modEmbed(title, description) {
    return new discord_js_1.EmbedBuilder().setTitle(title).setDescription(description).setColor(0x199155);
}
(0, framework_1.defineCommand)({
    name: 'mute',
    description: 'Timeout (mute) a member for a duration, e.g. 30m / 4h / 2d.',
    category: 'moderation',
    memberPermissions: MOD,
    cooldown: 3,
    usage: '/mute <user> <duration> [reason]',
    examples: ['/mute @user 1h Spamming'],
    builder: (b) => b
        .addUserOption((o) => o.setName('user').setDescription('Target member').setRequired(true))
        .addStringOption((o) => o.setName('duration').setDescription('Duration, e.g. 30m, 4h, 2d').setRequired(true))
        .addStringOption((o) => o.setName('reason').setDescription('Reason')),
    execute: async (ctx) => {
        const target = (0, _util_1.getUser)(ctx);
        const reason = (0, _util_1.getReason)(ctx);
        const dur = (0, framework_1.parseDuration)(ctx.interaction.options.getString('duration') ?? '');
        if (!dur || dur <= 0)
            return (0, framework_1.error)(ctx.interaction, 'Invalid duration. Use something like `30m`, `4h` or `2d`.');
        const guard = await (0, _util_1.moderationGuard)(ctx);
        if (guard)
            return (0, framework_1.error)(ctx.interaction, guard);
        const member = await (0, _util_1.getTargetMember)(ctx);
        if (!member)
            return (0, framework_1.error)(ctx.interaction, 'That user is not a member of this server.');
        await member.timeout(dur * 1000, reason.slice(0, 512));
        await (0, _util_1.logCase)(ctx, 'mute', target.id, target.username, reason, `${dur}s`);
        await ctx.interaction.reply({ embeds: [modEmbed('Muted', `**${target.username}** has been muted for ${dur}s.\nReason: ${reason}`)] });
    },
});
(0, framework_1.defineCommand)({
    name: 'unmute',
    description: 'Remove a timeout from a member.',
    category: 'moderation',
    memberPermissions: MOD,
    cooldown: 3,
    builder: (b) => userReason(b),
    execute: async (ctx) => {
        const target = (0, _util_1.getUser)(ctx);
        const reason = (0, _util_1.getReason)(ctx);
        const member = await (0, _util_1.getTargetMember)(ctx);
        if (!member)
            return (0, framework_1.error)(ctx.interaction, 'That user is not a member of this server.');
        await member.timeout(null, `unmute: ${reason}`.slice(0, 512));
        await (0, _util_1.logCase)(ctx, 'unmute', target.id, target.username, reason);
        await ctx.interaction.reply({ embeds: [modEmbed('Unmuted', `**${target.username}** timeout removed.`)] });
    },
});
(0, framework_1.defineCommand)({
    name: 'timeout',
    description: 'Apply a timeout with an exact duration in minutes.',
    category: 'moderation',
    memberPermissions: MOD,
    cooldown: 3,
    builder: (b) => b
        .addUserOption((o) => o.setName('user').setDescription('Target member').setRequired(true))
        .addIntegerOption((o) => o.setName('minutes').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320))
        .addStringOption((o) => o.setName('reason').setDescription('Reason')),
    execute: async (ctx) => {
        const target = (0, _util_1.getUser)(ctx);
        const minutes = ctx.interaction.options.getInteger('minutes') ?? 60;
        const reason = (0, _util_1.getReason)(ctx);
        const guard = await (0, _util_1.moderationGuard)(ctx);
        if (guard)
            return (0, framework_1.error)(ctx.interaction, guard);
        const member = await (0, _util_1.getTargetMember)(ctx);
        if (!member)
            return (0, framework_1.error)(ctx.interaction, 'That user is not a member of this server.');
        await member.timeout(minutes * 60000, reason.slice(0, 512));
        await (0, _util_1.logCase)(ctx, 'timeout', target.id, target.username, reason, `${minutes}m`);
        await ctx.interaction.reply({ embeds: [modEmbed('Timed out', `**${target.username}** timed out for ${minutes} minute(s).`)] });
    },
});
(0, framework_1.defineCommand)({
    name: 'untimeout',
    description: 'Remove a timeout from a member.',
    category: 'moderation',
    memberPermissions: MOD,
    cooldown: 3,
    builder: (b) => userReason(b),
    execute: async (ctx) => {
        const target = (0, _util_1.getUser)(ctx);
        const member = await (0, _util_1.getTargetMember)(ctx);
        if (!member)
            return (0, framework_1.error)(ctx.interaction, 'That user is not a member of this server.');
        await member.timeout(null, 'untimeout');
        await (0, _util_1.logCase)(ctx, 'untimeout', target.id, target.username, (0, _util_1.getReason)(ctx));
        await ctx.interaction.reply({ embeds: [modEmbed('Timeout removed', `**${target.username}** is no longer timed out.`)] });
    },
});
(0, framework_1.defineCommand)({
    name: 'warn',
    description: 'Warn a member. Warnings are stored persistently.',
    category: 'moderation',
    memberPermissions: MOD,
    cooldown: 3,
    builder: (b) => userReason(b),
    execute: async (ctx) => {
        const target = (0, _util_1.getUser)(ctx);
        const reason = (0, _util_1.getReason)(ctx);
        if (target.id === ctx.interaction.user.id)
            return (0, framework_1.error)(ctx.interaction, 'You cannot warn yourself.');
        const member = await (0, _util_1.getTargetMember)(ctx);
        if (member && 'permissions' in member && member.permissions.has(discord_js_1.PermissionFlagsBits.Administrator)) {
            return (0, framework_1.error)(ctx.interaction, 'That member cannot be warned.');
        }
        await (0, _util_1.logCase)(ctx, 'warn', target.id, target.username, reason);
        await ctx.interaction.reply({ embeds: [modEmbed('Warning issued', `**${target.username}** has been warned.\nReason: ${reason}`)] });
    },
});
(0, framework_1.defineCommand)({
    name: 'warns',
    description: 'List the warnings stored for a member.',
    category: 'moderation',
    cooldown: 3,
    builder: (b) => b.addUserOption((o) => o.setName('user').setDescription('Member to inspect').setRequired(true)),
    execute: async (ctx) => {
        const target = (0, _util_1.getUser)(ctx);
        if (!ctx.interaction.guildId) {
            await (0, framework_1.error)(ctx.interaction, 'This command only works in servers.');
            return;
        }
        const warns = await (0, services_1.getWarningsForUser)(ctx.interaction.guildId, target.id);
        if (warns.length === 0) {
            await ctx.interaction.reply({ embeds: [modEmbed('Warnings', `**${target.username}** has no warnings.`)] });
            return;
        }
        const lines = warns.slice(0, 10).map((w, idx) => {
            const when = w.created_at ? new Date(String(w.created_at)).toLocaleDateString() : 'unknown';
            return `**${idx + 1}.** ${w.reason ?? 'No reason'} — by ${w.moderator_name ?? 'unknown'} (${when})`;
        });
        await ctx.interaction.reply({
            embeds: [modEmbed(`Warnings for ${target.username}`, `${lines.join('\n')}\n\nTotal: **${warns.length}**`)],
        });
    },
});
(0, framework_1.defineCommand)({
    name: 'warnclear',
    description: 'Clear all warnings for a member.',
    category: 'moderation',
    memberPermissions: MOD,
    cooldown: 3,
    builder: (b) => b.addUserOption((o) => o.setName('user').setDescription('Member to clear warnings for').setRequired(true)),
    execute: async (ctx) => {
        const target = (0, _util_1.getUser)(ctx);
        if (!ctx.interaction.guildId)
            return (0, framework_1.error)(ctx.interaction, 'This command only works in servers.');
        const cleared = await (0, services_1.clearWarningsForUser)(ctx.interaction.guildId, target.id);
        await ctx.interaction.reply({ embeds: [modEmbed('Warnings cleared', `Cleared **${cleared}** warning(s) for **${target.username}**.`)] });
    },
});
