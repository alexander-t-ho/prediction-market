// GET /api/users/[id]/is-following - Check if a user is following another user

import { NextRequest, NextResponse } from "next/server";
import { followService } from "@/lib/services/followService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: followingId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const isFollowing = await followService.isFollowing(userId, followingId);

    return NextResponse.json({ isFollowing });
  } catch (error: any) {
    console.error("Error checking follow status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check follow status" },
      { status: 500 }
    );
  }
}
