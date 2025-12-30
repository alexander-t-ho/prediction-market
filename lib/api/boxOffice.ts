/**
 * Box Office Data Integration
 * Fetches domestic opening weekend gross and rankings for market resolution
 *
 * Strategy:
 * 1. Primary: RapidAPI box office endpoints (if configured)
 * 2. Fallback: Manual admin entry through UI
 * 3. Future: Web scraping as last resort
 */

export interface BoxOfficeResult {
  title: string;
  openingWeekendGross: number; // In USD
  rank: number; // Weekend ranking (1 = #1, 2 = #2, etc.)
  theaterCount: number | null;
  perTheaterAverage: number | null;
  releaseDate: Date;
  retrievedAt: Date;
}

export interface WeekendBoxOffice {
  weekend: Date;
  movies: BoxOfficeResult[];
}

class BoxOfficeService {
  private rapidApiKey: string;
  private cache: Map<string, { data: BoxOfficeResult; timestamp: number }> = new Map();
  private cacheExpirationMs = 60 * 60 * 1000; // 1 hour cache

  constructor() {
    this.rapidApiKey = process.env.RAPIDAPI_KEY || '';

    if (!this.rapidApiKey || this.rapidApiKey === 'your-rapidapi-key') {
      console.warn('RapidAPI key not configured. Box office resolution will require manual entry.');
    }
  }

  /**
   * Fetch opening weekend box office data by movie title
   */
  async getOpeningWeekend(title: string, releaseDate: Date): Promise<BoxOfficeResult | null> {
    // Check cache first
    const cacheKey = `${title}-${releaseDate.toISOString().split('T')[0]}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpirationMs) {
      console.log(`[BoxOffice] Cache hit for ${cacheKey}`);
      return cached.data;
    }

    // Try RapidAPI if configured
    if (this.rapidApiKey && this.rapidApiKey !== 'your-rapidapi-key') {
      try {
        const result = await this.fetchFromRapidAPI(title, releaseDate);
        if (result) {
          this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
          return result;
        }
      } catch (error) {
        console.error('[BoxOffice] RapidAPI fetch failed:', error);
      }
    }

    // If no API available, return null to trigger manual entry
    console.log(`[BoxOffice] No data source available for ${title}. Manual entry required.`);
    return null;
  }

  /**
   * Fetch weekend box office rankings
   * Returns top 10 movies for a given weekend
   */
  async getWeekendRankings(weekendDate: Date): Promise<WeekendBoxOffice | null> {
    if (!this.rapidApiKey || this.rapidApiKey === 'your-rapidapi-key') {
      console.log('[BoxOffice] RapidAPI not configured. Manual entry required.');
      return null;
    }

    try {
      // This would call a RapidAPI endpoint like Box Office Mojo API
      // Example: https://rapidapi.com/SAdrian/api/box-office/
      const result = await this.fetchWeekendFromRapidAPI(weekendDate);
      return result;
    } catch (error) {
      console.error('[BoxOffice] Weekend rankings fetch failed:', error);
      return null;
    }
  }

  /**
   * Manually set box office data (admin override)
   * This is the primary method for PoC until RapidAPI is configured
   */
  async setManualBoxOfficeData(data: {
    title: string;
    releaseDate: Date;
    openingWeekendGross: number;
    rank: number;
    theaterCount?: number;
    perTheaterAverage?: number;
  }): Promise<BoxOfficeResult> {
    const result: BoxOfficeResult = {
      title: data.title,
      openingWeekendGross: data.openingWeekendGross,
      rank: data.rank,
      theaterCount: data.theaterCount || null,
      perTheaterAverage: data.perTheaterAverage || null,
      releaseDate: data.releaseDate,
      retrievedAt: new Date(),
    };

    // Cache the manual entry
    const cacheKey = `${data.title}-${data.releaseDate.toISOString().split('T')[0]}`;
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

    console.log(`[BoxOffice] Manual data set for ${data.title}: $${data.openingWeekendGross.toLocaleString()} (#${data.rank})`);

    return result;
  }

  /**
   * Fetch from RapidAPI (implementation placeholder)
   * This would be implemented once a specific Box Office API is chosen from RapidAPI marketplace
   */
  private async fetchFromRapidAPI(title: string, releaseDate: Date): Promise<BoxOfficeResult | null> {
    // Placeholder implementation
    // In production, this would call a specific RapidAPI endpoint
    // Example: Box Office Mojo API, The Numbers API, or similar

    console.log(`[BoxOffice] RapidAPI fetch for ${title} not yet implemented`);
    return null;

    /*
    // Example implementation (to be customized based on chosen API):
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': this.rapidApiKey,
        'X-RapidAPI-Host': 'box-office-api.p.rapidapi.com'
      }
    };

    const response = await fetch(
      `https://box-office-api.p.rapidapi.com/movie/${encodeURIComponent(title)}`,
      options
    );

    if (!response.ok) {
      throw new Error(`RapidAPI request failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      title: data.title,
      openingWeekendGross: data.opening_weekend,
      rank: data.rank,
      theaterCount: data.theaters,
      perTheaterAverage: data.per_theater,
      releaseDate: new Date(data.release_date),
      retrievedAt: new Date(),
    };
    */
  }

  /**
   * Fetch weekend rankings from RapidAPI (implementation placeholder)
   */
  private async fetchWeekendFromRapidAPI(weekendDate: Date): Promise<WeekendBoxOffice | null> {
    console.log(`[BoxOffice] RapidAPI weekend fetch not yet implemented`);
    return null;

    /*
    // Example implementation:
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': this.rapidApiKey,
        'X-RapidAPI-Host': 'box-office-api.p.rapidapi.com'
      }
    };

    const dateStr = weekendDate.toISOString().split('T')[0];
    const response = await fetch(
      `https://box-office-api.p.rapidapi.com/weekend/${dateStr}`,
      options
    );

    if (!response.ok) {
      throw new Error(`RapidAPI request failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      weekend: weekendDate,
      movies: data.movies.map((m: any, index: number) => ({
        title: m.title,
        openingWeekendGross: m.gross,
        rank: index + 1,
        theaterCount: m.theaters,
        perTheaterAverage: m.per_theater,
        releaseDate: new Date(m.release_date),
        retrievedAt: new Date(),
      }))
    };
    */
  }

  /**
   * Validate box office data
   */
  validateBoxOfficeData(data: BoxOfficeResult): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.openingWeekendGross < 0) {
      errors.push('Opening weekend gross cannot be negative');
    }

    if (data.rank < 1) {
      errors.push('Rank must be at least 1');
    }

    if (data.theaterCount !== null && data.theaterCount < 0) {
      errors.push('Theater count cannot be negative');
    }

    if (data.perTheaterAverage !== null && data.perTheaterAverage < 0) {
      errors.push('Per-theater average cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Determine which bracket a gross amount falls into
   * Based on PRD bracket definitions
   */
  determineGrossBracket(gross: number): string {
    if (gross < 25_000_000) return 'Under $25M';
    if (gross < 50_000_000) return '$25M - $50M';
    if (gross < 75_000_000) return '$50M - $75M';
    if (gross < 100_000_000) return '$75M - $100M';
    if (gross < 150_000_000) return '$100M - $150M';
    if (gross < 200_000_000) return '$150M - $200M';
    return 'Over $200M';
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[BoxOffice] Cache cleared');
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
export const boxOfficeService = new BoxOfficeService();
