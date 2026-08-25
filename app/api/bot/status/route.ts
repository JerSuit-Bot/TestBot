import { NextResponse } from 'next/server';
import { getBotIntegrationStatus } from '@/lib/bot-integration';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getBotIntegrationStatus();

  // Canonical real-runtime shape.
  const status: Record<string, unknown> = {
    state: s.state,
    botUser: s.botUser,
    guildCount: s.guildCount,
    startedAt: s.startedAt,
    readyAt: s.readyAt,
    uptime: s.uptime,
    presence: s.presence,
    lastError: s.lastError,
    lastDisconnect: s.lastDisconnect,
    restartCount: s.restartCount,
    lastStartedAt: s.lastStartedAt,
    lastStoppedAt: s.lastStoppedAt,
    lastCrashAt: s.lastCrashAt,
    tokenConfigured: s.tokenConfigured,
    clientPresent: s.clientPresent,
    interactionCount: s.interactionCount,
  };

  // Legacy dashboard aliases (derived from the same real state - never fake).
  status.token_configured = s.tokenConfigured;
  status.uptime_seconds = s.uptime;
  status.connected_guilds = s.guildCount;
  status.last_error = s.lastError;
  status.last_started_at = s.lastStartedAt;
  status.last_stopped_at = s.lastStoppedAt;
  status.last_crash_at = s.lastCrashAt;
  status.gateway_latency_ms = null;
  status.total_users = 0;
  status.cpu_percent = 0;
  status.memory_mb = 0;
  status.bot_username = s.botUser?.username ?? null;

  return NextResponse.json({ status });
}

