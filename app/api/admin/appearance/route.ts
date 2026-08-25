import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { updateAppearanceSettings } from '@/lib/services';
import { appearanceSchema } from '@/lib/validation';
import { auditLog } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/api-utils';

export async function PUT(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = appearanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid appearance settings', details: parsed.error.flatten() }, { status: 400 });
  }

  const success = await updateAppearanceSettings(parsed.data);
  if (!success) {
    return NextResponse.json({ error: 'Failed to update appearance' }, { status: 500 });
  }

  await auditLog({
    actor_name: admin.username,
    action: 'appearance_updated',
    metadata: parsed.data,
    ip_address: getClientIP(request),
    user_agent: getUserAgent(request),
  });

  return NextResponse.json({ success: true });
}

