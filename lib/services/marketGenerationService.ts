// Market Generation Service - Auto-generate markets from TMDB

import {
  getNowPlayingMovies,
  getMovieDetails,
  getPosterUrl,
  type TMDBMovie,
  type TMDBMovieDetails,
} from '../api/tmdb';
import { createMarket, marketExists } from './marketService';
import type { NewMarketOutcome } from '../db/schema';

// Genre IDs from TMDB
const GENRE_IDS = {
  ACTION: 28,
  ADVENTURE: 12,
  ANIMATION: 16,
  COMEDY: 35,
  CRIME: 80,
  DOCUMENTARY: 99,
  DRAMA: 18,
  FAMILY: 10751,
  FANTASY: 14,
  HISTORY: 36,
  HORROR: 27,
  MUSIC: 10402,
  MYSTERY: 9648,
  ROMANCE: 10749,
  SCIFI: 878,
  THRILLER: 53,
  WAR: 10752,
  WESTERN: 37,
};

/**
 * Determine if movie should get box office markets
 */
function isTheatricalRelease(movie: TMDBMovie): boolean {
  // Exclude documentaries and made-for-TV movies
  if (movie.genre_ids.includes(GENRE_IDS.DOCUMENTARY)) {
    return false;
  }

  // Must have a release date
  return !!movie.release_date;
}

/**
 * Determine RT binary threshold based on movie profile
 */
function getRTBinaryThreshold(details: TMDBMovieDetails): number {
  const genres = details.genre_ids || [];

  // High threshold for big-budget tentpoles
  if (details.budget > 150_000_000) {
    return 80;
  }

  // Lower threshold for horror, comedy
  if (
    genres.includes(GENRE_IDS.HORROR) ||
    genres.includes(GENRE_IDS.COMEDY)
  ) {
    return 60;
  }

  // Default threshold
  return 70;
}

/**
 * Determine box office binary threshold based on movie profile
 */
function getBoxOfficeBinaryThreshold(details: TMDBMovieDetails): number {
  const genres = details.genre_ids || [];

  // Big-budget blockbusters
  if (details.budget > 200_000_000) {
    return 100_000_000;
  }

  if (details.budget > 100_000_000) {
    return 50_000_000;
  }

  // Mid-budget action/adventure
  if (
    genres.includes(GENRE_IDS.ACTION) ||
    genres.includes(GENRE_IDS.ADVENTURE) ||
    genres.includes(GENRE_IDS.SCIFI)
  ) {
    return 25_000_000;
  }

  // Smaller genres
  return 10_000_000;
}

/**
 * Create RT binary market
 */
async function createRTBinaryMarket(
  movie: TMDBMovie,
  details: TMDBMovieDetails
): Promise<void> {
  const threshold = getRTBinaryThreshold(details);

  const exists = await marketExists(
    movie.id.toString(),
    'rotten_tomatoes',
    'binary',
    threshold
  );

  if (exists) return;

  const releaseDate = new Date(movie.release_date);
  const now = new Date();
  const blindPeriodEnds = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now

  const outcomes: Omit<NewMarketOutcome, 'id' | 'marketId' | 'createdAt'>[] = [
    { label: `Yes (${threshold}% or higher)`, sortOrder: 0 },
    { label: `No (below ${threshold}%)`, sortOrder: 1 },
  ];

  await createMarket(
    {
      title: `Will "${movie.title}" score ${threshold}%+ on Rotten Tomatoes?`,
      description: `Predict whether ${movie.title} will receive a Tomatometer score of ${threshold}% or higher on Rotten Tomatoes.`,
      category: 'rotten_tomatoes',
      marketType: 'binary',
      movieId: movie.id.toString(),
      movieTitle: movie.title,
      moviePosterPath: movie.poster_path,
      releaseDate,
      threshold: threshold.toString(),
      blindPeriodEndsAt: blindPeriodEnds,
      lockAt: releaseDate, // Lock at release date
      status: 'blind',
      isUserProposed: false,
    },
    outcomes
  );
}

/**
 * Create RT range bracket market
 */
async function createRTRangeBracketMarket(
  movie: TMDBMovie,
  details: TMDBMovieDetails
): Promise<void> {
  const exists = await marketExists(
    movie.id.toString(),
    'rotten_tomatoes',
    'range_bracket'
  );

  if (exists) return;

  const releaseDate = new Date(movie.release_date);
  const now = new Date();
  const blindPeriodEnds = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const outcomes: Omit<NewMarketOutcome, 'id' | 'marketId' | 'createdAt'>[] = [
    {
      label: '0-39% (Rotten)',
      minValue: '0',
      maxValue: '39',
      sortOrder: 0,
    },
    {
      label: '40-59% (Mixed)',
      minValue: '40',
      maxValue: '59',
      sortOrder: 1,
    },
    {
      label: '60-74% (Fresh)',
      minValue: '60',
      maxValue: '74',
      sortOrder: 2,
    },
    {
      label: '75-89% (Certified Fresh)',
      minValue: '75',
      maxValue: '89',
      sortOrder: 3,
    },
    {
      label: '90-100% (Universal Acclaim)',
      minValue: '90',
      maxValue: '100',
      sortOrder: 4,
    },
  ];

  await createMarket(
    {
      title: `What will "${movie.title}" score on Rotten Tomatoes?`,
      description: `Predict the Tomatometer score range for ${movie.title}.`,
      category: 'rotten_tomatoes',
      marketType: 'range_bracket',
      movieId: movie.id.toString(),
      movieTitle: movie.title,
      moviePosterPath: movie.poster_path,
      releaseDate,
      blindPeriodEndsAt: blindPeriodEnds,
      lockAt: releaseDate,
      status: 'blind',
      isUserProposed: false,
    },
    outcomes
  );
}

/**
 * Create box office binary market
 */
async function createBoxOfficeBinaryMarket(
  movie: TMDBMovie,
  details: TMDBMovieDetails
): Promise<void> {
  const threshold = getBoxOfficeBinaryThreshold(details);

  const exists = await marketExists(
    movie.id.toString(),
    'box_office',
    'binary',
    threshold
  );

  if (exists) return;

  const releaseDate = new Date(movie.release_date);
  const now = new Date();
  const blindPeriodEnds = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Box office markets lock Thursday 11:59 PM ET before opening weekend
  const lockDate = new Date(releaseDate);
  lockDate.setDate(releaseDate.getDate() - ((releaseDate.getDay() + 7 - 4) % 7)); // Previous Thursday
  lockDate.setHours(23, 59, 0, 0);

  const thresholdMil = threshold / 1_000_000;

  const outcomes: Omit<NewMarketOutcome, 'id' | 'marketId' | 'createdAt'>[] = [
    { label: `Yes ($${thresholdMil}M+)`, sortOrder: 0 },
    { label: `No (under $${thresholdMil}M)`, sortOrder: 1 },
  ];

  await createMarket(
    {
      title: `Will "${movie.title}" open above $${thresholdMil}M?`,
      description: `Predict whether ${movie.title} will gross $${thresholdMil}M or more in its domestic opening weekend.`,
      category: 'box_office',
      marketType: 'binary',
      movieId: movie.id.toString(),
      movieTitle: movie.title,
      moviePosterPath: movie.poster_path,
      releaseDate,
      threshold: threshold.toString(),
      blindPeriodEndsAt: blindPeriodEnds,
      lockAt: lockDate,
      status: 'blind',
      isUserProposed: false,
    },
    outcomes
  );
}

/**
 * Create box office range bracket market
 */
async function createBoxOfficeRangeBracketMarket(
  movie: TMDBMovie,
  details: TMDBMovieDetails
): Promise<void> {
  const exists = await marketExists(
    movie.id.toString(),
    'box_office',
    'range_bracket'
  );

  if (exists) return;

  const releaseDate = new Date(movie.release_date);
  const now = new Date();
  const blindPeriodEnds = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const lockDate = new Date(releaseDate);
  lockDate.setDate(releaseDate.getDate() - ((releaseDate.getDay() + 7 - 4) % 7));
  lockDate.setHours(23, 59, 0, 0);

  const outcomes: Omit<NewMarketOutcome, 'id' | 'marketId' | 'createdAt'>[] = [
    {
      label: 'Under $25M',
      minValue: '0',
      maxValue: '25000000',
      sortOrder: 0,
    },
    {
      label: '$25M - $50M',
      minValue: '25000000',
      maxValue: '50000000',
      sortOrder: 1,
    },
    {
      label: '$50M - $75M',
      minValue: '50000000',
      maxValue: '75000000',
      sortOrder: 2,
    },
    {
      label: '$75M - $100M',
      minValue: '75000000',
      maxValue: '100000000',
      sortOrder: 3,
    },
    {
      label: '$100M - $150M',
      minValue: '100000000',
      maxValue: '150000000',
      sortOrder: 4,
    },
    {
      label: '$150M+',
      minValue: '150000000',
      maxValue: '999999999',
      sortOrder: 5,
    },
  ];

  await createMarket(
    {
      title: `What will "${movie.title}" open with domestically?`,
      description: `Predict the opening weekend domestic box office for ${movie.title}.`,
      category: 'box_office',
      marketType: 'range_bracket',
      movieId: movie.id.toString(),
      movieTitle: movie.title,
      moviePosterPath: movie.poster_path,
      releaseDate,
      blindPeriodEndsAt: blindPeriodEnds,
      lockAt: lockDate,
      status: 'blind',
      isUserProposed: false,
    },
    outcomes
  );
}

/**
 * Generate all markets for a movie
 */
export async function generateMarketsForMovie(
  movie: TMDBMovie
): Promise<number> {
  let createdCount = 0;

  try {
    // Get detailed movie information
    const details = await getMovieDetails(movie.id);

    // For proof of concept: Only create RT Binary market (1 market per movie)
    await createRTBinaryMarket(movie, details);
    createdCount++;

    // Uncomment below to create all 4 markets per movie:
    // await createRTRangeBracketMarket(movie, details);
    // createdCount++;

    // if (isTheatricalRelease(movie)) {
    //   await createBoxOfficeBinaryMarket(movie, details);
    //   createdCount++;
    //   await createBoxOfficeRangeBracketMarket(movie, details);
    //   createdCount++;
    // }

    return createdCount;
  } catch (error) {
    console.error(`Error generating markets for ${movie.title}:`, error);
    return createdCount;
  }
}

/**
 * Generate markets for movies currently playing in theaters
 * Fetches movies from TMDB's "Now Playing" section and creates prediction markets.
 */
export async function generateUpcomingMarkets(): Promise<{
  movies_processed: number;
  markets_created: number;
}> {
  console.log('Fetching now playing movies...');

  // Fetch 3 pages of now playing movies (~60 movies)
  const allMovies: TMDBMovie[] = [];
  const maxPages = 3;

  for (let page = 1; page <= maxPages; page++) {
    try {
      const response = await getNowPlayingMovies(page, 'US');
      allMovies.push(...response.results);

      if (page >= response.total_pages) break;
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      break;
    }
  }

  console.log(`Found ${allMovies.length} now playing movies`);

  // Filter for theatrical releases (exclude documentaries)
  const theatricalMovies: TMDBMovie[] = [];

  for (const movie of allMovies) {
    if (!isTheatricalRelease(movie)) continue;
    theatricalMovies.push(movie);
  }

  console.log(`Filtered to ${theatricalMovies.length} theatrical releases`);

  // Sort by popularity and take top 15
  const topMovies = theatricalMovies
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 15);

  console.log(`Selected top 15 movies by popularity`);

  let totalMarketsCreated = 0;

  for (const movie of topMovies) {
    console.log(`Generating markets for: ${movie.title} (Popularity: ${Math.round(movie.popularity)})`);
    const marketsCreated = await generateMarketsForMovie(movie);
    totalMarketsCreated += marketsCreated;
  }

  return {
    movies_processed: topMovies.length,
    markets_created: totalMarketsCreated,
  };
}
