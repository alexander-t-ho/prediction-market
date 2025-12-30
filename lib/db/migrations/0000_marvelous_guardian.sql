CREATE TYPE "public"."challenge_status" AS ENUM('pending', 'accepted', 'expired', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."market_status" AS ENUM('pending', 'blind', 'open', 'locked', 'resolving', 'resolved', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."market_type" AS ENUM('binary', 'range_bracket');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('blind_period_ending', 'market_locked', 'market_resolved', 'payout_received', 'contrarian_bonus', 'taste_match', 'new_follower', 'challenge_received', 'challenge_accepted');--> statement-breakpoint
CREATE TYPE "public"."prediction_category" AS ENUM('rotten_tomatoes', 'box_office', 'box_office_ranking');--> statement-breakpoint
CREATE TABLE "bets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"outcome_id" uuid NOT NULL,
	"stake" numeric(10, 2) NOT NULL,
	"placed_during_blind_period" boolean DEFAULT false NOT NULL,
	"is_contrarian" boolean DEFAULT false NOT NULL,
	"popularity_ratio_at_bet" numeric(5, 4),
	"potential_payout" numeric(10, 2),
	"actual_payout" numeric(10, 2),
	"dynamic_odds_multiplier" numeric(5, 4),
	"contrarian_bonus_applied" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"challenger_id" uuid NOT NULL,
	"challenger_outcome_id" uuid NOT NULL,
	"challenged_id" uuid NOT NULL,
	"challenged_outcome_id" uuid,
	"stake" numeric(10, 2) NOT NULL,
	"status" "challenge_status" DEFAULT 'pending' NOT NULL,
	"winner_id" uuid,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"has_spoiler" boolean DEFAULT false NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period" varchar(20) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp,
	"total_predictions" integer DEFAULT 0 NOT NULL,
	"correct_predictions" integer DEFAULT 0 NOT NULL,
	"accuracy_score" numeric(5, 2),
	"contrarian_score" numeric(5, 2),
	"trendsetter_score" integer DEFAULT 0 NOT NULL,
	"balance" numeric(10, 2) NOT NULL,
	"rank" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"label" varchar(100) NOT NULL,
	"min_value" numeric(10, 2),
	"max_value" numeric(10, 2),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"movie_title" varchar(255) NOT NULL,
	"movie_id" varchar(100),
	"release_date" timestamp,
	"status" "market_status" DEFAULT 'pending' NOT NULL,
	"market_type" "market_type" NOT NULL,
	"category" "prediction_category" NOT NULL,
	"threshold" numeric(10, 2),
	"blind_period_ends_at" timestamp,
	"lock_at" timestamp,
	"resolution_at" timestamp,
	"actual_value" numeric(10, 2),
	"resolved_outcome_id" uuid,
	"is_user_proposed" boolean DEFAULT false NOT NULL,
	"proposed_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text,
	"related_entity_type" varchar(50),
	"related_entity_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resolutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"resolved_at" timestamp DEFAULT now() NOT NULL,
	"resolved_by" uuid,
	"data_source" varchar(100),
	"raw_data" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "resolutions_market_id_unique" UNIQUE("market_id")
);
--> statement-breakpoint
CREATE TABLE "taste_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user1_id" uuid NOT NULL,
	"user2_id" uuid NOT NULL,
	"score" numeric(5, 4) NOT NULL,
	"markets_in_common" integer NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trendsetter_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bet_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"points" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"avatar" varchar(255),
	"balance" numeric(10, 2) DEFAULT '100.00' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_outcome_id_market_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."market_outcomes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_challenger_id_users_id_fk" FOREIGN KEY ("challenger_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_challenger_outcome_id_market_outcomes_id_fk" FOREIGN KEY ("challenger_outcome_id") REFERENCES "public"."market_outcomes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_challenged_id_users_id_fk" FOREIGN KEY ("challenged_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_challenged_outcome_id_market_outcomes_id_fk" FOREIGN KEY ("challenged_outcome_id") REFERENCES "public"."market_outcomes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_outcomes" ADD CONSTRAINT "market_outcomes_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taste_matches" ADD CONSTRAINT "taste_matches_user1_id_users_id_fk" FOREIGN KEY ("user1_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taste_matches" ADD CONSTRAINT "taste_matches_user2_id_users_id_fk" FOREIGN KEY ("user2_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trendsetter_events" ADD CONSTRAINT "trendsetter_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trendsetter_events" ADD CONSTRAINT "trendsetter_events_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trendsetter_events" ADD CONSTRAINT "trendsetter_events_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bet_user_id_idx" ON "bets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bet_market_id_idx" ON "bets" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "bet_outcome_id_idx" ON "bets" USING btree ("outcome_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bet_user_market_idx" ON "bets" USING btree ("user_id","market_id");--> statement-breakpoint
CREATE INDEX "challenge_market_id_idx" ON "challenges" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "challenge_challenger_idx" ON "challenges" USING btree ("challenger_id");--> statement-breakpoint
CREATE INDEX "challenge_challenged_idx" ON "challenges" USING btree ("challenged_id");--> statement-breakpoint
CREATE INDEX "challenge_status_idx" ON "challenges" USING btree ("status");--> statement-breakpoint
CREATE INDEX "comment_market_id_idx" ON "comments" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "comment_user_id_idx" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "comment_parent_id_idx" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "follow_follower_idx" ON "follows" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "follow_following_idx" ON "follows" USING btree ("following_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_follow_idx" ON "follows" USING btree ("follower_id","following_id");--> statement-breakpoint
CREATE INDEX "snapshot_user_id_idx" ON "leaderboard_snapshots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "snapshot_period_idx" ON "leaderboard_snapshots" USING btree ("period");--> statement-breakpoint
CREATE INDEX "outcome_market_id_idx" ON "market_outcomes" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "market_status_idx" ON "markets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "market_category_idx" ON "markets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "market_release_date_idx" ON "markets" USING btree ("release_date");--> statement-breakpoint
CREATE INDEX "notification_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "taste_match_user1_idx" ON "taste_matches" USING btree ("user1_id");--> statement-breakpoint
CREATE INDEX "taste_match_user2_idx" ON "taste_matches" USING btree ("user2_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_taste_match_idx" ON "taste_matches" USING btree ("user1_id","user2_id");--> statement-breakpoint
CREATE INDEX "trendsetter_user_id_idx" ON "trendsetter_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trendsetter_bet_id_idx" ON "trendsetter_events" USING btree ("bet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "username_idx" ON "users" USING btree ("username");