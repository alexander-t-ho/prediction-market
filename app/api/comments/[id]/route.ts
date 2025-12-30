// PUT /api/comments/[id] - Update a comment
// DELETE /api/comments/[id] - Delete a comment

import { NextRequest, NextResponse } from "next/server";
import { commentService } from "@/lib/services/commentService";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const body = await request.json();

    const { userId, content } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const comment = await commentService.updateComment(commentId, userId, content);

    return NextResponse.json(comment);
  } catch (error: any) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update comment" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const isAdmin = searchParams.get("isAdmin") === "true";

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await commentService.deleteComment(commentId, userId, isAdmin);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete comment" },
      { status: 400 }
    );
  }
}
