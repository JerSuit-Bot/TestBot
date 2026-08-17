import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';
import { ADMIN_COOKIE } from '@/lib/constants';
import { cookies } from 'next/headers';
import { appearanceSchema } from '@/lib/validation';
import { auditLog } from '@/lib/audit';

export async function PUT(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = appearanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid appearance settings', details: parsed.error.flatten() }, { status: 400 });
  }

  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;

  const { data, error } = await supabase.rpc('update_appearance_settings', {
    p_token: token,
    p_settings: parsed.data,
  });

  if (error) return NextResponse.json({ error: 'Failed to update appearance' }, { status: 500 });
  if (data?.error === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await auditLog({
    actor_name: admin.username,
    action: 'appearance_updated',
    metadata: parsed.data,
  });

  return NextResponse.json({ success: true });
}
