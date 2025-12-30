// GET /api/notifications - Get user's notifications
// POST /api/notifications/mark-read - Mark notification(s) as read

import { NextRequest, NextResponse } from "next/server";
import { activityService } from "@/lib/services/activityService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const notifications = await activityService.getUserNotifications(userId, limit);
    const unreadCount = await activityService.getUnreadCount(userId);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
