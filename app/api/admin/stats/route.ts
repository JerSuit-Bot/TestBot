import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getPlatformStats, getPlatformSettings, setPlatformSettings } from '@/lib/services';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE } from '@/lib/constants';
import { auditLog } from '@/lib/audit';
import { getClientIP, getUserAgent } from '@/lib/api-utils';

const PLATFORM_SETTING_KEYS = [
  'platform_name',
  'support_url',
  'default_language',
  'notify_new_owner',
  'notify_crashes',
  'notify_weekly',
  'session_timeout_hours',
  'max_login_attempts',
];

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value || '';

  const stats = await getPlatformStats(token);
  const platformSettings = await getPlatformSettings();

  if (!stats) {
    return NextResponse.json({ error: 'Failed to load stats.' }, { status: 500 });
  }
  return NextResponse.json({ stats, platform_settings: platformSettings });
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

  const incoming = body as Record<string, unknown>;
  const allowed: Record<string, unknown> = {};
  for (const key of PLATFORM_SETTING_KEYS) {
    if (incoming[key] !== undefined) {
      allowed[key] = incoming[key];
    }
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'No valid settings provided.' }, { status: 400 });
  }

  try {
    await setPlatformSettings(allowed);
    await auditLog({
      actor_name: admin.username,
      action: 'platform_settings_changed',
      metadata: { keys: Object.keys(allowed) },
      ip_address: getClientIP(request),
      user_agent: getUserAgent(request),
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
  }
}

