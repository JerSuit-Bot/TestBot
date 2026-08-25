import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminSession } from '@/lib/auth';
import { ADMIN_COOKIE, BOT_RUNTIME_COMMANDS } from '@/lib/constants';
import { auditLog } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/api-utils';
import { botRuntime } from '@/bot/services/runtime';
import { botPresenceSchema } from '@/lib/validation';
import { storeBotPresence, getStoredBotPresence } from '@/lib/services';
import { describePresence } from '@/bot/presence';
import { ensureBotIntegrationStarted } from '@/lib/bot-integration';

function getAdminToken(): string {
  const cookieStore = cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value || '';
}

export async function POST(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Ensure bot integration is started (lazy init)
  await ensureBotIntegrationStarted();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { command, presence } = (body ?? {}) as {
    command?: string;
    presence?: unknown;
  };

  const adminToken = getAdminToken();

  // Presence updates are applied to the REAL Discord client in real time.
  if (presence !== undefined) {
    const parsed = botPresenceSchema.safeParse(presence);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const safePresence = {
      status: parsed.data.status,
      activity: {
        type: parsed.data.activity.type,
        name: parsed.data.activity.name,
        url: parsed.data.activity.url ?? null,
      },
    };

    // Persist the SAFE presence config (never the token) so it is restored on
    // the next start/restart.
    const persisted = await storeBotPresence(adminToken, safePresence);

    const previous = await getStoredBotPresence(adminToken);
    const updateResult = await botRuntime.setPresence(safePresence);

    await auditLog({
      actor_name: admin.username,
      action: 'bot_presence_updated',
      metadata: {
        previous: previous ? describePresence(previous) : null,
        new: describePresence(safePresence),
        applied: updateResult.applied,
        persisted,
      },
      ip_address: getClientIP(request),
      user_agent: getUserAgent(request),
    });

    return NextResponse.json({
      success: updateResult.success,
      applied: updateResult.applied,
      persisted,
      presence: updateResult.presence,
      message: updateResult.message,
      status: botRuntime.getStatus(),
    });
  }

  // Lifecycle commands: start / stop / restart on the REAL Runtime Manager.
  if (!command || !(BOT_RUNTIME_COMMANDS as readonly string[]).includes(command)) {
    return NextResponse.json({ error: 'Invalid command' }, { status: 400 });
  }

  const runtimeCommand = command as 'start' | 'stop' | 'restart';
  const result = await botRuntime[runtimeCommand]();

  await auditLog({
    actor_name: admin.username,
    action: `bot_${runtimeCommand}`,
    metadata: {
      success: result.success,
      state: result.state,
      message: result.message,
    },
    result: result.success ? 'success' : 'failure',
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });

  const httpStatus = result.success ? 200 : 500;
  return NextResponse.json(
    {
      success: result.success,
      command: result.command,
      state: result.state,
      message: result.message,
      error: result.error,
      status: result.status,
    },
    { status: httpStatus },
  );
}

