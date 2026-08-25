"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const registry_1 = require("../registry");
const ui_1 = require("../ui");
const ping = {
    category: 'information',
    data: new discord_js_1.SlashCommandBuilder().setName('ping').setDescription('Check the bot\'s gateway latency.'),
    cooldownSeconds: 3,
    async execute({ interaction }) {
        const sent = await interaction.deferReply({ ephemeral: false, fetchReply: true });
        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
        const ws = interaction.client.ws.ping;
        await interaction.editReply({
            embeds: [
                (0, ui_1.jerSuitEmbed)('Pong!')
                    .setColor(0x199155)
                    .addFields({ name: 'Gateway latency', value: `${Math.round(ws)}ms`, inline: true }, { name: 'API roundtrip', value: `${roundtrip}ms`, inline: true }),
            ],
        });
    },
};
(0, registry_1.registerCommand)(ping);
