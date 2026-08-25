/**
 * JerSuit Bot Runtime entry point.
 *
 * This module initializes the singleton Runtime Manager and wires gateway
 * event handlers. It deliberately does NOT start the bot merely because the
 * module is imported - starting is explicit via botRuntime.start(), the
 * runtime control API, or the Admin Panel.
 *
 * When launched as the standalone runtime process (npm run bot), it connects
 * to Discord, installs graceful shutdown handlers (SIGINT / SIGTERM), and
 * keeps the process alive until a shutdown signal arrives.
 */
import { botRuntime } from '@/bot/services/runtime';
import { logger } from '@/lib/logger';

const isStandaloneEntry = process.env.BOT_STANDALONE === '1';

/**
 * Attaches graceful shutdown handlers for SIGINT and SIGTERM.
 */
function installShutdownHandlers(): void {
  const shutdown = async (signal: string) => {
    logger.info('bot', `[Bot] Received ${signal}, shutting down`);
    await botRuntime.shutdown().catch(() => undefined);
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

/**
 * Standalone start: connect the bot, then idle until shutdown.
 */
async function main(): Promise<void> {
  installShutdownHandlers();
  const result = await botRuntime.start();
  if (!result.success) {
    logger.error('bot', '[Bot] Failed to start', { message: result.message });
    process.exit(1);
  }
  logger.info('bot', '[Bot] Runtime is running. Waiting for shutdown signal.');

  // Keep the process alive. Graceful shutdown is driven by SIGINT/SIGTERM.
  setInterval(() => {
    // noop - keeps the Node event loop alive.
  }, 60_000);
}

// Only launch when this file is executed as the standalone bot process. When
// imported by Next.js (BOT_STANDALONE unset), nothing is started.
if (isStandaloneEntry) {
  void main();
}
