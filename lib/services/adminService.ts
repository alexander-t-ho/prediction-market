import { db } from "../db";
import {
  users,
  markets,
  bets,
  comments,
  marketOutcomes,
  resolutions,
} from "../db/schema";
import { eq, desc, sql, and, gte, lte, count } from "drizzle-orm";
import { resolveMarket, cancelResolution } from "./resolutionService";

// ============================================
// TYPES & INTERFACES
// ============================================

export interface PlatformStatistics {
  totalUsers: number;
  activeUsers: number; // Users who have placed at least one bet
  totalMarkets: number;
  activeMarkets: number; // Markets in blind, open, or locked status
  resolvedMarkets: number;
  totalBets: number;
  totalPoolValue: number; // Sum of all stakes in active markets
  totalPlatformValue: number; // Sum of all user balances
}

export interface RecentResolution {
  id: string;
  marketId: string;
  marketTitle: string;
  resolvedAt: Date;
  totalPayout: number;
  winnersCount: number;
  actualValue: number | null;
}

export interface MarketApproval {
  marketId: string;
  approved: boolean;
  approvedBy: string;
  notes?: string;
}

export interface MarketEditData {
  title?: string;
  description?: string;
  threshold?: number;
  blindPeriodEndsAt?: Date;
  lockAt?: Date;
  resolutionAt?: Date;
}

export interface ManualResolutionData {
  marketId: string;
  actualValue?: number;
  winningOutcomeId?: string;
  adminId: string;
  auditNote: string;
}

export interface UserManagementAction {
  userId: string;
  action: "ban" | "unban" | "set_balance" | "make_admin" | "remove_admin";
  adminId: string;
  newBalance?: number;
  reason?: string;
}

// ============================================
// PLATFORM STATISTICS
// ============================================

export async function getPlatformStatistics(): Promise<PlatformStatistics> {
  // Total users
  const totalUsersResult = await db
    .select({ count: count() })
    .from(users);
  const totalUsers = Number(totalUsersResult[0]?.count || 0);

  // Active users (users who have placed at least one bet)
  const activeUsersResult = await db
    .selectDistinct({ userId: bets.userId })
    .from(bets);
  const activeUsers = activeUsersResult.length;

  // Total markets
  const totalMarketsResult = await db
    .select({ count: count() })
    .from(markets);
  const totalMarkets = Number(totalMarketsResult[0]?.count || 0);

  // Active markets (blind, open, locked)
  const activeMarketsResult = await db
    .select({ count: count() })
    .from(markets)
    .where(
      sql`${markets.status} IN ('blind', 'open', 'locked')`
    );
  const activeMarkets = Number(activeMarketsResult[0]?.count || 0);

  // Resolved markets
  const resolvedMarketsResult = await db
    .select({ count: count() })
    .from(markets)
    .where(eq(markets.status, "resolved"));
  const resolvedMarkets = Number(resolvedMarketsResult[0]?.count || 0);

  // Total bets
  const totalBetsResult = await db
    .select({ count: count() })
    .from(bets);
  const totalBets = Number(totalBetsResult[0]?.count || 0);

  // Total pool value (sum of stakes in active markets)
  const totalPoolValueResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${bets.stake}), 0)`,
    })
    .from(bets)
    .innerJoin(markets, eq(bets.marketId, markets.id))
    .where(
      sql`${markets.status} IN ('blind', 'open', 'locked')`
    );
  const totalPoolValue = Number(totalPoolValueResult[0]?.total || 0);

  // Total platform value (sum of all user balances)
  const totalPlatformValueResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${users.balance}), 0)`,
    })
    .from(users);
  const totalPlatformValue = Number(totalPlatformValueResult[0]?.total || 0);

  return {
    totalUsers,
    activeUsers,
    totalMarkets,
    activeMarkets,
    resolvedMarkets,
    totalBets,
    totalPoolValue,
    totalPlatformValue,
  };
}

// ============================================
// RECENT RESOLUTIONS
// ============================================

export async function getRecentResolutions(limit: number = 10): Promise<RecentResolution[]> {
  const resolutionsData = await db
    .select({
      id: resolutions.id,
      marketId: resolutions.marketId,
      marketTitle: markets.title,
      resolvedAt: resolutions.createdAt,
      actualValue: markets.actualValue,
    })
    .from(resolutions)
    .innerJoin(markets, eq(resolutions.marketId, markets.id))
    .orderBy(desc(resolutions.createdAt))
    .limit(limit);

  // Calculate totalPayout and winnersCount for each resolution
  const results = await Promise.all(
    resolutionsData.map(async (r) => {
      const payoutStats = await db
        .select({
          totalPayout: sql<number>`COALESCE(SUM(${bets.actualPayout}), 0)`,
          winnersCount: sql<number>`COUNT(CASE WHEN ${bets.actualPayout} > 0 THEN 1 END)`,
        })
        .from(bets)
        .where(eq(bets.marketId, r.marketId));

      return {
        id: r.id,
        marketId: r.marketId,
        marketTitle: r.marketTitle,
        resolvedAt: r.resolvedAt,
        totalPayout: Number(payoutStats[0]?.totalPayout || 0),
        winnersCount: Number(payoutStats[0]?.winnersCount || 0),
        actualValue: r.actualValue ? Number(r.actualValue) : null,
      };
    })
  );

  return results;
}

// ============================================
// MARKET MANAGEMENT
// ============================================

export async function getPendingMarkets(limit: number = 50) {
  const pendingMarkets = await db.query.markets.findMany({
    where: eq(markets.status, "pending"),
    orderBy: [desc(markets.createdAt)],
    limit,
    with: {
      proposer: true,
      outcomes: true,
    },
  });

  return pendingMarkets;
}

export async function approveMarket(
  marketId: string,
  adminId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const market = await db.query.markets.findFirst({
      where: eq(markets.id, marketId),
    });

    if (!market) {
      return { success: false, error: "Market not found" };
    }

    if (market.status !== "pending") {
      return { success: false, error: "Market is not in pending status" };
    }

    // Update market status to blind period
    await db
      .update(markets)
      .set({
        status: "blind",
        updatedAt: new Date(),
      })
      .where(eq(markets.id, marketId));

    // TODO: Could create an audit log entry here
    console.log(`Market ${marketId} approved by admin ${adminId}. Notes: ${notes || "none"}`);

    return { success: true };
  } catch (error) {
    console.error("Error approving market:", error);
    return { success: false, error: "Failed to approve market" };
  }
}

export async function rejectMarket(
  marketId: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const market = await db.query.markets.findFirst({
      where: eq(markets.id, marketId),
    });

    if (!market) {
      return { success: false, error: "Market not found" };
    }

    if (market.status !== "pending") {
      return { success: false, error: "Market is not in pending status" };
    }

    // Update market status to cancelled
    await db
      .update(markets)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(markets.id, marketId));

    // TODO: Notify the user who proposed the market
    console.log(`Market ${marketId} rejected by admin ${adminId}. Reason: ${reason}`);

    return { success: true };
  } catch (error) {
    console.error("Error rejecting market:", error);
    return { success: false, error: "Failed to reject market" };
  }
}

export async function editMarketDetails(
  marketId: string,
  adminId: string,
  editData: MarketEditData
): Promise<{ success: boolean; error?: string }> {
  try {
    const market = await db.query.markets.findFirst({
      where: eq(markets.id, marketId),
    });

    if (!market) {
      return { success: false, error: "Market not found" };
    }

    // Don't allow editing resolved or cancelled markets
    if (market.status === "resolved" || market.status === "cancelled") {
      return {
        success: false,
        error: "Cannot edit resolved or cancelled markets",
      };
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (editData.title !== undefined) updateData.title = editData.title;
    if (editData.description !== undefined) updateData.description = editData.description;
    if (editData.threshold !== undefined) updateData.threshold = editData.threshold.toString();
    if (editData.blindPeriodEndsAt !== undefined)
      updateData.blindPeriodEndsAt = editData.blindPeriodEndsAt;
    if (editData.lockAt !== undefined) updateData.lockAt = editData.lockAt;
    if (editData.resolutionAt !== undefined) updateData.resolutionAt = editData.resolutionAt;

    await db.update(markets).set(updateData).where(eq(markets.id, marketId));

    console.log(`Market ${marketId} edited by admin ${adminId}`);
    return { success: true };
  } catch (error) {
    console.error("Error editing market:", error);
    return { success: false, error: "Failed to edit market" };
  }
}

export async function manuallyResolveMarket(
  data: ManualResolutionData
): Promise<{ success: boolean; error?: string; result?: any }> {
  try {
    const market = await db.query.markets.findFirst({
      where: eq(markets.id, data.marketId),
      with: {
        outcomes: true,
      },
    });

    if (!market) {
      return { success: false, error: "Market not found" };
    }

    // Verify market can be resolved
    if (market.status === "resolved") {
      return { success: false, error: "Market already resolved" };
    }

    if (market.status === "cancelled") {
      return { success: false, error: "Cannot resolve cancelled market" };
    }

    // Determine winning outcome
    let winningOutcomeId = data.winningOutcomeId;

    if (!winningOutcomeId && data.actualValue !== undefined) {
      // For binary markets, determine outcome based on threshold
      if (market.marketType === "binary" && market.threshold) {
        const threshold = Number(market.threshold);
        const actualValue = data.actualValue;

        // Find the "yes" or "no" outcome
        const yesOutcome = market.outcomes.find(
          (o) => o.description.toLowerCase().includes("yes") || o.description.toLowerCase().includes("above")
        );
        const noOutcome = market.outcomes.find(
          (o) => o.description.toLowerCase().includes("no") || o.description.toLowerCase().includes("below")
        );

        if (actualValue >= threshold && yesOutcome) {
          winningOutcomeId = yesOutcome.id;
        } else if (actualValue < threshold && noOutcome) {
          winningOutcomeId = noOutcome.id;
        }
      }
    }

    if (!winningOutcomeId) {
      return { success: false, error: "Could not determine winning outcome" };
    }

    // Verify outcome exists
    const outcomeExists = market.outcomes.some((o) => o.id === winningOutcomeId);
    if (!outcomeExists) {
      return { success: false, error: "Invalid outcome ID" };
    }

    // Call the existing resolution service
    const result = await resolveMarket(
      data.marketId,
      winningOutcomeId,
      data.actualValue ?? 0
    );

    if (!result.success) {
      return { success: false, error: result.errors?.[0] || "Resolution failed" };
    }

    // Log the manual resolution
    console.log(
      `Market ${data.marketId} manually resolved by admin ${data.adminId}. Audit note: ${data.auditNote}`
    );

    return { success: true, result };
  } catch (error) {
    console.error("Error manually resolving market:", error);
    return { success: false, error: "Failed to manually resolve market" };
  }
}

export async function cancelMarketWithRefunds(
  marketId: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await cancelResolution(marketId);

    if (!result.success) {
      return { success: false, error: result.errors?.[0] || "Resolution failed" };
    }

    console.log(`Market ${marketId} cancelled by admin ${adminId}. Reason: ${reason}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error cancelling market:", error);
    return { success: false, error: "Failed to cancel market" };
  }
}

// ============================================
// COMMENT MODERATION
// ============================================

export async function deleteComment(
  commentId: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
    });

    if (!comment) {
      return { success: false, error: "Comment not found" };
    }

    await db.delete(comments).where(eq(comments.id, commentId));

    console.log(`Comment ${commentId} deleted by admin ${adminId}. Reason: ${reason}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { success: false, error: "Failed to delete comment" };
  }
}

export async function getReportedComments(limit: number = 50) {
  // This would require a reports table in the schema
  // For now, return recent comments for moderation review
  const recentComments = await db.query.comments.findMany({
    orderBy: [desc(comments.createdAt)],
    limit,
    with: {
      user: true,
      market: true,
    },
  });

  return recentComments;
}

// ============================================
// USER MANAGEMENT
// ============================================

export async function manageUser(
  action: UserManagementAction
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, action.userId),
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    switch (action.action) {
      case "set_balance":
        if (action.newBalance === undefined || action.newBalance < 0) {
          return { success: false, error: "Invalid balance amount" };
        }
        await db
          .update(users)
          .set({
            balance: action.newBalance.toString(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, action.userId));
        console.log(
          `User ${action.userId} balance set to ${action.newBalance} by admin ${action.adminId}`
        );
        break;

      case "make_admin":
        await db
          .update(users)
          .set({
            isAdmin: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, action.userId));
        console.log(`User ${action.userId} promoted to admin by ${action.adminId}`);
        break;

      case "remove_admin":
        await db
          .update(users)
          .set({
            isAdmin: false,
            updatedAt: new Date(),
          })
          .where(eq(users.id, action.userId));
        console.log(`User ${action.userId} demoted from admin by ${action.adminId}`);
        break;

      default:
        return { success: false, error: "Invalid action" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error managing user:", error);
    return { success: false, error: "Failed to manage user" };
  }
}

export async function searchUsers(query: string, limit: number = 20) {
  const searchResults = await db
    .select()
    .from(users)
    .where(
      sql`${users.username} ILIKE ${"%" + query + "%"} OR ${users.displayName} ILIKE ${"%" + query + "%"}`
    )
    .limit(limit);

  return searchResults;
}

// ============================================
// AUDIT LOG (Future Enhancement)
// ============================================

// TODO: Create an audit_logs table to track all admin actions
// This would include: action type, target ID, admin ID, timestamp, details
