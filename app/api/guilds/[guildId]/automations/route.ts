import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { verifyGuildAccess, getAutomations, createAutomation, deleteAutomation, toggleAutomation } from '@/lib/services';
import { automationSchema } from '@/lib/validation';
import { auditLog } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/api-utils';

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

  const automations = await getAutomations(access.guildId);
  return NextResponse.json({ automations });
}

export async function POST(
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

  const parseResult = automationSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.issues },
      { status: 400 },
    );
  }

  const id = await createAutomation(
    access.guildId,
    parseResult.data.name,
    parseResult.data.trigger,
    parseResult.data.conditions,
    parseResult.data.actions,
  );

  if (!id) {
    return NextResponse.json({ error: 'Failed to create automation.' }, { status: 500 });
  }

  await auditLog({
    actor_id: user.id,
    actor_name: user.username,
    action: 'automation_created',
    target: params.guildId,
    guild_id: access.guildId,
    metadata: { automation_id: id, name: parseResult.data.name },
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });

  return NextResponse.json({ success: true, id });
}
