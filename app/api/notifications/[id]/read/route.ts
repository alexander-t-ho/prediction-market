// PUT /api/notifications/[id]/read - Mark a notification as read

import { NextRequest, NextResponse } from "next/server";
import { activityService } from "@/lib/services/activityService";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await activityService.markNotificationAsRead(notificationId, userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark notification as read" },
      { status: 400 }
    );
  }
}
