// PUT /api/challenges/[id]/decline - Decline a challenge

import { NextRequest, NextResponse } from "next/server";
import { challengeService } from "@/lib/services/challengeService";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: challengeId } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await challengeService.declineChallenge(challengeId, userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error declining challenge:", error);
    return NextResponse.json(
      { error: error.message || "Failed to decline challenge" },
      { status: 400 }
    );
  }
}
