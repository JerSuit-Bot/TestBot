"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COOLDOWN = exports.toDescriptor = exports.getCommandDescriptor = exports.getCommandDescriptors = exports.getCategories = exports.getCommandsByCategory = exports.getCommandCount = exports.getAllCommands = exports.getCommand = exports.registerCommand = void 0;
const types_1 = require("./types");
const commands = new Map();
const DEFAULT_COOLDOWN = 2;
exports.DEFAULT_COOLDOWN = DEFAULT_COOLDOWN;
function registerCommand(command) {
    if (!command.metadata) {
        command.metadata = {
            name: command.data.name,
            description: 'description' in command.data && typeof command.data.description === 'string'
                ? command.data.description
                : command.data.name,
            category: command.category,
        };
    }
    command.metadata.name = command.metadata.name || command.data.name;
    command.metadata.description = command.metadata.description || getDataDescription(command);
    command.metadata.category = command.category;
    commands.set(command.data.name, command);
}
exports.registerCommand = registerCommand;
function getCommand(name) {
    return commands.get(name);
}
exports.getCommand = getCommand;
function getAllCommands() {
    return Array.from(commands.values());
}
exports.getAllCommands = getAllCommands;
function getCommandCount() {
    return commands.size;
}
exports.getCommandCount = getCommandCount;
function getCommandsByCategory(category) {
    return Array.from(commands.values()).filter((c) => c.metadata?.category === category);
}
exports.getCommandsByCategory = getCommandsByCategory;
function getCategories() {
    const present = new Set(Array.from(commands.values()).map((c) => c.metadata?.category ?? 'general'));
    return types_1.COMMAND_CATEGORIES.filter((c) => present.has(c));
}
exports.getCategories = getCategories;
/**
 * Builds serialisable command descriptors (safe for the Admin Panel API) from
 * the live registry. This is the single source of truth for the dashboard.
 */
function getCommandDescriptors() {
    return Array.from(commands.values()).map((c) => toDescriptor(c));
}
exports.getCommandDescriptors = getCommandDescriptors;
function getCommandDescriptor(name) {
    const c = commands.get(name);
    return c ? toDescriptor(c) : null;
}
exports.getCommandDescriptor = getCommandDescriptor;
function toDescriptor(command) {
    const m = command.metadata ?? {};
    const data = command.data;
    const options = extractOptions(data);
    const { subcommands } = extractSubcommands(data);
    /** Distinct option names map to all-string usage fragments. */
    const usage = m.usage ?? buildUsage(command.data.name, options);
    const category = types_1.COMMAND_CATEGORIES.includes(m.category)
        ? m.category
        : 'general';
    return {
        name: command.data.name,
        description: m.description || getDataDescription(command),
        category,
        defaultMemberPermissions: command.defaultMemberPermissions?.toString() ?? null,
        cooldownSeconds: command.cooldownSeconds ?? m.cooldownSeconds ?? DEFAULT_COOLDOWN,
        guildOnly: m.guildOnly ?? true,
        ownerOnly: m.ownerOnly ?? false,
        enabledByDefault: !(m.disabled ?? false),
        usage,
        examples: m.examples ?? [],
        configurable: m.configurable ?? false,
        toggleable: m.toggleable ?? true,
        options,
        hasSubcommands: subcommands.length > 0,
        subcommands,
    };
}
exports.toDescriptor = toDescriptor;
function getDataDescription(c) {
    const data = c.data;
    return data.description ?? c.data.name;
}
function extractOptions(data) {
    const options = data.options ?? [];
    const out = [];
    for (const opt of options) {
        // Subcommand groups / subcommands are handled separately.
        if (opt.type === 1 || opt.type === 2)
            continue;
        const typeMap = {
            3: 'string',
            4: 'integer',
            5: 'boolean',
            6: 'user',
            7: 'channel',
            8: 'role',
            9: 'mentionable',
            10: 'number',
        };
        out.push({
            name: String(opt.name ?? ''),
            description: String(opt.description ?? ''),
            required: Boolean(opt.required),
            type: typeMap[Number(opt.type)] ?? 'string',
        });
    }
    return out;
}
function extractSubcommands(data) {
    const options = data.options ?? [];
    const subcommands = [];
    for (const opt of options) {
        if (opt.type === 1)
            subcommands.push(String(opt.name));
        if (opt.type === 2) {
            const groupOptions = opt.options ?? [];
            for (const sub of groupOptions) {
                subcommands.push(`${String(opt.name)} ${String(sub.name)}`);
            }
        }
    }
    return { subcommands };
}
function buildUsage(name, options) {
    if (options.length === 0)
        return `/${name}`;
    const parts = options.map((o) => (o.required ? `<${o.name}>` : `[${o.name}]`));
    return `/${name} ${parts.join(' ')}`;
}
