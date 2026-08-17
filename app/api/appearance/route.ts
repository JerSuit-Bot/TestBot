import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase.rpc('get_appearance_settings');

  if (error) {
    console.error('Failed to get appearance:', error);
    return NextResponse.json({ error: 'Failed to load appearance' }, { status: 500 });
  }

  return NextResponse.json({ appearance: data });
}
