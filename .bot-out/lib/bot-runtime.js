"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBotPresence = exports.runBotCommand = exports.getClient = exports.getBotRuntimeStatus = void 0;
/**
 * Server-only bridge between the Dashboard Runtime Control API and the Bot
 * Runtime Manager.
 *
 * IMPORTANT: This module must only ever be imported from server-side Next.js
 * routes. It imports discord.js transitively, so it must never be reachable
 * from a client ('use client') component or a browser bundle.
 */
require("server-only");
const runtime_1 = require("@/bot/services/runtime");
function getBotRuntimeStatus() {
    return runtime_1.botRuntime.getStatus();
}
exports.getBotRuntimeStatus = getBotRuntimeStatus;
function getClient() {
    return runtime_1.botRuntime.getClient();
}
exports.getClient = getClient;
async function runBotCommand(command) {
    return runtime_1.botRuntime[command]();
}
exports.runBotCommand = runBotCommand;
async function updateBotPresence(presence) {
    return runtime_1.botRuntime.setPresence(presence);
}
exports.updateBotPresence = updateBotPresence;
