// GET /api/markets/[id]/comments - Get all comments for a market
// POST /api/markets/[id]/comments - Create a comment on a market

import { NextRequest, NextResponse } from "next/server";
import { commentService } from "@/lib/services/commentService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketId } = await params;

    const comments = await commentService.getMarketComments(marketId);

    return NextResponse.json(comments);
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketId } = await params;
    const body = await request.json();

    const { userId, content, hasSpoiler, parentId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const comment = await commentService.createComment({
      marketId,
      userId,
      content,
      hasSpoiler,
      parentId,
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error: any) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create comment" },
      { status: 400 }
    );
  }
}
