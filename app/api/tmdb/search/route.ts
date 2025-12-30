// TMDB Search API Route

import { NextRequest, NextResponse } from 'next/server';
import { searchMovies } from '@/lib/api/tmdb';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('query');
        const page = parseInt(searchParams.get('page') || '1');

        if (!query) {
            return NextResponse.json(
                { error: 'Query parameter is required' },
                { status: 400 }
            );
        }

        const results = await searchMovies(query, page);

        return NextResponse.json(results);
    } catch (error: any) {
        console.error('TMDB search error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to search movies' },
            { status: 500 }
        );
    }
}
