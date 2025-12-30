import { db } from "@/lib/db";
import { comments, users } from "@/lib/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";

export const commentService = {
  /**
   * Create a new comment on a market
   */
  async createComment(data: {
    marketId: string;
    userId: string;
    content: string;
    hasSpoiler?: boolean;
    parentId?: string;
  }) {
    // Validate content
    if (!data.content.trim()) {
      throw new Error("Comment content cannot be empty");
    }

    // If replying to a comment, verify it exists and is not already a reply
    if (data.parentId) {
      const parentComment = await db.query.comments.findFirst({
        where: eq(comments.id, data.parentId),
      });

      if (!parentComment) {
        throw new Error("Parent comment not found");
      }

      // Enforce one-level threading
      if (parentComment.parentId) {
        throw new Error("Cannot reply to a reply. Only one level of threading is supported.");
      }

      // Verify parent comment is on the same market
      if (parentComment.marketId !== data.marketId) {
        throw new Error("Parent comment is not on this market");
      }
    }

    const [comment] = await db
      .insert(comments)
      .values({
        marketId: data.marketId,
        userId: data.userId,
        content: data.content,
        hasSpoiler: data.hasSpoiler || false,
        parentId: data.parentId || null,
      })
      .returning();

    // Fetch comment with user details
    return this.getCommentById(comment.id);
  },

  /**
   * Get a single comment by ID with user details
   */
  async getCommentById(commentId: string) {
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    return comment;
  },

  /**
   * Get all comments for a market (threaded structure)
   */
  async getMarketComments(marketId: string) {
    // Get all top-level comments (no parent)
    const topLevelComments = await db.query.comments.findMany({
      where: and(eq(comments.marketId, marketId), isNull(comments.parentId)),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        replies: {
          with: {
            user: {
              columns: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
          orderBy: [comments.createdAt], // Oldest replies first
        },
      },
      orderBy: [desc(comments.createdAt)], // Newest comments first
    });

    return topLevelComments;
  },

  /**
   * Get comments by a specific user
   */
  async getUserComments(userId: string, limit: number = 20) {
    const userComments = await db.query.comments.findMany({
      where: eq(comments.userId, userId),
      with: {
        market: {
          columns: {
            id: true,
            title: true,
            movieTitle: true,
            status: true,
          },
        },
      },
      orderBy: [desc(comments.createdAt)],
      limit,
    });

    return userComments;
  },

  /**
   * Update a comment
   */
  async updateComment(commentId: string, userId: string, content: string) {
    if (!content.trim()) {
      throw new Error("Comment content cannot be empty");
    }

    // Verify ownership
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.userId !== userId) {
      throw new Error("You can only edit your own comments");
    }

    const [updated] = await db
      .update(comments)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(comments.id, commentId))
      .returning();

    return this.getCommentById(updated.id);
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string, isAdmin: boolean = false) {
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    // Only owner or admin can delete
    if (comment.userId !== userId && !isAdmin) {
      throw new Error("You can only delete your own comments");
    }

    // Deleting a parent comment will cascade delete replies (via DB constraint)
    await db.delete(comments).where(eq(comments.id, commentId));

    return { success: true, deletedId: commentId };
  },

  /**
   * Get comment count for a market
   */
  async getMarketCommentCount(marketId: string): Promise<number> {
    const result = await db.query.comments.findMany({
      where: eq(comments.marketId, marketId),
    });

    return result.length;
  },

  /**
   * Toggle spoiler status on a comment
   */
  async toggleSpoiler(commentId: string, userId: string) {
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.userId !== userId) {
      throw new Error("You can only modify your own comments");
    }

    const [updated] = await db
      .update(comments)
      .set({
        hasSpoiler: !comment.hasSpoiler,
        updatedAt: new Date(),
      })
      .where(eq(comments.id, commentId))
      .returning();

    return this.getCommentById(updated.id);
  },
};
