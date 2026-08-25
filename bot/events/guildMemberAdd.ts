/**
 * guildMemberAdd handler - welcome/goodbye, auto-roles, leveling, verification.
 *
 * Reads guild_settings from the database and only acts when features are
 * enabled. Welcome messages use the shared variables + embed rendering.
 */
import type { ClientEvents } from 'discord.js';
import { logger } from '@/lib/logger';
import type { RuntimeSink } from '@/bot/types';
import { renderVariables } from '@/bot/variables';

let handlerInstalled = false;

export function registerGuildMemberAddHandler(
  client: {
    on: (event: string, listener: (member: ClientEvents['guildMemberAdd'][0]) => void) => unknown;
  },
  sink: RuntimeSink,
): void {
  if (handlerInstalled) return;
  handlerInstalled = true;

  client.on('guildMemberAdd', (member) => {
    void (async () => {
      try {
        const guild = member.guild;

        // Find the internal guild id + settings row.
        const { getGuildDbIdByDiscordId, getGuildSettings, getAutoroles } = await import('@/lib/services');
        const guildDbId = await getGuildDbIdByDiscordId(guild.id);
        if (!guildDbId) return;

        const settings = await getGuildSettings(guildDbId);
        if (!settings) return;

        // Welcome message.
        if (settings.welcome_enabled && settings.welcome_channel_id) {
          const { resolveChannel } = await import('@/bot/settings');
          const channel = resolveChannel(member.client, settings.welcome_channel_id);
          if (channel) {
            const content = settings.welcome_message ?? 'Welcome to {server}, {userMention}!';
            const rendered = renderVariables(content, {
              user: {
                id: member.id,
                username: member.user.username,
                displayName: member.user.displayName ?? null,
                mention: member.toString(),
              },
              guild: {
                id: guild.id,
                name: guild.name,
                memberCount: guild.memberCount,
                mention: guild.toString(),
              },
            });
            const { jerSuitEmbed } = await import('@/bot/commands/ui');
            const embed = jerSuitEmbed(`Welcome to ${guild.name}!`)
              .setColor(0x199155)
              .setDescription(rendered)
              .setThumbnail(member.user.displayAvatarURL({ size: 256 }));
            await channel.send({
              content: settings.welcome_embed_enabled === false ? rendered : undefined,
              embeds: settings.welcome_embed_enabled === false ? [] : [embed],
            }).catch(() => undefined);
          }
        }

        // Auto roles.
        const autoroles = await getAutoroles(guild.id);
        for (const ar of autoroles) {
          const roleId = String(ar.role_id);
          const role = guild.roles.cache.get(roleId);
          if (role && role.editable && role.managed === false) {
            await member.roles.add(roleId).catch(() => undefined);
          }
        }

        // Verification: assign nothing here; /verify grants the verified role.
      } catch (error) {
        const logger = (await import('@/lib/logger')).logger;
        logger.warn('bot', 'guildMemberAdd handling failed', {
          message: error instanceof Error ? error.message : 'unknown',
        });
      }
    })();
  });
}