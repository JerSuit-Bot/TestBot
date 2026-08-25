/**
 * Server-only bridge between the Dashboard Runtime Control API and the Bot
 * Runtime Manager.
 *
 * IMPORTANT: This module must only ever be imported from server-side Next.js
 * routes. It imports discord.js transitively, so it must never be reachable
 * from a client ('use client') component or a browser bundle.
 */
import 'server-only';
import { botRuntime } from '@/bot/services/runtime';
import type {
  RuntimeCommand,
  RuntimeCommandResult,
  RuntimeStatus,
  BotPresence,
  BotPresenceUpdateResult,
} from '@/bot/types';

export function getBotRuntimeStatus(): RuntimeStatus {
  return botRuntime.getStatus();
}

export function getClient(): import('discord.js').Client | null {
  return botRuntime.getClient();
}

export async function runBotCommand(command: RuntimeCommand): Promise<RuntimeCommandResult> {
  return botRuntime[command]();
}

export async function updateBotPresence(presence: BotPresence): Promise<BotPresenceUpdateResult> {
  return botRuntime.setPresence(presence);
}
