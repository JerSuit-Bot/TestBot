/**
 * Moderation action commands — real Discord API changes + persistent cases.
 */
import { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { defineCommand, error, parseDuration } from '../framework';
import { getUser, getReason, getTargetMember, moderationGuard, logCase } from './_util';
import { getWarningsForUser, clearWarningsForUser } from '@/lib/services';

const BAN = PermissionFlagsBits.BanMembers;
const KICK = PermissionFlagsBits.KickMembers;
const MOD = PermissionFlagsBits.ModerateMembers;

const userReason = (b: SlashCommandBuilder) =>
  b
    .addUserOption((o) => o.setName('user').setDescription('Target member').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the action'));

defineCommand({
  name: 'ban',
  description: 'Ban a member from the server.',
  category: 'moderation',
  memberPermissions: BAN,
  cooldown: 3,
  usage: '/ban <user> [reason]',
  examples: ['/ban @user Spamming'],
  builder: (b) => userReason(b),
  execute: async (ctx) => {
    const target = getUser(ctx);
    const reason = getReason(ctx);
    const guard = await moderationGuard(ctx);
    if (guard) return error(ctx.interaction, guard);
    await ctx.interaction.guild?.members.ban(target.id, { reason: reason.slice(0, 512) });
    await logCase(ctx, 'ban', target.id, target.username, reason);
    await ctx.interaction.reply({ embeds: [modEmbed('Banned', `**${target.username}** has been banned.\nReason: ${reason}`)] });
  },
});

defineCommand({
  name: 'unban',
  description: 'Unban a user from the server.',
  category: 'moderation',
  memberPermissions: BAN,
  cooldown: 3,
  builder: (b) => userReason(b),
  execute: async (ctx) => {
    const target = getUser(ctx);
    const reason = getReason(ctx);
    const guild = ctx.interaction.guild;
    const bans = guild ? await guild.bans.fetch().catch(() => null) : null;
    const banned = bans?.has(target.id);
    if (!banned) return error(ctx.interaction, 'That user is not banned.');
    await guild?.bans.remove(target.id, reason.slice(0, 512));
    await logCase(ctx, 'unban', target.id, target.username, reason);
    await ctx.interaction.reply({ embeds: [modEmbed('Unbanned', `**${target.username}** has been unbanned.`)] });
  },
});

defineCommand({
  name: 'kick',
  description: 'Kick a member from the server.',
  category: 'moderation',
  memberPermissions: KICK,
  cooldown: 3,
  builder: (b) => userReason(b),
  execute: async (ctx) => {
    const target = getUser(ctx);
    const reason = getReason(ctx);
    const guard = await moderationGuard(ctx);
    if (guard) return error(ctx.interaction, guard);
    const member = await getTargetMember(ctx);
    if (member?.kickable) await member.kick(reason.slice(0, 512));
    await logCase(ctx, 'kick', target.id, target.username, reason);
    await ctx.interaction.reply({ embeds: [modEmbed('Kicked', `**${target.username}** has been kicked.\nReason: ${reason}`)] });
  },
});

defineCommand({
  name: 'softban',
  description: 'Ban then immediately unban a member (purges their messages).',
  category: 'moderation',
  memberPermissions: BAN,
  cooldown: 3,
  builder: (b) => userReason(b),
  execute: async (ctx) => {
    const target = getUser(ctx);
    const reason = getReason(ctx);
    const guard = await moderationGuard(ctx);
    if (guard) return error(ctx.interaction, guard);
    const guild = ctx.interaction.guild;
    await guild?.members.ban(target.id, { reason: `softban: ${reason}`.slice(0, 512) });
    await guild?.bans.remove(target.id, 'softban complete');
    await logCase(ctx, 'softban', target.id, target.username, reason);
    await ctx.interaction.reply({ embeds: [modEmbed('Soft-banned', `**${target.username}** was banned and immediately unbanned. Messages purged.`)] });
  },
});

function modEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x199155);
}
defineCommand({
  name: 'mute',
  description: 'Timeout (mute) a member for a duration, e.g. 30m / 4h / 2d.',
  category: 'moderation',
  memberPermissions: MOD,
  cooldown: 3,
  usage: '/mute <user> <duration> [reason]',
  examples: ['/mute @user 1h Spamming'],
  builder: (b) =>
    b
      .addUserOption((o) => o.setName('user').setDescription('Target member').setRequired(true))
      .addStringOption((o) => o.setName('duration').setDescription('Duration, e.g. 30m, 4h, 2d').setRequired(true))
      .addStringOption((o) => o.setName('reason').setDescription('Reason')),
  execute: async (ctx) => {
    const target = getUser(ctx);
    const reason = getReason(ctx);
    const dur = parseDuration(ctx.interaction.options.getString('duration') ?? '');
    if (!dur || dur <= 0) return error(ctx.interaction, 'Invalid duration. Use something like `30m`, `4h` or `2d`.');
    const guard = await moderationGuard(ctx);
    if (guard) return error(ctx.interaction, guard);
    const member = await getTargetMember(ctx);
    if (!member) return error(ctx.interaction, 'That user is not a member of this server.');
    await member.timeout(dur * 1000, reason.slice(0, 512));
    await logCase(ctx, 'mute', target.id, target.username, reason, `${dur}s`);
    await ctx.interaction.reply({ embeds: [modEmbed('Muted', `**${target.username}** has been muted for ${dur}s.\nReason: ${reason}`)] });
  },
});

defineCommand({
  name: 'unmute',
  description: 'Remove a timeout from a member.',
  category: 'moderation',
  memberPermissions: MOD,
  cooldown: 3,
  builder: (b) => userReason(b),
  execute: async (ctx) => {
    const target = getUser(ctx);
    const reason = getReason(ctx);
    const member = await getTargetMember(ctx);
    if (!member) return error(ctx.interaction, 'That user is not a member of this server.');
    await member.timeout(null, `unmute: ${reason}`.slice(0, 512));
    await logCase(ctx, 'unmute', target.id, target.username, reason);
    await ctx.interaction.reply({ embeds: [modEmbed('Unmuted', `**${target.username}** timeout removed.`)] });
  },
});

defineCommand({
  name: 'timeout',
  description: 'Apply a timeout with an exact duration in minutes.',
  category: 'moderation',
  memberPermissions: MOD,
  cooldown: 3,
  builder: (b) =>
    b
      .addUserOption((o) => o.setName('user').setDescription('Target member').setRequired(true))
      .addIntegerOption((o) =>
        o.setName('minutes').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320),
      )
      .addStringOption((o) => o.setName('reason').setDescription('Reason')),
  execute: async (ctx) => {
    const target = getUser(ctx);
    const minutes = ctx.interaction.options.getInteger('minutes') ?? 60;
    const reason = getReason(ctx);
    const guard = await moderationGuard(ctx);
    if (guard) return error(ctx.interaction, guard);
    const member = await getTargetMember(ctx);
    if (!member) return error(ctx.interaction, 'That user is not a member of this server.');
    await member.timeout(minutes * 60_000, reason.slice(0, 512));
    await logCase(ctx, 'timeout', target.id, target.username, reason, `${minutes}m`);
    await ctx.interaction.reply({ embeds: [modEmbed('Timed out', `**${target.username}** timed out for ${minutes} minute(s).`)] });
  },
});

defineCommand({
  name: 'untimeout',
  description: 'Remove a timeout from a member.',
  category: 'moderation',
  memberPermissions: MOD,
  cooldown: 3,
  builder: (b) => userReason(b),
  execute: async (ctx) => {
    const target = getUser(ctx);
    const member = await getTargetMember(ctx);
    if (!member) return error(ctx.interaction, 'That user is not a member of this server.');
    await member.timeout(null, 'untimeout');
    await logCase(ctx, 'untimeout', target.id, target.username, getReason(ctx));
    await ctx.interaction.reply({ embeds: [modEmbed('Timeout removed', `**${target.username}** is no longer timed out.`)] });
  },
});
defineCommand({
  name: 'warn',
  description: 'Warn a member. Warnings are stored persistently.',
  category: 'moderation',
  memberPermissions: MOD,
  cooldown: 3,
  builder: (b) => userReason(b),
  execute: async (ctx) => {
    const target = getUser(ctx);
    const reason = getReason(ctx);
    if (target.id === ctx.interaction.user.id) return error(ctx.interaction, 'You cannot warn yourself.');
    const member = await getTargetMember(ctx);
    if (member && 'permissions' in member && member.permissions.has(PermissionFlagsBits.Administrator)) {
      return error(ctx.interaction, 'That member cannot be warned.');
    }
    await logCase(ctx, 'warn', target.id, target.username, reason);
    await ctx.interaction.reply({ embeds: [modEmbed('Warning issued', `**${target.username}** has been warned.\nReason: ${reason}`)] });
  },
});

defineCommand({
  name: 'warns',
  description: 'List the warnings stored for a member.',
  category: 'moderation',
  cooldown: 3,
  builder: (b) => b.addUserOption((o) => o.setName('user').setDescription('Member to inspect').setRequired(true)),
  execute: async (ctx) => {
    const target = getUser(ctx);
    if (!ctx.interaction.guildId) {
      await error(ctx.interaction, 'This command only works in servers.');
      return;
    }
    const warns = await getWarningsForUser(ctx.interaction.guildId, target.id);
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

defineCommand({
  name: 'warnclear',
  description: 'Clear all warnings for a member.',
  category: 'moderation',
  memberPermissions: MOD,
  cooldown: 3,
  builder: (b) => b.addUserOption((o) => o.setName('user').setDescription('Member to clear warnings for').setRequired(true)),
  execute: async (ctx) => {
    const target = getUser(ctx);
    if (!ctx.interaction.guildId) return error(ctx.interaction, 'This command only works in servers.');
    const cleared = await clearWarningsForUser(ctx.interaction.guildId, target.id);
    await ctx.interaction.reply({ embeds: [modEmbed('Warnings cleared', `Cleared **${cleared}** warning(s) for **${target.username}**.`)] });
  },
});