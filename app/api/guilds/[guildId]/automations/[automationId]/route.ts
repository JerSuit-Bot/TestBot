import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { verifyGuildAccess, deleteAutomation, toggleAutomation } from '@/lib/services';
import { auditLog } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/api-utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { guildId: string; automationId: string } },
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

  const success = await deleteAutomation(access.guildId, params.automationId);
  if (!success) {
    return NextResponse.json({ error: 'Failed to delete automation.' }, { status: 500 });
  }

  await auditLog({
    actor_id: user.id,
    actor_name: user.username,
    action: 'automation_deleted',
    target: params.guildId,
    guild_id: access.guildId,
    metadata: { automation_id: params.automationId },
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { guildId: string; automationId: string } },
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

  const { enabled } = body as { enabled?: boolean };
  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const success = await toggleAutomation(access.guildId, params.automationId, enabled);
  if (!success) {
    return NextResponse.json({ error: 'Failed to toggle automation.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
