// GET /api/markets - List markets with filters
// POST /api/markets - Create market (admin)

import { NextRequest, NextResponse } from 'next/server';
import { getMarkets, createMarket } from '@/lib/services/marketService';
import type { MarketFilters, MarketSortOption } from '@/lib/types/market';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const filters: MarketFilters = {
      status: (searchParams.get('status') as any) || 'all',
      category: (searchParams.get('category') as any) || 'all',
      closingSoon: searchParams.get('closingSoon') === 'true',
      search: searchParams.get('search') || undefined,
    };

    // Parse sort
    const sort = (searchParams.get('sort') as MarketSortOption) || 'newest';

    // Parse pagination
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const markets = await getMarkets(filters, sort, limit, offset);

    return NextResponse.json({
      markets,
      count: markets.length,
    });
  } catch (error) {
    console.error('Error fetching markets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      title,
      description,
      category,
      market_type,
      movie_id,
      movie_title,
      movie_poster_path,
      release_date,
      threshold_value,
      blind_period_ends_at,
      closes_at,
      created_by_user_id,
      outcomes,
    } = body;

    // Validate required fields
    if (
      !title ||
      !category ||
      !market_type ||
      !movie_id ||
      !movie_title ||
      !release_date ||
      !blind_period_ends_at ||
      !closes_at ||
      !outcomes
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create market
    const market = await createMarket(
      {
        title,
        description,
        category,
        marketType: market_type,
        movieId: movie_id.toString(),
        movieTitle: movie_title,
        releaseDate: new Date(release_date),
        threshold: threshold_value?.toString(),
        blindPeriodEndsAt: new Date(blind_period_ends_at),
        lockAt: new Date(closes_at),
        status: created_by_user_id ? 'pending' : 'blind', // User-proposed starts as pending
        isUserProposed: !!created_by_user_id,
        proposedBy: created_by_user_id,
      },
      outcomes.map((outcome: any) => ({
        label: outcome.label,
        minValue: outcome.value_min?.toString(),
        maxValue: outcome.value_max?.toString(),
        sortOrder: outcome.sort_order,
      }))
    );

    return NextResponse.json({ market }, { status: 201 });
  } catch (error) {
    console.error('Error creating market:', error);
    return NextResponse.json(
      { error: 'Failed to create market' },
      { status: 500 }
    );
  }
}
