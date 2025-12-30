/**
 * Taste Match Service
 *
 * Calculate similarity scores between users based on their prediction overlap.
 *
 * Algorithm:
 * For each resolved market both users participated in:
 * - Same outcome: +1 point
 * - Same outcome AND both contrarian: +2 points (bonus)
 * - Opposite outcome: -1 point
 *
 * Score = Total Points / Markets in Common
 * Match if: Score > 0.6 AND Markets in Common ≥ 3
 */

import { db } from '@/lib/db';
import { tasteMatches, bets, markets, users } from '@/lib/db/schema';
import { eq, and, sql, desc, or } from 'drizzle-orm';

export interface TasteMatchScore {
  userId1: string;
  userId2: string;
  score: number;
  marketsInCommon: number;
  agreements: number;
  disagreements: number;
  contrarianAgreements: number;
  isMatch: boolean;
}

export interface TasteMatchProfile {
  userId: string;
  username: string;
  score: number;
  marketsInCommon: number;
}

const MATCH_THRESHOLD = 0.6;
const MIN_MARKETS_FOR_MATCH = 3;

/**
 * Calculate taste match score between two users
 *
 * @param userId1 - First user ID
 * @param userId2 - Second user ID
 * @returns Taste match score and details
 */
export async function calculateTasteMatch(
  userId1: string,
  userId2: string
): Promise<TasteMatchScore> {
  // Get all resolved markets
  const resolvedMarkets = await db
    .select()
    .from(markets)
    .where(eq(markets.status, 'resolved'));

  const resolvedMarketIds = resolvedMarkets.map((m) => m.id);

  // Get all bets from both users on resolved markets
  const user1Bets = await db
    .select()
    .from(bets)
    .where(
      and(
        eq(bets.userId, userId1),
        sql`${bets.marketId} IN ${resolvedMarketIds}`
      )
    );

  const user2Bets = await db
    .select()
    .from(bets)
    .where(
      and(
        eq(bets.userId, userId2),
        sql`${bets.marketId} IN ${resolvedMarketIds}`
      )
    );

  // Find markets both users bet on
  const user1MarketIds = new Set(user1Bets.map((b) => b.marketId));
  const user2MarketIds = new Set(user2Bets.map((b) => b.marketId));
  const commonMarketIds = [...user1MarketIds].filter((id) => user2MarketIds.has(id));

  // Calculate score
  let totalPoints = 0;
  let agreements = 0;
  let disagreements = 0;
  let contrarianAgreements = 0;

  for (const marketId of commonMarketIds) {
    const user1Bet = user1Bets.find((b) => b.marketId === marketId);
    const user2Bet = user2Bets.find((b) => b.marketId === marketId);

    if (!user1Bet || !user2Bet) continue;

    const sameOutcome = user1Bet.outcomeId === user2Bet.outcomeId;
    const bothContrarian = (user1Bet.isContrarian ?? false) && (user2Bet.isContrarian ?? false);

    if (sameOutcome) {
      if (bothContrarian) {
        // Same outcome AND both contrarian: +2 points
        totalPoints += 2;
        contrarianAgreements += 1;
      } else {
        // Same outcome: +1 point
        totalPoints += 1;
      }
      agreements += 1;
    } else {
      // Opposite outcome: -1 point
      totalPoints -= 1;
      disagreements += 1;
    }
  }

  // Calculate final score
  const marketsInCommon = commonMarketIds.length;
  const score = marketsInCommon > 0 ? totalPoints / marketsInCommon : 0;

  // Determine if it's a match
  const isMatch = score > MATCH_THRESHOLD && marketsInCommon >= MIN_MARKETS_FOR_MATCH;

  return {
    userId1,
    userId2,
    score,
    marketsInCommon,
    agreements,
    disagreements,
    contrarianAgreements,
    isMatch,
  };
}

/**
 * Store or update a taste match in the database
 *
 * @param matchScore - Taste match score
 */
export async function saveTasteMatch(matchScore: TasteMatchScore): Promise<void> {
  if (!matchScore.isMatch) {
    // Not a match - delete if exists
    await db
      .delete(tasteMatches)
      .where(
        or(
          and(
            eq(tasteMatches.user1Id, matchScore.userId1),
            eq(tasteMatches.user2Id, matchScore.userId2)
          ),
          and(
            eq(tasteMatches.user1Id, matchScore.userId2),
            eq(tasteMatches.user2Id, matchScore.userId1)
          )
        )
      );
    return;
  }

  // Check if match already exists (either direction)
  const existing = await db.query.tasteMatches.findFirst({
    where: or(
      and(
        eq(tasteMatches.user1Id, matchScore.userId1),
        eq(tasteMatches.user2Id, matchScore.userId2)
      ),
      and(
        eq(tasteMatches.user1Id, matchScore.userId2),
        eq(tasteMatches.user2Id, matchScore.userId1)
      )
    ),
  });

  if (existing) {
    // Update existing match
    await db
      .update(tasteMatches)
      .set({
        score: matchScore.score.toString(),
        marketsInCommon: matchScore.marketsInCommon,
      })
      .where(eq(tasteMatches.id, existing.id));
  } else {
    // Insert new match
    await db.insert(tasteMatches).values({
      user1Id: matchScore.userId1,
      user2Id: matchScore.userId2,
      score: matchScore.score.toString(),
      marketsInCommon: matchScore.marketsInCommon,
    });
  }
}

/**
 * Calculate and update taste matches for a user
 *
 * Called after a market is resolved to update all relevant matches.
 *
 * @param userId - User ID
 * @returns Number of matches found
 */
export async function updateUserTasteMatches(userId: string): Promise<number> {
  // Get all other users who have placed bets
  const otherUsers = await db
    .selectDistinct({ userId: bets.userId })
    .from(bets)
    .where(sql`${bets.userId} != ${userId}`);

  let matchCount = 0;

  for (const { userId: otherUserId } of otherUsers) {
    const matchScore = await calculateTasteMatch(userId, otherUserId);

    // Save or update match
    await saveTasteMatch(matchScore);

    if (matchScore.isMatch) {
      matchCount += 1;
    }
  }

  return matchCount;
}

/**
 * Get taste matches for a user
 *
 * @param userId - User ID
 * @param limit - Number of matches to return (default: 20)
 * @returns Array of taste match profiles
 */
export async function getUserTasteMatches(
  userId: string,
  limit: number = 20
): Promise<TasteMatchProfile[]> {
  // Find matches where user is either user1Id or user2Id
  const matches = await db.query.tasteMatches.findMany({
    where: or(
      eq(tasteMatches.user1Id, userId),
      eq(tasteMatches.user2Id, userId)
    ),
    orderBy: [desc(tasteMatches.score)],
    limit,
  });

  // Get user details for matched users
  const profiles: TasteMatchProfile[] = [];

  for (const match of matches) {
    const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
    const user = await db.query.users.findFirst({
      where: eq(users.id, otherUserId),
    });

    if (user) {
      profiles.push({
        userId: otherUserId,
        username: user.username,
        score: Number(match.score),
        marketsInCommon: match.marketsInCommon,
      });
    }
  }

  return profiles;
}

/**
 * Calculate taste match percentage for display
 *
 * @param score - Similarity score
 * @returns Percentage string (e.g., "85%")
 */
export function getTasteMatchPercentage(score: number): string {
  // Normalize score to 0-100%
  // Scores can be negative (all disagreements) or > 1 (all agreements with bonuses)
  // We'll map to a reasonable range for display
  const normalized = Math.max(0, Math.min(100, (score + 1) * 50));
  return `${Math.round(normalized)}%`;
}

/**
 * Get taste match strength label
 *
 * @param score - Similarity score
 * @returns Strength label
 */
export function getTasteMatchStrength(score: number): string {
  if (score > 1.5) return 'Exceptional';
  if (score > 1.0) return 'Strong';
  if (score > 0.8) return 'Good';
  if (score > MATCH_THRESHOLD) return 'Moderate';
  if (score > 0.3) return 'Weak';
  return 'Poor';
}

/**
 * Recalculate all taste matches for a market
 *
 * Called when a market is resolved to update matches for all participants.
 *
 * @param marketId - Market ID
 * @returns Number of users processed
 */
export async function recalculateTasteMatchesForMarket(marketId: string): Promise<number> {
  // Get all users who bet on this market
  const marketBets = await db
    .selectDistinct({ userId: bets.userId })
    .from(bets)
    .where(eq(bets.marketId, marketId));

  let processedCount = 0;

  for (const { userId: userId } of marketBets) {
    await updateUserTasteMatches(userId);
    processedCount += 1;
  }

  return processedCount;
}
