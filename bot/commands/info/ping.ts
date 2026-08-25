import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { registerCommand } from '../registry';
import { jerSuitEmbed } from '../ui';
import type { Command } from '../types';

const ping: Command = {
  category: 'information',
  data: new SlashCommandBuilder().setName('ping').setDescription('Check the bot\'s gateway latency.'),
  cooldownSeconds: 3,
  async execute({ interaction }) {
    const sent = await interaction.deferReply({ ephemeral: false, fetchReply: true });
    const roundtrip = (sent as unknown as { createdTimestamp: number }).createdTimestamp - interaction.createdTimestamp;
    const ws = interaction.client.ws.ping;
    await interaction.editReply({
      embeds: [
        jerSuitEmbed('Pong!')
          .setColor(0x199155)
          .addFields(
            { name: 'Gateway latency', value: `${Math.round(ws)}ms`, inline: true },
            { name: 'API roundtrip', value: `${roundtrip}ms`, inline: true },
          ),
      ],
    });
  },
};

registerCommand(ping);
