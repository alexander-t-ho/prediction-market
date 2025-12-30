import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  editMarketDetails,
  manuallyResolveMarket,
  cancelMarketWithRefunds,
} from "@/lib/services/adminService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    const { marketId } = await params;
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
    const editData = {
      title: body.title,
      description: body.description,
      threshold: body.threshold,
      blindPeriodEndsAt: body.blindPeriodEndsAt ? new Date(body.blindPeriodEndsAt) : undefined,
      lockAt: body.lockAt ? new Date(body.lockAt) : undefined,
      resolutionAt: body.resolutionAt ? new Date(body.resolutionAt) : undefined,
    };

    const result = await editMarketDetails(marketId, userId, editData);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      marketId,
    });
  } catch (error) {
    console.error("Error editing market:", error);
    return NextResponse.json(
      { error: "Failed to edit market" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    const { marketId } = await params;
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
    const { action } = body;

    if (action === "resolve") {
      const { actualValue, winningOutcomeId, auditNote } = body;

      if (!auditNote) {
        return NextResponse.json(
          { error: "Audit note required for manual resolution" },
          { status: 400 }
        );
      }

      const result = await manuallyResolveMarket({
        marketId,
        actualValue,
        winningOutcomeId,
        adminId: userId,
        auditNote,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        marketId,
        result: result.result,
      });
    } else if (action === "cancel") {
      const { reason } = body;

      if (!reason) {
        return NextResponse.json(
          { error: "Reason required for cancellation" },
          { status: 400 }
        );
      }

      const result = await cancelMarketWithRefunds(marketId, userId, reason);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        marketId,
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error processing market action:", error);
    return NextResponse.json(
      { error: "Failed to process market action" },
      { status: 500 }
    );
  }
}
