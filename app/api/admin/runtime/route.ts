import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';
import { ADMIN_COOKIE } from '@/lib/constants';
import { cookies } from 'next/headers';
import { auditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { command } = body;
  if (!['start', 'stop', 'restart'].includes(command)) {
    return NextResponse.json({ error: 'Invalid command' }, { status: 400 });
  }

  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;

  const { data, error } = await supabase.rpc('issue_bot_command', {
    p_token: token,
    p_command: command,
    p_payload: {},
  });

  if (error) return NextResponse.json({ error: 'Failed to issue command' }, { status: 500 });
  if (data?.error === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (data?.error === 'invalid_command') return NextResponse.json({ error: 'Invalid command' }, { status: 400 });

  await auditLog({
    actor_name: admin.username,
    action: `bot_${command}`,
    metadata: { command_id: data.command_id },
  });

  return NextResponse.json({ success: true, command_id: data.command_id });
}
