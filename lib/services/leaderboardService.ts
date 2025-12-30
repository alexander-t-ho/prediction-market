import { db } from "../db";
import { users, bets, markets, trendsetterEvents, leaderboardSnapshots } from "../db/schema";
import { eq, and, gte, lte, sql, desc, asc } from "drizzle-orm";

// ============================================
// TYPES & INTERFACES
// ============================================

export enum LeaderboardType {
  TOP_EARNERS = "top_earners",
  MOST_ACCURATE = "most_accurate",
  TOP_CONTRARIANS = "top_contrarians",
  TRENDSETTERS = "trendsetters",
  WEEKLY_STARS = "weekly_stars",
}

export enum LeaderboardPeriod {
  ALL_TIME = "all_time",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  score: number; // Primary metric for this leaderboard type
  secondaryMetric?: number;
  badge?: string;
}

export interface TopEarnerEntry extends LeaderboardEntry {
  balance: number;
  totalProfits: number;
}

export interface AccuracyEntry extends LeaderboardEntry {
  totalPredictions: number;
  correctPredictions: number;
  accuracyRate: number; // score = accuracyRate
}

export interface ContrarianEntry extends LeaderboardEntry {
  totalPredictions: number;
  contrarianBets: number;
  contrarianRate: number; // score = contrarianRate
}

export interface TrendsetterEntry extends LeaderboardEntry {
  totalPoints: number; // score = totalPoints
  blindBets: number;
  contrarianBets: number;
  correctBlindBets: number;
  correctContrarianBets: number;
}

export interface WeeklyStarEntry extends LeaderboardEntry {
  weeklyEarnings: number; // score = weeklyEarnings
  weekStartDate: Date;
  weekEndDate: Date;
}

export interface LeaderboardSnapshot {
  id: string;
  userId: string;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  totalPredictions: number;
  correctPredictions: number;
  accuracyScore: number;
  contrarianScore: number;
  trendsetterScore: number;
  balance: number;
  rank: number;
  createdAt: Date;
}

// ============================================
// CACHE CONFIGURATION
// ============================================

const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const leaderboardCache = new Map<string, { data: any; timestamp: number }>();

function getCacheKey(type: LeaderboardType, period: LeaderboardPeriod = LeaderboardPeriod.ALL_TIME): string {
  return `${type}_${period}`;
}

function getFromCache<T>(key: string): T | null {
  const cached = leaderboardCache.get(key);
  if (!cached) return null;

  const isExpired = Date.now() - cached.timestamp > CACHE_DURATION_MS;
  if (isExpired) {
    leaderboardCache.delete(key);
    return null;
  }

  return cached.data as T;
}

function setCache<T>(key: string, data: T): void {
  leaderboardCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export function clearLeaderboardCache(): void {
  leaderboardCache.clear();
}

// ============================================
// 1. TOP EARNERS LEADERBOARD
// ============================================

export async function getTopEarners(
  limit: number = 100,
  useCache: boolean = true
): Promise<TopEarnerEntry[]> {
  const cacheKey = getCacheKey(LeaderboardType.TOP_EARNERS);

  if (useCache) {
    const cached = getFromCache<TopEarnerEntry[]>(cacheKey);
    if (cached) return cached.slice(0, limit);
  }

  // Calculate total profits (actualPayout - stake) for each user
  const profitsQuery = db
    .select({
      userId: bets.userId,
      totalProfits: sql<number>`COALESCE(SUM(${bets.actualPayout} - ${bets.stake}), 0)`,
    })
    .from(bets)
    .groupBy(bets.userId)
    .as("profits");

  const results = await db
    .select({
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
      avatar: users.avatar,
      balance: users.balance,
      totalProfits: sql<number>`COALESCE(${profitsQuery.totalProfits}, 0)`,
    })
    .from(users)
    .leftJoin(profitsQuery, eq(users.id, profitsQuery.userId))
    .orderBy(desc(users.balance))
    .limit(limit);

  const entries: TopEarnerEntry[] = results.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    username: row.username,
    displayName: row.displayName,
    avatar: row.avatar,
    score: Number(row.balance),
    balance: Number(row.balance),
    totalProfits: Number(row.totalProfits),
    badge: getBadgeForEarner(Number(row.balance)),
  }));

  setCache(cacheKey, entries);
  return entries;
}

function getBadgeForEarner(balance: number): string | undefined {
  if (balance >= 100000) return "💎 Diamond Mogul";
  if (balance >= 50000) return "🏆 Platinum Trader";
  if (balance >= 25000) return "🥇 Gold Investor";
  if (balance >= 10000) return "🥈 Silver Speculator";
  return undefined;
}

// ============================================
// 2. MOST ACCURATE LEADERBOARD
// ============================================

export async function getMostAccurate(
  limit: number = 100,
  minPredictions: number = 10,
  useCache: boolean = true
): Promise<AccuracyEntry[]> {
  const cacheKey = getCacheKey(LeaderboardType.MOST_ACCURATE);

  if (useCache) {
    const cached = getFromCache<AccuracyEntry[]>(cacheKey);
    if (cached) return cached.slice(0, limit);
  }

  // Query bets on resolved markets
  const results = await db
    .select({
      userId: bets.userId,
      username: users.username,
      displayName: users.displayName,
      avatar: users.avatar,
      totalPredictions: sql<number>`COUNT(*)`,
      correctPredictions: sql<number>`SUM(CASE WHEN ${bets.actualPayout} > 0 THEN 1 ELSE 0 END)`,
    })
    .from(bets)
    .innerJoin(users, eq(bets.userId, users.id))
    .innerJoin(markets, eq(bets.marketId, markets.id))
    .where(eq(markets.status, "resolved"))
    .groupBy(bets.userId, users.username, users.displayName, users.avatar)
    .having(sql`COUNT(*) >= ${minPredictions}`)
    .orderBy(desc(sql`(SUM(CASE WHEN ${bets.actualPayout} > 0 THEN 1 ELSE 0 END)::float / COUNT(*)) * 100`))
    .limit(limit);

  const entries: AccuracyEntry[] = results.map((row, index) => {
    const total = Number(row.totalPredictions);
    const correct = Number(row.correctPredictions);
    const accuracyRate = total > 0 ? (correct / total) * 100 : 0;

    return {
      rank: index + 1,
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      avatar: row.avatar,
      score: accuracyRate,
      totalPredictions: total,
      correctPredictions: correct,
      accuracyRate: accuracyRate,
      badge: getBadgeForAccuracy(accuracyRate, total),
    };
  });

  setCache(cacheKey, entries);
  return entries;
}

function getBadgeForAccuracy(accuracyRate: number, totalPredictions: number): string | undefined {
  if (accuracyRate >= 90 && totalPredictions >= 50) return "🔮 Oracle";
  if (accuracyRate >= 85 && totalPredictions >= 30) return "🎯 Sharpshooter";
  if (accuracyRate >= 80 && totalPredictions >= 20) return "📊 Analyst";
  if (accuracyRate >= 75 && totalPredictions >= 10) return "🧠 Predictor";
  return undefined;
}

// ============================================
// 3. TOP CONTRARIANS LEADERBOARD
// ============================================

export async function getTopContrarians(
  limit: number = 100,
  minPredictions: number = 10,
  useCache: boolean = true
): Promise<ContrarianEntry[]> {
  const cacheKey = getCacheKey(LeaderboardType.TOP_CONTRARIANS);

  if (useCache) {
    const cached = getFromCache<ContrarianEntry[]>(cacheKey);
    if (cached) return cached.slice(0, limit);
  }

  const results = await db
    .select({
      userId: bets.userId,
      username: users.username,
      displayName: users.displayName,
      avatar: users.avatar,
      totalPredictions: sql<number>`COUNT(*)`,
      contrarianBets: sql<number>`SUM(CASE WHEN ${bets.isContrarian} = true THEN 1 ELSE 0 END)`,
    })
    .from(bets)
    .innerJoin(users, eq(bets.userId, users.id))
    .groupBy(bets.userId, users.username, users.displayName, users.avatar)
    .having(sql`COUNT(*) >= ${minPredictions}`)
    .orderBy(desc(sql`(SUM(CASE WHEN ${bets.isContrarian} = true THEN 1 ELSE 0 END)::float / COUNT(*)) * 100`))
    .limit(limit);

  const entries: ContrarianEntry[] = results.map((row, index) => {
    const total = Number(row.totalPredictions);
    const contrarian = Number(row.contrarianBets);
    const contrarianRate = total > 0 ? (contrarian / total) * 100 : 0;

    return {
      rank: index + 1,
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      avatar: row.avatar,
      score: contrarianRate,
      totalPredictions: total,
      contrarianBets: contrarian,
      contrarianRate: contrarianRate,
      badge: getBadgeForContrarian(contrarianRate, contrarian),
    };
  });

  setCache(cacheKey, entries);
  return entries;
}

function getBadgeForContrarian(contrarianRate: number, contrarianBets: number): string | undefined {
  if (contrarianRate >= 75 && contrarianBets >= 25) return "🦁 Rebel King";
  if (contrarianRate >= 65 && contrarianBets >= 20) return "🎭 Maverick";
  if (contrarianRate >= 55 && contrarianBets >= 15) return "⚡ Free Thinker";
  if (contrarianRate >= 45 && contrarianBets >= 10) return "🌟 Independent";
  return undefined;
}

// ============================================
// 4. TRENDSETTERS LEADERBOARD
// ============================================

export async function getTrendsetters(
  limit: number = 100,
  useCache: boolean = true
): Promise<TrendsetterEntry[]> {
  const cacheKey = getCacheKey(LeaderboardType.TRENDSETTERS);

  if (useCache) {
    const cached = getFromCache<TrendsetterEntry[]>(cacheKey);
    if (cached) return cached.slice(0, limit);
  }

  const results = await db
    .select({
      userId: trendsetterEvents.userId,
      username: users.username,
      displayName: users.displayName,
      avatar: users.avatar,
      totalPoints: sql<number>`SUM(${trendsetterEvents.points})`,
      blindBets: sql<number>`SUM(CASE WHEN ${trendsetterEvents.eventType} = 'blind_bet' THEN 1 ELSE 0 END)`,
      contrarianBets: sql<number>`SUM(CASE WHEN ${trendsetterEvents.eventType} = 'contrarian_bet' THEN 1 ELSE 0 END)`,
      correctBlindBets: sql<number>`SUM(CASE WHEN ${trendsetterEvents.eventType} = 'correct_blind' THEN 1 ELSE 0 END)`,
      correctContrarianBets: sql<number>`SUM(CASE WHEN ${trendsetterEvents.eventType} = 'correct_contrarian' THEN 1 ELSE 0 END)`,
    })
    .from(trendsetterEvents)
    .innerJoin(users, eq(trendsetterEvents.userId, users.id))
    .groupBy(trendsetterEvents.userId, users.username, users.displayName, users.avatar)
    .orderBy(desc(sql`SUM(${trendsetterEvents.points})`))
    .limit(limit);

  const entries: TrendsetterEntry[] = results.map((row, index) => {
    const totalPoints = Number(row.totalPoints);

    return {
      rank: index + 1,
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      avatar: row.avatar,
      score: totalPoints,
      totalPoints: totalPoints,
      blindBets: Number(row.blindBets),
      contrarianBets: Number(row.contrarianBets),
      correctBlindBets: Number(row.correctBlindBets),
      correctContrarianBets: Number(row.correctContrarianBets),
      badge: getBadgeForTrendsetter(totalPoints, Number(row.correctContrarianBets)),
    };
  });

  setCache(cacheKey, entries);
  return entries;
}

function getBadgeForTrendsetter(totalPoints: number, correctContrarianBets: number): string | undefined {
  if (correctContrarianBets >= 25) return "👑 Contrarian Legend";
  if (totalPoints >= 100) return "🌠 Visionary";
  if (totalPoints >= 50) return "💫 Trendsetter";
  if (totalPoints >= 25) return "🎪 Early Adopter";
  return undefined;
}

// ============================================
// 5. WEEKLY STARS LEADERBOARD
// ============================================

export async function getWeeklyStars(
  limit: number = 100,
  weekStartDate?: Date,
  useCache: boolean = true
): Promise<WeeklyStarEntry[]> {
  // Calculate current week boundaries (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days since last Monday

  const weekStart = weekStartDate || new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  const cacheKey = `${getCacheKey(LeaderboardType.WEEKLY_STARS)}_${weekStart.toISOString()}`;

  if (useCache) {
    const cached = getFromCache<WeeklyStarEntry[]>(cacheKey);
    if (cached) return cached.slice(0, limit);
  }

  // Calculate weekly earnings (payouts minus stakes) for bets placed this week
  const results = await db
    .select({
      userId: bets.userId,
      username: users.username,
      displayName: users.displayName,
      avatar: users.avatar,
      weeklyEarnings: sql<number>`SUM(${bets.actualPayout} - ${bets.stake})`,
    })
    .from(bets)
    .innerJoin(users, eq(bets.userId, users.id))
    .where(
      and(
        gte(bets.createdAt, weekStart),
        lte(bets.createdAt, weekEnd)
      )
    )
    .groupBy(bets.userId, users.username, users.displayName, users.avatar)
    .orderBy(desc(sql`SUM(${bets.actualPayout} - ${bets.stake})`))
    .limit(limit);

  const entries: WeeklyStarEntry[] = results.map((row, index) => {
    const weeklyEarnings = Number(row.weeklyEarnings);

    return {
      rank: index + 1,
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      avatar: row.avatar,
      score: weeklyEarnings,
      weeklyEarnings: weeklyEarnings,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      badge: getBadgeForWeeklyStar(weeklyEarnings),
    };
  });

  setCache(cacheKey, entries);
  return entries;
}

function getBadgeForWeeklyStar(weeklyEarnings: number): string | undefined {
  if (weeklyEarnings >= 5000) return "⚡ Lightning Round";
  if (weeklyEarnings >= 2500) return "🔥 Hot Streak";
  if (weeklyEarnings >= 1000) return "📈 Rising Star";
  if (weeklyEarnings >= 500) return "✨ On Fire";
  return undefined;
}

// ============================================
// USER RANK QUERIES
// ============================================

export async function getUserRank(
  userId: string,
  leaderboardType: LeaderboardType
): Promise<number | null> {
  switch (leaderboardType) {
    case LeaderboardType.TOP_EARNERS:
      return getUserEarnerRank(userId);
    case LeaderboardType.MOST_ACCURATE:
      return getUserAccuracyRank(userId);
    case LeaderboardType.TOP_CONTRARIANS:
      return getUserContrarianRank(userId);
    case LeaderboardType.TRENDSETTERS:
      return getUserTrendsetterRank(userId);
    case LeaderboardType.WEEKLY_STARS:
      return getUserWeeklyRank(userId);
    default:
      return null;
  }
}

async function getUserEarnerRank(userId: string): Promise<number | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return null;

  const rankResult = await db
    .select({
      rank: sql<number>`COUNT(*) + 1`,
    })
    .from(users)
    .where(sql`${users.balance} > ${user.balance}`);

  return rankResult[0]?.rank || null;
}

async function getUserAccuracyRank(userId: string): Promise<number | null> {
  // Get user's accuracy stats
  const userStats = await db
    .select({
      totalPredictions: sql<number>`COUNT(*)`,
      correctPredictions: sql<number>`SUM(CASE WHEN ${bets.actualPayout} > 0 THEN 1 ELSE 0 END)`,
    })
    .from(bets)
    .innerJoin(markets, eq(bets.marketId, markets.id))
    .where(and(eq(bets.userId, userId), eq(markets.status, "resolved")))
    .groupBy(bets.userId);

  if (!userStats[0] || Number(userStats[0].totalPredictions) < 10) return null;

  const userAccuracy =
    (Number(userStats[0].correctPredictions) / Number(userStats[0].totalPredictions)) * 100;

  // Count users with better accuracy (minimum 10 predictions)
  const rankResult = await db
    .select({
      rank: sql<number>`COUNT(*) + 1`,
    })
    .from(bets)
    .innerJoin(markets, eq(bets.marketId, markets.id))
    .where(eq(markets.status, "resolved"))
    .groupBy(bets.userId)
    .having(
      and(
        sql`COUNT(*) >= 10`,
        sql`(SUM(CASE WHEN ${bets.actualPayout} > 0 THEN 1 ELSE 0 END)::float / COUNT(*)) * 100 > ${userAccuracy}`
      )
    );

  return rankResult.length + 1;
}

async function getUserContrarianRank(userId: string): Promise<number | null> {
  const userStats = await db
    .select({
      totalPredictions: sql<number>`COUNT(*)`,
      contrarianBets: sql<number>`SUM(CASE WHEN ${bets.isContrarian} = true THEN 1 ELSE 0 END)`,
    })
    .from(bets)
    .where(eq(bets.userId, userId))
    .groupBy(bets.userId);

  if (!userStats[0] || Number(userStats[0].totalPredictions) < 10) return null;

  const userContrarianRate =
    (Number(userStats[0].contrarianBets) / Number(userStats[0].totalPredictions)) * 100;

  const rankResult = await db
    .select({
      rank: sql<number>`COUNT(*) + 1`,
    })
    .from(bets)
    .groupBy(bets.userId)
    .having(
      and(
        sql`COUNT(*) >= 10`,
        sql`(SUM(CASE WHEN ${bets.isContrarian} = true THEN 1 ELSE 0 END)::float / COUNT(*)) * 100 > ${userContrarianRate}`
      )
    );

  return rankResult.length + 1;
}

async function getUserTrendsetterRank(userId: string): Promise<number | null> {
  const userScore = await db
    .select({
      totalPoints: sql<number>`SUM(${trendsetterEvents.points})`,
    })
    .from(trendsetterEvents)
    .where(eq(trendsetterEvents.userId, userId))
    .groupBy(trendsetterEvents.userId);

  if (!userScore[0]) return null;

  const rankResult = await db
    .select({
      rank: sql<number>`COUNT(*) + 1`,
    })
    .from(trendsetterEvents)
    .groupBy(trendsetterEvents.userId)
    .having(sql`SUM(${trendsetterEvents.points}) > ${userScore[0].totalPoints}`);

  return rankResult.length + 1;
}

async function getUserWeeklyRank(userId: string, weekStartDate?: Date): Promise<number | null> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const weekStart = weekStartDate || new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const userEarnings = await db
    .select({
      earnings: sql<number>`SUM(${bets.actualPayout} - ${bets.stake})`,
    })
    .from(bets)
    .where(
      and(
        eq(bets.userId, userId),
        gte(bets.createdAt, weekStart),
        lte(bets.createdAt, weekEnd)
      )
    )
    .groupBy(bets.userId);

  if (!userEarnings[0]) return null;

  const rankResult = await db
    .select({
      rank: sql<number>`COUNT(*) + 1`,
    })
    .from(bets)
    .where(and(gte(bets.createdAt, weekStart), lte(bets.createdAt, weekEnd)))
    .groupBy(bets.userId)
    .having(sql`SUM(${bets.actualPayout} - ${bets.stake}) > ${userEarnings[0].earnings}`);

  return rankResult.length + 1;
}

// ============================================
// SNAPSHOT GENERATION (For Historical Data)
// ============================================

export async function generateLeaderboardSnapshot(
  period: LeaderboardPeriod = LeaderboardPeriod.WEEKLY
): Promise<void> {
  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;

  if (period === LeaderboardPeriod.WEEKLY) {
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday - 7);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + 7);
  } else if (period === LeaderboardPeriod.MONTHLY) {
    periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  } else {
    // ALL_TIME
    periodStart = new Date(0);
    periodEnd = now;
  }

  // Get all leaderboards
  const [earners, accurate, contrarians, trendsetters] = await Promise.all([
    getTopEarners(1000, false),
    getMostAccurate(1000, 10, false),
    getTopContrarians(1000, 10, false),
    getTrendsetters(1000, false),
  ]);

  // Create snapshots for all users
  const snapshots: any[] = [];

  // Combine all users from all leaderboards
  const allUserIds = new Set([
    ...earners.map((e) => e.userId),
    ...accurate.map((e) => e.userId),
    ...contrarians.map((e) => e.userId),
    ...trendsetters.map((e) => e.userId),
  ]);

  for (const userId of allUserIds) {
    const earner = earners.find((e) => e.userId === userId);
    const acc = accurate.find((e) => e.userId === userId);
    const contr = contrarians.find((e) => e.userId === userId);
    const trend = trendsetters.find((e) => e.userId === userId);

    snapshots.push({
      id: crypto.randomUUID(),
      userId,
      period: period.toString(),
      periodStart,
      periodEnd,
      totalPredictions: acc?.totalPredictions || 0,
      correctPredictions: acc?.correctPredictions || 0,
      accuracyScore: acc?.accuracyRate || 0,
      contrarianScore: contr?.contrarianRate || 0,
      trendsetterScore: trend?.totalPoints || 0,
      balance: earner?.balance || 0,
      rank: earner?.rank || 0,
      createdAt: now,
    });
  }

  // Batch insert snapshots
  if (snapshots.length > 0) {
    await db.insert(leaderboardSnapshots).values(snapshots);
  }

  console.log(`Generated ${snapshots.length} leaderboard snapshots for period: ${period}`);
}

export async function getUserHistoricalRanks(
  userId: string,
  period: LeaderboardPeriod = LeaderboardPeriod.WEEKLY,
  limit: number = 10
): Promise<LeaderboardSnapshot[]> {
  const results = await db.query.leaderboardSnapshots.findMany({
    where: and(
      eq(leaderboardSnapshots.userId, userId),
      eq(leaderboardSnapshots.period, period.toString())
    ),
    orderBy: [desc(leaderboardSnapshots.createdAt)],
    limit,
  });

  return results;
}
