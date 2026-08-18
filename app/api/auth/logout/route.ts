import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, ADMIN_COOKIE } from '@/lib/constants';
import { deleteSession, deleteAdminSession } from '@/lib/services';
import { getSessionUser } from '@/lib/auth';
import { auditLog } from '@/lib/audit';
import { clearSessionCookie } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  const adminToken = cookieStore.get(ADMIN_COOKIE)?.value;

  if (sessionToken) {
    const user = await getSessionUser();
    if (user) {
      await auditLog({
        actor_id: user.id,
        actor_name: user.username,
        action: 'user_logout',
      });
    }
    await deleteSession(sessionToken);
  }

  if (adminToken) {
    await deleteAdminSession(adminToken);
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response, SESSION_COOKIE);
  clearSessionCookie(response, ADMIN_COOKIE);
  return response;
}
