/**
 * Voice moderation commands — real voice channel actions.
 */
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { defineCommand, error } from '../framework';

const MUTE = PermissionFlagsBits.MuteMembers;

function modEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x199155);
}

defineCommand({
  name: 'vmute',
  description: 'Server-mute a member in their voice channel.',
  category: 'moderation',
  memberPermissions: MUTE,
  cooldown: 3,
  builder: (b) => b.addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true)),
  execute: async (ctx) => {
    const user = ctx.interaction.options.getUser('user', true);
    const member = await ctx.interaction.guild?.members.fetch(user.id).catch(() => null);
    if (!member?.voice.channel) return error(ctx.interaction, 'That member is not in a voice channel.');
    await member.voice.setMute(true, 'vmute command');
    await ctx.interaction.reply({ embeds: [modEmbed('Voice muted', `**${user.username}** is muted in voice.`)] });
  },
});

defineCommand({
  name: 'vunmute',
  description: 'Unmute a member in voice.',
  category: 'moderation',
  memberPermissions: MUTE,
  cooldown: 3,
  builder: (b) => b.addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true)),
  execute: async (ctx) => {
    const user = ctx.interaction.options.getUser('user', true);
    const member = await ctx.interaction.guild?.members.fetch(user.id).catch(() => null);
    if (!member?.voice.channel) return error(ctx.interaction, 'That member is not in a voice channel.');
    await member.voice.setMute(false, 'vunmute command');
    await ctx.interaction.reply({ embeds: [modEmbed('Voice unmuted', `**${user.username}** can speak again.`)] });
  },
});

defineCommand({
  name: 'vdeafen',
  description: 'Deafen a member in voice.',
  category: 'moderation',
  memberPermissions: MUTE,
  cooldown: 3,
  builder: (b) => b.addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true)),
  execute: async (ctx) => {
    const user = ctx.interaction.options.getUser('user', true);
    const member = await ctx.interaction.guild?.members.fetch(user.id).catch(() => null);
    if (!member?.voice.channel) return error(ctx.interaction, 'That member is not in a voice channel.');
    await member.voice.setDeaf(true, 'vdeafen command');
    await ctx.interaction.reply({ embeds: [modEmbed('Deafened', `**${user.username}** is deafened in voice.`)] });
  },
});

defineCommand({
  name: 'vundeafen',
  description: 'Undeafen a member in voice.',
  category: 'moderation',
  memberPermissions: MUTE,
  cooldown: 3,
  builder: (b) => b.addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true)),
  execute: async (ctx) => {
    const user = ctx.interaction.options.getUser('user', true);
    const member = await ctx.interaction.guild?.members.fetch(user.id).catch(() => null);
    if (!member?.voice.channel) return error(ctx.interaction, 'That member is not in a voice channel.');
    await member.voice.setDeaf(false, 'vundeafen command');
    await ctx.interaction.reply({ embeds: [modEmbed('Undeafened', `**${user.username}** can hear again.`)] });
  },
});

defineCommand({
  name: 'vkick',
  description: 'Disconnect a member from voice.',
  category: 'moderation',
  memberPermissions: MUTE,
  cooldown: 3,
  builder: (b) => b.addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true)),
  execute: async (ctx) => {
    const user = ctx.interaction.options.getUser('user', true);
    const member = await ctx.interaction.guild?.members.fetch(user.id).catch(() => null);
    if (!member?.voice.channel) return error(ctx.interaction, 'That member is not in a voice channel.');
    await member.voice.disconnect('vkick command').catch(() => undefined);
    await ctx.interaction.reply({ embeds: [modEmbed('Voice kicked', `**${user.username}** was disconnected from voice.`)] });
  },
});