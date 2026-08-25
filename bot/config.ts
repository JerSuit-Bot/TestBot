/**
 * Strongly typed runtime configuration for the JerSuit Discord Bot.
 *
 * SECURITY: The bot token is read only from the DISCORD_BOT_TOKEN environment
 * variable. It is never written, logged, exported, or exposed through any API
 * surface. Every module in this file returns safe metadata about *whether* a
 * token is configured - never the token value itself.
 */
import { z } from 'zod';

/**
 * Only schema used to *validate* token presence/format. The trimmed value is
 * used internally and never stored or returned.
 */
const botTokenSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().trim().min(1),
});

/**
 * Reads the configured bot token.
 *
 * @throws when no token is configured. Never logs or exposes the value.
 */
export function getBotToken(): string {
  const result = botTokenSchema.safeParse({
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN ?? '',
  });

  if (!result.success) {
    throw new Error(
      'DISCORD_BOT_TOKEN is not configured. Set the environment variable before starting the bot.',
    );
  }

  return result.data.DISCORD_BOT_TOKEN;
}

/**
 * Safe boolean indicating whether an environment-side token is configured.
 * This is the *only* token information the Dashboard / runtime status may
 * expose.
 */
export function isBotTokenConfigured(): boolean {
  return Boolean((process.env.DISCORD_BOT_TOKEN ?? '').trim());
}

/**
 * A safe, human-readable reason the bot cannot start, or `null` when it can.
 */
export function getBotConfigError(): string | null {
  if (!isBotTokenConfigured()) {
    return 'DISCORD_BOT_TOKEN is not configured. Set the environment variable and restart to enable the bot.';
  }
  return null;
}
