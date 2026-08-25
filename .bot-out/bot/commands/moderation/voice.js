"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Voice moderation commands — real voice channel actions.
 */
const discord_js_1 = require("discord.js");
const framework_1 = require("../framework");
const MUTE = discord_js_1.PermissionFlagsBits.MuteMembers;
function modEmbed(title, description) {
    return new discord_js_1.EmbedBuilder().setTitle(title).setDescription(description).setColor(0x199155);
}
(0, framework_1.defineCommand)({
    name: 'vmute',
    description: 'Server-mute a member in their voice channel.',
    category: 'moderation',
    memberPermissions: MUTE,
    cooldown: 3,
    builder: (b) => b.addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true)),
    execute: async (ctx) => {
        const user = ctx.interaction.options.getUser('user', true);
        const member = await ctx.interaction.guild?.members.fetch(user.id).catch(() => null);
        if (!member?.voice.channel)
            return (0, framework_1.error)(ctx.interaction, 'That member is not in a voice channel.');
        await member.voice.setMute(true, 'vmute command');
        await ctx.interaction.reply({ embeds: [modEmbed('Voice muted', `**${user.username}** is muted in voice.`)] });
    },
});
(0, framework_1.defineCommand)({
    name: 'vunmute',
    description: 'Unmute a member in voice.',
    category: 'moderation',
    memberPermissions: MUTE,
    cooldown: 3,
    builder: (b) => b.addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true)),
    execute: async (ctx) => {
        const user = ctx.interaction.options.getUser('user', true);
        const member = await ctx.interaction.guild?.members.fetch(user.id).catch(() => null);
        if (!member?.voice.channel)
            return (0, framework_1.error)(ctx.interaction, 'That member is not in a voice channel.');
        await member.voice.setMute(false, 'vunmute command');
        await ctx.interaction.reply({ embeds: [modEmbed('Voice unmuted', `**${user.username}** can speak again.`)] });
    },
});
(0, framework_1.defineCommand)({
    name: 'vdeafen',
    description: 'Deafen a member in voice.',
    category: 'moderation',
    memberPermissions: MUTE,
    cooldown: 3,
    builder: (b) => b.addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true)),
    execute: async (ctx) => {
        const user = ctx.interaction.options.getUser('user', true);
        const member = await ctx.interaction.guild?.members.fetch(user.id).catch(() => null);
        if (!member?.voice.channel)
            return (0, framework_1.error)(ctx.interaction, 'That member is not in a voice channel.');
        await member.voice.setDeaf(true, 'vdeafen command');
        await ctx.interaction.reply({ embeds: [modEmbed('Deafened', `**${user.username}** is deafened in voice.`)] });
    },
});
(0, framework_1.defineCommand)({
    name: 'vundeafen',
    description: 'Undeafen a member in voice.',
    category: 'moderation',
    memberPermissions: MUTE,
    cooldown: 3,
    builder: (b) => b.addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true)),
    execute: async (ctx) => {
        const user = ctx.interaction.options.getUser('user', true);
        const member = await ctx.interaction.guild?.members.fetch(user.id).catch(() => null);
        if (!member?.voice.channel)
            return (0, framework_1.error)(ctx.interaction, 'That member is not in a voice channel.');
        await member.voice.setDeaf(false, 'vundeafen command');
        await ctx.interaction.reply({ embeds: [modEmbed('Undeafened', `**${user.username}** can hear again.`)] });
    },
});
(0, framework_1.defineCommand)({
    name: 'vkick',
    description: 'Disconnect a member from voice.',
    category: 'moderation',
    memberPermissions: MUTE,
    cooldown: 3,
    builder: (b) => b.addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true)),
    execute: async (ctx) => {
        const user = ctx.interaction.options.getUser('user', true);
        const member = await ctx.interaction.guild?.members.fetch(user.id).catch(() => null);
        if (!member?.voice.channel)
            return (0, framework_1.error)(ctx.interaction, 'That member is not in a voice channel.');
        await member.voice.disconnect('vkick command').catch(() => undefined);
        await ctx.interaction.reply({ embeds: [modEmbed('Voice kicked', `**${user.username}** was disconnected from voice.`)] });
    },
});
