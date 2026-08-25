"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.botRuntime = void 0;
const logger_1 = require("@/lib/logger");
const config_1 = require("@/bot/config");
const client_1 = require("@/bot/client");
const ready_1 = require("@/bot/events/ready");
const guildCreate_1 = require("@/bot/events/guildCreate");
const guildDelete_1 = require("@/bot/events/guildDelete");
const interactionCreate_1 = require("@/bot/events/interactionCreate");
const error_1 = require("@/bot/events/error");
const presence_1 = require("@/bot/presence");
const guildMemberAdd_1 = require("@/bot/events/guildMemberAdd");
const messageCreate_1 = require("@/bot/events/messageCreate");
const reactions_1 = require("@/bot/events/reactions");
const READY_TIMEOUT_MS = 30000;
class BotRuntimeManager {
    constructor() {
        this.client = null;
        this.readyClient = null;
        this.stateValue = 'stopped';
        this.botUserValue = null;
        this.guildCountValue = 0;
        this.interactionCountValue = 0;
        this.startedAtValue = null;
        this.readyAtValue = null;
        this.lastStartedAtValue = null;
        this.lastStoppedAtValue = null;
        this.lastErrorValue = null;
        this.lastDisconnectValue = null;
        this.lastCrashAtValue = null;
        this.restartCountValue = 0;
        this.presenceValue = null;
        /**
         * Real-time animated Discord presence.
         *
         * The presence rotates through live statistics gathered directly
         * from the connected Discord client.
         */
        this.presenceRotationTimer = null;
        this.presenceRotationIndex = 0;
        this.transitioning = false;
        this.shuttingDown = false;
        this.readyPromise = null;
        this.readyResolve = null;
    }
    /* ─────── Public lifecycle API ─────── */
    start() {
        return this.runCommand('start');
    }
    stop() {
        return this.runCommand('stop');
    }
    restart() {
        return this.runCommand('restart');
    }
    /** Returns the live discord.js Client if one exists (null when stopped). */
    getClient() {
        return this.client;
    }
    getStatus() {
        const now = Date.now();
        const anchor = this.startedAtValue ? new Date(this.startedAtValue).getTime() : now;
        const uptime = this.readyAtValue
            ? Math.max(0, Math.floor((now - new Date(this.readyAtValue).getTime()) / 1000))
            : Math.max(0, Math.floor((now - anchor) / 1000));
        return {
            state: this.stateValue,
            botUser: this.botUserValue ? { ...this.botUserValue } : null,
            guildCount: this.guildCountValue,
            startedAt: this.startedAtValue,
            readyAt: this.readyAtValue,
            uptime,
            presence: this.presenceValue ? structuredClonePresence(this.presenceValue) : null,
            lastError: this.lastErrorValue,
            lastDisconnect: this.lastDisconnectValue,
            restartCount: this.restartCountValue,
            lastStartedAt: this.lastStartedAtValue,
            lastStoppedAt: this.lastStoppedAtValue,
            lastCrashAt: this.lastCrashAtValue,
            tokenConfigured: (0, config_1.isBotTokenConfigured)(),
            clientPresent: this.client !== null,
            interactionCount: this.interactionCountValue,
        };
    }
    /**
     * Applies a presence to the real connected client. When offline, the
     * intended presence is stored and marked not-applied; it is automatically
     * restored after the next successful start.
     */
    async setPresence(presence) {
        if (this.stateValue !== 'online' || !this.readyClient) {
            this.presenceValue = structuredClonePresence(presence);
            return {
                success: true,
                applied: false,
                presence: structuredClonePresence(presence),
                message: 'Bot is not online. Presence saved and will be applied on the next start.',
            };
        }
        try {
            // Real Discord presence update on the active client - no reconnecting.
            this.readyClient.user.setStatus(presence.status);
            const activityOptions = {
                type: (0, presence_1.toDiscordActivityType)(presence.activity.type),
            };
            if (presence.activity.url)
                activityOptions.url = presence.activity.url;
            this.readyClient.user.setActivity(presence.activity.name, activityOptions);
            this.presenceValue = structuredClonePresence(presence);
            logger_1.logger.info('bot', '[Bot] Presence updated', { status: presence.status, activityType: presence.activity.type });
            return {
                success: true,
                applied: true,
                presence: structuredClonePresence(presence),
                message: 'Bot presence updated on Discord.',
            };
        }
        catch (error) {
            const safe = error instanceof Error ? error.message : 'unknown';
            this.lastErrorValue = safe;
            logger_1.logger.error('bot', '[Bot] Failed to apply presence', { message: safe });
            return {
                success: false,
                applied: false,
                presence: structuredClonePresence(presence),
                message: 'Failed to apply presence to Discord.',
                error: { code: 'PRESENCE_UPDATE_FAILED', message: safe },
            };
        }
    }
    /**
     * Starts the animated real-time presence rotation.
     *
     * Statistics are calculated from the actual connected Discord client,
     * so values are never hard-coded.
     */
    startPresenceRotation() {
        this.stopPresenceRotation();
        this.presenceRotationIndex = 0;
        const update = async () => {
            const client = this.readyClient;
            if (!client || !client.isReady()) {
                return;
            }
            const guildCount = client.guilds.cache.size;
            const memberCount = client.guilds.cache.reduce((total, guild) => total + (guild.memberCount || 0), 0);
            const channelCount = client.channels.cache.size;
            const commandCount = await this.getRealCommandCount();
            const frames = [
                `⚡ JerSuit • ${commandCount} Commands`,
                `🛡️ JerSuit • ${guildCount} Servers`,
                `👥 JerSuit • ${memberCount.toLocaleString()} Members`,
                `📡 JerSuit • ${channelCount} Channels`,
            ];
            const activityName = frames[this.presenceRotationIndex % frames.length];
            this.presenceRotationIndex += 1;
            try {
                client.user.setActivity(activityName, {
                    type: (0, presence_1.toDiscordActivityType)('playing'),
                });
                logger_1.logger.info('bot', '[Bot] Animated presence updated', {
                    activity: activityName,
                    commands: commandCount,
                    guilds: guildCount,
                    members: memberCount,
                    channels: channelCount,
                });
            }
            catch (error) {
                logger_1.logger.error('bot', '[Bot] Failed to update animated presence', {
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        };
        void update();
        this.presenceRotationTimer = setInterval(() => void update(), BotRuntimeManager.PRESENCE_ROTATION_INTERVAL);
    }
    /**
     * Stops the animated presence timer.
     */
    stopPresenceRotation() {
        if (this.presenceRotationTimer) {
            clearInterval(this.presenceRotationTimer);
            this.presenceRotationTimer = null;
        }
    }
    /**
     * Counts the real loaded slash commands from the command loader.
     *
     * Falls back safely to zero if the loader does not expose its registry.
     */
    async getRealCommandCount() {
        try {
            const loader = await Promise.resolve().then(() => __importStar(require('@/bot/commands/loader')));
            const candidate = loader;
            for (const key of [
                'getCommands',
                'getLoadedCommands',
                'getCommandRegistry',
                'commands',
            ]) {
                const value = candidate[key];
                if (typeof value === 'function') {
                    const result = await value();
                    if (Array.isArray(result)) {
                        return result.length;
                    }
                    if (result instanceof Map || result instanceof Set) {
                        return result.size;
                    }
                }
                if (Array.isArray(value)) {
                    return value.length;
                }
                if (value instanceof Map || value instanceof Set) {
                    return value.size;
                }
            }
        }
        catch {
            // Safe fallback.
        }
        return 0;
    }
    async shutdown() {
        if (this.shuttingDown)
            return;
        this.shuttingDown = true;
        logger_1.logger.info('bot', '[Bot] Shutting down');
        await this.doStop();
    }
    /* ─── RuntimeSink (event handlers) ─── */
    markReady(info) {
        this.botUserValue = { ...info.botUser };
        this.guildCountValue = info.guildCount;
        this.readyAtValue = info.readyAt.toISOString();
        this.readyPromise = this.readyPromise ?? Promise.resolve();
        this.readyResolve?.();
        if (this.stateValue === 'starting' || this.stateValue === 'restarting') {
            this.stateValue = 'online';
        }
        // Capture the narrowed ready client for presence/activity operations.
        if (this.client?.isReady()) {
            this.readyClient = this.client;
        }
    }
    adjustGuildCount(delta) {
        this.guildCountValue = Math.max(0, this.guildCountValue + delta);
    }
    noteInteraction() {
        this.interactionCountValue += 1;
    }
    noteError(error) {
        const safe = error instanceof Error ? error.message : String(error);
        this.lastErrorValue = safe;
    }
    noteDisconnect(reason) {
        this.lastDisconnectValue =
            reason === null ? new Date().toISOString() : `${reason} @ ${new Date().toISOString()}`;
        this.readyClient = null;
    }
    /* ─── Command router with transition lock ─── */
    async runCommand(command) {
        if (this.shuttingDown) {
            return this.makeResult(command, false, 'error', 'Runtime is shutting down.', null);
        }
        if (this.transitioning) {
            const msg = command === 'start'
                ? 'A runtime operation is already in progress. Duplicate start blocked.'
                : 'A runtime operation is already in progress.';
            return this.makeResult(command, false, this.stateValue, msg, null);
        }
        this.transitioning = true;
        try {
            switch (command) {
                case 'start':
                    return await this.doStart();
                case 'stop':
                    return await this.doStopCommand();
                case 'restart':
                    return await this.doRestart();
            }
        }
        finally {
            this.transitioning = false;
        }
    }
    async doStart() {
        if (this.stateValue === 'online' || this.stateValue === 'starting') {
            return this.makeResult('start', this.stateValue === 'online', this.stateValue, this.stateValue === 'online' ? 'Bot is already online.' : 'Bot is already starting.', null);
        }
        const configError = (0, config_1.getBotConfigError)();
        if (configError) {
            this.stateValue = 'error';
            this.lastErrorValue = configError;
            return this.makeResult('start', false, 'error', configError, null);
        }
        logger_1.logger.info('bot', '[Bot] Starting...');
        this.stateValue = 'starting';
        this.startedAtValue = new Date().toISOString();
        this.lastStartedAtValue = this.startedAtValue;
        this.readyAtValue = null;
        this.lastErrorValue = null;
        this.lastCrashAtValue = null;
        let token;
        try {
            token = (0, config_1.getBotToken)();
        }
        catch (error) {
            return this.failStart('start', error, null);
        }
        const client = (0, client_1.createBotClient)();
        this.client = client;
        this.readyPromise = new Promise((resolve) => { this.readyResolve = resolve; });
        try {
            this.registerHandlers(client);
            this.readyClient = null;
            logger_1.logger.info('bot', '[Bot] Connecting to Discord...');
            await client.login(token);
            await this.awaitReady(client);
            if (!client.isReady() || !this.readyAtValue) {
                return this.failStart('start', null, 'ready timeout');
            }
            this.readyClient = client;
            logger_1.logger.info('bot', `[Bot] Connected to ${this.guildCountValue} guilds`);
            // Start real-time animated presence using live Discord statistics.
            this.startPresenceRotation();
            // Load and register the real slash command set (idempotent).
            await this.registerCommands(client);
            // Restore the last intended presence on the real client. Prefers the
            // in-memory value (set from the dashboard) and falls back to the DB.
            let presenceToRestore = this.presenceValue;
            if (!presenceToRestore) {
                try {
                    const { loadStoredBotPresence } = await Promise.resolve().then(() => __importStar(require('@/lib/services')));
                    const stored = await loadStoredBotPresence();
                    if (stored) {
                        presenceToRestore = {
                            status: stored.status,
                            activity: { type: stored.activity.type, name: stored.activity.name, url: stored.activity.url ?? null },
                        };
                    }
                }
                catch {
                    /* non-fatal */
                }
            }
            if (presenceToRestore) {
                const restored = await this.setPresence(presenceToRestore);
                logger_1.logger.info('bot', '[Bot] Presence restored on start', { applied: restored.applied });
            }
            else {
                await this.setPresence(presence_1.DEFAULT_BOT_PRESENCE);
            }
            return this.makeResult('start', true, 'online', 'Bot started and connected to Discord.', this.getStatus());
        }
        catch (error) {
            return this.failStart('start', error, null);
        }
    }
    async registerCommands(client) {
        const { registerCommandsIfPossible } = await Promise.resolve().then(() => __importStar(require('@/bot/commands/loader')));
        await registerCommandsIfPossible(client);
    }
    async doStopCommand() {
        if (this.stateValue === 'stopped') {
            return this.makeResult('stop', true, 'stopped', 'Bot is already stopped.', null);
        }
        logger_1.logger.info('bot', '[Bot] Stopping...');
        await this.doStop();
        return this.makeResult('stop', true, 'stopped', 'Bot stopped cleanly.', this.getStatus());
    }
    async doStop() {
        this.stateValue = 'stopping';
        try {
            if (this.client) {
                const target = this.client;
                this.client = null;
                this.readyClient = null;
                this.readyPromise = null;
                this.readyResolve = null;
                this.botUserValue = null;
                this.readyAtValue = null;
                await target.destroy();
                logger_1.logger.info('bot', '[Bot] Disconnected');
                this.interactionCountValue = 0;
            }
        }
        catch (error) {
            this.lastErrorValue = error instanceof Error ? error.message : String(error);
        }
        finally {
            this.stateValue = 'stopped';
            this.lastStoppedAtValue = new Date().toISOString();
        }
    }
    async doRestart() {
        if (this.stateValue === 'stopped' || this.stateValue === 'error') {
            this.restartCountValue += 1;
            return this.doStart();
        }
        logger_1.logger.info('bot', '[Bot] Restarting...');
        this.restartCountValue += 1;
        await this.doStop();
        return this.doStart();
    }
    /* ─── Ready await ─── */
    async awaitReady(client) {
        if (client.isReady())
            return;
        const wait = this.readyPromise ?? Promise.resolve();
        await Promise.race([
            wait,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out waiting for the Discord ready event.')), READY_TIMEOUT_MS)),
        ]);
    }
    registerHandlers(client) {
        (0, ready_1.registerReadyHandler)(client, this, () => this.readyResolve?.());
        (0, guildCreate_1.registerGuildCreateHandler)(client, this);
        (0, guildDelete_1.registerGuildDeleteHandler)(client, this);
        (0, interactionCreate_1.registerInteractionHandler)(client, this);
        (0, error_1.registerErrorHandler)(client, this);
        (0, guildMemberAdd_1.registerGuildMemberAddHandler)(client, this);
        (0, messageCreate_1.registerMessageHandler)(client, this);
        (0, reactions_1.registerReactionHandlers)(client, this);
    }
    failStart(command, error, fallback) {
        const message = error instanceof Error ? error.message : (fallback ?? 'Unknown start failure.');
        this.stateValue = 'error';
        this.lastErrorValue = message;
        this.lastCrashAtValue = new Date().toISOString();
        if (this.client) {
            void this.client.destroy().catch(() => undefined);
            this.client = null;
            this.readyClient = null;
        }
        return this.makeResult(command, false, 'error', message, null, 'START_FAILED');
    }
    makeResult(command, success, state, message, status, code) {
        logger_1.logger.info('bot', `[Bot] command=${command} success=${success} state=${state}`);
        const result = {
            success,
            command,
            state,
            message,
            status: status ?? this.getStatus(),
        };
        if (code)
            result.error = { code, message };
        return result;
    }
}
BotRuntimeManager.PRESENCE_ROTATION_INTERVAL = 15000;
function structuredClonePresence(presence) {
    return {
        status: presence.status,
        activity: {
            name: presence.activity.name,
            type: presence.activity.type,
            url: presence.activity.url ? String(presence.activity.url) : null,
        },
    };
}
const runtimeManager = new BotRuntimeManager();
exports.botRuntime = runtimeManager;
