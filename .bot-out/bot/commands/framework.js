"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staticCommands = exports.staticCommand = exports.dbGuildId = exports.formatDuration = exports.parseDuration = exports.isOwner = exports.requireOwner = exports.success = exports.error = exports.PERMS = exports.defineCommand = void 0;
const helpers_1 = require("./helpers");
Object.defineProperty(exports, "defineCommand", { enumerable: true, get: function () { return helpers_1.defineCommand; } });
Object.defineProperty(exports, "PERMS", { enumerable: true, get: function () { return helpers_1.PERMS; } });
Object.defineProperty(exports, "error", { enumerable: true, get: function () { return helpers_1.error; } });
Object.defineProperty(exports, "success", { enumerable: true, get: function () { return helpers_1.success; } });
Object.defineProperty(exports, "requireOwner", { enumerable: true, get: function () { return helpers_1.requireOwner; } });
Object.defineProperty(exports, "isOwner", { enumerable: true, get: function () { return helpers_1.isOwner; } });
Object.defineProperty(exports, "parseDuration", { enumerable: true, get: function () { return helpers_1.parseDuration; } });
Object.defineProperty(exports, "formatDuration", { enumerable: true, get: function () { return helpers_1.formatDuration; } });
Object.defineProperty(exports, "dbGuildId", { enumerable: true, get: function () { return helpers_1.dbGuildId; } });
const ui_1 = require("./ui");
/**
 * Registers a command whose reply is primarily an embedded message. This keeps
 * short informational/utility commands to a few lines while staying fully real
 * (reads runtime data where the content function asks for it).
 */
function staticCommand(input) {
    const execute = async (ctx) => {
        if (input.execute) {
            await input.execute(ctx);
            return;
        }
        if (input.embedFn) {
            const embed = await input.embedFn(ctx.interaction);
            await ctx.interaction.reply({ embeds: [embed], ephemeral: false });
            return;
        }
        const text = typeof input.content === 'function' ? await input.content(ctx.interaction) : (input.content ?? '');
        await ctx.interaction.reply({
            embeds: [(0, ui_1.jerSuitEmbed)(input.name).setDescription(String(text))],
            ephemeral: false,
        });
    };
    return (0, helpers_1.defineCommand)({
        name: input.name,
        description: input.description,
        category: input.category,
        cooldown: input.cooldown ?? 2,
        ownerOnly: input.ownerOnly,
        guildOnly: input.guildOnly ?? true,
        memberPermissions: input.memberPermissions ?? null,
        usage: input.usage,
        examples: input.examples,
        configurable: input.configurable ?? true,
        toggleable: input.toggleable ?? true,
        disabled: input.disabled,
        builder: input.builder,
        execute,
    });
}
exports.staticCommand = staticCommand;
/** Registers a batch of static commands in one sweep. */
function staticCommands(defs) {
    for (const def of defs)
        staticCommand(def);
}
exports.staticCommands = staticCommands;
