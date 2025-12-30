// GET /api/users/[id]/follow-counts - Get follower and following counts

import { NextRequest, NextResponse } from "next/server";
import { followService } from "@/lib/services/followService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const counts = await followService.getFollowCounts(id);

    return NextResponse.json(counts);
  } catch (error: any) {
    console.error("Error fetching follow counts:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch follow counts" },
      { status: 500 }
    );
  }
}
