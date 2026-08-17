import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase.rpc('get_bot_status');

  if (error) {
    console.error('Failed to get bot status:', error);
    return NextResponse.json({ error: 'Failed to get bot status' }, { status: 500 });
  }

  return NextResponse.json({ status: data });
}
