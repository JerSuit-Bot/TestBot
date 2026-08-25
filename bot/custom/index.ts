/**
 * Custom commands engine.
 *
 * Custom commands are stored per guild in the database. They support a text
 * response and/or embed, cooldowns, aliases, allowed roles and variables.
 * Content is validated at write time (no JS evaluation - plain text/embed only).
 */
import type { Message } from 'discord.js';
import { logger } from '@/lib/logger';
import { renderVariables } from '@/bot/variables';

const cd = new Map<string, number>();

async function getGuildDbId(discordGuildId: string): Promise<string | null> {
  if (!discordGuildId) return null;
  const { getGuildDbIdByDiscordId } = await import('@/lib/services');
  return getGuildDbIdByDiscordId(discordGuildId);
}

/**
 * Runs a custom command when a prefixed message matches its name or an alias.
 */
export async function runCustomCommand(
  message: Message,
  name: string,
  _prefix: string,
): Promise<void> {
  try {
    const guildDbId = await getGuildDbId(message.guildId ?? '');
    if (!guildDbId) return;

    const { getCustomCommandByName, recordCommandUsage } = await import('@/lib/services');
    const command = await getCustomCommandByName(guildDbId, name);
    if (!command) return;

    const startedAt = Date.now();
    let ok = false;
    try {
      // Allowed roles gate.
      const allowedRoles = Array.isArray(command.allowed_roles) ? command.allowed_roles : [];
      const member = message.member;
      if (member && allowedRoles.length > 0) {
        const memberRoles = member.roles.cache.map((r) => r.id);
        const has = allowedRoles.some((r) => memberRoles.includes(String(r)));
        if (!has) return;
      }

      // Cooldown.
      const cooldownSeconds = Number(command.cooldown_seconds ?? 0);
      if (cooldownSeconds > 0) {
        const key = `cc:${message.guildId}:${message.author.id}:${command.name}`;
        const last = cd.get(key);
        const now = Date.now();
        if (last && now - last < cooldownSeconds * 1000) return;
        cd.set(key, now);
      }

      const ctx = {
        user: {
          id: message.author.id,
          username: message.author.username,
          displayName: message.author.displayName ?? null,
          mention: message.author.toString(),
        },
        guild: message.guild
          ? {
              id: message.guild.id,
              name: message.guild.name,
              memberCount: message.guild.memberCount,
              mention: message.guild.toString(),
            }
          : null,
        channel: message.channel
          ? { id: message.channel.id, name: 'channel', mention: message.channel.toString() }
          : null,
      };

      // Response content (plain text, variables resolved).
      if (command.response) {
        await sendChannel(message, renderVariables(String(command.response), ctx));
      }
      // Optional embed.
      if (command.embed && typeof command.embed === 'object') {
        const { jerSuitEmbed } = await import('@/bot/commands/ui');
        const embedData = command.embed as Record<string, unknown>;
        const embed = jerSuitEmbed();
        if (typeof embedData.title === 'string') embed.setTitle(renderVariables(embedData.title, ctx));
        if (typeof embedData.description === 'string') {
          embed.setDescription(renderVariables(embedData.description, ctx));
        }
        if (typeof embedData.color === 'string' || typeof embedData.color === 'number') {
          embed.setColor(embedData.color as never);
        }
        if (typeof embedData.footer === 'string') embed.setFooter({ text: renderVariables(embedData.footer, ctx) });
        if (typeof embedData.image === 'string') embed.setImage(embedData.image);
        if (typeof embedData.thumbnail === 'string') embed.setThumbnail(embedData.thumbnail);
        await sendChannel(message, undefined, [embed]);
      }
      ok = true;
    } finally {
      await recordCommandUsage({
        commandName: name,
        category: 'custom',
        discordGuildId: message.guildId ?? null,
        userId: message.author.id,
        success: ok,
        latencyMs: Date.now() - startedAt,
      }).catch(() => undefined);
    }
  } catch (error) {
    logger.warn('bot', 'Custom command failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
  }
}

/** Typesafe channel send used by custom commands (avoids union-type issues). */
async function sendChannel(
  message: Message,
  content?: string,
  embeds?: unknown[],
): Promise<void> {
  const channel = message.channel as { send: (payload: { content?: string; embeds?: unknown[] }) => Promise<unknown> };
  if (!channel || typeof channel.send !== 'function') return;
  await channel.send({
    content: content ?? undefined,
    embeds: embeds && embeds.length > 0 ? (embeds as never[]) : undefined,
  }).catch(() => undefined);
}
