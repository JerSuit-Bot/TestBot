import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { verifyGuildAccess, getGuildSettings, updateGuildSettings } from '@/lib/services';
import { guildSettingsSchema } from '@/lib/validation';
import { auditLog } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await verifyGuildAccess(user.id, params.guildId);
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const settings = await getGuildSettings(access.guildId);
  if (!settings) {
    return NextResponse.json({ settings: null });
  }
  return NextResponse.json({ settings });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { guildId: string } },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await verifyGuildAccess(user.id, params.guildId);
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (access.role !== 'SERVER_OWNER' && access.role !== 'SERVER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parseResult = guildSettingsSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.issues },
      { status: 400 },
    );
  }

  try {
    await updateGuildSettings(access.guildId, parseResult.data);
    await auditLog({
      actor_id: user.id,
      actor_name: user.username,
      action: 'settings_changed',
      target: params.guildId,
      guild_id: access.guildId,
      metadata: { keys: Object.keys(parseResult.data) },
      ip_address: getClientIP(request),
      user_agent: getUserAgent(request),
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    logger.error('api', 'Failed to update guild settings', { error: (e as Error).message });
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
  }
}
