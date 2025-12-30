import { NextRequest, NextResponse } from "next/server";
import {
  getUserRank,
  getUserHistoricalRanks,
  LeaderboardType,
  LeaderboardPeriod,
} from "@/lib/services/leaderboardService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const historyPeriod = searchParams.get("historyPeriod") as LeaderboardPeriod | null;
    const historyLimit = searchParams.get("historyLimit");

    // Get user's current ranks across all leaderboards
    const [topEarnerRank, accuracyRank, contrarianRank, trendsetterRank, weeklyRank] =
      await Promise.all([
        getUserRank(userId, LeaderboardType.TOP_EARNERS),
        getUserRank(userId, LeaderboardType.MOST_ACCURATE),
        getUserRank(userId, LeaderboardType.TOP_CONTRARIANS),
        getUserRank(userId, LeaderboardType.TRENDSETTERS),
        getUserRank(userId, LeaderboardType.WEEKLY_STARS),
      ]);

    const response: any = {
      userId,
      ranks: {
        topEarner: topEarnerRank,
        accuracy: accuracyRank,
        contrarian: contrarianRank,
        trendsetter: trendsetterRank,
        weekly: weeklyRank,
      },
    };

    // Optionally get historical ranks
    if (historyPeriod) {
      const limit = historyLimit ? parseInt(historyLimit, 10) : 10;
      const historicalRanks = await getUserHistoricalRanks(
        userId,
        historyPeriod,
        limit
      );
      response.history = historicalRanks;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching user leaderboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch user leaderboard data" },
      { status: 500 }
    );
  }
}
