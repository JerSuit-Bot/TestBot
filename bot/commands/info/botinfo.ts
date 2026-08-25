import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../registry';
import { jerSuitEmbed } from '../ui';
import type { Command } from '../types';

const botinfo: Command = {
  category: 'information',
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Show JerSuit bot information.'),
  async execute({ interaction }) {
    await interaction.reply({
      embeds: [
        jerSuitEmbed(interaction.client.user?.username ?? 'JerSuit')
          .setDescription('A professional Discord bot powering the JerSuit platform.')
          .addFields(
            { name: 'Status', value: interaction.client.user?.presence?.status ?? 'unknown', inline: true },
            { name: 'Guilds', value: String(interaction.client.guilds.cache.size), inline: true },
            { name: 'Uptime', value: `${Math.floor((interaction.client.uptime ?? 0) / 1000)}s`, inline: true },
            { name: 'Library', value: 'discord.js v14', inline: true },
          ),
      ],
    });
  },
};
registerCommand(botinfo);
