// TMDB API Integration

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Rate limiting: 40 requests per 10 seconds
let requestCount = 0;
let resetTime = Date.now() + 10000;

async function checkRateLimit(): Promise<void> {
  const now = Date.now();
  if (now > resetTime) {
    requestCount = 0;
    resetTime = now + 10000;
  }

  if (requestCount >= 40) {
    const waitTime = resetTime - now;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    requestCount = 0;
    resetTime = Date.now() + 10000;
  }

  requestCount++;
}

async function tmdbFetch<T>(endpoint: string): Promise<T> {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB_API_KEY is not configured');
  }

  await checkRateLimit();

  const url = `${TMDB_API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `TMDB API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

// Types
export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genre_ids: number[];
  adult: boolean;
  vote_average: number;
  vote_count: number;
  popularity: number;
}

export interface TMDBMovieDetails extends TMDBMovie {
  budget: number;
  revenue: number;
  runtime: number;
  genres: { id: number; name: string }[];
  production_companies: { id: number; name: string }[];
  status: string;
  tagline: string;
}

export interface TMDBUpcomingResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
  dates: {
    maximum: string;
    minimum: string;
  };
}

export interface TMDBSearchResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

// API Functions

/**
 * Get upcoming theatrical releases
 * @param page Page number (default: 1)
 * @param region Region code (default: 'US')
 * @returns Upcoming movies
 */
export async function getUpcomingMovies(
  page: number = 1,
  region: string = 'US'
): Promise<TMDBUpcomingResponse> {
  return tmdbFetch<TMDBUpcomingResponse>(
    `/movie/upcoming?page=${page}&region=${region}&language=en-US`
  );
}

/**
 * Get movies currently playing in theaters
 * @param page Page number (default: 1)
 * @param region Region code (default: 'US')
 * @returns Movies currently in theaters
 */
export async function getNowPlayingMovies(
  page: number = 1,
  region: string = 'US'
): Promise<TMDBUpcomingResponse> {
  return tmdbFetch<TMDBUpcomingResponse>(
    `/movie/now_playing?page=${page}&region=${region}&language=en-US`
  );
}

/**
 * Get popular movies
 * Returns trending and popular movies based on user engagement
 * @param page Page number (default: 1)
 * @param region Region code (default: 'US')
 * @returns Popular movies
 */
export async function getPopularMovies(
  page: number = 1,
  region: string = 'US'
): Promise<TMDBUpcomingResponse> {
  return tmdbFetch<TMDBUpcomingResponse>(
    `/movie/popular?page=${page}&region=${region}&language=en-US`
  );
}

/**
 * Get movies releasing in a specific date range
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @returns Movies releasing in date range
 */
export async function getMoviesByDateRange(
  startDate: string,
  endDate: string
): Promise<TMDBMovie[]> {
  const results: TMDBMovie[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= 5) {
    // Limit to 5 pages
    const response = await tmdbFetch<TMDBUpcomingResponse>(
      `/discover/movie?primary_release_date.gte=${startDate}&primary_release_date.lte=${endDate}&page=${page}&region=US&language=en-US&with_release_type=3` // 3 = Theatrical
    );

    results.push(...response.results);
    totalPages = response.total_pages;
    page++;
  }

  return results;
}

/**
 * Get detailed movie information
 * @param movieId TMDB movie ID
 * @returns Movie details
 */
export async function getMovieDetails(
  movieId: number
): Promise<TMDBMovieDetails> {
  return tmdbFetch<TMDBMovieDetails>(`/movie/${movieId}?language=en-US`);
}

/**
 * Search for movies by title
 * @param query Search query
 * @param page Page number (default: 1)
 * @returns Search results
 */
export async function searchMovies(
  query: string,
  page: number = 1
): Promise<TMDBSearchResponse> {
  const encodedQuery = encodeURIComponent(query);
  return tmdbFetch<TMDBSearchResponse>(
    `/search/movie?query=${encodedQuery}&page=${page}&language=en-US`
  );
}

/**
 * Get poster URL for a movie
 * @param posterPath Poster path from TMDB
 * @param size Poster size (w92, w154, w185, w342, w500, w780, original)
 * @returns Full poster URL
 */
export function getPosterUrl(
  posterPath: string | null,
  size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342'
): string | null {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
}

/**
 * Get backdrop URL for a movie
 * @param backdropPath Backdrop path from TMDB
 * @param size Backdrop size (w300, w780, w1280, original)
 * @returns Full backdrop URL
 */
export function getBackdropUrl(
  backdropPath: string | null,
  size: 'w300' | 'w780' | 'w1280' | 'original' = 'w780'
): string | null {
  if (!backdropPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${backdropPath}`;
}

/**
 * Filter movies to only theatrical releases (excludes streaming-only)
 * @param movies Array of movies
 * @returns Filtered movies
 */
export function filterTheatricalReleases(movies: TMDBMovie[]): TMDBMovie[] {
  // Filter out movies with no release date
  return movies.filter((movie) => movie.release_date);
}
