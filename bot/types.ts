/**
 * Shared runtime types for the JerSuit Discord Bot Runtime.
 *
 * These types are intentionally small and free of imports so that any module
 * (events, services, or Dashboard bridges) can reference them without creating
 * import cycles.
 */

/**
 * Lifecycle state machine of the bot runtime.
 */
export type RuntimeState =
  | 'stopped'
  | 'starting'
  | 'online'
  | 'stopping'
  | 'restarting'
  | 'error';

/**
 * Safety-critical state transitions. Guards are implemented in the runtime
 * manager itself; this documentation doubles as the single reference for the
 * allowed transitions.
 */
export const RUNTIME_STATES: readonly RuntimeState[] = [
  'stopped',
  'starting',
  'online',
  'stopping',
  'restarting',
  'error',
] as const;

/**
 * Serialisable, secret-free identity of the connected bot user.
 */
export interface RuntimeBotUser {
  id: string;
  username: string;
  /** e.g. `#0000` discriminator, when available. */
  tag: string | null;
  displayName: string | null;
}

/**
 * Read-only snapshot of the runtime. This is the only representation allowed
 * to cross an API boundary. It must never contain the token or any secret.
 */
export interface RuntimeStatus {
  state: RuntimeState;
  botUser: RuntimeBotUser | null;
  guildCount: number;
  startedAt: string | null;
  readyAt: string | null;
  uptime: number;
  lastError: string | null;
  lastDisconnect: string | null;
  restartCount: number;
  lastStartedAt: string | null;
  lastStoppedAt: string | null;
  lastCrashAt: string | null;
  tokenConfigured: boolean;
  /** Whether a client instance currently exists / is being torn down. */
  clientPresent: boolean;
  /** Number of interactions received since the last start. */
  interactionCount: number;
  /** The last presence that was successfully applied to the real client. */
  presence: BotPresence | null;
}

/**
 * Command types accepted by the Runtime Control API.
 */
export type RuntimeCommand = 'start' | 'stop' | 'restart';

/**
 * The output of a runtime control operation. An operation either performed a
 * real state transition (success) or failed with a safe, sanitized error.
 */
export interface RuntimeCommandResult {
  success: boolean;
  command: RuntimeCommand;
  state: RuntimeState;
  message: string;
  status: RuntimeStatus;
  error?: { code: string; message: string };
}

/**
 * Safe bot presence state mirrored to Discord's real Rich Presence.
 */
export type BotPresenceStatus = 'online' | 'idle' | 'dnd' | 'invisible';

/**
 * Discord activity types supported by the Runtime Manager.
 */
export type BotActivityType =
  | 'playing'
  | 'streaming'
  | 'listening'
  | 'watching'
  | 'competing';

export interface BotActivity {
  /** The human-readable activity text (e.g. `"JerSuit V2"`). */
  name: string;
  type: BotActivityType;
  /** A streaming URL, required only when `type === 'streaming'`. */
  url: string | null;
}

export interface BotPresence {
  status: BotPresenceStatus;
  activity: BotActivity;
}

export interface BotPresenceUpdateResult {
  success: boolean;
  applied: boolean;
  presence: BotPresence | null;
  message: string;
  error?: { code: string; message: string };
}

/**
 * Callback surface the event handlers use to update runtime telemetry without
 * importing the concrete runtime manager (avoiding a circular dependency).
 */
export interface RuntimeSink {
  markReady(info: {
    botUser: RuntimeBotUser;
    guildCount: number;
    readyAt: Date;
  }): void;
  adjustGuildCount(delta: 1 | -1): void;
  noteInteraction(): void;
  noteError(error: Error): void;
  noteDisconnect(reason: string | null): void;
}