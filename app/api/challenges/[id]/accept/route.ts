// PUT /api/challenges/[id]/accept - Accept a challenge

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

    const challenge = await challengeService.acceptChallenge(challengeId, userId);

    return NextResponse.json(challenge);
  } catch (error: any) {
    console.error("Error accepting challenge:", error);
    return NextResponse.json(
      { error: error.message || "Failed to accept challenge" },
      { status: 400 }
    );
  }
}
