import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getPendingMarkets,
  approveMarket,
  rejectMarket,
} from "@/lib/services/adminService";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const pendingMarkets = await getPendingMarkets(limit);

    return NextResponse.json({
      markets: pendingMarkets,
      count: pendingMarkets.length,
    });
  } catch (error) {
    console.error("Error fetching pending markets:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending markets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { marketId, action, notes, reason } = body;

    if (!marketId || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let result;

    if (action === "approve") {
      result = await approveMarket(marketId, userId, notes);
    } else if (action === "reject") {
      if (!reason) {
        return NextResponse.json(
          { error: "Reason required for rejection" },
          { status: 400 }
        );
      }
      result = await rejectMarket(marketId, userId, reason);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      marketId,
      action,
    });
  } catch (error) {
    console.error("Error processing market approval/rejection:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
