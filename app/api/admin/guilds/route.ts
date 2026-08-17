import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getAllGuilds } from '@/lib/services';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const guilds = await getAllGuilds('');
  if (!guilds) {
    return NextResponse.json({ error: 'Failed to load guilds.' }, { status: 500 });
  }
  return NextResponse.json({ guilds });
}
