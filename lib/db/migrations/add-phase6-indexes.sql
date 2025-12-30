-- Phase 6: Performance Optimization Indexes
-- Add indexes for leaderboard queries and admin dashboard queries

-- ============================================
-- LEADERBOARD INDEXES
-- ============================================

-- Top Earners: Index on user balance for fast sorting
CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance DESC);

-- Most Accurate: Index on bet outcomes for resolved markets
CREATE INDEX IF NOT EXISTS idx_bets_actual_payout ON bets(actual_payout);

-- Contrarians: Index on contrarian flag
CREATE INDEX IF NOT EXISTS idx_bets_is_contrarian ON bets(is_contrarian);

-- Trendsetters: Already has event type index from schema
CREATE INDEX IF NOT EXISTS idx_trendsetter_events_type ON trendsetter_events(event_type);
CREATE INDEX IF NOT EXISTS idx_trendsetter_events_points ON trendsetter_events(points);

-- Weekly Stars: Index on bet created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON bets(created_at DESC);

-- Leaderboard Snapshots: Indexes for historical queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_user_period ON leaderboard_snapshots(user_id, period, period_end DESC);

-- ============================================
-- ADMIN DASHBOARD INDEXES
-- ============================================

-- Pending markets query
CREATE INDEX IF NOT EXISTS idx_markets_status_created ON markets(status, created_at DESC);

-- Market resolution queries
CREATE INDEX IF NOT EXISTS idx_markets_resolved_at ON markets(status, updated_at DESC) WHERE status = 'resolved';

-- User search
CREATE INDEX IF NOT EXISTS idx_users_username_search ON users USING gin(to_tsvector('english', username));
CREATE INDEX IF NOT EXISTS idx_users_display_name_search ON users USING gin(to_tsvector('english', display_name));

-- Comment moderation
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- ============================================
-- COMPOUND INDEXES FOR COMMON QUERIES
-- ============================================

-- Bets on resolved markets (for accuracy calculations)
CREATE INDEX IF NOT EXISTS idx_bets_market_user_outcome ON bets(market_id, user_id, actual_payout);

-- Active markets with bets (for pool value calculations)
CREATE INDEX IF NOT EXISTS idx_markets_active_with_bets ON markets(status) WHERE status IN ('blind', 'open', 'locked');

-- User activity tracking
CREATE INDEX IF NOT EXISTS idx_bets_user_created ON bets(user_id, created_at DESC);

-- ============================================
-- PARTIAL INDEXES FOR SPECIFIC QUERIES
-- ============================================

-- Admin users only
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin) WHERE is_admin = true;

-- Contrarian bets only
CREATE INDEX IF NOT EXISTS idx_bets_contrarian ON bets(user_id, is_contrarian) WHERE is_contrarian = true;

-- Blind period bets
CREATE INDEX IF NOT EXISTS idx_bets_blind_period ON bets(user_id, placed_during_blind_period) WHERE placed_during_blind_period = true;

-- ============================================
-- VACUUM AND ANALYZE
-- ============================================

-- Update statistics for query planner
ANALYZE users;
ANALYZE markets;
ANALYZE bets;
ANALYZE trendsetter_events;
ANALYZE leaderboard_snapshots;
ANALYZE comments;
