/**
 * JerSuit Bot Runtime Manager - the singleton owner of the real discord.js
 * Client lifecycle.
 *
 *   Admin Panel -> Runtime Control API -> BotRuntimeManager -> discord.js Client -> Gateway
 *
 * Guarantees:
 *   - No duplicate Client instances / duplicate simultaneous starts.
 *   - start() waits for the real Discord ready event before reporting online.
 *   - Login failures, gateway errors, and unexpected disconnects are handled.
 *   - Presence changes are applied to the *real* connected client in real time.
 *   - The token is never exposed; status/presence carry safe telemetry only.
 */
import { Client } from 'discord.js';
import { logger } from '@/lib/logger';
import { getBotToken, isBotTokenConfigured, getBotConfigError } from '@/bot/config';
import { createBotClient } from '@/bot/client';
import { registerReadyHandler } from '@/bot/events/ready';
import { registerGuildCreateHandler } from '@/bot/events/guildCreate';
import { registerGuildDeleteHandler } from '@/bot/events/guildDelete';
import { registerInteractionHandler } from '@/bot/events/interactionCreate';
import { registerErrorHandler } from '@/bot/events/error';
import { toDiscordActivityType, DEFAULT_BOT_PRESENCE } from '@/bot/presence';
import { registerGuildMemberAddHandler } from '@/bot/events/guildMemberAdd';
import { registerMessageHandler } from '@/bot/events/messageCreate';
import { registerReactionHandlers } from '@/bot/events/reactions';
import type {
  RuntimeState,
  RuntimeStatus,
  RuntimeCommand,
  RuntimeCommandResult,
  RuntimeSink,
  RuntimeBotUser,
  BotPresence,
  BotPresenceUpdateResult,
} from '@/bot/types';

const READY_TIMEOUT_MS = 30_000;

interface TrackedUser {
  id: string;
  username: string;
  tag: string | null;
  displayName: string | null;
}

class BotRuntimeManager implements RuntimeSink {
  private client: Client | null = null;
  private readyClient: Client<true> | null = null;
  private stateValue: RuntimeState = 'stopped';

  private botUserValue: TrackedUser | null = null;
  private guildCountValue = 0;
  private interactionCountValue = 0;

  private startedAtValue: string | null = null;
  private readyAtValue: string | null = null;
  private lastStartedAtValue: string | null = null;
  private lastStoppedAtValue: string | null = null;
  private lastErrorValue: string | null = null;
  private lastDisconnectValue: string | null = null;
  private lastCrashAtValue: string | null = null;
  private restartCountValue = 0;
  private presenceValue: BotPresence | null = null;

  /**
   * Real-time animated Discord presence.
   *
   * The presence rotates through live statistics gathered directly
   * from the connected Discord client.
   */
  private presenceRotationTimer: NodeJS.Timeout | null = null;
  private presenceRotationIndex = 0;
  private static readonly PRESENCE_ROTATION_INTERVAL = 15_000;

  private transitioning = false;
  private shuttingDown = false;
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;

  /* ─────── Public lifecycle API ─────── */

  start(): Promise<RuntimeCommandResult> {
    return this.runCommand('start');
  }

  stop(): Promise<RuntimeCommandResult> {
    return this.runCommand('stop');
  }

  restart(): Promise<RuntimeCommandResult> {
    return this.runCommand('restart');
  }

  /** Returns the live discord.js Client if one exists (null when stopped). */
  getClient(): Client | null {
    return this.client;
  }

  getStatus(): RuntimeStatus {
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
      tokenConfigured: isBotTokenConfigured(),
      clientPresent: this.client !== null,
      interactionCount: this.interactionCountValue,
    };
  }

  /**
   * Applies a presence to the real connected client. When offline, the
   * intended presence is stored and marked not-applied; it is automatically
   * restored after the next successful start.
   */
  async setPresence(presence: BotPresence): Promise<BotPresenceUpdateResult> {
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
      const activityOptions: { type: ReturnType<typeof toDiscordActivityType>; url?: string } = {
        type: toDiscordActivityType(presence.activity.type),
      };
      if (presence.activity.url) activityOptions.url = presence.activity.url;
      this.readyClient.user.setActivity(presence.activity.name, activityOptions);

      this.presenceValue = structuredClonePresence(presence);
      logger.info('bot', '[Bot] Presence updated', { status: presence.status, activityType: presence.activity.type });
      return {
        success: true,
        applied: true,
        presence: structuredClonePresence(presence),
        message: 'Bot presence updated on Discord.',
      };
    } catch (error) {
      const safe = error instanceof Error ? error.message : 'unknown';
      this.lastErrorValue = safe;
      logger.error('bot', '[Bot] Failed to apply presence', { message: safe });
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
  private startPresenceRotation(): void {
    this.stopPresenceRotation();

    this.presenceRotationIndex = 0;

    const update = async () => {
      const client = this.readyClient;

      if (!client || !client.isReady()) {
        return;
      }

      const guildCount = client.guilds.cache.size;

      const memberCount = client.guilds.cache.reduce(
        (total, guild) => total + (guild.memberCount || 0),
        0,
      );

      const channelCount = client.channels.cache.size;

      const commandCount = await this.getRealCommandCount();

      const frames = [
        `⚡ JerSuit • ${commandCount} Commands`,
        `🛡️ JerSuit • ${guildCount} Servers`,
        `👥 JerSuit • ${memberCount.toLocaleString()} Members`,
        `📡 JerSuit • ${channelCount} Channels`,
      ];

      const activityName = frames[
        this.presenceRotationIndex % frames.length
      ];

      this.presenceRotationIndex += 1;

      try {
        client.user.setActivity(activityName, {
          type: toDiscordActivityType('playing'),
        });

        logger.info('bot', '[Bot] Animated presence updated', {
          activity: activityName,
          commands: commandCount,
          guilds: guildCount,
          members: memberCount,
          channels: channelCount,
        });
      } catch (error) {
        logger.error('bot', '[Bot] Failed to update animated presence', {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    };

    void update();

    this.presenceRotationTimer = setInterval(
      () => void update(),
      BotRuntimeManager.PRESENCE_ROTATION_INTERVAL,
    );
  }

  /**
   * Stops the animated presence timer.
   */
  private stopPresenceRotation(): void {
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
  private async getRealCommandCount(): Promise<number> {
    try {
      const loader = await import('@/bot/commands/loader');

      const candidate = loader as Record<string, unknown>;

      for (const key of [
        'getCommands',
        'getLoadedCommands',
        'getCommandRegistry',
        'commands',
      ]) {
        const value = candidate[key];

        if (typeof value === 'function') {
          const result = await (value as () => unknown)();

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
    } catch {
      // Safe fallback.
    }

    return 0;
  }

  async shutdown(): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    logger.info('bot', '[Bot] Shutting down');
    await this.doStop();
  }

  /* ─── RuntimeSink (event handlers) ─── */

  markReady(info: { botUser: RuntimeBotUser; guildCount: number; readyAt: Date }): void {
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

  adjustGuildCount(delta: 1 | -1): void {
    this.guildCountValue = Math.max(0, this.guildCountValue + delta);
  }

  noteInteraction(): void {
    this.interactionCountValue += 1;
  }

  noteError(error: Error): void {
    const safe = error instanceof Error ? error.message : String(error);
    this.lastErrorValue = safe;
  }

  noteDisconnect(reason: string | null): void {
    this.lastDisconnectValue =
      reason === null ? new Date().toISOString() : `${reason} @ ${new Date().toISOString()}`;
    this.readyClient = null;
  }

  /* ─── Command router with transition lock ─── */

  private async runCommand(command: RuntimeCommand): Promise<RuntimeCommandResult> {
    if (this.shuttingDown) {
      return this.makeResult(command, false, 'error', 'Runtime is shutting down.', null);
    }
    if (this.transitioning) {
      const msg =
        command === 'start'
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
    } finally {
      this.transitioning = false;
    }
  }

  private async doStart(): Promise<RuntimeCommandResult> {
    if (this.stateValue === 'online' || this.stateValue === 'starting') {
      return this.makeResult('start', this.stateValue === 'online', this.stateValue, this.stateValue === 'online' ? 'Bot is already online.' : 'Bot is already starting.', null);
    }

    const configError = getBotConfigError();
    if (configError) {
      this.stateValue = 'error';
      this.lastErrorValue = configError;
      return this.makeResult('start', false, 'error', configError, null);
    }

    logger.info('bot', '[Bot] Starting...');
    this.stateValue = 'starting';
    this.startedAtValue = new Date().toISOString();
    this.lastStartedAtValue = this.startedAtValue;
    this.readyAtValue = null;
    this.lastErrorValue = null;
    this.lastCrashAtValue = null;

    let token: string;
    try {
      token = getBotToken();
    } catch (error) {
      return this.failStart('start', error, null);
    }

    const client = createBotClient();
    this.client = client;
    this.readyPromise = new Promise<void>((resolve) => { this.readyResolve = resolve; });

    try {
      this.registerHandlers(client);
      this.readyClient = null;
      logger.info('bot', '[Bot] Connecting to Discord...');
      await client.login(token);
      await this.awaitReady(client);

      if (!client.isReady() || !this.readyAtValue) {
        return this.failStart('start', null, 'ready timeout');
      }

      this.readyClient = client;
      logger.info('bot', `[Bot] Connected to ${this.guildCountValue} guilds`);

      // Start real-time animated presence using live Discord statistics.
      this.startPresenceRotation();

      // Load and register the real slash command set (idempotent).
      await this.registerCommands(client);

      // Restore the last intended presence on the real client. Prefers the
      // in-memory value (set from the dashboard) and falls back to the DB.
      let presenceToRestore = this.presenceValue;
      if (!presenceToRestore) {
        try {
          const { loadStoredBotPresence } = await import('@/lib/services');
          const stored = await loadStoredBotPresence();
          if (stored) {
            presenceToRestore = {
              status: stored.status,
              activity: { type: stored.activity.type, name: stored.activity.name, url: stored.activity.url ?? null },
            };
          }
        } catch {
          /* non-fatal */
        }
      }
      if (presenceToRestore) {
        const restored = await this.setPresence(presenceToRestore);
        logger.info('bot', '[Bot] Presence restored on start', { applied: restored.applied });
      } else {
        await this.setPresence(DEFAULT_BOT_PRESENCE);
      }

      return this.makeResult('start', true, 'online', 'Bot started and connected to Discord.', this.getStatus());
    } catch (error) {
      return this.failStart('start', error, null);
    }
  }

  private async registerCommands(client: Client<true>): Promise<void> {
    const { registerCommandsIfPossible } = await import('@/bot/commands/loader');
    await registerCommandsIfPossible(client);
  }

  private async doStopCommand(): Promise<RuntimeCommandResult> {
    if (this.stateValue === 'stopped') {
      return this.makeResult('stop', true, 'stopped', 'Bot is already stopped.', null);
    }
    logger.info('bot', '[Bot] Stopping...');
    await this.doStop();
    return this.makeResult('stop', true, 'stopped', 'Bot stopped cleanly.', this.getStatus());
  }

  private async doStop(): Promise<void> {
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
        logger.info('bot', '[Bot] Disconnected');
        this.interactionCountValue = 0;
      }
    } catch (error) {
      this.lastErrorValue = error instanceof Error ? error.message : String(error);
    } finally {
      this.stateValue = 'stopped';
      this.lastStoppedAtValue = new Date().toISOString();
    }
  }

  private async doRestart(): Promise<RuntimeCommandResult> {
    if (this.stateValue === 'stopped' || this.stateValue === 'error') {
      this.restartCountValue += 1;
      return this.doStart();
    }
    logger.info('bot', '[Bot] Restarting...');
    this.restartCountValue += 1;
    await this.doStop();
    return this.doStart();
  }

  /* ─── Ready await ─── */

  private async awaitReady(client: Client): Promise<void> {
    if (client.isReady()) return;
    const wait = this.readyPromise ?? Promise.resolve();
    await Promise.race([
      wait,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out waiting for the Discord ready event.')), READY_TIMEOUT_MS),
      ),
    ]);
  }

  private registerHandlers(client: Client): void {
    registerReadyHandler(client, this, () => this.readyResolve?.());
    registerGuildCreateHandler(client, this);
    registerGuildDeleteHandler(client, this);
    registerInteractionHandler(client, this);
    registerErrorHandler(client, this);
    registerGuildMemberAddHandler(client, this);
    registerMessageHandler(client, this);
    registerReactionHandlers(
      client as unknown as { on: (event: string, listener: (...args: unknown[]) => void) => unknown },
      this,
    );
  }

  private failStart(command: RuntimeCommand, error: unknown, fallback: string | null): RuntimeCommandResult {
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

  private makeResult(
    command: RuntimeCommand,
    success: boolean,
    state: RuntimeState,
    message: string,
    status: RuntimeStatus | null,
    code?: string | null,
  ): RuntimeCommandResult {
    logger.info('bot', `[Bot] command=${command} success=${success} state=${state}`);
    const result: RuntimeCommandResult = {
      success,
      command,
      state,
      message,
      status: status ?? this.getStatus(),
    };
    if (code) result.error = { code, message };
    return result;
  }
}

function structuredClonePresence(presence: BotPresence): BotPresence {
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

export const botRuntime: BotRuntimeManager = runtimeManager;
