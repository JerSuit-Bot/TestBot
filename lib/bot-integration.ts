/**
 * Bot Integration - starts the Discord bot alongside the Next.js server.
 *
 * This module provides a singleton integration layer that:
 * - Starts the bot lazily when first needed (e.g., when bot status is requested)
 * - Handles graceful shutdown on SIGINT/SIGTERM
 * - Prevents duplicate bot instances
 * - Provides clear startup logs
 *
 * NOTE: This module is server-only (used by API routes).
 * The 'server-only' import is intentionally omitted to avoid instrumentation issues.
 */
import { botRuntime } from '@/bot/services/runtime';
import { logger } from '@/lib/logger';
import { isBotTokenConfigured, getBotConfigError } from '@/bot/config';

let integrationStarted = false;
let integrationStarting = false;
let shutdownHandlersInstalled = false;

/**
 * Ensures the bot integration is started. Call this from API routes that need the bot.
 * Uses lazy initialization - only starts on first call.
 */
export async function ensureBotIntegrationStarted(): Promise<void> {
  if (integrationStarted || integrationStarting) {
    return;
  }

  integrationStarting = true;

  try {
    if (!isBotTokenConfigured()) {
      const error = getBotConfigError();
      logger.warn('bot', '[Bot Integration] Bot token not configured, skipping bot startup', {
        reason: error,
      });
      integrationStarted = true;
      integrationStarting = false;
      return;
    }

    logger.info('bot', '[Bot Integration] Starting Discord bot (lazy init)...');

    const result = await botRuntime.start();

    if (result.success) {
      logger.info('bot', '[Bot Integration] Bot started successfully', {
        state: result.state,
        botUser: result.status?.botUser?.username ?? 'unknown',
        guildCount: result.status?.guildCount ?? 0,
      });
    } else {
      logger.error('bot', '[Bot Integration] Bot failed to start', {
        message: result.message,
        state: result.state,
      });
      integrationStarted = false;
    }
  } finally {
    integrationStarting = false;
    integrationStarted = true;
  }
}

/**
 * Starts the bot integration explicitly. Safe to call multiple times - only starts once.
 * @deprecated Use ensureBotIntegrationStarted() for lazy initialization
 */
export async function startBotIntegration(): Promise<void> {
  await ensureBotIntegrationStarted();
}

export function isBotIntegrationStarted(): boolean {
  return integrationStarted;
}

/**
 * Stops the bot integration gracefully.
 */
export async function stopBotIntegration(): Promise<void> {
  if (!integrationStarted) {
    logger.info('bot', '[Bot Integration] Not started, nothing to stop');
    return;
  }

  logger.info('bot', '[Bot Integration] Stopping Discord bot...');
  const result = await botRuntime.stop();

  if (result.success) {
    logger.info('bot', '[Bot Integration] Bot stopped successfully');
  } else {
    logger.error('bot', '[Bot Integration] Bot stop reported failure', {
      message: result.message,
    });
  }

  integrationStarted = false;
}

/**
 * Installs process-level shutdown handlers for graceful bot shutdown.
 * Only installs once globally.
 */
export function installBotShutdownHandlers(): void {
  if (shutdownHandlersInstalled) return;

  const shutdown = async (signal: string) => {
    logger.info('bot', `[Bot Integration] Received ${signal}, shutting down bot...`);
    await stopBotIntegration().catch((err) => {
      logger.error('bot', '[Bot Integration] Error during shutdown', {
        message: err instanceof Error ? err.message : String(err),
      });
    });
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  shutdownHandlersInstalled = true;
  logger.info('bot', '[Bot Integration] Shutdown handlers installed (SIGINT, SIGTERM)');
}

/**
 * Gets the current bot runtime status for the dashboard.
 * Ensures bot is started before returning status.
 */
export async function getBotIntegrationStatus() {
  await ensureBotIntegrationStarted();
  return botRuntime.getStatus();
}