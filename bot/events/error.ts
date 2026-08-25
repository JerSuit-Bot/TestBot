/**
 * Real Discord `error` event handler.
 *
 * discord.js v14 emits `error` when the REST/websocket layer produces an
 * error. Safely records it on the runtime manager without exposing secrets.
 */
import { logger } from '@/lib/logger';
import type { RuntimeSink } from '@/bot/types';

export function registerErrorHandler(client: { on: (event: string, listener: (error: Error) => void) => unknown }, sink: RuntimeSink): void {
  client.on('error', (error: Error) => {
    logger.warn('bot', '[Bot] Discord error', { message: error.message });
    sink.noteError(error);
  });
}
