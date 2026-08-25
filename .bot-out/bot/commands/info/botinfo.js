"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const registry_1 = require("../registry");
const ui_1 = require("../ui");
const botinfo = {
    category: 'information',
    data: new discord_js_1.SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Show JerSuit bot information.'),
    async execute({ interaction }) {
        await interaction.reply({
            embeds: [
                (0, ui_1.jerSuitEmbed)(interaction.client.user?.username ?? 'JerSuit')
                    .setDescription('A professional Discord bot powering the JerSuit platform.')
                    .addFields({ name: 'Status', value: interaction.client.user?.presence?.status ?? 'unknown', inline: true }, { name: 'Guilds', value: String(interaction.client.guilds.cache.size), inline: true }, { name: 'Uptime', value: `${Math.floor((interaction.client.uptime ?? 0) / 1000)}s`, inline: true }, { name: 'Library', value: 'discord.js v14', inline: true }),
            ],
        });
    },
};
(0, registry_1.registerCommand)(botinfo);
