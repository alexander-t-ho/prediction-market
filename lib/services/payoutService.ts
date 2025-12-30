/**
 * Payout Service
 *
 * Calculates final payouts with all modifiers:
 * Final Payout = Base Payout × Dynamic Multiplier × Contrarian Bonus
 *
 * Where:
 * - Base Payout = (User Stake / Total Winning Stakes) × Total Pool
 * - Dynamic Multiplier = 0.7 to 1.3 (based on popularity at bet time)
 * - Contrarian Bonus = 1.25x if (was contrarian AND won), else 1.0x
 */

import { db } from '@/lib/db';
import { bets, markets, marketOutcomes } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { calculatePenaltyMultiplier } from './dynamicOddsService';

export interface PayoutCalculation {
  userId: string;
  betId: string;
  outcomeId: string;
  stake: number;
  won: boolean;
  basePayout: number;
  dynamicMultiplier: number;
  contrarianBonus: number;
  finalPayout: number;
  breakdown: {
    base: number;
    afterDynamic: number;
    afterContrarian: number;
  };
  flags: {
    wasBlindPeriodBet: boolean;
    wasContrarian: boolean;
  };
}

export interface PayoutSummary {
  totalPool: number;
  totalWinningStakes: number;
  totalPayouts: number;
  winnerCount: number;
  calculations: PayoutCalculation[];
}

/**
 * Calculate payouts for all bets in a resolved market
 *
 * @param marketId - Market ID (must be resolved)
 * @param winningOutcomeId - ID of the winning outcome
 * @returns Payout calculations for all bets
 */
export async function calculatePayouts(
  marketId: string,
  winningOutcomeId: string
): Promise<PayoutSummary> {
  // Get all bets for this market
  const allBets = await db
    .select()
    .from(bets)
    .where(eq(bets.marketId, marketId));

  if (allBets.length === 0) {
    return {
      totalPool: 0,
      totalWinningStakes: 0,
      totalPayouts: 0,
      winnerCount: 0,
      calculations: [],
    };
  }

  // Calculate total pool
  const totalPool = allBets.reduce((sum, bet) => sum + Number(bet.stake), 0);

  // Filter winning bets
  const winningBets = allBets.filter((bet) => bet.outcomeId === winningOutcomeId);
  const totalWinningStakes = winningBets.reduce((sum, bet) => sum + Number(bet.stake), 0);

  // Edge case: No winners (shouldn't happen, but handle gracefully)
  if (winningBets.length === 0) {
    // Return stakes to all bettors
    return {
      totalPool,
      totalWinningStakes: 0,
      totalPayouts: totalPool,
      winnerCount: 0,
      calculations: allBets.map((bet) => ({
        userId: bet.userId,
        betId: bet.id,
        outcomeId: bet.outcomeId,
        stake: Number(bet.stake),
        won: false,
        basePayout: Number(bet.stake), // Stake returned
        dynamicMultiplier: 1.0,
        contrarianBonus: 1.0,
        finalPayout: Number(bet.stake),
        breakdown: {
          base: Number(bet.stake),
          afterDynamic: Number(bet.stake),
          afterContrarian: Number(bet.stake),
        },
        flags: {
          wasBlindPeriodBet: bet.placedDuringBlindPeriod ?? false,
          wasContrarian: bet.isContrarian ?? false,
        },
      })),
    };
  }

  // Calculate payouts for each bet
  const calculations: PayoutCalculation[] = allBets.map((bet) => {
    const stake = Number(bet.stake);
    const won = bet.outcomeId === winningOutcomeId;

    if (!won) {
      // Losing bet: no payout
      return {
        userId: bet.userId,
        betId: bet.id,
        outcomeId: bet.outcomeId,
        stake,
        won: false,
        basePayout: 0,
        dynamicMultiplier: 1.0,
        contrarianBonus: 1.0,
        finalPayout: 0,
        breakdown: {
          base: 0,
          afterDynamic: 0,
          afterContrarian: 0,
        },
        flags: {
          wasBlindPeriodBet: bet.placedDuringBlindPeriod ?? false,
          wasContrarian: bet.isContrarian ?? false,
        },
      };
    }

    // Winning bet: calculate payout

    // 1. Base payout: proportional share of total pool
    const basePayout = (stake / totalWinningStakes) * totalPool;

    // 2. Dynamic multiplier: from popularity at bet time
    // Use stored multiplier if available, otherwise calculate from popularity ratio
    let dynamicMultiplier = bet.dynamicOddsMultiplier
      ? Number(bet.dynamicOddsMultiplier)
      : calculatePenaltyMultiplier(Number(bet.popularityRatioAtBet ?? 0.5));

    // 3. Contrarian bonus: 1.25x if was contrarian AND won
    const wasContrarian = bet.isContrarian ?? false;
    const contrarianBonus = wasContrarian ? 1.25 : 1.0;

    // 4. Calculate final payout with all modifiers
    const afterDynamic = basePayout * dynamicMultiplier;
    const finalPayout = afterDynamic * contrarianBonus;

    return {
      userId: bet.userId,
      betId: bet.id,
      outcomeId: bet.outcomeId,
      stake,
      won: true,
      basePayout,
      dynamicMultiplier,
      contrarianBonus,
      finalPayout,
      breakdown: {
        base: basePayout,
        afterDynamic,
        afterContrarian: finalPayout,
      },
      flags: {
        wasBlindPeriodBet: bet.placedDuringBlindPeriod ?? false,
        wasContrarian,
      },
    };
  });

  // Calculate total payouts
  const totalPayouts = calculations.reduce((sum, calc) => sum + calc.finalPayout, 0);
  const winnerCount = calculations.filter((calc) => calc.won).length;

  return {
    totalPool,
    totalWinningStakes,
    totalPayouts,
    winnerCount,
    calculations,
  };
}

/**
 * Preview potential payout for a hypothetical bet
 *
 * Shows what a user would win if:
 * - They place this bet
 * - Their outcome wins
 * - No other bets are placed (distribution stays same)
 *
 * @param marketId - Market ID
 * @param outcomeId - Outcome to bet on
 * @param stake - Stake amount
 * @returns Estimated payout details
 */
export async function previewPayout(
  marketId: string,
  outcomeId: string,
  stake: number
): Promise<{
  estimatedPayout: number;
  dynamicMultiplier: number;
  isContrarian: boolean;
  contrarianBonus: number;
  maxPayout: number;
  breakdown: string;
}> {
  // Get current betting distribution
  const allBets = await db
    .select()
    .from(bets)
    .where(eq(bets.marketId, marketId));

  // Calculate current pool
  const currentPool = allBets.reduce((sum, bet) => sum + Number(bet.stake), 0);
  const hypotheticalPool = currentPool + stake;

  // Calculate hypothetical winning stakes (if this outcome wins)
  const currentWinningStakes = allBets
    .filter((bet) => bet.outcomeId === outcomeId)
    .reduce((sum, bet) => sum + Number(bet.stake), 0);
  const hypotheticalWinningStakes = currentWinningStakes + stake;

  // Calculate popularity ratio at bet time
  const hypotheticalOutcomeStakes = currentWinningStakes + stake;
  const popularityRatio = hypotheticalPool > 0
    ? hypotheticalOutcomeStakes / hypotheticalPool
    : 0.5;

  // Dynamic multiplier
  const dynamicMultiplier = calculatePenaltyMultiplier(popularityRatio);

  // Contrarian check
  const isContrarian = popularityRatio < 0.35;
  const contrarianBonus = isContrarian ? 1.25 : 1.0;

  // Base payout (proportional share)
  const basePayout = (stake / hypotheticalWinningStakes) * hypotheticalPool;

  // Estimated payout
  const estimatedPayout = basePayout * dynamicMultiplier;
  const maxPayout = estimatedPayout * contrarianBonus;

  // Breakdown string
  const breakdown = `Base: T$${basePayout.toFixed(2)} × Dynamic: ${dynamicMultiplier.toFixed(2)}x${
    isContrarian ? ` × Contrarian: ${contrarianBonus}x` : ''
  } = T$${maxPayout.toFixed(2)}`;

  return {
    estimatedPayout,
    dynamicMultiplier,
    isContrarian,
    contrarianBonus,
    maxPayout,
    breakdown,
  };
}

/**
 * Get payout for a specific bet (after resolution)
 *
 * @param betId - Bet ID
 * @returns Payout calculation for this bet, or null if market not resolved
 */
export async function getBetPayout(betId: string): Promise<PayoutCalculation | null> {
  // Get bet
  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
  });

  if (!bet) {
    throw new Error(`Bet ${betId} not found`);
  }

  // Get market
  const market = await db.query.markets.findFirst({
    where: eq(markets.id, bet.marketId),
  });

  if (!market || market.status !== 'resolved' || !market.resolvedOutcomeId) {
    return null; // Market not resolved yet
  }

  // Calculate payouts for the market
  const payoutSummary = await calculatePayouts(market.id, market.resolvedOutcomeId);

  // Find this bet's payout
  const betPayout = payoutSummary.calculations.find((calc) => calc.betId === betId);

  return betPayout ?? null;
}

/**
 * Format payout breakdown for display
 *
 * @param calculation - Payout calculation
 * @returns Human-readable breakdown
 */
export function formatPayoutBreakdown(calculation: PayoutCalculation): string {
  if (!calculation.won) {
    return 'Lost - No payout';
  }

  const parts: string[] = [];
  parts.push(`Base: T$${calculation.breakdown.base.toFixed(2)}`);
  parts.push(`Dynamic Multiplier: ${calculation.dynamicMultiplier.toFixed(2)}x`);

  if (calculation.contrarianBonus > 1.0) {
    parts.push(`Contrarian Bonus: ${calculation.contrarianBonus}x`);
  }

  parts.push(`Final: T$${calculation.finalPayout.toFixed(2)}`);

  return parts.join(' → ');
}
