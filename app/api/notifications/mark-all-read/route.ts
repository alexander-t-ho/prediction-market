// PUT /api/notifications/mark-all-read - Mark all notifications as read for a user

import { NextRequest, NextResponse } from "next/server";
import { activityService } from "@/lib/services/activityService";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await activityService.markAllNotificationsAsRead(userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}
