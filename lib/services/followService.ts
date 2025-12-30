import { db } from "@/lib/db";
import { follows, users, notifications, tasteMatches } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const followService = {
  /**
   * Follow a user
   */
  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new Error("You cannot follow yourself");
    }

    // Check if already following
    const existing = await db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId)
      ),
    });

    if (existing) {
      throw new Error("Already following this user");
    }

    // Create follow relationship
    const [follow] = await db
      .insert(follows)
      .values({
        followerId,
        followingId,
      })
      .returning();

    // Create notification for the followed user
    await db.insert(notifications).values({
      userId: followingId,
      type: "new_follower",
      title: "New Follower",
      message: "Someone started following you",
      relatedEntityType: "user",
      relatedEntityId: followerId,
    });

    return follow;
  },

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string) {
    const result = await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error("Not following this user");
    }

    return result[0];
  },

  /**
   * Check if user A is following user B
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId)
      ),
    });

    return !!follow;
  },

  /**
   * Get a user's followers
   */
  async getFollowers(userId: string) {
    const followers = await db.query.follows.findMany({
      where: eq(follows.followingId, userId),
      with: {
        follower: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
      orderBy: [desc(follows.createdAt)],
    });

    return followers.map((f) => ({
      ...f.follower,
      followedAt: f.createdAt,
    }));
  },

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string) {
    const following = await db.query.follows.findMany({
      where: eq(follows.followerId, userId),
      with: {
        following: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
      orderBy: [desc(follows.createdAt)],
    });

    return following.map((f) => {
      const user = Array.isArray(f.following) ? f.following[0] : f.following;
      return {
        ...user,
        followedAt: f.createdAt,
      };
    });
  },

  /**
   * Get follower and following counts for a user
   */
  async getFollowCounts(userId: string) {
    const [followerResult, followingResult] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(follows)
        .where(eq(follows.followingId, userId)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(follows)
        .where(eq(follows.followerId, userId)),
    ]);

    return {
      followers: followerResult[0]?.count || 0,
      following: followingResult[0]?.count || 0,
    };
  },

  /**
   * Get suggested users to follow based on taste matches
   * Excludes users already followed
   */
  async getSuggestedFollows(userId: string, limit: number = 10) {
    // Get taste matches with user details
    const matches = await db.query.tasteMatches.findMany({
      where: eq(tasteMatches.user1Id, userId),
      orderBy: [desc(tasteMatches.score)],
      limit: limit * 2, // Get more to filter out already followed
      with: {
        user2: true,
      },
    });

    // Get users already following
    const followingIds = (await this.getFollowing(userId)).map((u) => u.id);

    // Filter out already followed users
    const suggestions = matches
      .filter((match) => !followingIds.includes(match.user2Id))
      .slice(0, limit)
      .map((match) => ({
        user: match.user2,
        tasteMatchScore: match.score,
        marketsInCommon: match.marketsInCommon,
      }));

    return suggestions;
  },

  /**
   * Get mutual followers (users who follow each other)
   */
  async getMutualFollows(userId: string) {
    // Get users that this user follows
    const following = await this.getFollowing(userId);
    const followingIds = following.map((u) => u.id);

    if (followingIds.length === 0) {
      return [];
    }

    // Get which of those users also follow back
    const mutualFollows = await db.query.follows.findMany({
      where: and(
        eq(follows.followingId, userId),
        sql`${follows.followerId} = ANY(${followingIds})`
      ),
      with: {
        follower: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
    });

    return mutualFollows.map((f) => f.follower);
  },
};
