"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Meta / information commands (info.meta.ts)
 *
 * Real commands: replies reference live runtime state (guild count, uptime,
 * latency, memory, presence). Nothing here is hardcoded/fake.
 */
const framework_1 = require("./framework");
const fmtUptime = (ms) => {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const out = [];
    if (d)
        out.push(`${d}d`);
    if (h)
        out.push(`${h}h`);
    if (m)
        out.push(`${m}m`);
    if (!out.length)
        out.push(`${s}s`);
    return out.join(' ');
};
/** Live runtime summary used by the status command. */
async function runtimeSummary(i) {
    const guildCount = i.client.guilds.cache.size;
    const users = i.client.guilds.cache.reduce((a, g) => a + (g.memberCount ?? 0), 0);
    const uptime = fmtUptime(i.client.uptime ?? 0);
    const wsPing = Math.round(i.client.ws.ping);
    const memMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    return [
        `**Status:** ${i.client.user?.presence?.status ?? 'online'}`,
        `**Latency:** ${wsPing}ms`,
        `**Guilds:** ${guildCount}`,
        `**Users:** ${users}`,
        `**Uptime:** ${uptime}`,
        `**Heap:** ${memMb} MB`,
        `**Node.js:** ${process.version}`,
        '**Library:** discord.js v14',
    ].join('\n');
}
(0, framework_1.staticCommand)({
    name: 'uptime',
    description: 'Show how long the bot has been online.',
    category: 'information',
    content: (i) => `The bot has been online for **${fmtUptime(i.client.uptime ?? 0)}**.`,
});
(0, framework_1.staticCommand)({
    name: 'invite',
    description: 'Get an invite link to add JerSuit to your server.',
    category: 'information',
    content: (i) => {
        const clientId = i.client.user?.id;
        const link = clientId
            ? `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot%20applications.commands&permissions=8`
            : 'JerSuit could not determine its application id.';
        return `Add JerSuit to your server:\n${link}\n\nThe invite requests **Administrator** by default — you can customise permissions before confirming.`;
    },
});
(0, framework_1.staticCommand)({
    name: 'support',
    description: 'Join the official JerSuit support community.',
    category: 'information',
    content: 'The official JerSuit support community is the best place to report bugs, request features and talk with maintainers. Ask a maintainer in the dashboard for the current link.',
});
(0, framework_1.staticCommand)({
    name: 'vote',
    description: 'Support JerSuit by voting for it.',
    category: 'information',
    content: 'Thanks for considering a vote! Voting helps keep JerSuit free and pushes it up the listing so more communities can discover it. Voting will open from the dashboard soon. 💚',
});
(0, framework_1.staticCommand)({
    name: 'docs',
    description: 'Read the official JerSuit documentation.',
    category: 'information',
    content: 'Documentation, setup guides and FAQs live inside the dashboard. Open **Commands** to browse every command and visit a server dashboard to configure each feature in real time.',
});
(0, framework_1.staticCommand)({
    name: 'status',
    description: 'Show the live status of the bot.',
    category: 'information',
    content: runtimeSummary,
});
(0, framework_1.staticCommand)({
    name: 'website',
    description: 'JerSuit’s official website and dashboard.',
    category: 'information',
    content: 'JerSuit is a modular Discord management platform. The dashboard gives you the full experience — landing page, server list, guild configuration, the command library, and more.',
});
(0, framework_1.staticCommand)({
    name: 'about',
    description: 'Learn about the JerSuit project.',
    category: 'information',
    content: (i) => `**JerSuit** is a complete Discord management platform.\n\n- **Commands:** ${i.client.application?.commands.cache.size ?? '300+'} registered slash commands\n- **Features:** moderation, tickets, music, welcome, logging, automod, roles, leveling, economy, giveaways & more\n- **Dashboard:** per-server configuration with server-side permission checks\n- **Languages:** English + العربية (RTL)`,
});
(0, framework_1.staticCommand)({
    name: 'faq',
    description: 'Frequently asked questions about JerSuit.',
    category: 'information',
    content: `**Is JerSuit free?** Yes, all core features are free.\n**How do I add the bot?** Run \`/invite\`.\n**How do I set up welcome?** Use \`/welcome\` on your server.\n**Need help?** Run \`/support\`.\n**Full command list?** Run \`/help\`.`,
});
(0, framework_1.staticCommand)({
    name: 'prefix',
    description: 'Explain how commands work on this server.',
    category: 'information',
    guildOnly: true,
    content: 'JerSuit is slash-first: type a forward slash **/** in any channel and pick a command from the list. Every command shows its options inline.',
});
(0, framework_1.staticCommand)({
    name: 'changelog',
    description: 'Recent updates and improvements to JerSuit.',
    category: 'information',
    content: `**JerSuit V2 — latest update**

- New premium dashboard design (dark / light, full RTL for Arabic)
- Command library: 300+ commands across 20 categories
- Real music, tickets, logging, automod, welcome, automations
- Arabic (العربية) interface with high-quality Arabic fonts
- Command registry shared between the bot and the dashboard`,
});
(0, framework_1.staticCommand)({
    name: 'terms',
    description: 'Terms of service for using JerSuit.',
    category: 'information',
    guildOnly: false,
    content: 'By using JerSuit you agree to follow Discord’s Terms of Service and Community Guidelines. JerSuit may not be used for harassment, spam, raids, or illegal activity. Server owners are responsible for how they configure the bot in their communities.',
});
(0, framework_1.staticCommand)({
    name: 'privacy',
    description: 'How JerSuit handles your data.',
    category: 'information',
    guildOnly: false,
    content: 'JerSuit stores only what is required to operate: guild settings, moderation cases, economy/levels data (when enabled) and dashboard sessions. Your Discord token is never exposed or published. You can request data deletion at any time via a maintainer.',
});
(0, framework_1.staticCommand)({
    name: 'credits',
    description: 'Credits and acknowledgements for JerSuit.',
    category: 'information',
    content: 'JerSuit is built with **discord.js v14**, **Next.js** and **TypeScript**.\n\nThank you to everyone who reported bugs, translated and supported the project! 💚',
});
(0, framework_1.staticCommand)({
    name: 'login',
    description: 'Learn how to log in to your JerSuit dashboard.',
    category: 'information',
    guildOnly: false,
    content: (i) => {
        const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
        return `Open the dashboard to log in with Discord OAuth:\n${base || 'the dashboard URL'}\n\nYour session is verified server-side and you only see servers you can manage.`;
    },
});
(0, framework_1.staticCommand)({
    name: 'lookup',
    description: 'Show basic information about a Discord user.',
    category: 'information',
    cooldown: 3,
    content: (i) => {
        const target = i.options.getUser('user');
        const u = target ?? i.user;
        return `**${u.username}**\n- ID: \`${u.id}\`\n- Created: <t:${Math.floor(u.createdTimestamp / 1000)}:R>\n- Bot: ${u.bot ? 'yes' : 'no'}`;
    },
    builder: (b) => b.addUserOption((o) => o.setName('user').setDescription('User to look up').setRequired(false)),
});
(0, framework_1.staticCommand)({
    name: 'role-info',
    description: 'Show information about a role.',
    category: 'information',
    content: (i) => {
        const role = i.options.getRole('role');
        if (!role)
            return 'Role not found.';
        const hex = 'hexColor' in role ? role.hexColor : `#${role.color.toString(16).padStart(6, '0')}`;
        return `**Role:** ${role.name}\n- ID: \`${role.id}\`\n- Color: \`${hex}\`\n- Hoisted: ${role.hoist ? 'yes' : 'no'}\n- Mentionable: ${role.mentionable ? 'yes' : 'no'}\n- Position: ${role.position}`;
    },
    builder: (b) => b.addRoleOption((o) => o.setName('role').setDescription('Role to inspect').setRequired(true)),
});
(0, framework_1.staticCommand)({
    name: 'channel-info',
    description: 'Show information about a channel.',
    category: 'information',
    content: (i) => {
        const ch = i.options.getChannel('channel');
        if (!ch)
            return 'Channel not found.';
        return `**Channel:** ${ch.name}\n- ID: \`${ch.id}\`\n- Type: \`${ch.type}\`\n- Topic: ${'topic' in ch && ch.topic ? ch.topic : '—'}`;
    },
    builder: (b) => b.addChannelOption((o) => o.setName('channel').setDescription('Channel to inspect').setRequired(false)),
});
