// GET /api/users/[id]/following - Get users that this user is following

import { NextRequest, NextResponse } from "next/server";
import { followService } from "@/lib/services/followService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const following = await followService.getFollowing(id);

    return NextResponse.json(following);
  } catch (error: any) {
    console.error("Error fetching following:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch following" },
      { status: 500 }
    );
  }
}
