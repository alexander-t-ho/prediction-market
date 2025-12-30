import { NextRequest, NextResponse } from "next/server";
import {
  getTopEarners,
  getMostAccurate,
  getTopContrarians,
  getTrendsetters,
  getWeeklyStars,
  LeaderboardType,
} from "@/lib/services/leaderboardService";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") as LeaderboardType | null;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    if (limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 1000" },
        { status: 400 }
      );
    }

    // If type is specified, return that specific leaderboard
    if (type) {
      let leaderboard;

      switch (type) {
        case LeaderboardType.TOP_EARNERS:
          leaderboard = await getTopEarners(limit);
          break;
        case LeaderboardType.MOST_ACCURATE:
          leaderboard = await getMostAccurate(limit);
          break;
        case LeaderboardType.TOP_CONTRARIANS:
          leaderboard = await getTopContrarians(limit);
          break;
        case LeaderboardType.TRENDSETTERS:
          leaderboard = await getTrendsetters(limit);
          break;
        case LeaderboardType.WEEKLY_STARS:
          leaderboard = await getWeeklyStars(limit);
          break;
        default:
          return NextResponse.json(
            { error: "Invalid leaderboard type" },
            { status: 400 }
          );
      }

      return NextResponse.json({
        type,
        leaderboard,
        count: leaderboard.length,
      });
    }

    // If no type specified, return summary of all leaderboards (top 10 each)
    const [topEarners, mostAccurate, topContrarians, trendsetters, weeklyStars] =
      await Promise.all([
        getTopEarners(10),
        getMostAccurate(10),
        getTopContrarians(10),
        getTrendsetters(10),
        getWeeklyStars(10),
      ]);

    return NextResponse.json({
      topEarners,
      mostAccurate,
      topContrarians,
      trendsetters,
      weeklyStars,
    });
  } catch (error) {
    console.error("Error fetching leaderboards:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboards" },
      { status: 500 }
    );
  }
}
