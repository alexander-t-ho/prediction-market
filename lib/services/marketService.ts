// Market Service

import { db } from '../db';
import { markets, marketOutcomes, bets, users } from '../db/schema';
import type { NewMarket, NewMarketOutcome, Market } from '../db/schema';
import { eq, and, gte, lte, sql, desc, asc, like, or } from 'drizzle-orm';
import type {
  MarketFilters,
  MarketSortOption,
  MarketWithOutcomes,
  MarketWithStats,
} from '../types/market';

/**
 * Create a new market with outcomes
 */
export async function createMarket(
  marketData: Omit<NewMarket, 'id' | 'createdAt' | 'updatedAt'>,
  outcomes: Omit<NewMarketOutcome, 'id' | 'marketId' | 'createdAt'>[]
): Promise<MarketWithOutcomes> {
  // Insert market
  const [market] = await db
    .insert(markets)
    .values(marketData)
    .returning();

  // Insert outcomes
  const insertedOutcomes = await db
    .insert(marketOutcomes)
    .values(
      outcomes.map((outcome, index) => ({
        ...outcome,
        marketId: market.id,
        sortOrder: outcome.sortOrder ?? index,
      }))
    )
    .returning();

  return {
    ...market,
    outcomes: insertedOutcomes as any,
  } as unknown as MarketWithOutcomes;
}

/**
 * Get market by ID
 */
export async function getMarketById(
  marketId: string,
  includeOutcomes: boolean = true
): Promise<MarketWithOutcomes | null> {
  const market = await db.query.markets.findFirst({
    where: eq(markets.id, marketId),
    with: includeOutcomes
      ? {
          outcomes: {
            orderBy: [asc(marketOutcomes.sortOrder)],
          },
        }
      : undefined,
  });

  return market as unknown as MarketWithOutcomes | null;
}

/**
 * Get market with betting statistics
 */
export async function getMarketWithStats(
  marketId: string,
  userId?: string
): Promise<MarketWithStats | null> {
  const market = await getMarketById(marketId);
  if (!market) return null;

  // Get betting distribution for each outcome
  const outcomesWithStats = await Promise.all(
    market.outcomes.map(async (outcome) => {
      const stats = await db
        .select({
          bet_count: sql<number>`cast(count(*) as int)`,
          total_stake: sql<string>`coalesce(sum(${bets.stake}), 0)`,
        })
        .from(bets)
        .where(eq(bets.outcomeId, outcome.id));

      return {
        ...outcome,
        bet_count: stats[0]?.bet_count || 0,
        total_stake: parseFloat(stats[0]?.total_stake || '0'),
        percentage: 0, // Will calculate after we have total
      };
    })
  );

  // Calculate total pool and percentages
  const total_pool = outcomesWithStats.reduce(
    (sum, o) => sum + o.total_stake,
    0
  );
  const total_bets = outcomesWithStats.reduce((sum, o) => sum + o.bet_count, 0);

  outcomesWithStats.forEach((outcome) => {
    outcome.percentage =
      total_pool > 0 ? (outcome.total_stake / total_pool) * 100 : 0;
  });

  // Get user's bet if userId provided
  let user_bet;
  if (userId) {
    const userBet: any = await db.query.bets.findFirst({
      where: and(eq(bets.marketId, marketId), eq(bets.userId, userId)),
      with: {
        outcome: true,
      },
    });

    if (userBet) {
      user_bet = {
        outcome_id: userBet.outcomeId,
        stake: parseFloat(userBet.stake),
        outcome_label: userBet.outcome.label,
      };
    }
  }

  return {
    ...market,
    outcomes: outcomesWithStats,
    total_pool,
    total_bets,
    user_bet,
  };
}

/**
 * Get markets with filters and sorting
 */
export async function getMarkets(
  filters: MarketFilters = {},
  sort: MarketSortOption = 'newest',
  limit: number = 20,
  offset: number = 0
): Promise<Market[]> {
  const conditions = [];

  // Status filter
  if (filters.status && filters.status !== 'all') {
    conditions.push(eq(markets.status, filters.status));
  }

  // Category filter
  if (filters.category && filters.category !== 'all') {
    conditions.push(eq(markets.category, filters.category));
  }

  // Closing soon filter (next 24 hours)
  if (filters.closingSoon) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    conditions.push(
      and(gte(markets.lockAt, now), lte(markets.lockAt, tomorrow))
    );
  }

  // Search filter
  if (filters.search) {
    conditions.push(
      or(
        like(markets.title, `%${filters.search}%`),
        like(markets.movieTitle, `%${filters.search}%`)
      )
    );
  }

  // Build where clause
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Determine sort order
  let orderBy;
  switch (sort) {
    case 'closing_soon':
      orderBy = [asc(markets.lockAt)];
      break;
    case 'most_pool':
      // This would require a join with bets, skipping for now
      orderBy = [desc(markets.createdAt)];
      break;
    case 'newest':
    default:
      orderBy = [desc(markets.createdAt)];
      break;
  }

  return db.query.markets.findMany({
    where: whereClause,
    orderBy,
    limit,
    offset,
  });
}

/**
 * Update market status
 */
export async function updateMarketStatus(
  marketId: string,
  newStatus: Market['status']
): Promise<Market | null> {
  const [updated] = await db
    .update(markets)
    .set({
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(markets.id, marketId))
    .returning();

  return updated || null;
}

/**
 * Update market with resolution data
 */
export async function resolveMarket(
  marketId: string,
  actualValue: number,
  winningOutcomeId: string
): Promise<Market | null> {
  const [updated] = await db
    .update(markets)
    .set({
      status: 'resolved',
      actualValue: actualValue.toString(),
      resolvedOutcomeId: winningOutcomeId,
      resolutionAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(markets.id, marketId))
    .returning();

  return updated || null;
}

/**
 * Check if market exists for movie and threshold
 */
export async function marketExists(
  movieId: string,
  category: Market['category'],
  marketType: Market['marketType'],
  thresholdValue?: number
): Promise<boolean> {
  const conditions = [
    eq(markets.movieId, movieId),
    eq(markets.category, category),
    eq(markets.marketType, marketType),
  ];

  if (thresholdValue !== undefined) {
    conditions.push(eq(markets.threshold, thresholdValue.toString()));
  }

  const existing = await db.query.markets.findFirst({
    where: and(...conditions),
  });

  return !!existing;
}

/**
 * Get markets closing soon (next 24 hours)
 */
export async function getMarketsClosingSoon(limit: number = 10): Promise<Market[]> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return db.query.markets.findMany({
    where: and(
      gte(markets.lockAt, now),
      lte(markets.lockAt, tomorrow),
      or(eq(markets.status, 'blind'), eq(markets.status, 'open'))
    ),
    orderBy: [asc(markets.lockAt)],
    limit,
  });
}

/**
 * Get user's proposed markets
 */
export async function getUserProposedMarkets(userId: string): Promise<Market[]> {
  return db.query.markets.findMany({
    where: and(eq(markets.proposedBy, userId), eq(markets.isUserProposed, true)),
    orderBy: [desc(markets.createdAt)],
  });
}

/**
 * Transition markets from blind to open
 */
export async function transitionBlindToOpen(): Promise<number> {
  const now = new Date();

  const result = await db
    .update(markets)
    .set({
      status: 'open',
      updatedAt: now,
    })
    .where(
      and(eq(markets.status, 'blind'), lte(markets.blindPeriodEndsAt, now))
    )
    .returning();

  return result.length;
}

/**
 * Lock markets that have reached their close time
 */
export async function lockClosedMarkets(): Promise<number> {
  const now = new Date();

  const result = await db
    .update(markets)
    .set({
      status: 'locked',
      updatedAt: now,
    })
    .where(and(eq(markets.status, 'open'), lte(markets.lockAt, now)))
    .returning();

  return result.length;
}
