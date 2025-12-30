// API route to get markets closing soon

import { NextRequest, NextResponse } from 'next/server';
import { getMarketsClosingSoon, getMarketWithStats } from '@/lib/services/marketService';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');
        const limit = parseInt(searchParams.get('limit') || '10');

        // Get markets closing in next 24 hours
        const markets = await getMarketsClosingSoon(limit);

        // Get stats for each market
        const marketsWithStats = await Promise.all(
            markets.map(async (market) => {
                return await getMarketWithStats(market.id, userId || undefined);
            })
        );

        return NextResponse.json({
            markets: marketsWithStats.filter(m => m !== null),
        });
    } catch (error: any) {
        console.error('Error fetching closing soon markets:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch markets' },
            { status: 500 }
        );
    }
}
