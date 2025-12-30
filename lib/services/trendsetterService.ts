/**
 * Trendsetter Service
 *
 * Track and reward early, contrarian, and correct predictions.
 *
 * Point System:
 * - Blind period bet (placed): +1 point
 * - Contrarian bet (placed): +2 points
 * - Correct blind period bet (resolution): +2 points
 * - Correct contrarian bet (resolution): +5 points
 *
 * Example:
 * - Bet during blind period on contrarian position: +1 + +2 = +3 points
 * - If correct: +3 + +2 (blind) + +5 (contrarian) = +10 points total
 * - If wrong: only +3 points (no correctness bonuses)
 */

import { db } from '@/lib/db';
import { trendsetterEvents, bets, users } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

export enum TrendsetterEventType {
  BLIND_BET = 'blind_bet',
  CONTRARIAN_BET = 'contrarian_bet',
  CORRECT_BLIND = 'correct_blind',
  CORRECT_CONTRARIAN = 'correct_contrarian',
}

export interface TrendsetterEvent {
  id: string;
  userId: string;
  betId: string;
  eventType: TrendsetterEventType;
  points: number;
  createdAt: Date;
}

export interface TrendsetterScore {
  userId: string;
  totalPoints: number;
  blindBets: number;
  contrarianBets: number;
  correctBlindBets: number;
  correctContrarianBets: number;
  rank?: number;
}

export interface TrendsetterLeaderboardEntry {
  userId: string;
  username: string;
  totalPoints: number;
  rank: number;
  badges: string[];
}

/**
 * Record a trendsetter event
 *
 * @param userId - User ID
 * @param betId - Bet ID
 * @param eventType - Type of event
 * @param points - Points to award
 */
export async function recordEvent(
  userId: string,
  betId: string,
  eventType: TrendsetterEventType,
  points: number
): Promise<void> {
  // Get the bet to find the marketId
  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
  });

  if (!bet) {
    throw new Error(`Bet ${betId} not found`);
  }

  await db.insert(trendsetterEvents).values({
    userId: userId,
    betId: betId,
    marketId: bet.marketId,
    eventType: eventType,
    points,
  });
}

/**
 * Award points at bet placement
 *
 * Called when a user places a bet.
 * Awards points for:
 * - Blind period bets (+1)
 * - Contrarian bets (+2)
 *
 * @param userId - User ID
 * @param betId - Bet ID
 * @param isBlindPeriodBet - Whether bet was placed during blind period
 * @param isContrarian - Whether bet is contrarian
 * @returns Total points awarded
 */
export async function awardPlacementPoints(
  userId: string,
  betId: string,
  isBlindPeriodBet: boolean,
  isContrarian: boolean
): Promise<number> {
  let totalPoints = 0;

  if (isBlindPeriodBet) {
    await recordEvent(userId, betId, TrendsetterEventType.BLIND_BET, 1);
    totalPoints += 1;
  }

  if (isContrarian) {
    await recordEvent(userId, betId, TrendsetterEventType.CONTRARIAN_BET, 2);
    totalPoints += 2;
  }

  return totalPoints;
}

/**
 * Award points at market resolution (for winning bets)
 *
 * Called when a market is resolved.
 * Awards additional points for correct predictions:
 * - Correct blind period bet (+2)
 * - Correct contrarian bet (+5)
 *
 * @param userId - User ID
 * @param betId - Bet ID
 * @param isBlindPeriodBet - Whether bet was placed during blind period
 * @param isContrarian - Whether bet was contrarian
 * @param won - Whether bet won
 * @returns Total points awarded
 */
export async function awardResolutionPoints(
  userId: string,
  betId: string,
  isBlindPeriodBet: boolean,
  isContrarian: boolean,
  won: boolean
): Promise<number> {
  // Only award resolution points if bet won
  if (!won) {
    return 0;
  }

  let totalPoints = 0;

  if (isBlindPeriodBet) {
    await recordEvent(userId, betId, TrendsetterEventType.CORRECT_BLIND, 2);
    totalPoints += 2;
  }

  if (isContrarian) {
    await recordEvent(userId, betId, TrendsetterEventType.CORRECT_CONTRARIAN, 5);
    totalPoints += 5;
  }

  return totalPoints;
}

/**
 * Calculate total trendsetter score for a user
 *
 * @param userId - User ID
 * @returns Trendsetter score with breakdown
 */
export async function calculateScore(userId: string): Promise<TrendsetterScore> {
  // Get all events for user
  const events = await db
    .select()
    .from(trendsetterEvents)
    .where(eq(trendsetterEvents.userId, userId));

  // Calculate totals
  const totalPoints = events.reduce((sum, event) => sum + event.points, 0);

  const blindBets = events.filter((e) => e.eventType === TrendsetterEventType.BLIND_BET).length;
  const contrarianBets = events.filter((e) => e.eventType === TrendsetterEventType.CONTRARIAN_BET).length;
  const correctBlindBets = events.filter((e) => e.eventType === TrendsetterEventType.CORRECT_BLIND).length;
  const correctContrarianBets = events.filter(
    (e) => e.eventType === TrendsetterEventType.CORRECT_CONTRARIAN
  ).length;

  return {
    userId,
    totalPoints,
    blindBets,
    contrarianBets,
    correctBlindBets,
    correctContrarianBets,
  };
}

/**
 * Get trendsetter leaderboard
 *
 * @param limit - Number of entries to return (default: 50)
 * @returns Leaderboard entries sorted by points descending
 */
export async function getLeaderboard(limit: number = 50): Promise<TrendsetterLeaderboardEntry[]> {
  // Aggregate points by user
  const scores = await db
    .select({
      userId: trendsetterEvents.userId,
      totalPoints: sql<number>`SUM(${trendsetterEvents.points})`,
    })
    .from(trendsetterEvents)
    .groupBy(trendsetterEvents.userId)
    .orderBy(desc(sql`SUM(${trendsetterEvents.points})`))
    .limit(limit);

  // Get user details
  const leaderboard: TrendsetterLeaderboardEntry[] = [];

  for (let i = 0; i < scores.length; i++) {
    const score = scores[i];
    const user = await db.query.users.findFirst({
      where: eq(users.id, score.userId),
    });

    if (user) {
      const userScore = await calculateScore(score.userId);
      const badges = getBadges(userScore);

      leaderboard.push({
        userId: score.userId,
        username: user.username,
        totalPoints: Number(score.totalPoints),
        rank: i + 1,
        badges,
      });
    }
  }

  return leaderboard;
}

/**
 * Get trendsetter badges for a user
 *
 * @param score - Trendsetter score
 * @returns Array of badge names
 */
export function getBadges(score: TrendsetterScore): string[] {
  const badges: string[] = [];

  // Early Bird: 10+ blind period bets
  if (score.blindBets >= 10) {
    badges.push('Early Bird');
  }

  // Maverick: 10+ contrarian bets
  if (score.contrarianBets >= 10) {
    badges.push('Maverick');
  }

  // Oracle: 20+ correct predictions (blind or contrarian)
  const totalCorrect = score.correctBlindBets + score.correctContrarianBets;
  if (totalCorrect >= 20) {
    badges.push('Oracle');
  }

  // Contrarian Legend: 25+ correct contrarian bets
  if (score.correctContrarianBets >= 25) {
    badges.push('Contrarian Legend');
  }

  // Blind Faith: 15+ correct blind period bets
  if (score.correctBlindBets >= 15) {
    badges.push('Blind Faith');
  }

  return badges;
}

/**
 * Get user's rank on leaderboard
 *
 * @param userId - User ID
 * @returns Rank (1-based), or null if not on leaderboard
 */
export async function getUserRank(userId: string): Promise<number | null> {
  // Get all user scores
  const scores = await db
    .select({
      userId: trendsetterEvents.userId,
      totalPoints: sql<number>`SUM(${trendsetterEvents.points})`,
    })
    .from(trendsetterEvents)
    .groupBy(trendsetterEvents.userId)
    .orderBy(desc(sql`SUM(${trendsetterEvents.points})`));

  const rank = scores.findIndex((s) => s.userId === userId);
  return rank !== -1 ? rank + 1 : null;
}

/**
 * Get recent trendsetter events for a user
 *
 * @param userId - User ID
 * @param limit - Number of events to return (default: 20)
 * @returns Recent events
 */
export async function getRecentEvents(userId: string, limit: number = 20): Promise<TrendsetterEvent[]> {
  const events = await db
    .select()
    .from(trendsetterEvents)
    .where(eq(trendsetterEvents.userId, userId))
    .orderBy(desc(trendsetterEvents.createdAt))
    .limit(limit);

  return events.map((event) => ({
    id: event.id,
    userId: event.userId,
    betId: event.betId,
    eventType: event.eventType as TrendsetterEventType,
    points: event.points,
    createdAt: event.createdAt,
  }));
}
