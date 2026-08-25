/**
 * Centralized JerSuit embed / response system. All commands use these helpers
 * so EmbedBuilder configuration is never duplicated across commands.
 */
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';

export const JERSUIT_PRIMARY = 0x33a65f;
export const JERSUIT_DEEP = 0x199155;
export const JERSUIT_DANGER = 0xe23d3d;

/**
 * Default JerSuit embed with the brand color and footer.
 */
export function jerSuitEmbed(title?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(JERSUIT_PRIMARY)
    .setFooter({ text: 'JerSuit V2' })
    .setTimestamp();
  if (title) embed.setTitle(title);
  return embed;
}

export function jerSuitErrorEmbed(message: string): EmbedBuilder {
  return jerSuitEmbed('JerSuit')
    .setColor(JERSUIT_DANGER)
    .setDescription(message)
    .setTitle('Something went wrong');
}

export function jerSuitSuccessEmbed(message: string): EmbedBuilder {
  return jerSuitEmbed().setColor(JERSUIT_DEEP).setDescription(message);
}

export function jerSuitInfoEmbed(title: string, description: string): EmbedBuilder {
  return jerSuitEmbed(title).setColor(JERSUIT_DEEP).setDescription(description);
}

/**
 * Custom emoji resolver. The JerSuit server hosts these emojis; each resolves
 * to a mention if known, otherwise a safe text fallback.
 */
export function jerSuitEmoji(name: string, guildEmojis?: Iterable<{ name: string | null; id: string }>): string {
  if (guildEmojis) {
    for (const e of guildEmojis) {
      if (e.name === name) return `<:${name}:${e.id}>`;
    }
  }
  // Safe fallbacks (no hardcoded emoji ids).
  const fallbacks: Record<string, string> = {
    done: '\u2705',
    dev: '\u{1F527}',
    owner: '\u{1F451}',
    developer: '\u{1F527}',
    id: '\u{1F194}',
    '1_': '1\uFE0F\u20E3',
  };
  return fallbacks[name] ?? '\u{1F539}';
}

export function actionRow(components: Array<ButtonBuilder | StringSelectMenuBuilder>) {
  return new ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>().addComponents(components);
}
