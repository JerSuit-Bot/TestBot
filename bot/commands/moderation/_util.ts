/**
 * Shared helpers for moderation commands.
 */
import { PermissionFlagsBits } from 'discord.js';
import type { CommandContext } from '../types';
import { createModerationCase } from '@/lib/services';

const PERM_ADMIN = PermissionFlagsBits.Administrator;

export function getUser(ctx: CommandContext) {
  return ctx.interaction.options.getUser('user', true);
}

export function getReason(ctx: CommandContext, fallback = 'No reason provided'): string {
  return ctx.interaction.options.getString('reason') ?? fallback;
}

export async function getTargetMember(ctx: CommandContext) {
  return ctx.interaction.guild?.members.fetch(getUser(ctx).id).catch(() => null);
}

async function cannotModerate(
  member: { permissions: { has: (p: bigint) => boolean }; moderatable?: boolean } | null,
): Promise<boolean> {
  if (!member) return false;
  if (member.permissions.has(PERM_ADMIN)) return true;
  if (member.moderatable === false) return true;
  return false;
}

/** Guards: user missing, self-harm, admin target, bot hierarchy. Returns a message or null. */
export async function moderationGuard(ctx: CommandContext): Promise<string | null> {
  const target = getUser(ctx);
  const member = await getTargetMember(ctx);
  if (target.id === ctx.interaction.user.id) return 'You cannot moderate yourself.';
  if (target.id === ctx.interaction.client.user?.id) return 'I cannot moderate myself.';
  if (member && (await cannotModerate(member))) return 'That member cannot be moderated.';
  if (!member && !target.bot) return 'That user is not a member of this server.';
  return null;
}

export async function logCase(
  ctx: CommandContext,
  action: string,
  targetId: string,
  targetName: string,
  reason: string | null,
  duration?: string,
) {
  if (!ctx.interaction.guildId) return;
  await createModerationCase({
    discordGuildId: ctx.interaction.guildId,
    action,
    targetId,
    targetName,
    moderatorId: ctx.interaction.user.id,
    moderatorName: ctx.interaction.user.username,
    reason,
    duration,
  }).catch(() => undefined);
}