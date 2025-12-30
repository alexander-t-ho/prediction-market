import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getPlatformStatistics,
  getRecentResolutions,
} from "@/lib/services/adminService";

export async function GET(request: NextRequest) {
  try {
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

    const [stats, recentResolutions] = await Promise.all([
      getPlatformStatistics(),
      getRecentResolutions(10),
    ]);

    return NextResponse.json({
      statistics: stats,
      recentResolutions,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin statistics" },
      { status: 500 }
    );
  }
}
