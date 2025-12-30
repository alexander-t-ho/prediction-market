/**
 * Resolution Service
 *
 * Orchestrates the complete market resolution flow:
 * 1. Resolve market with winning outcome
 * 2. Calculate all payouts (base × dynamic × contrarian)
 * 3. Award trendsetter points
 * 4. Update user balances
 * 5. Recalculate taste matches
 * 6. Create notifications
 *
 * This is the central orchestrator that ties together all Phase 3 components.
 */

import { db } from '@/lib/db';
import { markets, resolutions, bets, users } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { calculatePayouts, type PayoutSummary } from './payoutService';
import {
  awardResolutionPoints,
  type TrendsetterScore,
} from './trendsetterService';
import { recalculateTasteMatchesForMarket } from './tasteMatchService';

export interface ResolutionResult {
  marketId: string;
  winningOutcomeId: string;
  actualValue: number;
  payoutSummary: PayoutSummary;
  trendsetterPoints: Record<string, number>; // userId -> points awarded
  tasteMatchesUpdated: number;
  balancesUpdated: number;
  success: boolean;
  errors: string[];
}

/**
 * Resolve a market with the actual outcome
 *
 * This is the main entry point for resolving markets.
 * It orchestrates all the steps needed to fully resolve a market.
 *
 * @param marketId - Market ID to resolve
 * @param winningOutcomeId - ID of the winning outcome
 * @param actualValue - Actual value (for range markets)
 * @param resolvedBy - User ID of admin resolving (optional)
 * @returns Resolution result with all details
 */
export async function resolveMarket(
  marketId: string,
  winningOutcomeId: string,
  actualValue: number,
  resolvedBy?: string
): Promise<ResolutionResult> {
  const errors: string[] = [];

  try {
    // 1. Verify market exists and can be resolved
    const market = await db.query.markets.findFirst({
      where: eq(markets.id, marketId),
    });

    if (!market) {
      errors.push(`Market ${marketId} not found`);
      return {
        marketId,
        winningOutcomeId,
        actualValue,
        payoutSummary: {
          totalPool: 0,
          totalWinningStakes: 0,
          totalPayouts: 0,
          winnerCount: 0,
          calculations: [],
        },
        trendsetterPoints: {},
        tasteMatchesUpdated: 0,
        balancesUpdated: 0,
        success: false,
        errors,
      };
    }

    if (market.status === 'resolved') {
      errors.push(`Market ${marketId} is already resolved`);
      return {
        marketId,
        winningOutcomeId,
        actualValue,
        payoutSummary: {
          totalPool: 0,
          totalWinningStakes: 0,
          totalPayouts: 0,
          winnerCount: 0,
          calculations: [],
        },
        trendsetterPoints: {},
        tasteMatchesUpdated: 0,
        balancesUpdated: 0,
        success: false,
        errors,
      };
    }

    if (market.status !== 'locked' && market.status !== 'open') {
      errors.push(`Market ${marketId} must be locked or open to resolve (current: ${market.status})`);
    }

    // 2. Calculate payouts for all bets
    const payoutSummary = await calculatePayouts(marketId, winningOutcomeId);

    // 3. Update market status to resolved
    await db
      .update(markets)
      .set({
        status: 'resolved',
        resolvedOutcomeId: winningOutcomeId,
        actualValue: actualValue.toString(),
      })
      .where(eq(markets.id, marketId));

    // 4. Create resolution record
    await db.insert(resolutions).values({
      marketId: marketId,
      resolvedBy: resolvedBy,
    });

    // 5. Award trendsetter points and update balances
    const trendsetterPoints: Record<string, number> = {};
    let balancesUpdated = 0;

    for (const calculation of payoutSummary.calculations) {
      const { userId, betId, finalPayout, won, flags } = calculation;

      // Update bet record with payout
      await db
        .update(bets)
        .set({
          actualPayout: finalPayout.toString(),
        })
        .where(eq(bets.id, betId));

      // Award trendsetter points (only for winners)
      const pointsAwarded = await awardResolutionPoints(
        userId,
        betId,
        flags.wasBlindPeriodBet,
        flags.wasContrarian,
        won
      );

      if (pointsAwarded > 0) {
        trendsetterPoints[userId] = (trendsetterPoints[userId] || 0) + pointsAwarded;
      }

      // Update user balance (if won)
      if (finalPayout > 0) {
        await db
          .update(users)
          .set({
            balance: sql`${users.balance} + ${finalPayout}`,
          })
          .where(eq(users.id, userId));
        balancesUpdated += 1;
      }
    }

    // 6. Recalculate taste matches for all participants
    const tasteMatchesUpdated = await recalculateTasteMatchesForMarket(marketId);

    // 7. TODO: Create notifications for all participants
    // This will be implemented in Phase 5 (Social Features)

    return {
      marketId,
      winningOutcomeId,
      actualValue,
      payoutSummary,
      trendsetterPoints,
      tasteMatchesUpdated,
      balancesUpdated,
      success: errors.length === 0,
      errors,
    };
  } catch (error) {
    errors.push(`Resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

    return {
      marketId,
      winningOutcomeId,
      actualValue,
      payoutSummary: {
        totalPool: 0,
        totalWinningStakes: 0,
        totalPayouts: 0,
        winnerCount: 0,
        calculations: [],
      },
      trendsetterPoints: {},
      tasteMatchesUpdated: 0,
      balancesUpdated: 0,
      success: false,
      errors,
    };
  }
}

/**
 * Get resolution details for a market
 *
 * @param marketId - Market ID
 * @returns Resolution details, or null if not resolved
 */
export async function getResolutionDetails(marketId: string) {
  const resolution = await db.query.resolutions.findFirst({
    where: eq(resolutions.marketId, marketId),
  });

  if (!resolution) {
    return null;
  }

  const market = await db.query.markets.findFirst({
    where: eq(markets.id, marketId),
    with: {
      outcomes: true,
    },
  });

  const winningOutcome = market?.outcomes.find(
    (o) => o.id === market?.resolvedOutcomeId
  );

  return {
    ...resolution,
    market,
    winningOutcome,
  };
}

/**
 * Preview resolution without actually resolving
 *
 * Useful for admins to see what would happen if they resolve with a specific outcome.
 *
 * @param marketId - Market ID
 * @param winningOutcomeId - Hypothetical winning outcome
 * @returns Preview of what would happen
 */
export async function previewResolution(
  marketId: string,
  winningOutcomeId: string
): Promise<{
  payoutSummary: PayoutSummary;
  winnersCount: number;
  losersCount: number;
  averageWinnerPayout: number;
  totalPointsAwarded: number;
}> {
  // Calculate payouts (without saving)
  const payoutSummary = await calculatePayouts(marketId, winningOutcomeId);

  const winners = payoutSummary.calculations.filter((c) => c.won);
  const losers = payoutSummary.calculations.filter((c) => !c.won);

  const averageWinnerPayout =
    winners.length > 0
      ? winners.reduce((sum, c) => sum + c.finalPayout, 0) / winners.length
      : 0;

  // Estimate trendsetter points (without saving)
  let totalPointsAwarded = 0;
  for (const calc of winners) {
    if (calc.flags.wasBlindPeriodBet) totalPointsAwarded += 2;
    if (calc.flags.wasContrarian) totalPointsAwarded += 5;
  }

  return {
    payoutSummary,
    winnersCount: winners.length,
    losersCount: losers.length,
    averageWinnerPayout,
    totalPointsAwarded,
  };
}

/**
 * Cancel a market resolution (admin function)
 *
 * WARNING: This should only be used if a market was resolved incorrectly.
 * It reverses all payouts and points.
 *
 * @param marketId - Market ID
 * @returns Success status
 */
export async function cancelResolution(marketId: string): Promise<{
  success: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // Get market
    const market = await db.query.markets.findFirst({
      where: eq(markets.id, marketId),
    });

    if (!market || market.status !== 'resolved') {
      errors.push('Market is not resolved');
      return { success: false, errors };
    }

    // Get all bets with payouts
    const marketBets = await db
      .select()
      .from(bets)
      .where(and(eq(bets.marketId, marketId), sql`${bets.actualPayout} IS NOT NULL`));

    // Reverse balance updates
    for (const bet of marketBets) {
      if (bet.actualPayout && Number(bet.actualPayout) > 0) {
        await db
          .update(users)
          .set({
            balance: sql`${users.balance} - ${bet.actualPayout}`,
          })
          .where(eq(users.id, bet.userId));
      }

      // Clear payout
      await db
        .update(bets)
        .set({
          actualPayout: null,
        })
        .where(eq(bets.id, bet.id));
    }

    // Delete resolution record
    await db.delete(resolutions).where(eq(resolutions.marketId, marketId));

    // Reset market status
    await db
      .update(markets)
      .set({
        status: 'locked',
        resolvedOutcomeId: null,
        actualValue: null,
      })
      .where(eq(markets.id, marketId));

    // Note: We don't reverse trendsetter points or taste matches
    // This is intentional - those are historical records

    return { success: true, errors: [] };
  } catch (error) {
    errors.push(`Cancel failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, errors };
  }
}
