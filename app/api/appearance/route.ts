import { NextResponse } from 'next/server';
import { getAppearanceSettings } from '@/lib/services';

export async function GET() {
  const appearance = await getAppearanceSettings();

  if (!appearance) {
    return NextResponse.json({ error: 'Failed to load appearance' }, { status: 500 });
  }

  return NextResponse.json({ appearance });
}

