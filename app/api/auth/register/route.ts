import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, displayName, avatar } = body;

    // Validate input
    if (!username || !displayName) {
      return NextResponse.json(
        { message: "Username and display name are required" },
        { status: 400 }
      );
    }

    // Validate username format (alphanumeric, underscores, hyphens)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        {
          message:
            "Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens",
        },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ message: "Username already taken" }, { status: 409 });
    }

    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        displayName,
        avatar: avatar || null,
        balance: "100.00", // Starting balance
        isAdmin: false,
      })
      .returning();

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
