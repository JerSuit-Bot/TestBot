import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminSession } from '@/lib/services';
import { setSessionCookie, getClientIP, getUserAgent } from '@/lib/api-utils';
import { ADMIN_COOKIE } from '@/lib/constants';
import { adminLoginSchema } from '@/lib/validation';
import { auditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parseResult = adminLoginSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 400 });
  }

  const { username, password } = parseResult.data;

  const adminUsername = process.env.JERSUIT_ADMIN_USERNAME;
  const adminPasswordHash = process.env.JERSUIT_ADMIN_PASSWORD_HASH;

  if (!adminUsername || !adminPasswordHash) {
    logger.error('admin', 'Admin credentials not configured in environment');
    return NextResponse.json({ error: 'Admin access is not configured.' }, { status: 503 });
  }

  if (username !== adminUsername) {
    await auditLog({ action: 'admin_login_failed', metadata: { username }, ip_address: getClientIP(request) });
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  if (passwordHash !== adminPasswordHash) {
    await auditLog({ action: 'admin_login_failed', metadata: { username }, ip_address: getClientIP(request) });
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const ip = getClientIP(request);
  const ua = getUserAgent(request);

  const token = await createAdminSession(username, ip, ua, 24);
  if (!token) {
    return NextResponse.json({ error: 'Failed to create admin session.' }, { status: 500 });
  }

  await auditLog({
    actor_name: username,
    action: 'admin_login',
    ip_address: ip,
    user_agent: ua,
  });

  const response = NextResponse.json({ success: true });
  setSessionCookie(response, ADMIN_COOKIE, token, 24);
  return response;
}
