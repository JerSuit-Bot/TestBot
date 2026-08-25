"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Moderation — role management commands. Real Discord actions, role-locked.
 */
const discord_js_1 = require("discord.js");
const framework_1 = require("../framework");
const MANAGE_ROLES = discord_js_1.PermissionFlagsBits.ManageRoles;
function modEmbed(title, description) {
    return new discord_js_1.EmbedBuilder().setTitle(title).setDescription(description).setColor(0x199155);
}
(0, framework_1.defineCommand)({
    name: 'addrole',
    description: 'Assign a role to a member.',
    category: 'roles',
    memberPermissions: MANAGE_ROLES,
    cooldown: 3,
    builder: (b) => b
        .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true))
        .addRoleOption((o) => o.setName('role').setDescription('Role to give').setRequired(true)),
    execute: async (ctx) => {
        const guild = ctx.interaction.guild;
        const user = ctx.interaction.options.getUser('user', true);
        const role = ctx.interaction.options.getRole('role', true);
        if (!guild || !('id' in role))
            return (0, framework_1.error)(ctx.interaction, 'Invalid role.');
        if (role.id === guild.roles.everyone.id)
            return (0, framework_1.error)(ctx.interaction, 'Cannot assign @everyone.');
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member)
            return (0, framework_1.error)(ctx.interaction, 'That user is not a member of this server.');
        if (member.roles.cache.has(role.id))
            return (0, framework_1.error)(ctx.interaction, 'That member already has this role.');
        await member.roles.add(role.id, 'addrole command');
        await ctx.interaction.reply({ embeds: [modEmbed('Role added', `Gave ${role} to **${user.username}**.`)] });
    },
});
(0, framework_1.defineCommand)({
    name: 'removerole',
    description: 'Remove a role from a member.',
    category: 'roles',
    memberPermissions: MANAGE_ROLES,
    cooldown: 3,
    builder: (b) => b
        .addUserOption((o) => o.setName('user').setDescription('Member').setRequired(true))
        .addRoleOption((o) => o.setName('role').setDescription('Role to remove').setRequired(true)),
    execute: async (ctx) => {
        const guild = ctx.interaction.guild;
        const user = ctx.interaction.options.getUser('user', true);
        const role = ctx.interaction.options.getRole('role', true);
        if (!guild || !('id' in role))
            return (0, framework_1.error)(ctx.interaction, 'Invalid role.');
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member)
            return (0, framework_1.error)(ctx.interaction, 'That user is not a member of this server.');
        if (!member.roles.cache.has(role.id))
            return (0, framework_1.error)(ctx.interaction, 'That member does not have this role.');
        await member.roles.remove(role.id, 'removerole command');
        await ctx.interaction.reply({ embeds: [modEmbed('Role removed', `Removed ${role} from **${user.username}**.`)] });
    },
});
(0, framework_1.defineCommand)({
    name: 'rolecreate',
    description: 'Create a new role with an optional color.',
    category: 'roles',
    memberPermissions: MANAGE_ROLES,
    cooldown: 3,
    builder: (b) => b
        .addStringOption((o) => o.setName('name').setDescription('Role name').setRequired(true))
        .addStringOption((o) => o.setName('color').setDescription('Hex color, e.g. 33A65F')),
    execute: async (ctx) => {
        const name = ctx.interaction.options.getString('name') ?? 'new-role';
        const color = ctx.interaction.options.getString('color') ?? '#33A65F';
        const guild = ctx.interaction.guild;
        if (!guild) {
            return (0, framework_1.error)(ctx.interaction, 'This command only works in servers.');
        }
        const role = await guild.roles.create({
            name: name.slice(0, 100),
            color: color,
        });
        await ctx.interaction.reply({ embeds: [modEmbed('Role created', `Created ${role}.`)], ephemeral: true });
    },
});
(0, framework_1.defineCommand)({
    name: 'roledelete',
    description: 'Delete a role.',
    category: 'roles',
    memberPermissions: MANAGE_ROLES,
    cooldown: 3,
    builder: (b) => b.addRoleOption((o) => o.setName('role').setDescription('Role to delete').setRequired(true)),
    execute: async (ctx) => {
        const selectedRole = ctx.interaction.options.getRole('role', true);
        const role = await ctx.interaction.guild?.roles.fetch(selectedRole.id);
        if (!role) {
            return (0, framework_1.error)(ctx.interaction, 'That role could not be found.');
        }
        const name = role.name;
        if (!role.editable) {
            return (0, framework_1.error)(ctx.interaction, 'That role cannot be deleted by the bot.');
        }
        await role.delete('roledelete command');
        await ctx.interaction.reply({ embeds: [modEmbed('Role deleted', `Deleted **${name}**.`)], ephemeral: true });
    },
});
(0, framework_1.defineCommand)({
    name: 'rolerename',
    description: 'Rename a role.',
    category: 'roles',
    memberPermissions: MANAGE_ROLES,
    cooldown: 3,
    builder: (b) => b
        .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true))
        .addStringOption((o) => o.setName('name').setDescription('New name').setRequired(true)),
    execute: async (ctx) => {
        const selectedRole = ctx.interaction.options.getRole('role', true);
        const role = await ctx.interaction.guild?.roles.fetch(selectedRole.id);
        if (!role) {
            return (0, framework_1.error)(ctx.interaction, 'That role could not be found.');
        }
        const name = ctx.interaction.options.getString('name') ?? '';
        await role.setName(name.slice(0, 100));
        await ctx.interaction.reply({ embeds: [modEmbed('Role renamed', `Renamed to **${name}**.`)], ephemeral: true });
        (0, framework_1.defineCommand)({
            name: 'rolecolor',
            description: 'Change a role’s color.',
            category: 'roles',
            memberPermissions: MANAGE_ROLES,
            cooldown: 3,
            builder: (b) => b
                .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true))
                .addStringOption((o) => o.setName('color').setDescription('Hex color').setRequired(true)),
            execute: async (ctx) => {
                const selectedRole = ctx.interaction.options.getRole('role', true);
                const role = await ctx.interaction.guild?.roles.fetch(selectedRole.id);
                if (!role) {
                    return (0, framework_1.error)(ctx.interaction, 'That role could not be found.');
                }
                const color = ctx.interaction.options.getString('color') ?? '#33A65F';
                await role.setColor(color);
                await ctx.interaction.reply({ embeds: [modEmbed('Role color', `Changed ${role} to \`${color}\`.`)], ephemeral: true });
            },
        });
        (0, framework_1.defineCommand)({
            name: 'rolehoist',
            description: 'Toggle whether a role is shown separately in the member list.',
            category: 'roles',
            memberPermissions: MANAGE_ROLES,
            cooldown: 3,
            builder: (b) => b.addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true)),
            execute: async (ctx) => {
                const selectedRole = ctx.interaction.options.getRole('role', true);
                const role = await ctx.interaction.guild?.roles.fetch(selectedRole.id);
                if (!role) {
                    return (0, framework_1.error)(ctx.interaction, 'That role could not be found.');
                }
                await role.setHoist(!role.hoist);
                await ctx.interaction.reply({
                    embeds: [modEmbed('Role hoist', `${role} is now **${role.hoist ? 'hoisted' : 'not hoisted'}**.`)],
                    ephemeral: true,
                });
            },
        });
        (0, framework_1.defineCommand)({
            name: 'rolepurge',
            description: 'Remove a role from every member currently holding it.',
            category: 'roles',
            memberPermissions: MANAGE_ROLES,
            cooldown: 10,
            builder: (b) => b.addRoleOption((o) => o.setName('role').setDescription('Role to remove').setRequired(true)),
            execute: async (ctx) => {
                const role = ctx.interaction.options.getRole('role', true);
                if (!('members' in role))
                    return (0, framework_1.error)(ctx.interaction, 'Role not found.');
                let count = 0;
                for (const [, member] of role.members) {
                    await member.roles.remove(role.id, 'rolepurge command').catch(() => undefined);
                    count++;
                }
                await ctx.interaction.reply({
                    embeds: [modEmbed('Role purged', `Removed ${role.name} from **${count}** member(s).`)],
                    ephemeral: true,
                });
            },
        });
    },
});
