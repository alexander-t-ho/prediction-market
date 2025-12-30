// Bet Service

import { db } from '../db';
import { bets, markets, marketOutcomes, users } from '../db/schema';
import type { NewBet, Bet } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type {
  PlaceBetData,
  PlaceBetResult,
  BettingDistribution,
  OutcomeDistribution,
  BetWithDetails,
  BetValidationError,
  BET_CONSTRAINTS,
} from '../types/bet';
import { calculatePenaltyMultiplier } from './dynamicOddsService';
import { awardPlacementPoints } from './trendsetterService';

const MIN_STAKE = 1;
const MAX_STAKE = 50;

/**
 * Validate bet placement
 */
async function validateBet(
  data: PlaceBetData
): Promise<BetValidationError | null> {
  // Validate stake amount
  if (data.stake < MIN_STAKE) {
    return {
      field: 'stake',
      message: `Minimum stake is T$${MIN_STAKE}`,
    };
  }

  if (data.stake > MAX_STAKE) {
    return {
      field: 'stake',
      message: `Maximum stake is T$${MAX_STAKE}`,
    };
  }

  // Get user balance
  const user = await db.query.users.findFirst({
    where: eq(users.id, data.user_id),
  });

  if (!user) {
    return {
      message: 'User not found',
    };
  }

  const balance = parseFloat(user.balance);
  if (balance < data.stake) {
    return {
      field: 'balance',
      message: `Insufficient balance. You have T$${balance.toFixed(2)}`,
    };
  }

  // Check market exists and is accepting bets
  const market = await db.query.markets.findFirst({
    where: eq(markets.id, data.market_id),
  });

  if (!market) {
    return {
      field: 'market',
      message: 'Market not found',
    };
  }

  if (market.status !== 'blind' && market.status !== 'open') {
    return {
      field: 'market',
      message: 'Market is not accepting bets',
    };
  }

  // Check outcome exists
  const outcome = await db.query.marketOutcomes.findFirst({
    where: eq(marketOutcomes.id, data.outcome_id),
  });

  if (!outcome) {
    return {
      field: 'outcome',
      message: 'Outcome not found',
    };
  }

  if (outcome.marketId !== data.market_id) {
    return {
      field: 'outcome',
      message: 'Outcome does not belong to this market',
    };
  }

  // Check if user already bet on this market
  const existingBet = await db.query.bets.findFirst({
    where: and(
      eq(bets.userId, data.user_id),
      eq(bets.marketId, data.market_id)
    ),
  });

  if (existingBet) {
    return {
      field: 'market',
      message: 'You have already placed a bet on this market',
    };
  }

  return null;
}

/**
 * Calculate popularity ratio for contrarian detection
 */
async function calculatePopularityRatio(
  marketId: string,
  outcomeId: string
): Promise<number> {
  // Get total stakes for all outcomes
  const allBets = await db
    .select({
      outcomeId: bets.outcomeId,
      total: sql<string>`sum(${bets.stake})`,
    })
    .from(bets)
    .where(eq(bets.marketId, marketId))
    .groupBy(bets.outcomeId);

  const totalPool = allBets.reduce(
    (sum, bet) => sum + parseFloat(bet.total),
    0
  );

  if (totalPool === 0) {
    return 0; // No bets yet
  }

  const outcomeBet = allBets.find((bet) => bet.outcomeId === outcomeId);
  const outcomeStake = outcomeBet ? parseFloat(outcomeBet.total) : 0;

  return outcomeStake / totalPool;
}

/**
 * Determine if bet is contrarian (choosing unpopular outcome)
 * Updated to match Phase 3 threshold: <35%
 */
function isContrarian(popularityRatio: number): boolean {
  // Contrarian if choosing outcome with <35% of stakes
  return popularityRatio < 0.35;
}

/**
 * Place a bet
 */
export async function placeBet(
  data: PlaceBetData
): Promise<PlaceBetResult> {
  // Validate bet
  const error = await validateBet(data);
  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  try {
    // Get market to check if in blind period
    const market = await db.query.markets.findFirst({
      where: eq(markets.id, data.market_id),
    });

    const isBlindPeriod = market!.status === 'blind';

    // Calculate popularity ratio
    const popularityRatio = await calculatePopularityRatio(
      data.market_id,
      data.outcome_id
    );

    const isContrarianBet = isContrarian(popularityRatio);

    // Calculate dynamic odds multiplier at bet time
    const dynamicMultiplier = calculatePenaltyMultiplier(popularityRatio);

    // Insert bet
    const [bet] = await db
      .insert(bets)
      .values({
        userId: data.user_id,
        marketId: data.market_id,
        outcomeId: data.outcome_id,
        stake: data.stake.toString(),
        placedDuringBlindPeriod: isBlindPeriod,
        popularityRatioAtBet: popularityRatio.toFixed(4),
        isContrarian: isContrarianBet,
        dynamicOddsMultiplier: dynamicMultiplier.toFixed(4),
      })
      .returning();

    // Deduct stake from user balance
    const user = await db.query.users.findFirst({
      where: eq(users.id, data.user_id),
    });

    const newBalance = parseFloat(user!.balance) - data.stake;

    await db
      .update(users)
      .set({
        balance: newBalance.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(users.id, data.user_id));

    // Award trendsetter points for placement
    await awardPlacementPoints(
      data.user_id,
      bet.id,
      isBlindPeriod,
      isContrarianBet
    );

    return {
      success: true,
      bet: bet as any,
      new_balance: newBalance,
    };
  } catch (err) {
    console.error('Error placing bet:', err);
    return {
      success: false,
      error: 'Failed to place bet. Please try again.',
    };
  }
}

/**
 * Get betting distribution for a market
 */
export async function getBettingDistribution(
  marketId: string
): Promise<BettingDistribution> {
  // Get market to check if blind period
  const market = await db.query.markets.findFirst({
    where: eq(markets.id, marketId),
  });

  const isBlindPeriod = market?.status === 'blind';

  // Get all outcomes
  const outcomes = await db.query.marketOutcomes.findMany({
    where: eq(marketOutcomes.marketId, marketId),
  });

  // Get betting stats for each outcome
  const outcomeDistributions: OutcomeDistribution[] = await Promise.all(
    outcomes.map(async (outcome) => {
      const stats = await db
        .select({
          bet_count: sql<number>`cast(count(*) as int)`,
          total_stake: sql<string>`coalesce(sum(${bets.stake}), 0)`,
        })
        .from(bets)
        .where(eq(bets.outcomeId, outcome.id));

      return {
        outcome_id: outcome.id,
        outcome_label: outcome.label,
        bet_count: stats[0]?.bet_count || 0,
        total_stake: parseFloat(stats[0]?.total_stake || '0'),
        percentage: 0, // Will calculate after
      };
    })
  );

  // Calculate total pool
  const totalPool = outcomeDistributions.reduce(
    (sum, dist) => sum + dist.total_stake,
    0
  );
  const totalBets = outcomeDistributions.reduce(
    (sum, dist) => sum + dist.bet_count,
    0
  );

  // Calculate percentages
  outcomeDistributions.forEach((dist) => {
    dist.percentage = totalPool > 0 ? (dist.total_stake / totalPool) * 100 : 0;
  });

  return {
    outcomes: outcomeDistributions,
    total_pool: totalPool,
    total_bets: totalBets,
    is_blind_period: isBlindPeriod || false,
  };
}

/**
 * Get user's bets
 */
export async function getUserBets(userId: string): Promise<BetWithDetails[]> {
  const userBets = await db.query.bets.findMany({
    where: eq(bets.userId, userId),
    with: {
      market: true,
      outcome: true,
    },
    orderBy: (bets, { desc }) => [desc(bets.createdAt)],
  });

  return userBets.map((bet: any) => ({
    id: bet.id,
    user_id: bet.userId,
    market_id: bet.marketId,
    outcome_id: bet.outcomeId,
    stake: parseFloat(bet.stake),
    placed_at: bet.createdAt,
    is_blind_period_bet: bet.placedDuringBlindPeriod,
    popularity_ratio_at_bet: parseFloat(bet.popularityRatioAtBet || '0'),
    is_contrarian: bet.isContrarian,
    payout: bet.actualPayout ? parseFloat(bet.actualPayout) : undefined,
    created_at: bet.createdAt,
    market_title: bet.market.title,
    market_status: bet.market.status,
    outcome_label: bet.outcome.label,
    movie_title: bet.market.movieTitle,
    movie_poster_path: bet.market.movieId || undefined,
  }));
}

/**
 * Get market bets (filtered by blind period visibility)
 */
export async function getMarketBets(
  marketId: string,
  showAll: boolean = false
): Promise<Bet[]> {
  const market = await db.query.markets.findFirst({
    where: eq(markets.id, marketId),
  });

  // During blind period, don't show bets unless showAll is true
  if (market?.status === 'blind' && !showAll) {
    return [];
  }

  return db.query.bets.findMany({
    where: eq(bets.marketId, marketId),
    orderBy: (bets, { desc }) => [desc(bets.createdAt)],
  });
}

/**
 * Check if user has bet on market
 */
export async function userHasBet(
  userId: string,
  marketId: string
): Promise<boolean> {
  const bet = await db.query.bets.findFirst({
    where: and(eq(bets.userId, userId), eq(bets.marketId, marketId)),
  });

  return !!bet;
}
