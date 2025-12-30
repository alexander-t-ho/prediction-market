// PATCH /api/markets/[id]/status - Update market status

import { NextRequest, NextResponse } from 'next/server';
import { updateMarketStatus } from '@/lib/services/marketService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // TODO: Add admin authorization check

    const market = await updateMarketStatus(id, status);

    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    return NextResponse.json({ market });
  } catch (error) {
    console.error('Error updating market status:', error);
    return NextResponse.json(
      { error: 'Failed to update market status' },
      { status: 500 }
    );
  }
}
