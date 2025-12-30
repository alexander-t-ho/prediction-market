/**
 * Admin Box Office Data Entry
 *
 * Allows admins to manually enter box office data for market resolution
 * when automated data sources are unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { boxOfficeService } from '@/lib/api/boxOffice';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * POST /api/admin/box-office
 *
 * Manually set box office data for a movie
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      title,
      releaseDate,
      openingWeekendGross,
      rank,
      theaterCount,
      perTheaterAverage,
    } = body;

    // Verify user is admin
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!title || !releaseDate || openingWeekendGross === undefined || !rank) {
      return NextResponse.json(
        { error: 'Missing required fields: title, releaseDate, openingWeekendGross, rank' },
        { status: 400 }
      );
    }

    // Validate data types
    if (typeof openingWeekendGross !== 'number' || typeof rank !== 'number') {
      return NextResponse.json(
        { error: 'openingWeekendGross and rank must be numbers' },
        { status: 400 }
      );
    }

    // Set manual box office data
    const result = await boxOfficeService.setManualBoxOfficeData({
      title,
      releaseDate: new Date(releaseDate),
      openingWeekendGross,
      rank,
      theaterCount,
      perTheaterAverage,
    });

    // Validate the data
    const validation = boxOfficeService.validateBoxOfficeData(result);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid box office data', details: validation.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        formattedGross: boxOfficeService.formatCurrency(result.openingWeekendGross),
        bracket: boxOfficeService.determineGrossBracket(result.openingWeekendGross),
      },
    });
  } catch (error) {
    console.error('[Admin] Box office entry error:', error);

    return NextResponse.json(
      {
        error: 'Failed to set box office data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/box-office?title=...&releaseDate=...
 *
 * Attempt to fetch box office data from external API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const title = searchParams.get('title');
    const releaseDate = searchParams.get('releaseDate');

    // Verify user is admin
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    if (!title || !releaseDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: title, releaseDate' },
        { status: 400 }
      );
    }

    // Attempt to fetch from API
    const data = await boxOfficeService.getOpeningWeekend(
      title,
      new Date(releaseDate)
    );

    if (!data) {
      return NextResponse.json({
        success: false,
        message: 'Box office data not available via API. Manual entry required.',
        available: false,
      });
    }

    return NextResponse.json({
      success: true,
      available: true,
      data: {
        ...data,
        formattedGross: boxOfficeService.formatCurrency(data.openingWeekendGross),
        bracket: boxOfficeService.determineGrossBracket(data.openingWeekendGross),
      },
    });
  } catch (error) {
    console.error('[Admin] Box office fetch error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch box office data',
        details: error instanceof Error ? error.message : 'Unknown error',
        available: false,
      },
      { status: 500 }
    );
  }
}
