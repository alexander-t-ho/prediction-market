// GET /api/users/[id]/followers - Get user's followers

import { NextRequest, NextResponse } from "next/server";
import { followService } from "@/lib/services/followService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const followers = await followService.getFollowers(id);

    return NextResponse.json(followers);
  } catch (error: any) {
    console.error("Error fetching followers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch followers" },
      { status: 500 }
    );
  }
}
