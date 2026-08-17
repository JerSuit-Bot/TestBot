import { NextResponse } from 'next/server';
import { getSessionUser, getUserGuilds } from '@/lib/services';
import { getSessionUser as getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const guilds = await getUserGuilds(user.id);
  return NextResponse.json({ guilds });
}
