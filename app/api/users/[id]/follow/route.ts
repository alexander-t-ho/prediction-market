// POST /api/users/[id]/follow - Follow a user
// DELETE /api/users/[id]/follow - Unfollow a user

import { NextRequest, NextResponse } from "next/server";
import { followService } from "@/lib/services/followService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: followingId } = await params;
    const body = await request.json();
    const { userId: followerId } = body;

    if (!followerId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const follow = await followService.followUser(followerId, followingId);

    return NextResponse.json(follow, { status: 201 });
  } catch (error: any) {
    console.error("Error following user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to follow user" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: followingId } = await params;
    const { searchParams } = new URL(request.url);
    const followerId = searchParams.get("userId");

    if (!followerId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await followService.unfollowUser(followerId, followingId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error unfollowing user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to unfollow user" },
      { status: 400 }
    );
  }
}
