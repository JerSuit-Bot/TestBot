/**
 * Real Discord `interactionCreate` dispatch.
 *
 * Routes chat-input commands to the registered JerSuit command registry with
 * full runtime policy enforcement:
 *   - maintenance mode blocks all non-owner slash commands
 *   - settings: per-command enabled/disabled, allowed/blocked roles,
 *     cooldown, DM message
 *   - command usage analytics are recorded in the DB
 *   - handles /help category select, giveaway buttons and channel selects
 */
import type {
  Interaction,
  ChatInputCommandInteraction,
  StringSelectMenuInteraction,
  ButtonInteraction,
  ChannelSelectMenuInteraction,
} from 'discord.js';
import { logger } from '@/lib/logger';
import { getCommand, getAllCommands } from '@/bot/commands/registry';
import { jerSuitEmbed, jerSuitErrorEmbed } from '@/bot/commands/ui';
import type { RuntimeSink } from '@/bot/types';
import { botT } from '@/bot/i18n';
import { getCommandSettings, getGuildLanguage } from '@/bot/settings';
import { recordCommandUsage, getPlatformSettings } from '@/lib/services';
import { renderVariables } from '@/bot/variables';

/** Per user per command cooldown store (module-level, resets on restart). */
const cooldowns = new Map<string, number>();

export function registerInteractionHandler(
  client: {
    on: (event: string, listener: (interaction: Interaction) => void) => unknown;
  },
  sink: RuntimeSink,
): void {
  client.on('interactionCreate', async (interaction: Interaction) => {
    sink.noteInteraction();
    try {
      if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
        return;
      }

      if (interaction.isStringSelectMenu() && interaction.customId === 'help_category') {
        await handleHelpSelect(interaction);
        return;
      }

      if (interaction.isButton() && interaction.customId.startsWith('gg_')) {
        await handleGiveawayEntry(interaction);
        return;
      }

      if (interaction.isChannelSelectMenu() && interaction.customId.startsWith('ticket_panel_')) {
        await handleTicketPanelChannel(interaction);
        return;
      }

      logger.debug('bot', 'Unhandled interaction', { type: interaction.type, id: interaction.id });
    } catch (error) {
      logger.warn('bot', 'Interaction handling failed', {
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  });
async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const commandName = interaction.commandName;
  const command = getCommand(commandName);
  const lang = await getGuildLanguage(interaction);
  const startedAt = Date.now();

  let ok = false;
  try {
    if (!command) {
      await interaction.reply({ embeds: [jerSuitErrorEmbed(botT(lang, 'errors.notRegistered'))], ephemeral: true });
      return;
    }

    // Maintenance mode blocks all slash commands except owner-only ones.
    const isOwner = await isOwnerUser(interaction);
    const platformSettings = (await getPlatformSettings().catch(() => ({}))) as Record<string, unknown>;
    if (platformSettings.maintenance_mode === true && !command.metadata?.ownerOnly && !isOwner) {
      await interaction.reply({ embeds: [jerSuitErrorEmbed('Bot is in maintenance mode.')], ephemeral: true });
      return;
    }

    // Guild-only enforcement.
    if (command.metadata?.guildOnly && !interaction.inGuild()) {
      await interaction.reply({ embeds: [jerSuitErrorEmbed(botT(lang, 'errors.guildOnly'))], ephemeral: true });
      return;
    }

    // Owner-only enforcement.
    if (command.metadata?.ownerOnly && !isOwner) {
      await interaction.reply({ embeds: [jerSuitErrorEmbed(botT(lang, 'errors.ownerOnly'))], ephemeral: true });
      return;
    }

    // Load per-command runtime settings (portal + guild overrides merged).
    const settings = await getCommandSettings(interaction.guildId ?? null, commandName);

    if (!settings.enabled) {
      await interaction.reply({ embeds: [jerSuitErrorEmbed(botT(lang, 'errors.disabled'))], ephemeral: true });
      return;
    }
if (interaction.inGuild() && interaction.member) {
      const member = interaction.member;
      const roles = Array.isArray(member.roles)
        ? member.roles.map((r: string) => r)
        : Array.from((member.roles as { cache: Map<string, { id: string }> }).cache.keys());

      if (settings.blockedRoles.some((r) => roles.includes(r))) {
        await interaction.reply({ embeds: [jerSuitErrorEmbed(botT(lang, 'errors.missingPermissions'))], ephemeral: true });
        return;
      }
      if (settings.allowedRoles.length > 0 && !settings.allowedRoles.some((r) => roles.includes(r))) {
        await interaction.reply({ embeds: [jerSuitErrorEmbed(botT(lang, 'errors.missingPermissions'))], ephemeral: true });
        return;
      }
    }

    // Cooldown enforcement (per user per command).
    const cooldownKey = `cd:${interaction.user.id}:${commandName}`;
    const now = Date.now();
    const last = cooldowns.get(cooldownKey);
    const cooldownValue = settings.cooldownSeconds > 0 ? settings.cooldownSeconds : (command.cooldownSeconds ?? 0);
    if (cooldownValue > 0 && last && now - last < cooldownValue * 1000) {
      const remaining = Math.ceil((cooldownValue * 1000 - (now - last)) / 1000);
      await interaction.reply({
        embeds: [jerSuitErrorEmbed(botT(lang, 'errors.cooldown', { cooldown: remaining }))],
        ephemeral: true,
      });
      return;
    }
    cooldowns.set(cooldownKey, now);

    await command.execute({ interaction, startedAt });
    ok = true;

    // Custom DM message support (configured from the Admin Panel).
    if (settings.dmMessage) {
      const dm = renderVariables(settings.dmMessage, buildVars(interaction));
      await interaction.user.send(dm).catch(() => undefined);
    }
  } catch (error) {
    logger.error('bot', `Command "${commandName}" failed`, {
      message: error instanceof Error ? error.message : 'unknown',
    });
    const reply = { embeds: [jerSuitErrorEmbed(botT(lang, 'errors.failed'))], ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(reply).catch(() => undefined);
    } else {
      await interaction.reply(reply).catch(() => undefined);
    }
  } finally {
    await recordCommandUsage({
      commandName,
      category: command?.metadata?.category,
      discordGuildId: interaction.guildId,
      userId: interaction.user.id,
      success: ok,
      latencyMs: Date.now() - startedAt,
    }).catch(() => undefined);
  }
}
async function handleHelpSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const selected = interaction.values[0];
  if (!selected) return;
  const cmds = getAllCommands().filter((c) => c.metadata?.category === selected);
  const list = cmds.map((c) => `/${c.data.name} — ${c.data.description}`).join('\n') || 'No commands in this category.';
  await interaction.update({
    embeds: [jerSuitEmbed(`JerSuit Help — ${selected}`).setDescription(list)],
  });
}

async function handleGiveawayEntry(interaction: ButtonInteraction): Promise<void> {
  const id = interaction.customId.replace('gg_', '');
  const { toggleGiveawayEntry } = await import('@/lib/services');
  const result = await toggleGiveawayEntry(id, interaction.user.id);
  await interaction.reply({
    embeds: [jerSuitEmbed(result.joined ? '🎉 You entered the giveaway!' : 'You left the giveaway.')],
    ephemeral: true,
  });
}

async function handleTicketPanelChannel(interaction: ChannelSelectMenuInteraction): Promise<void> {
  const channelId = interaction.values[0];
  if (!channelId) return;
  const { createTicket } = await import('@/lib/services');
  await createTicket({
    discordGuildId: interaction.guildId ?? '',
    channelId,
    userId: interaction.user.id,
    userName: interaction.user.username,
  }).catch(() => undefined);
  await interaction.reply({
    embeds: [jerSuitEmbed(`Ticket opened: <#${channelId}>`)],
    ephemeral: true,
  });
}

function buildVars(interaction: ChatInputCommandInteraction) {
  return {
    user: {
      id: interaction.user.id,
      username: interaction.user.username,
      displayName: interaction.user.displayName ?? null,
      mention: interaction.user.toString(),
    },
    guild: interaction.inGuild() && interaction.guild
      ? {
          id: interaction.guild.id,
          name: interaction.guild.name,
          memberCount: interaction.guild.memberCount,
          mention: interaction.guild.toString(),
        }
      : null,
  };
}

/** Determines whether the invoking user is the platform owner. */
async function isOwnerUser(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const ownerDiscordId = process.env.PLATFORM_OWNER_DISCORD_ID;
  if (ownerDiscordId && interaction.user.id === ownerDiscordId) return true;
  try {
    const { getDb } = await import('@/lib/db');
    const db = await getDb();
    const res = await db.query<{ is_platform_owner: boolean }>(
      'SELECT is_platform_owner FROM users WHERE discord_id = $1 LIMIT 1',
      [interaction.user.id],
    );
    return res.rows[0]?.is_platform_owner === true;
  } catch {
    return false;
  }
}
}