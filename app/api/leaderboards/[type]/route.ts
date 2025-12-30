import { NextRequest, NextResponse } from "next/server";
import {
  getTopEarners,
  getMostAccurate,
  getTopContrarians,
  getTrendsetters,
  getWeeklyStars,
  getUserRank,
  LeaderboardType,
} from "@/lib/services/leaderboardService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get("limit");
    const userIdParam = searchParams.get("userId");
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    if (limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 1000" },
        { status: 400 }
      );
    }

    let leaderboard;
    let userRank = null;

    switch (type) {
      case LeaderboardType.TOP_EARNERS:
        leaderboard = await getTopEarners(limit);
        if (userIdParam) {
          userRank = await getUserRank(userIdParam, LeaderboardType.TOP_EARNERS);
        }
        break;
      case LeaderboardType.MOST_ACCURATE:
        leaderboard = await getMostAccurate(limit);
        if (userIdParam) {
          userRank = await getUserRank(userIdParam, LeaderboardType.MOST_ACCURATE);
        }
        break;
      case LeaderboardType.TOP_CONTRARIANS:
        leaderboard = await getTopContrarians(limit);
        if (userIdParam) {
          userRank = await getUserRank(userIdParam, LeaderboardType.TOP_CONTRARIANS);
        }
        break;
      case LeaderboardType.TRENDSETTERS:
        leaderboard = await getTrendsetters(limit);
        if (userIdParam) {
          userRank = await getUserRank(userIdParam, LeaderboardType.TRENDSETTERS);
        }
        break;
      case LeaderboardType.WEEKLY_STARS:
        leaderboard = await getWeeklyStars(limit);
        if (userIdParam) {
          userRank = await getUserRank(userIdParam, LeaderboardType.WEEKLY_STARS);
        }
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
      userRank,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
