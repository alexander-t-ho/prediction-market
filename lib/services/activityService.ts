import { db } from "@/lib/db";
import { bets, markets, challenges, comments, follows, notifications } from "@/lib/db/schema";
import { eq, desc, or, and, sql } from "drizzle-orm";

export interface ActivityItem {
  id: string;
  type: "bet" | "challenge_sent" | "challenge_received" | "comment" | "follow" | "market_proposed";
  timestamp: Date;
  data: any;
}

export const activityService = {
  /**
   * Get recent activity for a user (their own actions)
   */
  async getUserActivity(userId: string, limit: number = 20): Promise<ActivityItem[]> {
    const activities: ActivityItem[] = [];

    // Get recent bets
    const userBets = await db.query.bets.findMany({
      where: eq(bets.userId, userId),
      with: {
        market: {
          columns: {
            id: true,
            title: true,
            movieTitle: true,
            status: true,
            moviePosterPath: true,
          },
        },
        outcome: {
          columns: {
            label: true,
          },
        },
      },
      orderBy: [desc(bets.createdAt)],
      limit: limit / 2,
    });

    userBets.forEach((bet) => {
      activities.push({
        id: bet.id,
        type: "bet",
        timestamp: bet.createdAt,
        data: {
          marketId: bet.marketId,
          marketTitle: bet.market.title,
          movieTitle: bet.market.movieTitle,
          moviePosterPath: bet.market.moviePosterPath,
          outcome: bet.outcome.label,
          stake: bet.stake,
          placedDuringBlindPeriod: bet.placedDuringBlindPeriod,
          isContrarian: bet.isContrarian,
          actualPayout: bet.actualPayout,
        },
      });
    });

    // Get recent challenges (sent)
    const challengesSent = await db.query.challenges.findMany({
      where: eq(challenges.challengerId, userId),
      with: {
        market: {
          columns: {
            id: true,
            title: true,
            movieTitle: true,
          },
        },
        challenged: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: [desc(challenges.createdAt)],
      limit: 10,
    });

    challengesSent.forEach((challenge) => {
      activities.push({
        id: challenge.id,
        type: "challenge_sent",
        timestamp: challenge.createdAt,
        data: {
          challengeId: challenge.id,
          marketId: challenge.marketId,
          marketTitle: challenge.market.title,
          opponent: challenge.challenged,
          status: challenge.status,
          stake: challenge.stake,
        },
      });
    });

    // Get recent comments
    const userComments = await db.query.comments.findMany({
      where: eq(comments.userId, userId),
      with: {
        market: {
          columns: {
            id: true,
            title: true,
            movieTitle: true,
          },
        },
      },
      orderBy: [desc(comments.createdAt)],
      limit: 10,
    });

    userComments.forEach((comment) => {
      activities.push({
        id: comment.id,
        type: "comment",
        timestamp: comment.createdAt,
        data: {
          marketId: comment.marketId,
          marketTitle: comment.market.title,
          content: comment.content,
          hasSpoiler: comment.hasSpoiler,
        },
      });
    });

    // Get users followed
    const userFollows = await db.query.follows.findMany({
      where: eq(follows.followerId, userId),
      with: {
        following: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: [desc(follows.createdAt)],
      limit: 10,
    });

    userFollows.forEach((follow) => {
      activities.push({
        id: follow.id,
        type: "follow",
        timestamp: follow.createdAt,
        data: {
          user: follow.following,
        },
      });
    });

    // Get proposed markets
    const proposedMarkets = await db.query.markets.findMany({
      where: eq(markets.proposedBy, userId),
      columns: {
        id: true,
        title: true,
        movieTitle: true,
        status: true,
        createdAt: true,
      },
      orderBy: [desc(markets.createdAt)],
      limit: 10,
    });

    proposedMarkets.forEach((market) => {
      activities.push({
        id: market.id,
        type: "market_proposed",
        timestamp: market.createdAt,
        data: {
          marketId: market.id,
          marketTitle: market.title,
          movieTitle: market.movieTitle,
          status: market.status,
        },
      });
    });

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  },

  /**
   * Get activity feed for users that the current user follows
   */
  async getFollowingFeed(userId: string, limit: number = 20): Promise<ActivityItem[]> {
    // Get list of users being followed
    const following = await db.query.follows.findMany({
      where: eq(follows.followerId, userId),
      columns: {
        followingId: true,
      },
    });

    const followingIds = following.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return [];
    }

    const activities: ActivityItem[] = [];

    // Get recent bets from followed users
    const followedBets = await db.query.bets.findMany({
      where: sql`${bets.userId} = ANY(${followingIds})`,
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        market: {
          columns: {
            id: true,
            title: true,
            movieTitle: true,
            status: true,
          },
        },
        outcome: {
          columns: {
            label: true,
          },
        },
      },
      orderBy: [desc(bets.createdAt)],
      limit: limit,
    });

    followedBets.forEach((bet) => {
      activities.push({
        id: bet.id,
        type: "bet",
        timestamp: bet.createdAt,
        data: {
          user: bet.user,
          marketId: bet.marketId,
          marketTitle: bet.market.title,
          movieTitle: bet.market.movieTitle,
          outcome: bet.outcome.label,
          stake: bet.stake,
        },
      });
    });

    // Get recent comments from followed users
    const followedComments = await db.query.comments.findMany({
      where: sql`${comments.userId} = ANY(${followingIds})`,
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        market: {
          columns: {
            id: true,
            title: true,
            movieTitle: true,
          },
        },
      },
      orderBy: [desc(comments.createdAt)],
      limit: 10,
    });

    followedComments.forEach((comment) => {
      activities.push({
        id: comment.id,
        type: "comment",
        timestamp: comment.createdAt,
        data: {
          user: comment.user,
          marketId: comment.marketId,
          marketTitle: comment.market.title,
          content: comment.content,
        },
      });
    });

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  },

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string, limit: number = 50) {
    return await db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: [desc(notifications.createdAt)],
      limit,
    });
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await db.query.notifications.findMany({
      where: and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
    });

    return result.length;
  },

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string, userId: string) {
    const notification = await db.query.notifications.findFirst({
      where: eq(notifications.id, notificationId),
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));

    return { success: true };
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId: string) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return { success: true };
  },

  /**
   * Create a notification
   */
  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }) {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        message: data.message || null,
        relatedEntityType: data.relatedEntityType || null,
        relatedEntityId: data.relatedEntityId || null,
      })
      .returning();

    return notification;
  },
};
