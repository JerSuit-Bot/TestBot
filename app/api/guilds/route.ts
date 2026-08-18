export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getUserGuilds } from '@/lib/services';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/constants';

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const guilds = await getUserGuilds(token);
  return NextResponse.json({ guilds });
}
