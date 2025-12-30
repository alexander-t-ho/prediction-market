// Market Types

export type MarketCategory = 'rotten_tomatoes' | 'box_office';
export type MarketType = 'binary' | 'range_bracket' | 'number_one_opening';
export type MarketStatus =
  | 'pending'
  | 'blind'
  | 'open'
  | 'locked'
  | 'resolving'
  | 'resolved'
  | 'cancelled';

export interface Market {
  id: string;
  title: string;
  description: string;
  category: MarketCategory;
  market_type: MarketType;
  status: MarketStatus;
  movie_id: number;
  movie_title: string;
  movie_poster_path?: string;
  release_date: Date;
  threshold_value?: number;
  blind_period_ends_at: Date;
  closes_at: Date;
  resolves_at?: Date;
  resolution_value?: number;
  resolution_source_url?: string;
  created_by_user_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface MarketOutcome {
  id: string;
  market_id: string;
  label: string;
  value_min?: number;
  value_max?: number;
  is_winning_outcome?: boolean;
  created_at: Date;
}

export interface MarketWithOutcomes extends Market {
  outcomes: MarketOutcome[];
}

export interface MarketWithStats extends Market {
  outcomes: (MarketOutcome & {
    bet_count: number;
    total_stake: number;
    percentage: number;
  })[];
  total_pool: number;
  total_bets: number;
  user_bet?: {
    outcome_id: string;
    stake: number;
    outcome_label: string;
  };
}

// Filter and Sort Types
export interface MarketFilters {
  status?: MarketStatus | 'all';
  category?: MarketCategory | 'all';
  closingSoon?: boolean; // next 24 hours
  search?: string;
}

export type MarketSortOption = 'newest' | 'closing_soon' | 'most_pool';

// Market Creation Types
export interface CreateMarketData {
  title: string;
  description: string;
  category: MarketCategory;
  market_type: MarketType;
  movie_id: number;
  movie_title: string;
  movie_poster_path?: string;
  release_date: Date;
  threshold_value?: number;
  blind_period_ends_at: Date;
  closes_at: Date;
  created_by_user_id?: string;
  outcomes: Omit<MarketOutcome, 'id' | 'market_id' | 'created_at'>[];
}

// Market Proposal Types
export interface MarketProposal {
  movie_id: number;
  movie_title: string;
  category: MarketCategory;
  market_type: MarketType;
  threshold_value?: number;
  justification: string;
}
