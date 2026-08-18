import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE } from '@/lib/constants';
import { deleteAdminSession } from '@/lib/services';
import { getAdminSession } from '@/lib/auth';
import { auditLog } from '@/lib/audit';
import { clearSessionCookie } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;

  if (token) {
    const admin = await getAdminSession();
    if (admin) {
      await auditLog({ actor_name: admin.username, action: 'admin_logout' });
    }
    await deleteAdminSession(token);
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response, ADMIN_COOKIE);
  return response;
}
