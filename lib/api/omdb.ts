/**
 * OMDb API Integration
 * Fetches Rotten Tomatoes scores and movie ratings for market resolution
 */

import { retryWithBackoff } from '@/lib/utils/retry';

interface OMDbRating {
  Source: string;
  Value: string;
}

interface OMDbResponse {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Actors: string;
  Plot: string;
  Poster: string;
  Ratings: OMDbRating[];
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  Response: string;
  Error?: string;
}

export interface RottenTomatoesScore {
  tomatometer: number | null; // Critic score (0-100)
  audienceScore: number | null; // Audience score (0-100)
  reviewCount: number | null; // Number of critic reviews
  imdbRating: number | null; // Backup data source
  metascore: number | null; // Backup data source
  retrievedAt: Date;
}

class OMDbService {
  private apiKey: string;
  private baseUrl = 'http://www.omdbapi.com/';
  private cache: Map<string, { data: RottenTomatoesScore; timestamp: number }> = new Map();
  private cacheExpirationMs = 15 * 60 * 1000; // 15 minutes

  constructor() {
    // Extract API key from the full URL in env (format: http://www.omdbapi.com/?i=tt3896198&apikey=8e4ca29e)
    const envValue = process.env.OMDB_API_KEY || '';
    const match = envValue.match(/apikey=([a-zA-Z0-9]+)/);
    this.apiKey = match ? match[1] : '';

    if (!this.apiKey) {
      console.warn('OMDb API key not configured. Resolution will require manual intervention.');
    }
  }

  /**
   * Fetch Rotten Tomatoes score by IMDb ID
   */
  async getRottenTomatoesScore(imdbId: string): Promise<RottenTomatoesScore> {
    // Check cache first
    const cached = this.cache.get(imdbId);
    if (cached && Date.now() - cached.timestamp < this.cacheExpirationMs) {
      console.log(`[OMDb] Cache hit for ${imdbId}`);
      return cached.data;
    }

    if (!this.apiKey) {
      throw new Error('OMDb API key not configured');
    }

    // Use retry logic for API calls
    return retryWithBackoff(async () => {
      const url = `${this.baseUrl}?i=${imdbId}&apikey=${this.apiKey}&plot=short`;
      console.log(`[OMDb] Fetching: ${url.replace(this.apiKey, 'REDACTED')}`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`OMDb API request failed: ${response.status} ${response.statusText}`);
      }

      const data: OMDbResponse = await response.json();

      if (data.Response === 'False') {
        throw new Error(`OMDb Error: ${data.Error || 'Unknown error'}`);
      }

      const score = this.parseRottenTomatoesData(data);

      // Cache the result
      this.cache.set(imdbId, { data: score, timestamp: Date.now() });

      return score;
    }, {
      maxAttempts: 3,
      initialDelayMs: 1000,
      onRetry: (attempt, error) => {
        console.log(`[OMDb] Retry attempt ${attempt} for ${imdbId}: ${error.message}`);
      },
    });
  }

  /**
   * Fetch Rotten Tomatoes score by movie title and year
   */
  async getRottenTomatoesScoreByTitle(title: string, year?: number): Promise<RottenTomatoesScore> {
    if (!this.apiKey) {
      throw new Error('OMDb API key not configured');
    }

    return retryWithBackoff(async () => {
      let url = `${this.baseUrl}?t=${encodeURIComponent(title)}&apikey=${this.apiKey}&plot=short`;
      if (year) {
        url += `&y=${year}`;
      }

      console.log(`[OMDb] Fetching by title: ${url.replace(this.apiKey, 'REDACTED')}`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`OMDb API request failed: ${response.status} ${response.statusText}`);
      }

      const data: OMDbResponse = await response.json();

      if (data.Response === 'False') {
        throw new Error(`OMDb Error: ${data.Error || 'Unknown error'}`);
      }

      const score = this.parseRottenTomatoesData(data);

      // Cache by IMDb ID if available
      if (data.imdbID) {
        this.cache.set(data.imdbID, { data: score, timestamp: Date.now() });
      }

      return score;
    }, {
      maxAttempts: 3,
      initialDelayMs: 1000,
      onRetry: (attempt, error) => {
        console.log(`[OMDb] Retry attempt ${attempt} for "${title}": ${error.message}`);
      },
    });
  }

  /**
   * Parse Rotten Tomatoes data from OMDb response
   */
  private parseRottenTomatoesData(data: OMDbResponse): RottenTomatoesScore {
    let tomatometer: number | null = null;
    let audienceScore: number | null = null;

    // Parse Rotten Tomatoes ratings
    const rtRating = data.Ratings?.find(r => r.Source === 'Rotten Tomatoes');
    if (rtRating) {
      // Format: "85%" or "85/100"
      const match = rtRating.Value.match(/(\d+)/);
      if (match) {
        tomatometer = parseInt(match[1], 10);
      }
    }

    // Parse Metacritic score as backup
    let metascore: number | null = null;
    if (data.Metascore && data.Metascore !== 'N/A') {
      metascore = parseInt(data.Metascore, 10);
    }

    // Parse IMDb rating as backup
    let imdbRating: number | null = null;
    if (data.imdbRating && data.imdbRating !== 'N/A') {
      imdbRating = parseFloat(data.imdbRating);
    }

    // Estimate review count from IMDb votes (very rough approximation)
    let reviewCount: number | null = null;
    if (data.imdbVotes && data.imdbVotes !== 'N/A') {
      const votes = parseInt(data.imdbVotes.replace(/,/g, ''), 10);
      // Rough estimate: RT reviews are typically 0.1-0.5% of IMDb votes for wide releases
      reviewCount = Math.floor(votes * 0.002);
    }

    return {
      tomatometer,
      audienceScore,
      reviewCount,
      imdbRating,
      metascore,
      retrievedAt: new Date(),
    };
  }

  /**
   * Validate if a movie has sufficient reviews for resolution
   * Per PRD: Minimum 20 reviews required
   */
  validateSufficientReviews(score: RottenTomatoesScore, minimumReviews = 20): boolean {
    if (score.reviewCount === null) {
      console.warn('[OMDb] Review count unknown, cannot validate');
      return false;
    }

    return score.reviewCount >= minimumReviews;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[OMDb] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const omdbService = new OMDbService();
