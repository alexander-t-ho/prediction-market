/**
 * API Route: GET /api/markets/[id]/odds
 *
 * Get current dynamic odds for all outcomes in a market.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDynamicOdds, calculatePotentialPayout } from '@/lib/services/dynamicOddsService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketId } = await params;

    // Get dynamic odds for all outcomes
    const odds = await getDynamicOdds(marketId);

    return NextResponse.json({
      success: true,
      odds,
    });
  } catch (error) {
    console.error('Error getting dynamic odds:', error);
    return NextResponse.json(
      {
        error: 'Failed to get dynamic odds',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketId } = await params;
    const body = await request.json();

    const { outcomeId, stake } = body;

    // Validation
    if (!outcomeId) {
      return NextResponse.json(
        { error: 'Missing outcomeId' },
        { status: 400 }
      );
    }

    if (!stake || stake <= 0) {
      return NextResponse.json(
        { error: 'Invalid stake amount' },
        { status: 400 }
      );
    }

    // Calculate potential payout
    const potentialPayout = await calculatePotentialPayout(marketId, outcomeId, stake);

    return NextResponse.json({
      success: true,
      potentialPayout,
    });
  } catch (error) {
    console.error('Error calculating potential payout:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate potential payout',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
