/**
 * Moderation utility / audit commands.
 */
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { defineCommand, error } from '../framework';
import { getModerationCases, getGuildDbIdByDiscordId } from '@/lib/services';

function modEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x199155);
}

defineCommand({
  name: 'history',
  description: 'Show the recent moderation history for this server.',
  category: 'moderation',
  memberPermissions: PermissionFlagsBits.ManageMessages,
  cooldown: 5,
  execute: async (ctx) => {
    const guildId = ctx.interaction.guildId;
    if (!guildId) {
      await error(ctx.interaction, 'This command only works in servers.');
      return;
    }
    const dbGuildId = await getGuildDbIdByDiscordId(guildId).catch(() => null);
    if (!dbGuildId) {
      await error(ctx.interaction, 'No moderation history found for this server.');
      return;
    }
    const cases = await getModerationCases(dbGuildId);
    if (cases.length === 0) {
      await ctx.interaction.reply({
        embeds: [modEmbed('Moderation history', 'No moderation actions recorded yet.')],
      });
      return;
    }
    const lines = cases.slice(0, 12).map((c) => {
      const when = c.created_at ? new Date(String(c.created_at)).toLocaleDateString() : 'unknown';
      return `\`${c.action}\` **${c.target_name ?? c.target_id}** — ${c.reason ?? 'no reason'} (${when})`;
    });
    await ctx.interaction.reply({
      embeds: [modEmbed('Moderation history', `${lines.join('\n')}\n\nTotal: **${cases.length}** case(s)`)],
    });
  },
});

defineCommand({
  name: 'modstats',
  description: 'Show moderation statistics for this server.',
  category: 'moderation',
  memberPermissions: PermissionFlagsBits.ManageMessages,
  cooldown: 5,
  execute: async (ctx) => {
    const guildId = ctx.interaction.guildId;
    if (!guildId) {
      await error(ctx.interaction, 'This command only works in servers.');
      return;
    }
    const dbGuildId = await getGuildDbIdByDiscordId(guildId).catch(() => null);
    if (!dbGuildId) {
      await error(ctx.interaction, 'No data yet for this server.');
      return;
    }
    const cases = await getModerationCases(dbGuildId);
    const byAction = new Map<string, number>();
    for (const c of cases) {
      byAction.set(String(c.action), (byAction.get(String(c.action)) ?? 0) + 1);
    }
    const summary = Array.from(byAction.entries())
      .map(([action, count]) => `**${action}**: ${count}`)
      .join('\n');
    await ctx.interaction.reply({
      embeds: [modEmbed('Moderation statistics', `${summary || 'No actions recorded yet.'}\n\nTotal actions: **${cases.length}**`)],
    });
  },
});