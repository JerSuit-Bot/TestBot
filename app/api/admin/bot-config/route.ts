import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE } from '@/lib/constants';
import { getAdminSession } from '@/lib/auth';
import { getBotConfiguration, updateBotConfiguration, issueBotCommand } from '@/lib/services';
import { botConfigSchema } from '@/lib/validation';
import { auditLog } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/api-utils';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value || '';
  const config = await getBotConfiguration(token);
  if (!config) {
    return NextResponse.json({ config: null });
  }
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

  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value || '';
  const success = await updateBotConfiguration(token, parseResult.data);
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

  const { command, payload } = body as { command: string; payload?: Record<string, unknown> };
  if (!command) {
    return NextResponse.json({ error: 'Command is required.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value || '';
  const commandId = await issueBotCommand(token, command, payload || {});
  if (!commandId) {
    return NextResponse.json({ error: 'Failed to issue bot command.' }, { status: 500 });
  }

  await auditLog({
    actor_name: admin.username,
    action: 'bot_command_issued',
    metadata: { command, command_id: commandId },
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });

  return NextResponse.json({ success: true, command_id: commandId });
}
