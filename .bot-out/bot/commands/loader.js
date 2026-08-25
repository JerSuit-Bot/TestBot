"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommandsIfPossible = exports.getAllCommands = void 0;
/**
 * Command loader - imports all command modules (registration side effects),
 * then exposes the registry and idempotent slash registration.
 */
require("./index");
const registry_1 = require("./registry");
Object.defineProperty(exports, "getAllCommands", { enumerable: true, get: function () { return registry_1.getAllCommands; } });
const register_1 = require("./register");
const logger_1 = require("@/lib/logger");
/**
 * Registers commands with Discord. Failures are logged but never fatal - the
 * bot stays online even if registration needs re-authentication.
 */
async function registerCommandsIfPossible(client) {
    try {
        await (0, register_1.registerGlobalCommands)(client);
    }
    catch (error) {
        logger_1.logger.warn('bot', '[Bot] Command registration skipped', {
            message: error instanceof Error ? error.message : 'unknown',
        });
    }
}
exports.registerCommandsIfPossible = registerCommandsIfPossible;
