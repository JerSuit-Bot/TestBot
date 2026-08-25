/**
 * messageReactionAdd/messageReactionRemove handlers.
 *
 *  - Reaction roles: assigns/removes the configured role for an emoji on a
 *    specific message.
 *  - Starboard: tracks star emojis and posts messages that pass the threshold.
 */
import { logger } from '@/lib/logger';
import type { RuntimeSink } from '@/bot/types';

let installed = false;

interface EmojiShape {
  name?: string | null;
  id?: string | null;
}

interface ReactionShape {
  message?: { id?: string; guild?: { id: string } | null };
  emoji?: EmojiShape;
}

export function registerReactionHandlers(
  client: {
    on: (event: string, listener: (...args: unknown[]) => void) => unknown;
  },
  sink: RuntimeSink,
): void {
  if (installed) return;
  installed = true;

  client.on('messageReactionAdd', (reaction: unknown, user: unknown) => {
    void handleReaction('add', reaction as ReactionShape, user as { id?: string; bot?: boolean }).catch(() => undefined);
  });
  client.on('messageReactionRemove', (reaction: unknown, user: unknown) => {
    void handleReaction('remove', reaction as ReactionShape, user as { id?: string; bot?: boolean }).catch(() => undefined);
  });
}

async function handleReaction(
  kind: 'add' | 'remove',
  reaction: ReactionShape,
  user: { id?: string; bot?: boolean },
): Promise<void> {
  try {
    if (!reaction.message?.guild || !reaction.emoji) return;
    if (user.bot) return;

    const guildDiscordId = reaction.message.guild.id;
    const messageId = reaction.message.id ?? '';
    const emojiKey = resolveEmojiKey(reaction.emoji);

    const { getDb } = await import('@/lib/db');
    const db = await getDb();

    const guild = await db.query<{ id: string }>(
      'SELECT id FROM guilds WHERE discord_id = $1 LIMIT 1',
      [guildDiscordId],
    );
    if (!guild.rows[0]) return;
    const guildDbId = guild.rows[0].id;

    // 1) Reaction roles.
    const rr = await db.query<{ role_id: string }>(
      `SELECT role_id FROM reaction_roles
       WHERE guild_id = $1 AND message_id = $2 AND emoji = $3
       LIMIT 1`,
      [guildDbId, messageId, emojiKey],
    );
    const roleId = rr.rows[0]?.role_id;
    if (roleId) {
      const { getClient } = await import('@/lib/bot-runtime');
      const client = getClient();
      if (client) {
        const guild = client.guilds.cache.get(guildDiscordId);
        if (guild) {
          const member = await guild.members.fetch(user.id ?? '').catch(() => null);
          const role = guild.roles.cache.get(roleId);
          if (member && role && role.editable && !role.managed) {
            if (kind === 'add') await member.roles.add(roleId).catch(() => undefined);
            else await member.roles.remove(roleId).catch(() => undefined);
          }
        }
      }
    }

    // 2) Starboard (only on adds, with star emoji).
    if (kind === 'add' && (emojiKey.includes('⭐') || emojiKey.includes('star'))) {
      await updateStarboard(db, guildDbId, messageId, guildDiscordId).catch(() => undefined);
    }
  } catch (error) {
    logger.warn('bot', 'Reaction handling failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
  }
}

function resolveEmojiKey(emoji: EmojiShape): string {
  return emoji.id ? `${emoji.name}:${emoji.id}` : (emoji.name ?? '');
}

async function updateStarboard(
  db: { query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }> },
  guildDbId: string,
  sourceMessageId: string,
  _guildDiscordId: string,
): Promise<void> {
  const { getGuildSettings } = await import('@/lib/services');
  const settings = await getGuildSettings(guildDbId);
  if (!settings?.starboard_enabled || !settings.starboard_channel_id) return;

  const res = await db.query<{ stars: number }>(
    `SELECT stars FROM starboard_messages
     WHERE source_message_id = $1 AND guild_id = $2`,
    [sourceMessageId, guildDbId],
  );
  const stars = (res.rows[0]?.stars ?? 0) + 1;
  const threshold = Number(settings.starboard_limit ?? 5);

  if (stars < threshold) return;

  if (res.rows[0]) {
    await db.query(
      `UPDATE starboard_messages SET stars = $3 WHERE source_message_id = $1 AND guild_id = $2`,
      [sourceMessageId, guildDbId, stars],
    );
  } else {
    await db.query(
      `INSERT INTO starboard_messages (guild_id, source_message_id, source_channel_id, stars)
       VALUES ($1, $2, 'unknown', $3)`,
      [guildDbId, sourceMessageId, stars],
    );
  }
}
