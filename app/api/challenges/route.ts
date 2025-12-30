// POST /api/challenges - Create a challenge

import { NextRequest, NextResponse } from "next/server";
import { challengeService } from "@/lib/services/challengeService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { marketId, challengerId, challengerOutcomeId, challengedId, stake } = body;

    if (!marketId || !challengerId || !challengerOutcomeId || !challengedId || !stake) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const challenge = await challengeService.createChallenge({
      marketId,
      challengerId,
      challengerOutcomeId,
      challengedId,
      stake: parseFloat(stake),
    });

    return NextResponse.json(challenge, { status: 201 });
  } catch (error: any) {
    console.error("Error creating challenge:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create challenge" },
      { status: 400 }
    );
  }
}
