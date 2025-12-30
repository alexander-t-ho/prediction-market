/**
 * API Route: POST /api/markets/[id]/resolve
 *
 * Resolve a market with the winning outcome and actual value.
 * This triggers the full resolution flow including payouts, trendsetter points, and taste matches.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveMarket, previewResolution } from '@/lib/services/resolutionService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketId } = await params;
    const body = await request.json();

    const { winningOutcomeId, actualValue, preview } = body;

    // Validation
    if (!winningOutcomeId) {
      return NextResponse.json(
        { error: 'Missing winningOutcomeId' },
        { status: 400 }
      );
    }

    if (actualValue === undefined || actualValue === null) {
      return NextResponse.json(
        { error: 'Missing actualValue' },
        { status: 400 }
      );
    }

    // Preview mode: don't actually resolve, just show what would happen
    if (preview) {
      const previewResult = await previewResolution(marketId, winningOutcomeId);
      return NextResponse.json({
        success: true,
        preview: previewResult,
      });
    }

    // Actually resolve the market
    // TODO: Add authentication and admin check
    // const user = await getCurrentUser(request);
    // if (!user || !user.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const result = await resolveMarket(
      marketId,
      winningOutcomeId,
      actualValue
      // user.id // resolvedBy
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          errors: result.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      result: {
        marketId: result.marketId,
        winningOutcomeId: result.winningOutcomeId,
        actualValue: result.actualValue,
        totalPool: result.payoutSummary.totalPool,
        totalPayouts: result.payoutSummary.totalPayouts,
        winnerCount: result.payoutSummary.winnerCount,
        trendsetterPointsAwarded: Object.values(result.trendsetterPoints).reduce(
          (sum, points) => sum + points,
          0
        ),
        tasteMatchesUpdated: result.tasteMatchesUpdated,
        balancesUpdated: result.balancesUpdated,
      },
    });
  } catch (error) {
    console.error('Error resolving market:', error);
    return NextResponse.json(
      {
        error: 'Failed to resolve market',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
