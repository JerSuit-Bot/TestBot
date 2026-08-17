import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getPlatformStats } from '@/lib/services';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE } from '@/lib/constants';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value || '';
  const stats = await getPlatformStats(token);
  if (!stats) {
    return NextResponse.json({ error: 'Failed to load stats.' }, { status: 500 });
  }
  return NextResponse.json({ stats });
}
