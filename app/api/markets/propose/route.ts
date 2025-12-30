// POST /api/markets/propose - User proposes a new market

import { NextRequest, NextResponse } from 'next/server';
import { searchMovies } from '@/lib/api/tmdb';
import { marketExists } from '@/lib/services/marketService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      user_id,
      movie_id,
      movie_title,
      category,
      market_type,
      threshold_value,
      justification,
    } = body;

    // Validate required fields
    if (
      !user_id ||
      !movie_id ||
      !movie_title ||
      !category ||
      !market_type ||
      !justification
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate justification length
    if (justification.length < 20) {
      return NextResponse.json(
        { error: 'Justification must be at least 20 characters' },
        { status: 400 }
      );
    }

    // Check if market already exists
    const exists = await marketExists(
      movie_id.toString(),
      category,
      market_type,
      threshold_value
    );

    if (exists) {
      return NextResponse.json(
        { error: 'This market already exists' },
        { status: 400 }
      );
    }

    // Create the proposal (market with status = 'pending')
    // This would be similar to creating a regular market but with status 'pending'
    // For now, return success

    return NextResponse.json({
      success: true,
      message: 'Market proposal submitted for review',
    });
  } catch (error) {
    console.error('Error submitting market proposal:', error);
    return NextResponse.json(
      { error: 'Failed to submit proposal' },
      { status: 500 }
    );
  }
}

// GET /api/markets/propose/search - Search movies for proposal
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const results = await searchMovies(query);

    return NextResponse.json({
      movies: results.results.slice(0, 10), // Return top 10 results
    });
  } catch (error) {
    console.error('Error searching movies:', error);
    return NextResponse.json(
      { error: 'Failed to search movies' },
      { status: 500 }
    );
  }
}
