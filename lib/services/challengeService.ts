import { db } from "@/lib/db";
import { challenges, bets, markets, marketOutcomes, users, notifications } from "@/lib/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { activityService } from "./activityService";

export const challengeService = {
  /**
   * Create a challenge
   */
  async createChallenge(data: {
    marketId: string;
    challengerId: string;
    challengerOutcomeId: string;
    challengedId: string;
    stake: number;
  }) {
    // Validate that challenger and challenged are different
    if (data.challengerId === data.challengedId) {
      throw new Error("You cannot challenge yourself");
    }

    // Validate stake
    if (data.stake < 1) {
      throw new Error("Minimum stake is T$1");
    }

    if (data.stake > 50) {
      throw new Error("Maximum stake is T$50");
    }

    // Validate challenger has sufficient balance
    const challenger = await db.query.users.findFirst({
      where: eq(users.id, data.challengerId),
    });

    if (!challenger) {
      throw new Error("Challenger not found");
    }

    const challengerBalance = parseFloat(challenger.balance);
    if (challengerBalance < data.stake) {
      throw new Error(`Insufficient balance. You have T$${challengerBalance.toFixed(2)}`);
    }

    // Validate challenged user exists
    const challenged = await db.query.users.findFirst({
      where: eq(users.id, data.challengedId),
    });

    if (!challenged) {
      throw new Error("Challenged user not found");
    }

    // Validate market exists and is accepting bets
    const market = await db.query.markets.findFirst({
      where: eq(markets.id, data.marketId),
      with: {
        outcomes: true,
      },
    });

    if (!market) {
      throw new Error("Market not found");
    }

    if (market.status !== "blind" && market.status !== "open") {
      throw new Error("Market is not accepting challenges");
    }

    // Validate challenger outcome
    const challengerOutcome = market.outcomes.find((o) => o.id === data.challengerOutcomeId);
    if (!challengerOutcome) {
      throw new Error("Invalid outcome for challenger");
    }

    // For binary markets, automatically set the opposite outcome
    let challengedOutcomeId: string | null = null;
    if (market.marketType === "binary") {
      const oppositeOutcome = market.outcomes.find((o) => o.id !== data.challengerOutcomeId);
      if (!oppositeOutcome) {
        throw new Error("Could not find opposite outcome");
      }
      challengedOutcomeId = oppositeOutcome.id;
    }

    // Check if challenger already has a bet on this market
    const existingChallengerBet = await db.query.bets.findFirst({
      where: and(eq(bets.userId, data.challengerId), eq(bets.marketId, data.marketId)),
    });

    if (existingChallengerBet) {
      throw new Error("You have already placed a bet on this market. Cannot create challenge.");
    }

    // Check if challenged already has a bet on this market
    const existingChallengedBet = await db.query.bets.findFirst({
      where: and(eq(bets.userId, data.challengedId), eq(bets.marketId, data.marketId)),
    });

    if (existingChallengedBet) {
      // Validate they bet on the opposite outcome for binary markets
      if (market.marketType === "binary" && existingChallengedBet.outcomeId === data.challengerOutcomeId) {
        throw new Error("Challenged user bet on the same outcome as you");
      }
    }

    // Deduct stake from challenger immediately
    await db
      .update(users)
      .set({
        balance: sql`${users.balance} - ${data.stake}`,
      })
      .where(eq(users.id, data.challengerId));

    // Create challenge (expires in 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const [challenge] = await db
      .insert(challenges)
      .values({
        marketId: data.marketId,
        challengerId: data.challengerId,
        challengerOutcomeId: data.challengerOutcomeId,
        challengedId: data.challengedId,
        challengedOutcomeId: challengedOutcomeId,
        stake: data.stake.toString(),
        status: "pending",
        expiresAt,
      })
      .returning();

    // Create notification for challenged user
    await activityService.createNotification({
      userId: data.challengedId,
      type: "challenge_received",
      title: "New Challenge!",
      message: `${challenger.displayName} challenged you on "${market.title}"`,
      relatedEntityType: "challenge",
      relatedEntityId: challenge.id,
    });

    return this.getChallengeById(challenge.id);
  },

  /**
   * Accept a challenge
   */
  async acceptChallenge(challengeId: string, userId: string) {
    const challenge = await this.getChallengeById(challengeId);

    if (!challenge) {
      throw new Error("Challenge not found");
    }

    if (challenge.challengedId !== userId) {
      throw new Error("You are not the challenged user");
    }

    if (challenge.status !== "pending") {
      throw new Error(`Challenge is ${challenge.status}`);
    }

    // Check if expired
    if (new Date() > new Date(challenge.expiresAt)) {
      await this.expireChallenge(challengeId);
      throw new Error("Challenge has expired");
    }

    // Validate challenged user has sufficient balance
    const challenged = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!challenged) {
      throw new Error("User not found");
    }

    const stake = parseFloat(challenge.stake);
    const challengedBalance = parseFloat(challenged.balance);

    if (challengedBalance < stake) {
      throw new Error(`Insufficient balance. You need T$${stake.toFixed(2)}`);
    }

    // Check if challenged already bet on this market
    const existingBet = await db.query.bets.findFirst({
      where: and(eq(bets.userId, userId), eq(bets.marketId, challenge.marketId)),
    });

    if (existingBet) {
      throw new Error("You have already placed a bet on this market");
    }

    // Deduct stake from challenged user
    await db
      .update(users)
      .set({
        balance: sql`${users.balance} - ${stake}`,
      })
      .where(eq(users.id, userId));

    // Update challenge status
    await db
      .update(challenges)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
      })
      .where(eq(challenges.id, challengeId));

    // Create notification for challenger
    await activityService.createNotification({
      userId: challenge.challengerId,
      type: "challenge_accepted",
      title: "Challenge Accepted!",
      message: `${challenged.displayName} accepted your challenge`,
      relatedEntityType: "challenge",
      relatedEntityId: challengeId,
    });

    return this.getChallengeById(challengeId);
  },

  /**
   * Decline a challenge (refund challenger)
   */
  async declineChallenge(challengeId: string, userId: string) {
    const challenge = await this.getChallengeById(challengeId);

    if (!challenge) {
      throw new Error("Challenge not found");
    }

    if (challenge.challengedId !== userId) {
      throw new Error("You are not the challenged user");
    }

    if (challenge.status !== "pending") {
      throw new Error(`Challenge is ${challenge.status}`);
    }

    const stake = parseFloat(challenge.stake);

    // Refund challenger
    await db
      .update(users)
      .set({
        balance: sql`${users.balance} + ${stake}`,
      })
      .where(eq(users.id, challenge.challengerId));

    // Mark challenge as expired
    await db
      .update(challenges)
      .set({
        status: "expired",
      })
      .where(eq(challenges.id, challengeId));

    return { success: true };
  },

  /**
   * Expire a challenge (refund challenger)
   */
  async expireChallenge(challengeId: string) {
    const challenge = await db.query.challenges.findFirst({
      where: eq(challenges.id, challengeId),
    });

    if (!challenge) {
      throw new Error("Challenge not found");
    }

    if (challenge.status !== "pending") {
      return { success: false, message: "Challenge not pending" };
    }

    const stake = parseFloat(challenge.stake);

    // Refund challenger
    await db
      .update(users)
      .set({
        balance: sql`${users.balance} + ${stake}`,
      })
      .where(eq(users.id, challenge.challengerId));

    // Mark as expired
    await db
      .update(challenges)
      .set({
        status: "expired",
      })
      .where(eq(challenges.id, challengeId));

    return { success: true };
  },

  /**
   * Resolve a challenge after market resolution
   */
  async resolveChallenge(challengeId: string, winnerId: string) {
    const challenge = await this.getChallengeById(challengeId);

    if (!challenge) {
      throw new Error("Challenge not found");
    }

    if (challenge.status !== "accepted") {
      throw new Error("Challenge is not accepted");
    }

    // Validate winner is one of the participants
    if (winnerId !== challenge.challengerId && winnerId !== challenge.challengedId) {
      throw new Error("Winner must be challenger or challenged");
    }

    const stake = parseFloat(challenge.stake);
    const totalPot = stake * 2;

    // Award pot to winner
    await db
      .update(users)
      .set({
        balance: sql`${users.balance} + ${totalPot}`,
      })
      .where(eq(users.id, winnerId));

    // Update challenge
    await db
      .update(challenges)
      .set({
        status: "resolved",
        winnerId,
        resolvedAt: new Date(),
      })
      .where(eq(challenges.id, challengeId));

    // Create notifications
    const loserIsChallenger = winnerId === challenge.challengedId;
    const loserId = loserIsChallenger ? challenge.challengerId : challenge.challengedId;

    await activityService.createNotification({
      userId: winnerId,
      type: "payout_received",
      title: "Challenge Won!",
      message: `You won T$${totalPot.toFixed(2)} from your challenge`,
      relatedEntityType: "challenge",
      relatedEntityId: challengeId,
    });

    return this.getChallengeById(challengeId);
  },

  /**
   * Get challenge by ID with full details
   */
  async getChallengeById(challengeId: string) {
    const challenge = await db.query.challenges.findFirst({
      where: eq(challenges.id, challengeId),
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
        challenger: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
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
        challengerOutcome: {
          columns: {
            label: true,
          },
        },
        challengedOutcome: {
          columns: {
            label: true,
          },
        },
      },
    });

    return challenge;
  },

  /**
   * Get challenges for a user (sent and received)
   */
  async getUserChallenges(userId: string) {
    const userChallenges = await db.query.challenges.findMany({
      where: or(eq(challenges.challengerId, userId), eq(challenges.challengedId, userId)),
      with: {
        market: {
          columns: {
            id: true,
            title: true,
            movieTitle: true,
            status: true,
          },
        },
        challenger: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
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
        challengerOutcome: {
          columns: {
            label: true,
          },
        },
        challengedOutcome: {
          columns: {
            label: true,
          },
        },
      },
      orderBy: [sql`${challenges.createdAt} DESC`],
    });

    return userChallenges;
  },

  /**
   * Get challenges for a specific market
   */
  async getMarketChallenges(marketId: string) {
    const marketChallenges = await db.query.challenges.findMany({
      where: eq(challenges.marketId, marketId),
      with: {
        challenger: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
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
        challengerOutcome: {
          columns: {
            label: true,
          },
        },
        challengedOutcome: {
          columns: {
            label: true,
          },
        },
      },
      orderBy: [sql`${challenges.createdAt} DESC`],
    });

    return marketChallenges;
  },

  /**
   * Get pending challenges that need to be expired
   */
  async getExpiredChallenges() {
    const now = new Date();
    const expired = await db.query.challenges.findMany({
      where: and(eq(challenges.status, "pending"), sql`${challenges.expiresAt} < ${now}`),
    });

    return expired;
  },
};
