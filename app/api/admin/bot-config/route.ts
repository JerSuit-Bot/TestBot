import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE } from '@/lib/constants';
import { getAdminSession } from '@/lib/auth';
import { getBotConfiguration, updateBotConfiguration, getStoredBotPresence } from '@/lib/services';
import { botConfigSchema, botPresenceSchema } from '@/lib/validation';
import { auditLog } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/api-utils';
import { getBotConfigError } from '@/bot/config';
import { describePresence } from '@/bot/presence';
import { storeBotPresence } from '@/lib/services';
import { ensureBotIntegrationStarted } from '@/lib/bot-integration';
import { botRuntime } from '@/bot/services/runtime';

function getAdminToken(): string {
  const cookieStore = cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value || '';
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminToken = getAdminToken();
  const dbConfig = await getBotConfiguration(adminToken);
  const storedPresence = await getStoredBotPresence(adminToken);

  // NEVER return a token. token_configured is a safe boolean only.
  const config: Record<string, unknown> = {
    ...(dbConfig ?? {}),
    token_configured: !getBotConfigError(),
    presence: storedPresence,
  };
  delete config.discord_bot_token;

  return NextResponse.json({ config });
}

export async function PUT(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parseResult = botConfigSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.issues },
      { status: 400 },
    );
  }

  const adminToken = getAdminToken();
  const success = await updateBotConfiguration(adminToken, parseResult.data);
  if (!success) {
    return NextResponse.json({ error: 'Failed to update bot configuration.' }, { status: 500 });
  }

  await auditLog({
    actor_name: admin.username,
    action: 'bot_config_changed',
    metadata: parseResult.data,
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { presence } = (body ?? {}) as { presence?: unknown };

  // Persist a SAFE presence configuration (never the token). The actual
  // runtime application goes through POST /api/admin/runtime with a presence.
  if (presence !== undefined) {
    const parsed = botPresenceSchema.safeParse(presence);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid presence configuration.' }, { status: 400 });
    }
    const safePresence = {
      status: parsed.data.status,
      activity: {
        type: parsed.data.activity.type,
        name: parsed.data.activity.name,
        url: parsed.data.activity.url ?? null,
      },
    };
    const persisted = await storeBotPresence(getAdminToken(), safePresence);
    await auditLog({
      actor_name: admin.username,
      action: 'bot_presence_configured',
      metadata: { persisted, presence: describePresence(safePresence) },
      ip_address: getClientIP(request),
      user_agent: getUserAgent(request),
    });
    return NextResponse.json({ success: persisted, presence: safePresence, status: botRuntime.getStatus() });
  }

  return NextResponse.json({ error: 'No supported operation provided.' }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action } = (body ?? {}) as { action?: string };

  // validate_token never returns the token - only a safe validity boolean.
  if (action === 'validate_token') {
    const configured = !getBotConfigError();
    return NextResponse.json({
      valid: configured,
      token_configured: configured,
      message: configured ? 'Token is configured and the bot can connect to Discord.' : 'Token is not configured.',
    });
  }

  return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
}
