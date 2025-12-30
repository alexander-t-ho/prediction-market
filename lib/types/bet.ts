// Bet Types

export interface Bet {
  id: string;
  user_id: string;
  market_id: string;
  outcome_id: string;
  stake: number;
  placed_at: Date;
  is_blind_period_bet: boolean;
  popularity_ratio_at_bet: number;
  is_contrarian: boolean;
  payout?: number;
  created_at: Date;
}

export interface BetWithDetails extends Bet {
  market_title: string;
  market_status: string;
  outcome_label: string;
  movie_title: string;
  movie_poster_path?: string;
}

// Bet Placement Types
export interface PlaceBetData {
  user_id: string;
  market_id: string;
  outcome_id: string;
  stake: number;
}

export interface PlaceBetResult {
  success: boolean;
  bet?: Bet;
  error?: string;
  new_balance?: number;
}

// Bet Distribution Types
export interface OutcomeDistribution {
  outcome_id: string;
  outcome_label: string;
  bet_count: number;
  total_stake: number;
  percentage: number;
}

export interface BettingDistribution {
  outcomes: OutcomeDistribution[];
  total_pool: number;
  total_bets: number;
  is_blind_period: boolean;
}

// Bet Validation Types
export interface BetValidationError {
  field?: 'stake' | 'balance' | 'market' | 'outcome';
  message: string;
}

export const BET_CONSTRAINTS = {
  MIN_STAKE: 1,
  MAX_STAKE: 50,
} as const;
