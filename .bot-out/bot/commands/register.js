"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGuildCommands = exports.registerGlobalCommands = exports.collectCommandData = void 0;
const logger_1 = require("@/lib/logger");
const registry_1 = require("./registry");
const services_1 = require("@/lib/services");
async function collectCommandData() {
    const commands = (0, registry_1.getAllCommands)();
    const resolvable = [];
    for (const c of commands) {
        try {
            const settings = (await (0, services_1.getGlobalCommandSettings)(c.data.name));
            const inner = (settings.settings ?? settings);
            const enabled = inner.enabled !== false && settings.enabled !== false;
            if (!enabled)
                continue;
            resolvable.push(c.data.toJSON());
        }
        catch {
            resolvable.push(c.data.toJSON());
        }
    }
    return resolvable;
}
exports.collectCommandData = collectCommandData;
async function registerGlobalCommands(client) {
    const commands = await collectCommandData();
    if (commands.length === 0)
        return;
    await client.application.commands.set(commands);
    logger_1.logger.info('bot', `[Bot] Registered ${commands.length} global commands`);
}
exports.registerGlobalCommands = registerGlobalCommands;
async function registerGuildCommands(client, guildId) {
    const commands = await collectCommandData();
    const guild = client.guilds.resolve(guildId);
    if (!guild)
        return;
    await guild.commands.set(commands);
    logger_1.logger.info('bot', `[Bot] Registered ${commands.length} guild commands`);
}
exports.registerGuildCommands = registerGuildCommands;
