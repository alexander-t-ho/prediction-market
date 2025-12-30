/**
 * Dynamic Odds Service
 *
 * Implements the dynamic popularity-based payout multiplier system.
 * Formula: Multiplier = 1 - (0.3 × (Popularity Ratio - 0.5))
 * Bounds: 0.7 ≤ multiplier ≤ 1.3
 *
 * Purpose: Make bandwagoning economically suboptimal by reducing payouts
 * for popular positions and increasing payouts for unpopular positions.
 */

import { db } from '@/lib/db';
import { bets, marketOutcomes, markets } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface DynamicOddsResult {
  outcomeId: string;
  outcomeName: string;
  totalStake: number;
  betCount: number;
  popularityRatio: number;
  penaltyMultiplier: number;
  effectiveOdds: string; // e.g., "0.91x" or "1.09x"
}

export interface PotentialPayoutResult {
  stake: number;
  popularityRatio: number;
  dynamicMultiplier: number;
  basePayout: number; // Simplified: assumes win and equal split
  estimatedPayout: number;
  isContrarian: boolean;
  contrarianBonus: number;
  maxPotentialPayout: number; // With contrarian bonus if applicable
}

/**
 * Calculate the dynamic odds penalty multiplier based on popularity ratio
 *
 * @param popularityRatio - Ratio of stakes on this outcome (0 to 1)
 * @returns Multiplier between 0.7 and 1.3
 *
 * Examples:
 * - 50% popularity (0.50) → 1.00x (neutral)
 * - 80% popularity (0.80) → 0.91x (penalty)
 * - 20% popularity (0.20) → 1.09x (bonus)
 * - 100% popularity (1.00) → 0.70x (max penalty, bounded)
 * - 0% popularity (0.00) → 1.30x (max bonus, bounded)
 */
export function calculatePenaltyMultiplier(popularityRatio: number): number {
  // Validate input
  if (popularityRatio < 0 || popularityRatio > 1) {
    throw new Error(`Invalid popularity ratio: ${popularityRatio}. Must be between 0 and 1.`);
  }

  // Apply formula: 1 - (0.3 × (popularityRatio - 0.5))
  const unbounded = 1 - (0.3 * (popularityRatio - 0.5));

  // Apply bounds: [0.7, 1.3]
  return Math.max(0.7, Math.min(1.3, unbounded));
}

/**
 * Get current dynamic odds for all outcomes in a market
 *
 * @param marketId - Market ID
 * @returns Array of odds results for each outcome
 */
export async function getDynamicOdds(marketId: string): Promise<DynamicOddsResult[]> {
  // Get all outcomes for the market
  const outcomes = await db
    .select()
    .from(marketOutcomes)
    .where(eq(marketOutcomes.marketId, marketId));

  if (outcomes.length === 0) {
    throw new Error(`No outcomes found for market ${marketId}`);
  }

  // Get betting distribution
  const distribution = await db
    .select({
      outcomeId: bets.outcomeId,
      totalStake: sql<number>`COALESCE(SUM(${bets.stake}), 0)`,
      betCount: sql<number>`COUNT(*)`,
    })
    .from(bets)
    .where(eq(bets.marketId, marketId))
    .groupBy(bets.outcomeId);

  // Calculate total pool
  const totalPool = distribution.reduce((sum, d) => sum + Number(d.totalStake), 0);

  // Build results for each outcome
  const results: DynamicOddsResult[] = outcomes.map((outcome) => {
    const outcomeStats = distribution.find((d) => d.outcomeId === outcome.id);
    const totalStake = outcomeStats ? Number(outcomeStats.totalStake) : 0;
    const betCount = outcomeStats ? Number(outcomeStats.betCount) : 0;

    // Calculate popularity ratio
    const popularityRatio = totalPool > 0 ? totalStake / totalPool : 0;

    // Calculate penalty multiplier
    const penaltyMultiplier = calculatePenaltyMultiplier(popularityRatio);

    return {
      outcomeId: outcome.id,
      outcomeName: outcome.label,
      totalStake,
      betCount,
      popularityRatio,
      penaltyMultiplier,
      effectiveOdds: `${penaltyMultiplier.toFixed(2)}x`,
    };
  });

  return results;
}

/**
 * Calculate potential payout for a hypothetical bet
 *
 * This shows the user what they could win if:
 * 1. They place the bet now
 * 2. Their outcome wins
 * 3. No other bets are placed (distribution stays the same)
 *
 * NOTE: This is an estimate only. Actual payout depends on:
 * - Final pool size at market lock
 * - Distribution at bet placement time (for dynamic multiplier)
 * - Whether bet was contrarian at placement time
 *
 * @param marketId - Market ID
 * @param outcomeId - Outcome ID to bet on
 * @param stake - Stake amount (in Takes)
 * @returns Potential payout details
 */
export async function calculatePotentialPayout(
  marketId: string,
  outcomeId: string,
  stake: number
): Promise<PotentialPayoutResult> {
  // Validate stake
  if (stake <= 0) {
    throw new Error(`Invalid stake: ${stake}. Must be positive.`);
  }

  // Get current odds
  const oddsResults = await getDynamicOdds(marketId);
  const outcomeOdds = oddsResults.find((o) => o.outcomeId === outcomeId);

  if (!outcomeOdds) {
    throw new Error(`Outcome ${outcomeId} not found in market ${marketId}`);
  }

  // Calculate current pool and hypothetical pool (after this bet)
  const currentPool = oddsResults.reduce((sum, o) => sum + o.totalStake, 0);
  const hypotheticalPool = currentPool + stake;

  // Calculate hypothetical popularity ratio (after this bet)
  const hypotheticalTotalStake = outcomeOdds.totalStake + stake;
  const hypotheticalPopularityRatio = hypotheticalTotalStake / hypotheticalPool;

  // Dynamic multiplier at bet time
  const dynamicMultiplier = calculatePenaltyMultiplier(hypotheticalPopularityRatio);

  // Check if would be contrarian (< 35% at bet time)
  const isContrarian = hypotheticalPopularityRatio < 0.35;
  const contrarianBonus = isContrarian ? 1.25 : 1.0;

  // Simplified base payout calculation
  // Assumes: user's outcome wins, stakes split proportionally
  // Base = (user stake / total winning stakes) × total pool
  // For estimation, assume current distribution
  const basePayout = hypotheticalPool > 0
    ? (stake / hypotheticalTotalStake) * hypotheticalPool
    : stake;

  // Estimated payout = base × dynamic multiplier
  const estimatedPayout = basePayout * dynamicMultiplier;

  // Max potential with contrarian bonus (if applicable and wins)
  const maxPotentialPayout = estimatedPayout * contrarianBonus;

  return {
    stake,
    popularityRatio: hypotheticalPopularityRatio,
    dynamicMultiplier,
    basePayout,
    estimatedPayout,
    isContrarian,
    contrarianBonus,
    maxPotentialPayout,
  };
}

/**
 * Get the value indicator for an outcome
 *
 * @param multiplier - Dynamic odds multiplier
 * @returns 'good' | 'fair' | 'poor'
 */
export function getValueIndicator(multiplier: number): 'good' | 'fair' | 'poor' {
  if (multiplier > 1.05) return 'good';
  if (multiplier < 0.95) return 'poor';
  return 'fair';
}

/**
 * Format multiplier for display
 *
 * @param multiplier - Multiplier value
 * @returns Formatted string with color coding
 */
export function formatMultiplier(multiplier: number): string {
  const indicator = getValueIndicator(multiplier);
  const formatted = `${multiplier.toFixed(2)}x`;

  return formatted;
}
