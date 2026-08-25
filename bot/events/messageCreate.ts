/**
 * messageCreate handler - leveling XP, custom command triggers and automod.
 *
 * Leveling grants XP with a per-user cooldown and adds level-up announcements.
 * Custom commands fire when their name/aliases match a prefixed message.
 */
import type { ClientEvents } from 'discord.js';
import { logger } from '@/lib/logger';
import type { RuntimeSink } from '@/bot/types';

let handlerInstalled = false;

/** Per-user XP cooldown (seconds between XP-granting messages). */
export const LEVEL_XP_COOLDOWN_MS = 60_000;

export function registerMessageHandler(
  client: {
    on: (event: string, listener: (message: ClientEvents['messageCreate'][0]) => void) => unknown;
  },
  sink: RuntimeSink,
): void {
  if (handlerInstalled) return;
  handlerInstalled = true;

  client.on('messageCreate', (message) => {
    void (async () => {
      try {
        if (message.author.bot || !message.inGuild()) return;

        const { getGuildDbIdByDiscordId, getGuildSettings } = await import('@/lib/services');
        const guildDbId = await getGuildDbIdByDiscordId(message.guildId);
        if (!guildDbId) return;

        const settings = await getGuildSettings(guildDbId);
        if (!settings) return;

        // Leveling.
        const s = settings as unknown as Record<string, unknown>;
        if (s.leveling_enabled === true) {
          await awardXp(message, guildDbId, s);
        }

        // Custom commands via prefix (!name) - configurable prefix support.
        const prefix = typeof s.prefix === 'string' && s.prefix ? s.prefix : '!';
        if (message.content.startsWith(prefix)) {
          const name = message.content.slice(prefix.length).split(/\s+/)[0]?.toLowerCase();
          if (name) {
            const { runCustomCommand } = await import('@/bot/custom');
            await runCustomCommand(message, name, prefix);
          }
        }
      } catch (error) {
        logger.warn('bot', 'messageCreate handling failed', {
          message: error instanceof Error ? error.message : 'unknown',
        });
      }
    })();
  });
}

async function awardXp(
  message: ClientEvents['messageCreate'][0],
  guildDbId: string,
  settings: Record<string, unknown>,
): Promise<void> {
  const xpKey = `xp:${guildDbId}:${message.author.id}`;
  const last = xpCooldowns.get(xpKey);
  const now = Date.now();
  if (last && now - last < xpCooldownMs) return;
  xpCooldowns.set(xpKey, now);

  const { addXpForMessage } = await import('@/lib/services');
  const level = await addXpForMessage({
    discordGuildId: message.guildId ?? '',
    discordUserId: message.author.id,
    xp: 15,
  });

  if (level?.leveledUp && level.newLevel) {
    const { jerSuitEmbed } = await import('@/bot/commands/ui');
    await message.channel.send({
      embeds: [
        jerSuitEmbed(`🎉 ${message.author.displayName} reached level ${level.newLevel}!`),
      ],
    }).catch(() => undefined);
  }
}

const xpCooldowns = new Map<string, number>();
const xpCooldownMs = 60_000;