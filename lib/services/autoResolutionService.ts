/**
 * Automated Resolution Service
 *
 * Automatically resolves markets using external data sources:
 * - Rotten Tomatoes markets via OMDb API
 * - Box Office markets via Box Office API or manual entry
 *
 * Per PRD Phase 4:
 * - RT markets: Resolve 14 days post-release (minimum 20 reviews)
 * - Box Office markets: Resolve Monday/Tuesday after opening weekend
 */

import { db } from '@/lib/db';
import { markets, marketOutcomes } from '@/lib/db/schema';
import { eq, and, or, sql, gte, lte } from 'drizzle-orm';
import { omdbService } from '@/lib/api/omdb';
import { boxOfficeService } from '@/lib/api/boxOffice';
import { resolveMarket } from './resolutionService';

export interface AutoResolutionCandidate {
  marketId: string;
  marketType: 'rt_binary' | 'rt_range' | 'box_office_binary' | 'box_office_range' | 'box_office_number_one';
  movieTitle: string;
  releaseDate: Date;
  imdbId: string | null;
  daysPostRelease: number;
  canResolve: boolean;
  reason: string;
}

export interface AutoResolutionResult {
  marketId: string;
  success: boolean;
  winningOutcomeId: string | null;
  actualValue: number | null;
  dataSource: 'omdb' | 'box_office' | 'manual_required';
  error: string | null;
}

/**
 * Find markets that are candidates for auto-resolution
 */
export async function findResolutionCandidates(): Promise<AutoResolutionCandidate[]> {
  const now = new Date();
  const candidates: AutoResolutionCandidate[] = [];

  // Find locked or resolving markets that haven't been resolved yet
  const pendingMarkets = await db.query.markets.findMany({
    where: and(
      or(eq(markets.status, 'locked'), eq(markets.status, 'resolving')),
      sql`${markets.resolvedOutcomeId} IS NULL`
    ),
  });

  for (const market of pendingMarkets) {
    if (!market.releaseDate) continue;

    const releaseDate = new Date(market.releaseDate);
    const daysPostRelease = Math.floor((now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));

    const candidate: AutoResolutionCandidate = {
      marketId: market.id,
      marketType: market.marketType as any,
      movieTitle: market.title,
      releaseDate,
      imdbId: market.imdbId,
      daysPostRelease,
      canResolve: false,
      reason: '',
    };

    // Check RT markets (14 days minimum)
    if (market.marketType === 'rt_binary' || market.marketType === 'rt_range') {
      if (daysPostRelease >= 14) {
        candidate.canResolve = true;
        candidate.reason = `RT market ready (${daysPostRelease} days post-release)`;
      } else {
        candidate.reason = `RT market needs ${14 - daysPostRelease} more days`;
      }
    }

    // Check Box Office markets (Monday after opening weekend = 3-4 days)
    if (
      market.marketType === 'box_office_binary' ||
      market.marketType === 'box_office_range' ||
      market.marketType === 'box_office_number_one'
    ) {
      // Opening weekend is Friday-Sunday, so Monday = 3 days post-release
      if (daysPostRelease >= 3) {
        candidate.canResolve = true;
        candidate.reason = `Box office market ready (${daysPostRelease} days post-release)`;
      } else {
        candidate.reason = `Box office market needs ${3 - daysPostRelease} more days`;
      }
    }

    candidates.push(candidate);
  }

  return candidates;
}

/**
 * Attempt to auto-resolve a Rotten Tomatoes market
 */
export async function autoResolveRTMarket(
  marketId: string
): Promise<AutoResolutionResult> {
  try {
    // Get market details
    const market = await db.query.markets.findFirst({
      where: eq(markets.id, marketId),
      with: {
        outcomes: true,
      },
    });

    if (!market) {
      return {
        marketId,
        success: false,
        winningOutcomeId: null,
        actualValue: null,
        dataSource: 'omdb',
        error: 'Market not found',
      };
    }

    // Fetch RT score
    let rtScore;
    if (market.imdbId) {
      rtScore = await omdbService.getRottenTomatoesScore(market.imdbId);
    } else {
      const year = market.releaseDate ? new Date(market.releaseDate).getFullYear() : undefined;
      rtScore = await omdbService.getRottenTomatoesScoreByTitle(market.title, year);
    }

    if (rtScore.tomatometer === null) {
      return {
        marketId,
        success: false,
        winningOutcomeId: null,
        actualValue: null,
        dataSource: 'omdb',
        error: 'Rotten Tomatoes score not available',
      };
    }

    // Validate sufficient reviews (minimum 20 per PRD)
    if (!omdbService.validateSufficientReviews(rtScore, 20)) {
      return {
        marketId,
        success: false,
        winningOutcomeId: null,
        actualValue: rtScore.tomatometer,
        dataSource: 'omdb',
        error: `Insufficient reviews (estimated: ${rtScore.reviewCount || 'unknown'})`,
      };
    }

    // Determine winning outcome
    const winningOutcome = determineRTWinningOutcome(
      market.marketType as string,
      rtScore.tomatometer,
      market.outcomes,
      market.threshold ? Number(market.threshold) : undefined
    );

    if (!winningOutcome) {
      return {
        marketId,
        success: false,
        winningOutcomeId: null,
        actualValue: rtScore.tomatometer,
        dataSource: 'omdb',
        error: 'Could not determine winning outcome',
      };
    }

    // Resolve the market
    const resolutionResult = await resolveMarket(
      marketId,
      winningOutcome.id,
      rtScore.tomatometer,
      'system' // Resolved by automated system
    );

    return {
      marketId,
      success: resolutionResult.success,
      winningOutcomeId: winningOutcome.id,
      actualValue: rtScore.tomatometer,
      dataSource: 'omdb',
      error: resolutionResult.errors.length > 0 ? resolutionResult.errors.join(', ') : null,
    };
  } catch (error) {
    return {
      marketId,
      success: false,
      winningOutcomeId: null,
      actualValue: null,
      dataSource: 'omdb',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Attempt to auto-resolve a Box Office market
 */
export async function autoResolveBoxOfficeMarket(
  marketId: string
): Promise<AutoResolutionResult> {
  try {
    // Get market details
    const market = await db.query.markets.findFirst({
      where: eq(markets.id, marketId),
      with: {
        outcomes: true,
      },
    });

    if (!market) {
      return {
        marketId,
        success: false,
        winningOutcomeId: null,
        actualValue: null,
        dataSource: 'box_office',
        error: 'Market not found',
      };
    }

    if (!market.releaseDate) {
      return {
        marketId,
        success: false,
        winningOutcomeId: null,
        actualValue: null,
        dataSource: 'box_office',
        error: 'Release date not set',
      };
    }

    // Fetch box office data
    const boxOfficeData = await boxOfficeService.getOpeningWeekend(
      market.title,
      new Date(market.releaseDate)
    );

    if (!boxOfficeData) {
      return {
        marketId,
        success: false,
        winningOutcomeId: null,
        actualValue: null,
        dataSource: 'manual_required',
        error: 'Box office data not available via API. Manual entry required.',
      };
    }

    // Validate data
    const validation = boxOfficeService.validateBoxOfficeData(boxOfficeData);
    if (!validation.valid) {
      return {
        marketId,
        success: false,
        winningOutcomeId: null,
        actualValue: boxOfficeData.openingWeekendGross,
        dataSource: 'box_office',
        error: `Invalid data: ${validation.errors.join(', ')}`,
      };
    }

    // Determine winning outcome based on market type
    let winningOutcome;
    let actualValue = boxOfficeData.openingWeekendGross;

    if (market.marketType === 'box_office_number_one') {
      // #1 Opening Weekend market
      winningOutcome = boxOfficeData.rank === 1
        ? market.outcomes.find(o => o.label.toLowerCase().includes('yes'))
        : market.outcomes.find(o => o.label.toLowerCase().includes('no'));
      actualValue = boxOfficeData.rank;
    } else if (market.marketType === 'box_office_binary') {
      // Binary threshold market
      const threshold = market.threshold ? Number(market.threshold) : 0;
      winningOutcome = boxOfficeData.openingWeekendGross >= threshold
        ? market.outcomes.find(o => o.label.toLowerCase().includes('yes'))
        : market.outcomes.find(o => o.label.toLowerCase().includes('no'));
    } else if (market.marketType === 'box_office_range') {
      // Range bracket market
      winningOutcome = determineBoxOfficeBracket(
        boxOfficeData.openingWeekendGross,
        market.outcomes
      );
    }

    if (!winningOutcome) {
      return {
        marketId,
        success: false,
        winningOutcomeId: null,
        actualValue,
        dataSource: 'box_office',
        error: 'Could not determine winning outcome',
      };
    }

    // Resolve the market
    const resolutionResult = await resolveMarket(
      marketId,
      winningOutcome.id,
      actualValue,
      'system'
    );

    return {
      marketId,
      success: resolutionResult.success,
      winningOutcomeId: winningOutcome.id,
      actualValue,
      dataSource: 'box_office',
      error: resolutionResult.errors.length > 0 ? resolutionResult.errors.join(', ') : null,
    };
  } catch (error) {
    return {
      marketId,
      success: false,
      winningOutcomeId: null,
      actualValue: null,
      dataSource: 'box_office',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run auto-resolution for all eligible markets
 */
export async function runAutoResolution(): Promise<{
  processed: number;
  successful: number;
  failed: number;
  manualRequired: number;
  results: AutoResolutionResult[];
}> {
  console.log('[AutoResolution] Starting auto-resolution scan...');

  const candidates = await findResolutionCandidates();
  const resolvableCandidates = candidates.filter(c => c.canResolve);

  console.log(`[AutoResolution] Found ${resolvableCandidates.length} markets ready for resolution`);

  const results: AutoResolutionResult[] = [];
  let successful = 0;
  let failed = 0;
  let manualRequired = 0;

  for (const candidate of resolvableCandidates) {
    console.log(`[AutoResolution] Processing ${candidate.movieTitle} (${candidate.marketType})`);

    let result: AutoResolutionResult;

    if (candidate.marketType === 'rt_binary' || candidate.marketType === 'rt_range') {
      result = await autoResolveRTMarket(candidate.marketId);
    } else {
      result = await autoResolveBoxOfficeMarket(candidate.marketId);
    }

    results.push(result);

    if (result.success) {
      successful++;
      console.log(`[AutoResolution] ✓ Resolved ${candidate.movieTitle}: ${result.actualValue}`);
    } else {
      if (result.dataSource === 'manual_required') {
        manualRequired++;
        console.log(`[AutoResolution] ⚠ ${candidate.movieTitle} requires manual entry`);
      } else {
        failed++;
        console.log(`[AutoResolution] ✗ Failed ${candidate.movieTitle}: ${result.error}`);
      }
    }
  }

  console.log(`[AutoResolution] Complete: ${successful} successful, ${failed} failed, ${manualRequired} manual required`);

  return {
    processed: results.length,
    successful,
    failed,
    manualRequired,
    results,
  };
}

/**
 * Helper: Determine RT winning outcome
 */
function determineRTWinningOutcome(
  marketType: string,
  score: number,
  outcomes: any[],
  threshold?: number
) {
  if (marketType === 'rt_binary') {
    // Binary: Yes/No based on threshold
    if (threshold === undefined) return null;
    return score >= threshold
      ? outcomes.find(o => o.label.toLowerCase().includes('yes'))
      : outcomes.find(o => o.label.toLowerCase().includes('no'));
  } else if (marketType === 'rt_range') {
    // Range: Find matching bracket
    // Brackets: 0-39%, 40-59%, 60-74%, 75-89%, 90-100%
    if (score >= 0 && score <= 39) {
      return outcomes.find(o => o.minValue === 0 && o.maxValue === 39);
    } else if (score >= 40 && score <= 59) {
      return outcomes.find(o => o.minValue === 40 && o.maxValue === 59);
    } else if (score >= 60 && score <= 74) {
      return outcomes.find(o => o.minValue === 60 && o.maxValue === 74);
    } else if (score >= 75 && score <= 89) {
      return outcomes.find(o => o.minValue === 75 && o.maxValue === 89);
    } else if (score >= 90 && score <= 100) {
      return outcomes.find(o => o.minValue === 90 && o.maxValue === 100);
    }
  }

  return null;
}

/**
 * Helper: Determine Box Office bracket
 */
function determineBoxOfficeBracket(gross: number, outcomes: any[]) {
  // Brackets per PRD: <$25M, $25-50M, $50-75M, $75-100M, $100-150M, $150-200M, >$200M
  if (gross < 25_000_000) {
    return outcomes.find(o => o.maxValue === 25_000_000);
  } else if (gross < 50_000_000) {
    return outcomes.find(o => o.minValue === 25_000_000 && o.maxValue === 50_000_000);
  } else if (gross < 75_000_000) {
    return outcomes.find(o => o.minValue === 50_000_000 && o.maxValue === 75_000_000);
  } else if (gross < 100_000_000) {
    return outcomes.find(o => o.minValue === 75_000_000 && o.maxValue === 100_000_000);
  } else if (gross < 150_000_000) {
    return outcomes.find(o => o.minValue === 100_000_000 && o.maxValue === 150_000_000);
  } else if (gross < 200_000_000) {
    return outcomes.find(o => o.minValue === 150_000_000 && o.maxValue === 200_000_000);
  } else {
    return outcomes.find(o => o.minValue === 200_000_000 && !o.maxValue);
  }
}
