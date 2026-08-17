import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { verifyGuildAccess, getTickets } from '@/lib/services';

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

  const tickets = await getTickets(access.guildId);
  return NextResponse.json({ tickets });
}
