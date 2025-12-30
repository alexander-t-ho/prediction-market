import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  generateLeaderboardSnapshot,
  LeaderboardPeriod,
  clearLeaderboardCache,
} from "@/lib/services/leaderboardService";

export async function POST(request: NextRequest) {
  try {
    // Get user ID from headers (set by auth middleware)
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify admin access
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { period } = body;

    if (!period || !Object.values(LeaderboardPeriod).includes(period)) {
      return NextResponse.json(
        {
          error: "Invalid period. Must be one of: all_time, weekly, monthly",
        },
        { status: 400 }
      );
    }

    // Generate snapshot
    await generateLeaderboardSnapshot(period as LeaderboardPeriod);

    // Clear cache to refresh leaderboards
    clearLeaderboardCache();

    return NextResponse.json({
      success: true,
      message: `Leaderboard snapshot generated for period: ${period}`,
      period,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating leaderboard snapshot:", error);
    return NextResponse.json(
      { error: "Failed to generate leaderboard snapshot" },
      { status: 500 }
    );
  }
}
