import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getAllUsers } from '@/lib/services';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await getAllUsers('');
  if (!users) {
    return NextResponse.json({ error: 'Failed to load users.' }, { status: 500 });
  }
  return NextResponse.json({ users });
}
