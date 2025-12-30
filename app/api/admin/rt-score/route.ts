/**
 * Admin RT Score Fetch
 *
 * Fetch Rotten Tomatoes scores for manual resolution verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { omdbService } from '@/lib/api/omdb';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * GET /api/admin/rt-score?imdbId=... or ?title=...&year=...
 *
 * Fetch RT score from OMDb API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const imdbId = searchParams.get('imdbId');
    const title = searchParams.get('title');
    const yearParam = searchParams.get('year');

    // Verify user is admin (optional for PoC, but good practice)
    if (userId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user || !user.isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
    }

    let rtScore;

    if (imdbId) {
      // Fetch by IMDb ID (preferred method)
      rtScore = await omdbService.getRottenTomatoesScore(imdbId);
    } else if (title) {
      // Fetch by title and optional year
      const year = yearParam ? parseInt(yearParam, 10) : undefined;
      rtScore = await omdbService.getRottenTomatoesScoreByTitle(title, year);
    } else {
      return NextResponse.json(
        { error: 'Missing required parameter: imdbId or title' },
        { status: 400 }
      );
    }

    // Validate sufficient reviews
    const hasSufficientReviews = omdbService.validateSufficientReviews(rtScore, 20);

    return NextResponse.json({
      success: true,
      data: rtScore,
      validation: {
        hasSufficientReviews,
        minimumReviews: 20,
        estimatedReviews: rtScore.reviewCount,
      },
    });
  } catch (error) {
    console.error('[Admin] RT score fetch error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch RT score',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
