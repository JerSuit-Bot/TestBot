"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const registry_1 = require("../registry");
const ui_1 = require("../ui");
const help = {
    category: 'information',
    data: new discord_js_1.SlashCommandBuilder().setName('help').setDescription('List available JerSuit commands.'),
    cooldownSeconds: 5,
    async execute({ interaction }) {
        const commands = (0, registry_1.getAllCommands)();
        const categories = new Map();
        for (const c of commands)
            categories.set(c.category, (categories.get(c.category) ?? 0) + 1);
        const list = Array.from(categories.entries())
            .map(([cat, n]) => `**${cat}** — ${n} command${n === 1 ? '' : 's'}`)
            .join('\n');
        const select = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('Choose a category')
            .addOptions(Array.from(categories.entries()).map(([cat]) => ({ label: cat, value: cat })));
        await interaction.reply({
            embeds: [(0, ui_1.jerSuitEmbed)('JerSuit Help').setDescription(`**${commands.length}** commands registered.\n\n${list}`)],
            components: [(0, ui_1.actionRow)([select])],
            ephemeral: false,
        });
    },
};
(0, registry_1.registerCommand)(help);
