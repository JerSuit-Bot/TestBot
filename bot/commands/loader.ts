/**
 * Command loader - imports all command modules (registration side effects),
 * then exposes the registry and idempotent slash registration.
 */
import './index';
import { getAllCommands } from './registry';
import { registerGlobalCommands } from './register';
import type { Client } from 'discord.js';
import { logger } from '@/lib/logger';

export { getAllCommands };

/**
 * Registers commands with Discord. Failures are logged but never fatal - the
 * bot stays online even if registration needs re-authentication.
 */
export async function registerCommandsIfPossible(client: Client<true>): Promise<void> {
  try {
    await registerGlobalCommands(client);
  } catch (error) {
    logger.warn('bot', '[Bot] Command registration skipped', {
      message: error instanceof Error ? error.message : 'unknown',
    });
  }
}
