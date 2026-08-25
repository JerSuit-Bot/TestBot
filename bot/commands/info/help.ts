import { SlashCommandBuilder, StringSelectMenuBuilder } from 'discord.js';
import { registerCommand, getAllCommands } from '../registry';
import { jerSuitEmbed, actionRow } from '../ui';
import type { Command } from '../types';

const help: Command = {
  category: 'information',
  data: new SlashCommandBuilder().setName('help').setDescription('List available JerSuit commands.'),
  cooldownSeconds: 5,
  async execute({ interaction }) {
    const commands = getAllCommands();
    const categories = new Map<string, number>();
    for (const c of commands) categories.set(c.category, (categories.get(c.category) ?? 0) + 1);
    const list = Array.from(categories.entries())
      .map(([cat, n]) => `**${cat}** — ${n} command${n === 1 ? '' : 's'}`)
      .join('\n');
    const select = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Choose a category')
      .addOptions(
        Array.from(categories.entries()).map(([cat]) => ({ label: cat, value: cat })),
      );
    await interaction.reply({
      embeds: [jerSuitEmbed('JerSuit Help').setDescription(`**${commands.length}** commands registered.\n\n${list}`)],
      components: [actionRow([select])],
      ephemeral: false,
    });
  },
};
registerCommand(help);
