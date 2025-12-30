import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  decimal,
  boolean,
  text,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// ENUMS
// ============================================================================

export const marketStatusEnum = pgEnum("market_status", [
  "pending",
  "blind",
  "open",
  "locked",
  "resolving",
  "resolved",
  "cancelled",
]);

export const marketTypeEnum = pgEnum("market_type", ["binary", "range_bracket"]);

export const predictionCategoryEnum = pgEnum("prediction_category", [
  "rotten_tomatoes",
  "box_office",
  "box_office_ranking",
]);

export const challengeStatusEnum = pgEnum("challenge_status", [
  "pending",
  "accepted",
  "expired",
  "resolved",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "blind_period_ending",
  "market_locked",
  "market_resolved",
  "payout_received",
  "contrarian_bonus",
  "taste_match",
  "new_follower",
  "challenge_received",
  "challenge_accepted",
]);

// ============================================================================
// CORE TABLES
// ============================================================================

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    avatar: varchar("avatar", { length: 255 }),
    balance: decimal("balance", { precision: 10, scale: 2 }).default("100.00").notNull(),
    isAdmin: boolean("is_admin").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    usernameIdx: uniqueIndex("username_idx").on(table.username),
  })
);

export const markets = pgTable(
  "markets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    movieTitle: varchar("movie_title", { length: 255 }).notNull(),
    movieId: varchar("movie_id", { length: 100 }), // TMDB ID
    moviePosterPath: varchar("movie_poster_path", { length: 255 }), // TMDB poster path
    releaseDate: timestamp("release_date"),

    status: marketStatusEnum("status").default("pending").notNull(),
    marketType: marketTypeEnum("market_type").notNull(),
    category: predictionCategoryEnum("category").notNull(),

    // For binary markets
    threshold: decimal("threshold", { precision: 10, scale: 2 }),

    // Lifecycle timestamps
    blindPeriodEndsAt: timestamp("blind_period_ends_at"),
    lockAt: timestamp("lock_at"),
    resolutionAt: timestamp("resolution_at"),

    // Resolution data
    actualValue: decimal("actual_value", { precision: 10, scale: 2 }),
    resolvedOutcomeId: uuid("resolved_outcome_id"),

    // Auto-generated vs user-proposed
    isUserProposed: boolean("is_user_proposed").default(false).notNull(),
    proposedBy: uuid("proposed_by"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("market_status_idx").on(table.status),
    categoryIdx: index("market_category_idx").on(table.category),
    releaseDateIdx: index("market_release_date_idx").on(table.releaseDate),
  })
);

export const marketOutcomes = pgTable(
  "market_outcomes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    marketId: uuid("market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "cascade" }),

    // For binary markets: "Yes" or "No"
    // For range markets: "0-39%", "$25M-$50M", etc.
    label: varchar("label", { length: 100 }).notNull(),

    // For range markets
    minValue: decimal("min_value", { precision: 10, scale: 2 }),
    maxValue: decimal("max_value", { precision: 10, scale: 2 }),

    sortOrder: integer("sort_order").default(0).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    marketIdIdx: index("outcome_market_id_idx").on(table.marketId),
  })
);

export const bets = pgTable(
  "bets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    marketId: uuid("market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "cascade" }),
    outcomeId: uuid("outcome_id")
      .notNull()
      .references(() => marketOutcomes.id, { onDelete: "cascade" }),

    stake: decimal("stake", { precision: 10, scale: 2 }).notNull(),

    // Authentic Opinion System tracking
    placedDuringBlindPeriod: boolean("placed_during_blind_period").default(false).notNull(),
    isContrarian: boolean("is_contrarian").default(false).notNull(),
    popularityRatioAtBet: decimal("popularity_ratio_at_bet", { precision: 5, scale: 4 }),

    // Payout tracking
    potentialPayout: decimal("potential_payout", { precision: 10, scale: 2 }),
    actualPayout: decimal("actual_payout", { precision: 10, scale: 2 }),
    dynamicOddsMultiplier: decimal("dynamic_odds_multiplier", { precision: 5, scale: 4 }),
    contrarianBonusApplied: boolean("contrarian_bonus_applied").default(false),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("bet_user_id_idx").on(table.userId),
    marketIdIdx: index("bet_market_id_idx").on(table.marketId),
    outcomeIdIdx: index("bet_outcome_id_idx").on(table.outcomeId),
    // Enforce one bet per user per market
    userMarketIdx: uniqueIndex("bet_user_market_idx").on(table.userId, table.marketId),
  })
);

export const resolutions = pgTable("resolutions", {
  id: uuid("id").defaultRandom().primaryKey(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id, { onDelete: "cascade" })
    .unique(),

  resolvedAt: timestamp("resolved_at").defaultNow().notNull(),
  resolvedBy: uuid("resolved_by").references(() => users.id), // null for automated

  // Data source tracking
  dataSource: varchar("data_source", { length: 100 }), // "omdb", "box_office_mojo", "manual"
  rawData: text("raw_data"), // JSON string of API response

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// SOCIAL TABLES
// ============================================================================

export const follows = pgTable(
  "follows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    followerIdx: index("follow_follower_idx").on(table.followerId),
    followingIdx: index("follow_following_idx").on(table.followingId),
    uniqueFollowIdx: uniqueIndex("unique_follow_idx").on(table.followerId, table.followingId),
  })
);

export const comments: any = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    marketId: uuid("market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    content: text("content").notNull(),
    hasSpoiler: boolean("has_spoiler").default(false).notNull(),

    // Threaded comments (one level deep)
    parentId: uuid("parent_id").references(() => comments.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    marketIdIdx: index("comment_market_id_idx").on(table.marketId),
    userIdIdx: index("comment_user_id_idx").on(table.userId),
    parentIdIdx: index("comment_parent_id_idx").on(table.parentId),
  })
);

export const challenges = pgTable(
  "challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    marketId: uuid("market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "cascade" }),

    challengerId: uuid("challenger_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    challengerOutcomeId: uuid("challenger_outcome_id")
      .notNull()
      .references(() => marketOutcomes.id, { onDelete: "cascade" }),

    challengedId: uuid("challenged_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    challengedOutcomeId: uuid("challenged_outcome_id")
      .references(() => marketOutcomes.id, { onDelete: "cascade" }),

    stake: decimal("stake", { precision: 10, scale: 2 }).notNull(),
    status: challengeStatusEnum("status").default("pending").notNull(),

    winnerId: uuid("winner_id").references(() => users.id),

    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    resolvedAt: timestamp("resolved_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    marketIdIdx: index("challenge_market_id_idx").on(table.marketId),
    challengerIdx: index("challenge_challenger_idx").on(table.challengerId),
    challengedIdx: index("challenge_challenged_idx").on(table.challengedId),
    statusIdx: index("challenge_status_idx").on(table.status),
  })
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message"),

    // Polymorphic relation - can link to market, user, challenge, etc.
    relatedEntityType: varchar("related_entity_type", { length: 50 }),
    relatedEntityId: uuid("related_entity_id"),

    isRead: boolean("is_read").default(false).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("notification_user_id_idx").on(table.userId),
    isReadIdx: index("notification_is_read_idx").on(table.isRead),
  })
);

// ============================================================================
// REPUTATION TABLES
// ============================================================================

export const tasteMatches = pgTable(
  "taste_matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user1Id: uuid("user1_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    user2Id: uuid("user2_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    score: decimal("score", { precision: 5, scale: 4 }).notNull(),
    marketsInCommon: integer("markets_in_common").notNull(),

    lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  },
  (table) => ({
    user1Idx: index("taste_match_user1_idx").on(table.user1Id),
    user2Idx: index("taste_match_user2_idx").on(table.user2Id),
    uniqueMatchIdx: uniqueIndex("unique_taste_match_idx").on(table.user1Id, table.user2Id),
  })
);

export const trendsetterEvents = pgTable(
  "trendsetter_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    betId: uuid("bet_id")
      .notNull()
      .references(() => bets.id, { onDelete: "cascade" }),
    marketId: uuid("market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "cascade" }),

    eventType: varchar("event_type", { length: 50 }).notNull(), // "blind_period", "contrarian", "correct_contrarian"
    points: integer("points").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("trendsetter_user_id_idx").on(table.userId),
    betIdIdx: index("trendsetter_bet_id_idx").on(table.betId),
  })
);

export const leaderboardSnapshots = pgTable(
  "leaderboard_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Snapshot period
    period: varchar("period", { length: 20 }).notNull(), // "all_time", "weekly"
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end"),

    // Metrics
    totalPredictions: integer("total_predictions").default(0).notNull(),
    correctPredictions: integer("correct_predictions").default(0).notNull(),
    accuracyScore: decimal("accuracy_score", { precision: 5, scale: 2 }),
    contrarianScore: decimal("contrarian_score", { precision: 5, scale: 2 }),
    trendsetterScore: integer("trendsetter_score").default(0).notNull(),
    balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),

    rank: integer("rank"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("snapshot_user_id_idx").on(table.userId),
    periodIdx: index("snapshot_period_idx").on(table.period),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  bets: many(bets),
  proposedMarkets: many(markets),
  followers: many(follows, { relationName: "followers" }),
  following: many(follows, { relationName: "following" }),
  comments: many(comments),
  challengesCreated: many(challenges, { relationName: "challenger" }),
  challengesReceived: many(challenges, { relationName: "challenged" }),
  notifications: many(notifications),
  trendsetterEvents: many(trendsetterEvents),
}));

export const marketsRelations = relations(markets, ({ one, many }) => ({
  proposer: one(users, {
    fields: [markets.proposedBy],
    references: [users.id],
  }),
  outcomes: many(marketOutcomes),
  bets: many(bets),
  resolution: one(resolutions),
  comments: many(comments),
  challenges: many(challenges),
}));

export const marketOutcomesRelations = relations(marketOutcomes, ({ one, many }) => ({
  market: one(markets, {
    fields: [marketOutcomes.marketId],
    references: [markets.id],
  }),
  bets: many(bets),
}));

export const betsRelations = relations(bets, ({ one, many }) => ({
  user: one(users, {
    fields: [bets.userId],
    references: [users.id],
  }),
  market: one(markets, {
    fields: [bets.marketId],
    references: [markets.id],
  }),
  outcome: one(marketOutcomes, {
    fields: [bets.outcomeId],
    references: [marketOutcomes.id],
  }),
  trendsetterEvents: many(trendsetterEvents),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "followers",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  market: one(markets, {
    fields: [comments.marketId],
    references: [markets.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
  }),
  replies: many(comments),
}));

export const challengesRelations = relations(challenges, ({ one }) => ({
  market: one(markets, {
    fields: [challenges.marketId],
    references: [markets.id],
  }),
  challenger: one(users, {
    fields: [challenges.challengerId],
    references: [users.id],
    relationName: "challenger",
  }),
  challenged: one(users, {
    fields: [challenges.challengedId],
    references: [users.id],
    relationName: "challenged",
  }),
  challengerOutcome: one(marketOutcomes, {
    fields: [challenges.challengerOutcomeId],
    references: [marketOutcomes.id],
  }),
  challengedOutcome: one(marketOutcomes, {
    fields: [challenges.challengedOutcomeId],
    references: [marketOutcomes.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const trendsetterEventsRelations = relations(trendsetterEvents, ({ one }) => ({
  user: one(users, {
    fields: [trendsetterEvents.userId],
    references: [users.id],
  }),
  bet: one(bets, {
    fields: [trendsetterEvents.betId],
    references: [bets.id],
  }),
  market: one(markets, {
    fields: [trendsetterEvents.marketId],
    references: [markets.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Market = typeof markets.$inferSelect;
export type NewMarket = typeof markets.$inferInsert;

export type MarketOutcome = typeof marketOutcomes.$inferSelect;
export type NewMarketOutcome = typeof marketOutcomes.$inferInsert;

export type Bet = typeof bets.$inferSelect;
export type NewBet = typeof bets.$inferInsert;

export type Resolution = typeof resolutions.$inferSelect;
export type NewResolution = typeof resolutions.$inferInsert;

export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type TasteMatch = typeof tasteMatches.$inferSelect;
export type NewTasteMatch = typeof tasteMatches.$inferInsert;

export type TrendsetterEvent = typeof trendsetterEvents.$inferSelect;
export type NewTrendsetterEvent = typeof trendsetterEvents.$inferInsert;

export type LeaderboardSnapshot = typeof leaderboardSnapshots.$inferSelect;
export type NewLeaderboardSnapshot = typeof leaderboardSnapshots.$inferInsert;
