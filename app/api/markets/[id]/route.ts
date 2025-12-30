// GET /api/markets/[id] - Get market details

import { NextRequest, NextResponse } from 'next/server';
import { getMarketWithStats } from '@/lib/services/marketService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || undefined;

    const market = await getMarketWithStats(id, userId);

    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    return NextResponse.json({ market });
  } catch (error) {
    console.error('Error fetching market:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market' },
      { status: 500 }
    );
  }
}
